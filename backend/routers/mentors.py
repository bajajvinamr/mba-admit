"""Mentor Marketplace — browse, search, and create mentor profiles.

V1: JSON-file backed, no real DB. Serves data from /data/mentors.json.
"""

import json
import logging
import os
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/mentors", tags=["mentors"])
logger = logging.getLogger(__name__)

DATA_FILE = Path(os.path.dirname(__file__)).parent / "data" / "mentors.json"

# ── In-memory store ───────────────────────────────────────────────────────────

_MENTORS: list[dict] = []


def _load_mentors() -> list[dict]:
    """Load mentors from JSON file into memory (once)."""
    if _MENTORS:
        return _MENTORS

    if not DATA_FILE.exists():
        logger.warning("Mentors data file not found: %s", DATA_FILE)
        return []

    try:
        with open(DATA_FILE, "r") as f:
            data = json.load(f)
        _MENTORS.extend(data)
        logger.info("Loaded %d mentor profiles", len(_MENTORS))
    except (json.JSONDecodeError, OSError) as exc:
        logger.error("Failed to load mentors: %s", exc)

    return _MENTORS


def _save_mentors() -> None:
    """Persist current mentor list back to JSON file."""
    try:
        DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(DATA_FILE, "w") as f:
            json.dump(_MENTORS, f, indent=2, default=str)
    except OSError as exc:
        logger.error("Failed to save mentors: %s", exc)


def _mentor_summary(m: dict) -> dict:
    """Return card-level fields for list views."""
    return {
        "id": m.get("id"),
        "displayName": m.get("displayName"),
        "school": m.get("school"),
        "schoolName": m.get("schoolName"),
        "graduationYear": m.get("graduationYear"),
        "status": m.get("status"),
        "currentRole": m.get("currentRole"),
        "currentCompany": m.get("currentCompany"),
        "industry": m.get("industry"),
        "expertise": m.get("expertise", []),
        "hourlyRate": m.get("hourlyRate"),
        "currency": m.get("currency", "USD"),
        "availability": m.get("availability"),
        "rating": m.get("rating", 0),
        "reviewCount": m.get("reviewCount", 0),
        "sessionsCompleted": m.get("sessionsCompleted", 0),
        "verified": m.get("verified", False),
        "profileImage": m.get("profileImage"),
    }


# ── Request / Response Models ─────────────────────────────────────────────────


class CreateMentorRequest(BaseModel):
    displayName: str = Field(min_length=2, max_length=200)
    school: str = Field(min_length=2, max_length=50)
    schoolName: str = Field(min_length=2, max_length=200)
    graduationYear: Optional[int] = None
    status: str = Field(default="student", pattern="^(student|alumni)$")
    currentRole: Optional[str] = Field(default=None, max_length=200)
    currentCompany: Optional[str] = Field(default=None, max_length=200)
    industry: str = Field(min_length=2, max_length=100)
    expertise: list[str] = Field(min_length=1)
    bio: str = Field(min_length=50, max_length=2000)
    hourlyRate: int = Field(ge=0, le=1000)
    currency: str = Field(default="USD", max_length=10)
    languages: list[str] = Field(default=["English"])
    linkedinUrl: Optional[str] = Field(default=None, max_length=500)


