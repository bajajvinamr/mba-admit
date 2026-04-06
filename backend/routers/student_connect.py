"""Student Connect — connect applicants with current students and alumni.

Enables prospective applicants to request conversations with verified
current students or recent alumni at their target schools.

Also supports the "Human in the Loop" expert review feature where
the platform founder personally reviews applications.
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from agents import SCHOOL_DB

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/connect", tags=["student-connect"])

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
CONNECT_REQUESTS_FILE = DATA_DIR / "connect_requests.json"
STUDENT_DIRECTORY_FILE = DATA_DIR / "student_directory.json"


# ── Models ───────────────────────────────────────────────────────────────────


class StudentProfile(BaseModel):
    id: str
    name: str
    school_id: str
    school_name: str
    graduation_year: int
    program: str = "MBA"
    industry_pre_mba: str = ""
    industry_post_mba: str = ""
    nationality: str = ""
    topics: list[str] = Field(default_factory=list)  # What they can talk about
    bio: str = ""
    available: bool = True


class ConnectRequest(BaseModel):
    applicant_email: str
    applicant_name: str
    school_id: str
    student_id: Optional[str] = None  # Specific student, or None for any
    message: str = Field(max_length=1000)
    topics: list[str] = Field(default_factory=list)


class ExpertReviewRequest(BaseModel):
    applicant_email: str
    applicant_name: str
    review_type: str = Field(description="essay | profile | school_list | full_application")
    school_ids: list[str] = Field(default_factory=list)
    details: str = Field(max_length=2000)
    gmat: Optional[int] = None
    gpa: Optional[float] = None


# ── Seed Student Directory ───────────────────────────────────────────────────

# In production, this would be a database. For now, seed data.
SEED_STUDENTS: list[dict] = [
    {
        "id": "s_hbs_001",
        "name": "Verified HBS Student",
        "school_id": "hbs",
        "school_name": "Harvard Business School",
        "graduation_year": 2026,
        "program": "MBA",
        "industry_pre_mba": "Consulting",
        "industry_post_mba": "Tech",
        "nationality": "Indian",
        "topics": ["case method", "career switch", "indian applicant experience", "campus life"],
        "bio": "Former MBB consultant from Mumbai. Switched to PM at a FAANG. Happy to chat about the HBS experience, especially for Indian applicants.",
        "available": True,
    },
    {
        "id": "s_booth_001",
        "name": "Verified Booth Student",
        "school_id": "chicago_booth",
        "school_name": "Chicago Booth",
        "graduation_year": 2026,
        "program": "MBA",
        "industry_pre_mba": "Investment Banking",
        "industry_post_mba": "Private Equity",
        "nationality": "American",
        "topics": ["flexible curriculum", "finance recruiting", "chicago life", "booth culture"],
        "bio": "Ex-IB analyst, now in PE. Booth's flexible curriculum was the #1 reason I chose it over peer schools.",
        "available": True,
    },
    {
        "id": "s_insead_001",
        "name": "Verified INSEAD Student",
        "school_id": "insead",
        "school_name": "INSEAD",
        "graduation_year": 2026,
        "program": "MBA",
        "industry_pre_mba": "Tech",
        "industry_post_mba": "Consulting",
        "nationality": "French",
        "topics": ["1-year program", "international experience", "europe vs us", "consulting recruiting"],
        "bio": "Chose INSEAD's 1-year MBA over M7 2-year programs. Best decision I made. Ask me why.",
        "available": True,
    },
    {
        "id": "s_isb_001",
        "name": "Verified ISB Student",
        "school_id": "isb",
        "school_name": "Indian School of Business",
        "graduation_year": 2026,
        "program": "PGP",
        "industry_pre_mba": "IT Services",
        "industry_post_mba": "Product Management",
        "nationality": "Indian",
        "topics": ["ISB vs IIM", "career switch from IT", "scholarships", "placements"],
        "bio": "4 years in IT services before ISB. Got 50% scholarship. Happy to share the playbook.",
        "available": True,
    },
    {
        "id": "s_kellogg_001",
        "name": "Verified Kellogg Student",
        "school_id": "kellogg",
        "school_name": "Kellogg School of Management",
        "graduation_year": 2027,
        "program": "MBA",
        "industry_pre_mba": "Non-Profit",
        "industry_post_mba": "Tech",
        "nationality": "Nigerian",
        "topics": ["non-traditional background", "diversity", "kellogg culture", "team-based learning"],
        "bio": "Non-traditional background in non-profit. Kellogg's collaborative culture made me feel at home from day one.",
        "available": True,
    },
    {
        "id": "s_stern_001",
        "name": "Verified Stern Student",
        "school_id": "nyu_stern",
        "school_name": "NYU Stern",
        "graduation_year": 2026,
        "program": "MBA",
        "industry_pre_mba": "Finance",
        "industry_post_mba": "Finance",
        "nationality": "Chinese",
        "topics": ["nyc advantage", "finance recruiting", "stern specializations", "international students"],
        "bio": "Chose Stern for the NYC location and finance focus. Full scholarship recipient.",
        "available": True,
    },
]


def _load_students() -> list[dict]:
    """Load student directory."""
    if STUDENT_DIRECTORY_FILE.exists():
        try:
            return json.loads(STUDENT_DIRECTORY_FILE.read_text())
        except Exception:
            pass
    return SEED_STUDENTS


def _save_request(request_data: dict):
    """Append a connect request to file."""
    requests = []
    if CONNECT_REQUESTS_FILE.exists():
        try:
            requests = json.loads(CONNECT_REQUESTS_FILE.read_text())
        except Exception:
            requests = []

    requests.append(request_data)
    CONNECT_REQUESTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    CONNECT_REQUESTS_FILE.write_text(json.dumps(requests, indent=2))


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("/students")
def list_students(
    school_id: Optional[str] = Query(None),
    topic: Optional[str] = Query(None),
    nationality: Optional[str] = Query(None),
):
    """Browse verified students available for conversations."""
    students = _load_students()

    if school_id:
        students = [s for s in students if s["school_id"] == school_id]
    if topic:
        topic_lower = topic.lower()
        students = [s for s in students if any(topic_lower in t.lower() for t in s.get("topics", []))]
    if nationality:
        nat_lower = nationality.lower()
        students = [s for s in students if s.get("nationality", "").lower() == nat_lower]

    available = [s for s in students if s.get("available", True)]

    return {
        "students": available,
        "total": len(available),
        "schools_represented": len(set(s["school_id"] for s in available)),
    }


@router.get("/students/school/{school_id}")
def students_by_school(school_id: str):
    """Get all available students at a specific school."""
    students = _load_students()
    school = SCHOOL_DB.get(school_id, {})
    school_name = school.get("name", school_id)

    matched = [s for s in students if s["school_id"] == school_id and s.get("available", True)]

    return {
        "school_id": school_id,
        "school_name": school_name,
        "students": matched,
        "total": len(matched),
    }


@router.post("/request")
def request_connect(req: ConnectRequest):
    """Request a conversation with a student or any available student at a school."""
    school = SCHOOL_DB.get(req.school_id, {})
    if not school:
        raise HTTPException(404, f"School not found: {req.school_id}")

    request_data = {
        "id": f"req_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
        "applicant_email": req.applicant_email,
        "applicant_name": req.applicant_name,
        "school_id": req.school_id,
        "school_name": school.get("name", req.school_id),
        "student_id": req.student_id,
        "message": req.message,
        "topics": req.topics,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    _save_request(request_data)

    return {
        "status": "submitted",
        "request_id": request_data["id"],
        "message": "Your request has been submitted. We'll match you with a student within 48 hours.",
    }


@router.post("/expert-review")
def request_expert_review(req: ExpertReviewRequest):
    """Request a personal review from the platform founder.

    This is the 'Human in the Loop' premium feature — real expert eyes
    on your application, essays, or school list.
    """
    valid_types = {"essay", "profile", "school_list", "full_application"}
    if req.review_type not in valid_types:
        raise HTTPException(400, f"Invalid review_type. Must be one of: {valid_types}")

    review_data = {
        "id": f"review_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
        "type": "expert_review",
        "applicant_email": req.applicant_email,
        "applicant_name": req.applicant_name,
        "review_type": req.review_type,
        "school_ids": req.school_ids,
        "details": req.details,
        "gmat": req.gmat,
        "gpa": req.gpa,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    _save_request(review_data)

    turnaround = {
        "essay": "24-48 hours",
        "profile": "48 hours",
        "school_list": "24 hours",
        "full_application": "3-5 business days",
    }

    return {
        "status": "submitted",
        "request_id": review_data["id"],
        "review_type": req.review_type,
        "estimated_turnaround": turnaround.get(req.review_type, "48 hours"),
        "message": f"Your {req.review_type.replace('_', ' ')} review has been submitted. "
                   f"You'll receive personal feedback within {turnaround.get(req.review_type, '48 hours')}.",
    }


@router.get("/expert-review/types")
def review_types():
    """Get available expert review types and pricing."""
    return {
        "types": [
            {
                "id": "essay",
                "name": "Essay Review",
                "description": "Detailed feedback on one essay — structure, authenticity, school fit, and line-by-line suggestions.",
                "turnaround": "24-48 hours",
                "tier_required": "premium",
            },
            {
                "id": "profile",
                "name": "Profile Review",
                "description": "Honest assessment of your candidacy — strengths, weaknesses, positioning strategy.",
                "turnaround": "48 hours",
                "tier_required": "premium",
            },
            {
                "id": "school_list",
                "name": "School List Review",
                "description": "Is your list balanced? Are you missing hidden targets? Data-backed recommendations.",
                "turnaround": "24 hours",
                "tier_required": "pro",
            },
            {
                "id": "full_application",
                "name": "Full Application Review",
                "description": "Complete review of one school's application — essays, resume, school fit, strategy.",
                "turnaround": "3-5 business days",
                "tier_required": "consultant",
            },
        ],
    }
