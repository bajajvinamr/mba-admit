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
