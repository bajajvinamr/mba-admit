"""Outcome contributions router — anonymized applicant decisions."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/outcomes", tags=["outcomes"])

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "outcome_contributions.json"


def _load_outcomes() -> list[dict]:
    if DATA_FILE.exists():
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    return []


def _save_outcomes(outcomes: list[dict]) -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(json.dumps(outcomes, indent=2, ensure_ascii=False), encoding="utf-8")


class OutcomeSubmission(BaseModel):
    school_slug: str = Field(..., min_length=1)
    round: str = Field(..., pattern=r"^(R1|R2|R3|ED|Rolling)$")
    result: str = Field(..., pattern=r"^(admitted|rejected|waitlisted|withdrew)$")
    gmat_score: Optional[int] = Field(None, ge=400, le=800)
    gpa: Optional[float] = Field(None, ge=0.0, le=4.0)
    years_exp: Optional[int] = Field(None, ge=0, le=30)
    industry: Optional[str] = None
    scholarship: bool = False
    anonymous: bool = True


class OutcomeResponse(BaseModel):
    id: str
    message: str


class OutcomeSummary(BaseModel):
    school_slug: str
    total: int
    admitted: int
    rejected: int
    waitlisted: int
    avg_gmat: Optional[float]
    avg_gpa: Optional[float]
    avg_years_exp: Optional[float]
    scholarship_pct: Optional[float]


@router.post("", response_model=OutcomeResponse)
async def submit_outcome(submission: OutcomeSubmission) -> OutcomeResponse:
    """Submit an anonymized application outcome."""
    outcomes = _load_outcomes()
    outcome_id = f"oc_{len(outcomes) + 1:06d}"

    entry = {
        "id": outcome_id,
        "school_slug": submission.school_slug,
        "round": submission.round,
        "result": submission.result,
        "gmat_score": submission.gmat_score,
        "gpa": submission.gpa,
        "years_exp": submission.years_exp,
        "industry": submission.industry,
        "scholarship": submission.scholarship,
        "anonymous": submission.anonymous,
        "verified": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    outcomes.append(entry)
    _save_outcomes(outcomes)
    logger.info("Outcome submitted: %s for %s (%s)", outcome_id, submission.school_slug, submission.result)

    return OutcomeResponse(id=outcome_id, message="Thank you! Your outcome helps future applicants.")


@router.get("/{school_slug}", response_model=OutcomeSummary)
async def get_school_outcomes(school_slug: str) -> OutcomeSummary:
    """Get aggregated outcomes for a school."""
    outcomes = _load_outcomes()
    school_outcomes = [o for o in outcomes if o["school_slug"] == school_slug]

    if not school_outcomes:
        return OutcomeSummary(
            school_slug=school_slug,
            total=0, admitted=0, rejected=0, waitlisted=0,
            avg_gmat=None, avg_gpa=None, avg_years_exp=None, scholarship_pct=None,
        )

    admitted = sum(1 for o in school_outcomes if o["result"] == "admitted")
    rejected = sum(1 for o in school_outcomes if o["result"] == "rejected")
    waitlisted = sum(1 for o in school_outcomes if o["result"] == "waitlisted")

    gmat_scores = [o["gmat_score"] for o in school_outcomes if o.get("gmat_score")]
    gpas = [o["gpa"] for o in school_outcomes if o.get("gpa")]
    years = [o["years_exp"] for o in school_outcomes if o.get("years_exp")]
    scholarships = [o for o in school_outcomes if o.get("scholarship")]

    return OutcomeSummary(
        school_slug=school_slug,
        total=len(school_outcomes),
        admitted=admitted,
        rejected=rejected,
        waitlisted=waitlisted,
        avg_gmat=round(sum(gmat_scores) / len(gmat_scores), 1) if gmat_scores else None,
        avg_gpa=round(sum(gpas) / len(gpas), 2) if gpas else None,
        avg_years_exp=round(sum(years) / len(years), 1) if years else None,
        scholarship_pct=round(len(scholarships) / len(school_outcomes) * 100, 1) if school_outcomes else None,
    )


@router.get("/{school_slug}/list")
async def list_school_outcomes(school_slug: str, limit: int = 50):
    """Get individual anonymized outcomes for a school (for display on school detail page)."""
    outcomes = _load_outcomes()
    school_outcomes = [o for o in outcomes if o["school_slug"] == school_slug]

    # Only return anonymous fields
    safe_outcomes = []
    for o in school_outcomes[:limit]:
        safe_outcomes.append({
            "round": o["round"],
            "result": o["result"],
            "gmat_score": o.get("gmat_score"),
            "gpa": o.get("gpa"),
            "years_exp": o.get("years_exp"),
            "industry": o.get("industry"),
            "scholarship": o.get("scholarship"),
            "created_at": o.get("created_at"),
        })

    return {"school_slug": school_slug, "outcomes": safe_outcomes, "total": len(school_outcomes)}


# ── Live Decision Feed ───────────────────────────────────────────────────────


class DecisionFeedParams(BaseModel):
    schools: Optional[list[str]] = None
    round: Optional[str] = Field(None, pattern=r"^(R1|R2|R3|ED|Rolling)$")
    result: Optional[str] = Field(None, pattern=r"^(admitted|rejected|waitlisted|withdrew)$")
    gmat_min: Optional[int] = Field(None, ge=200, le=800)
    gmat_max: Optional[int] = Field(None, ge=200, le=800)
    gpa_min: Optional[float] = Field(None, ge=0.0, le=4.0)
    gpa_max: Optional[float] = Field(None, ge=0.0, le=4.0)
    industry: Optional[str] = None
    similar_to_profile: bool = False
    page: int = Field(1, ge=1)
    per_page: int = Field(20, ge=1, le=100)


@router.get("/feed/live")
async def get_decision_feed(
    schools: Optional[str] = None,
    round: Optional[str] = None,
    result: Optional[str] = None,
    gmat_min: Optional[int] = None,
    gmat_max: Optional[int] = None,
    gpa_min: Optional[float] = None,
    gpa_max: Optional[float] = None,
    industry: Optional[str] = None,
    similar_to_profile: bool = False,
    page: int = 1,
    per_page: int = 20,
):
    """Live decision feed — sorted by date with advanced filters.

    Also loads community decisions from scraped data for richer feed.
    """
    from agents import load_community_decisions

    # Combine our outcomes with community decisions
    outcomes = _load_outcomes()
    try:
        community = load_community_decisions()
        # Normalize community decisions to same format
        for cd in community:
            if "school_slug" not in cd:
                cd["school_slug"] = cd.get("school_id", "")
            if "result" not in cd:
                status = cd.get("status", "").lower()
                if "admitted" in status or "matriculating" in status:
                    cd["result"] = "admitted"
                elif "denied" in status:
                    cd["result"] = "rejected"
                elif "waitlist" in status:
                    cd["result"] = "waitlisted"
                else:
                    cd["result"] = status
            if "gmat_score" not in cd:
                cd["gmat_score"] = cd.get("gmat") or cd.get("gmat_focus")
            if "years_exp" not in cd:
                cd["years_exp"] = cd.get("yoe")
            if "created_at" not in cd:
                cd["created_at"] = cd.get("date", "")
    except Exception:
        community = []

    all_decisions = outcomes + community

    # Apply filters
    school_list = [s.strip() for s in schools.split(",")] if schools else None
    filtered = []
    for d in all_decisions:
        if school_list and d.get("school_slug") not in school_list:
            continue
        if round and d.get("round") != round:
            continue
        if result and d.get("result") != result:
            continue
        if gmat_min and (d.get("gmat_score") or 0) < gmat_min:
            continue
        if gmat_max and (d.get("gmat_score") or 999) > gmat_max:
            continue
        if gpa_min and (d.get("gpa") or 0) < gpa_min:
            continue
        if gpa_max and (d.get("gpa") or 5.0) > gpa_max:
            continue
        if industry and d.get("industry") and industry.lower() not in d["industry"].lower():
            continue
        filtered.append(d)

    # Sort by date (newest first)
    filtered.sort(key=lambda d: d.get("created_at", ""), reverse=True)

    # Paginate
    start = (page - 1) * per_page
    end = start + per_page
    page_items = filtered[start:end]

    # Sanitize output
    safe_items = []
    for d in page_items:
        safe_items.append({
            "school_slug": d.get("school_slug", ""),
            "school_name": d.get("program") or d.get("school_slug", ""),
            "round": d.get("round", ""),
            "result": d.get("result", ""),
            "gmat_score": d.get("gmat_score"),
            "gpa": d.get("gpa"),
            "years_exp": d.get("years_exp"),
            "industry": d.get("industry"),
            "scholarship": d.get("scholarship", False),
            "created_at": d.get("created_at", ""),
            "international": d.get("international"),
            "location": d.get("location"),
        })

    return {
        "decisions": safe_items,
        "total": len(filtered),
        "page": page,
        "per_page": per_page,
        "total_pages": max(1, (len(filtered) + per_page - 1) // per_page),
    }


@router.get("/feed/stats")
async def get_decision_stats():
    """Aggregate decision stats — this week's admits/rejects/waitlists, most active school."""
    from agents import load_community_decisions

    outcomes = _load_outcomes()
    try:
        community = load_community_decisions()
    except Exception:
        community = []

    all_decisions = outcomes + community

    # Count by result
    result_counts: dict[str, int] = {}
    school_counts: dict[str, int] = {}
    for d in all_decisions:
        r = d.get("result", d.get("status", "")).lower()
        if "admitted" in r or "matriculating" in r:
            result_counts["admitted"] = result_counts.get("admitted", 0) + 1
        elif "denied" in r or "rejected" in r:
            result_counts["rejected"] = result_counts.get("rejected", 0) + 1
        elif "waitlist" in r:
            result_counts["waitlisted"] = result_counts.get("waitlisted", 0) + 1

        slug = d.get("school_slug", d.get("school_id", ""))
        if slug:
            school_counts[slug] = school_counts.get(slug, 0) + 1

    # Most active school
    most_active = max(school_counts, key=school_counts.get, default="") if school_counts else ""

    return {
        "total": len(all_decisions),
        "admitted": result_counts.get("admitted", 0),
        "rejected": result_counts.get("rejected", 0),
        "waitlisted": result_counts.get("waitlisted", 0),
        "most_active_school": most_active,
        "school_counts": dict(sorted(school_counts.items(), key=lambda x: x[1], reverse=True)[:20]),
    }