class UpdateMentorRequest(BaseModel):
    displayName: Optional[str] = Field(default=None, min_length=2, max_length=200)
    currentRole: Optional[str] = Field(default=None, max_length=200)
    currentCompany: Optional[str] = Field(default=None, max_length=200)
    industry: Optional[str] = Field(default=None, max_length=100)
    expertise: Optional[list[str]] = None
    bio: Optional[str] = Field(default=None, min_length=50, max_length=2000)
    hourlyRate: Optional[int] = Field(default=None, ge=0, le=1000)
    availability: Optional[str] = Field(default=None, pattern="^(available|limited|unavailable)$")
    languages: Optional[list[str]] = None
    linkedinUrl: Optional[str] = Field(default=None, max_length=500)


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.get("")
def list_mentors(
    school: Optional[str] = Query(default=None, description="Filter by school slug"),
    expertise: Optional[str] = Query(default=None, description="Filter by expertise area"),
    industry: Optional[str] = Query(default=None, description="Filter by industry"),
    status: Optional[str] = Query(default=None, description="student or alumni"),
    min_rate: Optional[int] = Query(default=None, ge=0, description="Minimum hourly rate"),
    max_rate: Optional[int] = Query(default=None, ge=0, description="Maximum hourly rate"),
    availability: Optional[str] = Query(default=None, description="available, limited, or unavailable"),
    sort: Optional[str] = Query(default="rating", description="Sort by: rating, rate_asc, rate_desc, sessions"),
    q: Optional[str] = Query(default=None, description="Search query (name, bio, school)"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    """Search and filter mentors."""
    mentors = _load_mentors()
    results = list(mentors)

    # Apply filters
    if school:
        results = [m for m in results if m.get("school", "").lower() == school.lower()]
    if expertise:
        results = [m for m in results if expertise.lower() in [e.lower() for e in m.get("expertise", [])]]
    if industry:
        results = [m for m in results if m.get("industry", "").lower() == industry.lower()]
    if status:
        results = [m for m in results if m.get("status", "").lower() == status.lower()]
    if min_rate is not None:
        results = [m for m in results if m.get("hourlyRate", 0) >= min_rate]
    if max_rate is not None:
        results = [m for m in results if m.get("hourlyRate", 0) <= max_rate]
    if availability:
        results = [m for m in results if m.get("availability", "").lower() == availability.lower()]
    if q:
        q_lower = q.lower()
        results = [
            m for m in results
            if q_lower in m.get("displayName", "").lower()
            or q_lower in m.get("bio", "").lower()
            or q_lower in m.get("schoolName", "").lower()
            or q_lower in m.get("currentCompany", "").lower()
            or q_lower in m.get("currentRole", "").lower()
        ]

    # Sort
    if sort == "rate_asc":
        results.sort(key=lambda m: m.get("hourlyRate", 0))
    elif sort == "rate_desc":
        results.sort(key=lambda m: m.get("hourlyRate", 0), reverse=True)
    elif sort == "sessions":
        results.sort(key=lambda m: m.get("sessionsCompleted", 0), reverse=True)
    else:  # default: rating
        results.sort(key=lambda m: (m.get("rating", 0), m.get("reviewCount", 0)), reverse=True)

    total = len(results)
    page = results[offset : offset + limit]

    return {
        "mentors": [_mentor_summary(m) for m in page],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/schools")
def list_mentor_schools():
    """List schools that have at least one mentor."""
    mentors = _load_mentors()
    schools: dict[str, dict] = {}
    for m in mentors:
        slug = m.get("school", "")
        if slug and slug not in schools:
            schools[slug] = {
                "slug": slug,
                "name": m.get("schoolName", slug),
                "mentorCount": 0,
            }
        if slug in schools:
            schools[slug]["mentorCount"] += 1

    school_list = sorted(schools.values(), key=lambda s: s["mentorCount"], reverse=True)
    return {"schools": school_list, "total": len(school_list)}


@router.get("/stats")
def mentor_stats():
    """Aggregate mentor marketplace stats."""
    mentors = _load_mentors()
    if not mentors:
        return {"totalMentors": 0, "avgRate": 0, "topSchools": [], "totalSessions": 0}

    rates = [m.get("hourlyRate", 0) for m in mentors]
    school_counts: dict[str, int] = {}
    for m in mentors:
        slug = m.get("school", "unknown")
        school_counts[slug] = school_counts.get(slug, 0) + 1

    top_schools = sorted(school_counts.items(), key=lambda x: x[1], reverse=True)[:5]

    return {
        "totalMentors": len(mentors),
        "avgRate": round(sum(rates) / len(rates)),
        "minRate": min(rates),
        "maxRate": max(rates),
        "totalSessions": sum(m.get("sessionsCompleted", 0) for m in mentors),
        "totalReviews": sum(m.get("reviewCount", 0) for m in mentors),
        "avgRating": round(sum(m.get("rating", 0) for m in mentors) / len(mentors), 1),
        "topSchools": [{"school": s, "count": c} for s, c in top_schools],
        "byStatus": {
            "alumni": sum(1 for m in mentors if m.get("status") == "alumni"),
            "student": sum(1 for m in mentors if m.get("status") == "student"),
        },
    }


@router.get("/{mentor_id}")
def get_mentor(mentor_id: str):
    """Get full mentor profile by ID."""
    mentors = _load_mentors()
    for m in mentors:
        if m.get("id") == mentor_id:
            return m
    raise HTTPException(status_code=404, detail="Mentor not found")


@router.post("", status_code=201)
def create_mentor(body: CreateMentorRequest):
    """Create a new mentor profile."""
    mentors = _load_mentors()

    new_mentor = {
        "id": f"mentor_{uuid.uuid4().hex[:8]}",
        "userId": f"user_{uuid.uuid4().hex[:8]}",
        **body.model_dump(),
        "availability": "available",
        "rating": 0,
        "reviewCount": 0,
        "sessionsCompleted": 0,
        "verified": False,
        "profileImage": None,
        "createdAt": "2025-03-26T00:00:00Z",
        "updatedAt": "2025-03-26T00:00:00Z",
    }

    mentors.append(new_mentor)
    _save_mentors()
    logger.info("Created mentor profile: %s (%s)", new_mentor["displayName"], new_mentor["id"])

    return new_mentor


@router.patch("/{mentor_id}")
def update_mentor(mentor_id: str, body: UpdateMentorRequest):
    """Update an existing mentor profile."""
    mentors = _load_mentors()

    for i, m in enumerate(mentors):
        if m.get("id") == mentor_id:
            updates = body.model_dump(exclude_none=True)
            if not updates:
                raise HTTPException(status_code=400, detail="No fields to update")

            updated = {**m, **updates, "updatedAt": "2025-03-26T00:00:00Z"}
            mentors[i] = updated
            _save_mentors()
            logger.info("Updated mentor profile: %s", mentor_id)
            return updated

    raise HTTPException(status_code=404, detail="Mentor not found")
