"""Recommender management — CRUD for tracking recommendation letters."""

import logging
from datetime import datetime
from typing import Optional, List
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api", tags=["recommenders"])
logger = logging.getLogger(__name__)


# ── In-memory store (V1 — swap for DB in production) ─────────────────────────

_recommenders: dict[str, dict] = {}


# ── Models ───────────────────────────────────────────────────────────────────

class CreateRecommenderRequest(BaseModel):
    user_id: str
    name: str = Field(min_length=1, max_length=200)
    email: Optional[str] = None
    relationship: str = Field(
        description="manager | colleague | professor | mentor | other"
    )
    school_assignments: List[str] = Field(default_factory=list)
    status: str = "not_asked"
    deadline: Optional[str] = None
    notes: Optional[str] = None


class UpdateRecommenderRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    relationship: Optional[str] = None
    school_assignments: Optional[List[str]] = None
    status: Optional[str] = None
    deadline: Optional[str] = None
    notes: Optional[str] = None


VALID_STATUSES = {"not_asked", "asked", "accepted", "submitted"}
VALID_RELATIONSHIPS = {"manager", "colleague", "professor", "mentor", "other"}


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/recommenders")
def list_recommenders(user_id: str = Query(..., description="User ID")):
    """List all recommenders for a given user."""
    user_recs = [
        rec for rec in _recommenders.values()
        if rec["user_id"] == user_id
    ]
    user_recs.sort(key=lambda r: r["created_at"], reverse=True)
    return {"recommenders": user_recs}


@router.post("/recommenders", status_code=201)
def create_recommender(req: CreateRecommenderRequest):
    """Create a new recommender."""
    if req.relationship not in VALID_RELATIONSHIPS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid relationship. Must be one of: {', '.join(VALID_RELATIONSHIPS)}",
        )
    if req.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}",
        )

    rec_id = str(uuid4())[:12]
    now = datetime.utcnow().isoformat()

    rec = {
        "id": rec_id,
        "user_id": req.user_id,
        "name": req.name,
        "email": req.email,
        "relationship": req.relationship,
        "school_assignments": req.school_assignments,
        "status": req.status,
        "deadline": req.deadline,
        "notes": req.notes,
        "created_at": now,
        "updated_at": now,
    }

    _recommenders[rec_id] = rec
    return rec


@router.patch("/recommenders/{rec_id}")
def update_recommender(rec_id: str, req: UpdateRecommenderRequest):
    """Update a recommender's status, notes, deadline, or other fields."""
    rec = _recommenders.get(rec_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Recommender not found")

    if req.status is not None and req.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}",
        )
    if req.relationship is not None and req.relationship not in VALID_RELATIONSHIPS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid relationship. Must be one of: {', '.join(VALID_RELATIONSHIPS)}",
        )

    update_data = req.model_dump(exclude_none=True)
    for key, value in update_data.items():
        rec[key] = value
    rec["updated_at"] = datetime.utcnow().isoformat()

    return rec


@router.delete("/recommenders/{rec_id}")
def delete_recommender(rec_id: str, user_id: str = Query(..., description="User ID")):
    """Remove a recommender."""
    rec = _recommenders.get(rec_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Recommender not found")
    if rec["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    del _recommenders[rec_id]
    return {"deleted": rec_id}


@router.post("/recommenders/{rec_id}/briefing")
def generate_briefing(rec_id: str, school_id: str = Query(..., description="School slug")):
    """Generate a recommender briefing template for a specific school."""
    from agents import SCHOOL_DB

    rec = _recommenders.get(rec_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Recommender not found")

    school = SCHOOL_DB.get(school_id)
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    school_name = school.get("name", school_id)
    program = school.get("degree_type", "MBA")
    values = school.get("specializations", [])[:3]
    values_str = ", ".join(values) if values else "leadership, innovation, and collaboration"

    briefing = {
        "school_name": school_name,
        "program": program,
        "template": (
            f"Dear {rec['name']},\n\n"
            f"Thank you for agreeing to write a recommendation letter for my application "
            f"to the {program} program at {school_name}.\n\n"
            f"Here are some key areas the admissions committee values: {values_str}.\n\n"
            f"I would appreciate it if you could highlight:\n"
            f"- Specific examples of my leadership and impact\n"
            f"- My ability to work in teams and drive results\n"
            f"- My growth trajectory and potential for future leadership\n\n"
            f"The recommendation is due by {rec.get('deadline', 'the application deadline')}.\n\n"
            f"Please let me know if you need any additional information or if you'd like "
            f"to discuss this further.\n\n"
            f"Best regards"
        ),
        "tips": [
            "Share this briefing 4-6 weeks before the deadline",
            "Offer to provide your resume and essay drafts for context",
            f"Mention specific projects or achievements you'd like them to reference",
            "Follow up 2 weeks before the deadline if not yet submitted",
        ],
    }

    return briefing