class ContributeDecision(BaseModel):
    school_slug: str = Field(..., min_length=1)
    round: str = Field(..., pattern=r"^(R1|R2|R3|ED|Rolling)$")
    result: str = Field(..., pattern=r"^(admitted|rejected|waitlisted|withdrew)$")
    gmat_score: Optional[int] = Field(None, ge=200, le=800)
    gpa: Optional[float] = Field(None, ge=0.0, le=4.0)
    years_exp: Optional[int] = Field(None, ge=0, le=30)
    industry: Optional[str] = None
    scholarship: bool = False
    international: bool = False
    demographics: Optional[str] = None


@router.post("/feed/contribute")
async def contribute_decision(submission: ContributeDecision):
    """User submits their own decision to the community feed."""
    outcomes = _load_outcomes()
    outcome_id = f"oc_{len(outcomes) + 1:06d}"

    entry = {
        "id": outcome_id,
        "school_slug": submission.school_slug,
        "round": submission.round,
        "result": submission.result,
        "gmat_score": submission.gmat_score,
        "gpa": submission.gpa,
        "years_exp": submission.years_exp,
        "industry": submission.industry,
        "scholarship": submission.scholarship,
        "international": submission.international,
        "demographics": submission.demographics,
        "anonymous": True,
        "verified": False,
        "source": "user_contributed",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    outcomes.append(entry)
    _save_outcomes(outcomes)
    logger.info("Decision contributed: %s for %s (%s)", outcome_id, submission.school_slug, submission.result)

    return {"id": outcome_id, "message": "Thank you! Your decision helps the community."}
