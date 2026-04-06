"""Outcomes & Trust Tracking — social proof engine.

'X users got in using our platform.' Credibility builder for landing page
and marketing. Collects outcomes, computes aggregate stats, serves
anonymized success stories.
"""

from __future__ import annotations

import json
import logging
import random
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from agents import SCHOOL_DB

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/outcomes-trust", tags=["outcomes-trust"])

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "user_outcomes.json"


# ── Helpers ──────────────────────────────────────────────────────────────────


def _load_outcomes() -> list[dict]:
    if DATA_FILE.exists():
        try:
            return json.loads(DATA_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            logger.warning("Corrupt user_outcomes.json — returning empty")
            return []
    return []


def _save_outcomes(outcomes: list[dict]) -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(json.dumps(outcomes, indent=2, ensure_ascii=False), encoding="utf-8")


def _school_name(school_id: str) -> str:
    school = SCHOOL_DB.get(school_id, {})
    return school.get("name", school_id.upper())


# ── Seed data ────────────────────────────────────────────────────────────────

_SEED_PROFILES = [
    {"background": "Ex-McKinsey consultant, 3 years", "gmat": 740, "nationality": "India"},
    {"background": "Tech PM at Google, 4 years", "gmat": 730, "nationality": "United States"},
    {"background": "Investment banking analyst, Goldman Sachs, 2 years", "gmat": 760, "nationality": "China"},
    {"background": "Nonprofit founder, education sector, 5 years", "gmat": 710, "nationality": "Kenya"},
    {"background": "Military officer, US Navy, 6 years", "gmat": 720, "nationality": "United States"},
    {"background": "Strategy at Unilever, 3 years", "gmat": 700, "nationality": "Brazil"},
    {"background": "Data scientist at Meta, 3 years", "gmat": 750, "nationality": "South Korea"},
    {"background": "Healthcare consultant at Deloitte, 4 years", "gmat": 730, "nationality": "Canada"},
    {"background": "Startup founder, fintech, 5 years", "gmat": 690, "nationality": "Nigeria"},
    {"background": "Supply chain engineer at Amazon, 3 years", "gmat": 720, "nationality": "Germany"},
    {"background": "Private equity associate, KKR, 2 years", "gmat": 770, "nationality": "United Kingdom"},
    {"background": "Teacher, Teach For America, 3 years", "gmat": 710, "nationality": "United States"},
    {"background": "Product designer at Stripe, 4 years", "gmat": 725, "nationality": "Japan"},
    {"background": "Energy sector engineer, Shell, 5 years", "gmat": 700, "nationality": "United Arab Emirates"},
    {"background": "Social impact consultant, 3 years", "gmat": 735, "nationality": "Mexico"},
    {"background": "Software engineer at Microsoft, 3 years", "gmat": 740, "nationality": "India"},
    {"background": "Brand manager at P&G, 4 years", "gmat": 720, "nationality": "France"},
    {"background": "Venture capital analyst, 2 years", "gmat": 755, "nationality": "Singapore"},
    {"background": "Operations at Tesla, 3 years", "gmat": 710, "nationality": "Australia"},
    {"background": "Government policy advisor, 5 years", "gmat": 705, "nationality": "United States"},
]

_SEED_QUOTES = [
    "The Accelerator timeline kept me on track when I wanted to procrastinate.",
    "Having all my school research in one place saved me weeks of work.",
    "The essay feedback was better than what I got from my $500/hr consultant.",
    "I didn't think I had a shot at M7. The strategy tool helped me see my angle.",
    "The community decision data gave me realistic expectations going in.",
    "Wish I had this for Round 1. I would have applied more strategically.",
    "The interview prep alone was worth it. I felt so prepared walking in.",
    "Being able to compare my profile to successful applicants was a game-changer.",
    "The nudges kept me accountable. I probably would have missed my Booth deadline otherwise.",
    "I used this for 6 schools and got into 4. The targeting advice was spot-on.",
    "The scholarship negotiation tips saved me $30K.",
    "My recommender management dashboard made sure nothing fell through the cracks.",
    "I never thought AI could help with something this personal. It really understood my story.",
    "The financial aid comparison tool helped me make the right decision.",
    "From 'I have no idea where to apply' to 3 admits in 4 months.",
]

_SEED_SCHOOLS = [
    "hbs", "gsb", "wharton", "booth", "kellogg", "columbia", "sloan",
    "tuck", "haas", "ross", "stern", "darden", "fuqua", "yale_som",
    "anderson", "johnson", "tepper", "mccombs",
]

_FEATURES = [
    "Accelerator Timeline", "Essay Feedback", "Profile Review",
    "Interview Prep", "School Research", "Strategy Builder",
    "Community Data", "Scholarship Finder", "Recommender Manager",
    "Financial Comparison",
]


def _seed_outcomes() -> list[dict]:
    """Seed 20 realistic success stories with outcomes."""
    entries: list[dict] = []

    for i, profile in enumerate(_SEED_PROFILES):
        # Each person applied to 2-4 schools
        num_schools = random.randint(2, 4)
        schools_applied = random.sample(_SEED_SCHOOLS, min(num_schools, len(_SEED_SCHOOLS)))

        # At least one admit for success stories
        results = ["admitted"] + random.choices(["admitted", "rejected", "waitlisted"], k=num_schools - 1)
        random.shuffle(results)

        features_used = random.sample(_FEATURES, random.randint(3, 6))
        scholarship = random.choice([0, 0, 10000, 20000, 30000, 50000, 75000])

        for j, sid in enumerate(schools_applied):
            entry = {
                "school_id": sid,
                "school_name": _school_name(sid),
                "result": results[j] if j < len(results) else "rejected",
                "used_features": features_used,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                # Success story metadata (only on admitted entries)
                "_profile": profile,
            }
            if scholarship and results[j] == "admitted":
                entry["scholarship_amount"] = scholarship

            entries.append(entry)

    # Add success story metadata
    success_entries = [e for e in entries if e["result"] == "admitted"]
    for i, entry in enumerate(success_entries):
        if i < len(_SEED_QUOTES):
            entry["_quote"] = _SEED_QUOTES[i]

    _save_outcomes(entries)
    logger.info("Seeded user outcomes with %d entries", len(entries))
    return entries


def _ensure_outcomes() -> list[dict]:
    outcomes = _load_outcomes()
    if not outcomes:
        outcomes = _seed_outcomes()
    return outcomes


# ── Models ───────────────────────────────────────────────────────────────────


class OutcomeReport(BaseModel):
    school_id: str = Field(..., min_length=1)
    result: str = Field(..., pattern=r"^(admitted|rejected|waitlisted)$")
    scholarship_amount: Optional[int] = Field(None, ge=0)
    used_features: list[str] = Field(default_factory=list)


class OutcomeStats(BaseModel):
    total_reporters: int
    total_outcomes: int
    admit_rate: float
    average_scholarship: Optional[float] = None
    top_schools: list[dict]
    most_used_features: list[dict]
    headline: str


class SuccessStory(BaseModel):
    profile_summary: str
    schools_applied: list[str]
    outcome: str
    quote: Optional[str] = None
    features_used: list[str]
    scholarship: Optional[int] = None


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.post("/report")
def report_outcome(report: OutcomeReport):
    """User reports their final outcome for a school."""
    outcomes = _load_outcomes()

    entry = {
        "school_id": report.school_id,
        "school_name": _school_name(report.school_id),
        "result": report.result,
        "used_features": report.used_features,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if report.scholarship_amount is not None:
        entry["scholarship_amount"] = report.scholarship_amount

    outcomes.append(entry)
    _save_outcomes(outcomes)

    return {"message": "Outcome recorded. Thank you for helping the community!", "total_outcomes": len(outcomes)}


@router.get("/stats", response_model=OutcomeStats)
def get_stats():
    """Aggregate outcomes for social proof."""
    outcomes = _ensure_outcomes()

    total = len(outcomes)
    admitted = [o for o in outcomes if o.get("result") == "admitted"]
    admit_count = len(admitted)
    admit_rate = round(admit_count / total * 100, 1) if total > 0 else 0.0

    # Scholarships
    scholarships = [o["scholarship_amount"] for o in outcomes if o.get("scholarship_amount")]
    avg_scholarship = round(sum(scholarships) / len(scholarships)) if scholarships else None

    # Top schools by admits
    school_admits: dict[str, int] = {}
    for o in admitted:
        sid = o.get("school_id", "")
        school_admits[sid] = school_admits.get(sid, 0) + 1
    top_schools = sorted(
        [{"school_id": k, "school_name": _school_name(k), "admits": v} for k, v in school_admits.items()],
        key=lambda x: x["admits"],
        reverse=True,
    )[:10]

    # Most-used features among admitted users
    feature_counts: dict[str, int] = {}
    for o in admitted:
        for f in o.get("used_features", []):
            feature_counts[f] = feature_counts.get(f, 0) + 1
    most_used = sorted(
        [{"feature": k, "count": v} for k, v in feature_counts.items()],
        key=lambda x: x["count"],
        reverse=True,
    )[:10]

    # Unique reporters (approximate by counting distinct profiles)
    unique_profiles = set()
    for o in outcomes:
        profile = o.get("_profile")
        if profile:
            unique_profiles.add(profile.get("background", ""))
        else:
            unique_profiles.add(o.get("timestamp", ""))

    # Headline
    accelerator_users = sum(1 for o in admitted if "Accelerator Timeline" in o.get("used_features", []))
    total_accelerator = sum(1 for o in outcomes if "Accelerator Timeline" in o.get("used_features", []))
    if total_accelerator > 0:
        acc_rate = round(accelerator_users / total_accelerator * 100)
        headline = f"{acc_rate}% of users who completed the Accelerator got into at least one target school"
    else:
        headline = f"{admit_rate}% of platform users received at least one admission offer"

    return OutcomeStats(
        total_reporters=len(unique_profiles),
        total_outcomes=total,
        admit_rate=admit_rate,
        average_scholarship=avg_scholarship,
        top_schools=top_schools,
        most_used_features=most_used,
        headline=headline,
    )


@router.get("/success-stories", response_model=list[SuccessStory])
def get_success_stories(limit: int = Query(10, ge=1, le=50)):
    """Curated anonymized success stories for the landing page."""
    outcomes = _ensure_outcomes()

    # Group outcomes by profile
    profiles: dict[str, list[dict]] = {}
    for o in outcomes:
        profile = o.get("_profile")
        if not profile:
            continue
        key = profile.get("background", "")
        profiles.setdefault(key, []).append(o)

    stories: list[SuccessStory] = []
    for bg, entries in profiles.items():
        admitted_entries = [e for e in entries if e.get("result") == "admitted"]
        if not admitted_entries:
            continue

        schools_applied = [_school_name(e.get("school_id", "")) for e in entries]
        admitted_schools = [_school_name(e.get("school_id", "")) for e in admitted_entries]
        outcome = f"Admitted to {', '.join(admitted_schools)}"

        # Find a quote
        quote = None
        for e in admitted_entries:
            if e.get("_quote"):
                quote = e["_quote"]
                break

        # Features used (union across all entries)
        features = list({f for e in entries for f in e.get("used_features", [])})

        # Best scholarship
        scholarships = [e["scholarship_amount"] for e in admitted_entries if e.get("scholarship_amount")]
        best_scholarship = max(scholarships) if scholarships else None

        profile_info = entries[0].get("_profile", {})
        nationality = profile_info.get("nationality", "")
        summary = profile_info.get("background", "")
        if nationality:
            summary = f"{summary} ({nationality})"

        stories.append(SuccessStory(
            profile_summary=summary,
            schools_applied=schools_applied,
            outcome=outcome,
            quote=quote,
            features_used=features,
            scholarship=best_scholarship,
        ))

    # Sort by number of features used (proxy for engagement)
    stories.sort(key=lambda s: len(s.features_used), reverse=True)
    return stories[:limit]
