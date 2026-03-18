"""Real applicant data endpoints - decisions, interview Qs, reviews from community sources."""

import json
import logging
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/applicant-data", tags=["applicant-data"])

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "applicant_data"

# ---------------------------------------------------------------------------
# Load all extracted applicant data at startup
# ---------------------------------------------------------------------------

_SCHOOL_DECISIONS: dict[str, list] = {}    # school_id -> [decision, ...]
_SCHOOL_INTERVIEWS: dict[str, list] = {}   # school_id -> [question, ...]
_SCHOOL_REVIEWS: dict[str, list] = {}      # school_id -> [review, ...]
_SCHOOL_PROFILES: dict[str, list] = {}     # school_id -> [profile, ...]
_SCHOOL_STATS: dict[str, dict] = {}        # school_id -> admission_stats


def _load_applicant_data():
    """Load all extracted applicant data from JSON files."""
    global _SCHOOL_DECISIONS, _SCHOOL_INTERVIEWS, _SCHOOL_REVIEWS, _SCHOOL_PROFILES, _SCHOOL_STATS

    for source_dir in DATA_DIR.iterdir():
        if not source_dir.is_dir():
            continue
        source = source_dir.name

        for extracted_file in source_dir.glob("*_extracted.json"):
            try:
                data = json.loads(extracted_file.read_text())
            except (json.JSONDecodeError, OSError):
                continue

            # School-specific GMAT Club data
            school_id = data.get("school_id")
            if school_id:
                # Real applicant profiles
                profiles = data.get("real_applicant_profiles") or []
                if profiles:
                    _SCHOOL_PROFILES.setdefault(school_id, []).extend(profiles)

                # Interview questions
                questions = data.get("interview_questions_reported") or []
                if questions:
                    _SCHOOL_INTERVIEWS.setdefault(school_id, []).extend(questions)

                # Student reviews
                reviews = data.get("student_reviews") or []
                if reviews:
                    _SCHOOL_REVIEWS.setdefault(school_id, []).extend(reviews)

                # Admission stats
                stats = data.get("admission_stats_reported")
                if stats:
                    _SCHOOL_STATS[school_id] = stats

            # Decision data (from LiveWire, Reddit, etc.)
            decisions = data.get("decisions") or []
            for dec in decisions:
                sid = dec.get("school_id")
                if sid:
                    _SCHOOL_DECISIONS.setdefault(sid, []).append(dec)

    total_decisions = sum(len(v) for v in _SCHOOL_DECISIONS.values())
    total_profiles = sum(len(v) for v in _SCHOOL_PROFILES.values())
    total_questions = sum(len(v) for v in _SCHOOL_INTERVIEWS.values())
    total_reviews = sum(len(v) for v in _SCHOOL_REVIEWS.values())

    logger.info(
        "Applicant data loaded: %d decisions, %d profiles, %d interview Qs, %d reviews across %d schools",
        total_decisions, total_profiles, total_questions, total_reviews,
        len(set(list(_SCHOOL_DECISIONS) + list(_SCHOOL_PROFILES) + list(_SCHOOL_INTERVIEWS) + list(_SCHOOL_REVIEWS))),
    )


# Load on import
if DATA_DIR.exists():
    _load_applicant_data()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/stats")
async def applicant_data_stats():
    """Overview of available real applicant data."""
    return {
        "total_decisions": sum(len(v) for v in _SCHOOL_DECISIONS.values()),
        "total_profiles": sum(len(v) for v in _SCHOOL_PROFILES.values()),
        "total_interview_questions": sum(len(v) for v in _SCHOOL_INTERVIEWS.values()),
        "total_reviews": sum(len(v) for v in _SCHOOL_REVIEWS.values()),
        "schools_with_decisions": len(_SCHOOL_DECISIONS),
        "schools_with_profiles": len(_SCHOOL_PROFILES),
        "schools_with_interviews": len(_SCHOOL_INTERVIEWS),
        "schools_with_reviews": len(_SCHOOL_REVIEWS),
        "sources": ["gmat_club", "clear_admit", "reddit"],
    }


@router.get("/school/{school_id}")
async def school_applicant_data(school_id: str):
    """All real applicant data for a specific school."""
    decisions = _SCHOOL_DECISIONS.get(school_id, [])
    profiles = _SCHOOL_PROFILES.get(school_id, [])
    interviews = _SCHOOL_INTERVIEWS.get(school_id, [])
    reviews = _SCHOOL_REVIEWS.get(school_id, [])
    stats = _SCHOOL_STATS.get(school_id)

    if not any([decisions, profiles, interviews, reviews, stats]):
        raise HTTPException(status_code=404, detail=f"No applicant data for {school_id}")

    return {
        "school_id": school_id,
        "decisions": decisions,
        "applicant_profiles": profiles,
        "interview_questions": interviews,
        "student_reviews": reviews,
        "admission_stats": stats,
        "data_counts": {
            "decisions": len(decisions),
            "profiles": len(profiles),
            "interview_questions": len(interviews),
            "reviews": len(reviews),
        },
    }


@router.get("/decisions")
async def all_decisions(
    school_id: Optional[str] = Query(None),
    result: Optional[str] = Query(None, description="Filter: Accepted, Rejected, Waitlisted"),
    min_gmat: Optional[int] = Query(None),
    max_gmat: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Search real applicant decisions with filters."""
    all_decs = []
    if school_id:
        all_decs = _SCHOOL_DECISIONS.get(school_id, [])
    else:
        for decs in _SCHOOL_DECISIONS.values():
            all_decs.extend(decs)

    # Apply filters
    if result:
        all_decs = [d for d in all_decs if (d.get("result") or "").lower() == result.lower()]
    if min_gmat:
        all_decs = [d for d in all_decs if (d.get("gmat_score") or 0) >= min_gmat]
    if max_gmat:
        all_decs = [d for d in all_decs if (d.get("gmat_score") or 9999) <= max_gmat]

    total = len(all_decs)
    page = all_decs[offset:offset + limit]

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "decisions": page,
    }


@router.get("/interviews/{school_id}")
async def school_interviews(school_id: str):
    """Interview questions reported by real applicants for a school."""
    questions = _SCHOOL_INTERVIEWS.get(school_id, [])
    if not questions:
        raise HTTPException(status_code=404, detail=f"No interview data for {school_id}")

    return {
        "school_id": school_id,
        "total_questions": len(questions),
        "questions": questions,
    }


@router.get("/reviews/{school_id}")
async def school_reviews(school_id: str):
    """Student reviews for a school from community sources."""
    reviews = _SCHOOL_REVIEWS.get(school_id, [])
    if not reviews:
        raise HTTPException(status_code=404, detail=f"No reviews for {school_id}")

    return {
        "school_id": school_id,
        "total_reviews": len(reviews),
        "reviews": reviews,
    }


@router.get("/profiles/{school_id}")
async def school_profiles(school_id: str):
    """Real applicant profiles (GMAT, GPA, work exp) for a school."""
    profiles = _SCHOOL_PROFILES.get(school_id, [])
    if not profiles:
        raise HTTPException(status_code=404, detail=f"No applicant profiles for {school_id}")

    return {
        "school_id": school_id,
        "total_profiles": len(profiles),
        "profiles": profiles,
    }
