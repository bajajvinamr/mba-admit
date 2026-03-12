"""User-specific endpoints — school shortlist, dashboard."""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict
from auth import get_current_user
from models import AddSchoolRequest, UpdateSchoolStatusRequest
import db

router = APIRouter(prefix="/api/user", tags=["user"])


@router.get("/schools")
def get_user_schools(user: Dict = Depends(get_current_user)):
    """Get the authenticated user's school shortlist."""
    return db.get_user_schools(user["sub"])


@router.post("/schools")
def add_school_to_list(req: AddSchoolRequest, user: Dict = Depends(get_current_user)):
    """Add a school to the user's shortlist."""
    return db.add_user_school(
        user_id=user["sub"],
        school_id=req.school_id,
        round=req.round,
        notes=req.notes,
        priority=req.priority,
    )


@router.put("/schools/{entry_id}")
def update_school_status(entry_id: str, req: UpdateSchoolStatusRequest, user: Dict = Depends(get_current_user)):
    """Update status, round, or notes for a school on the shortlist."""
    updates = req.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = db.update_user_school(entry_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="School entry not found")
    return result


@router.delete("/schools/{entry_id}")
def remove_school_from_list(entry_id: str, user: Dict = Depends(get_current_user)):
    """Remove a school from the user's shortlist."""
    if not db.delete_user_school(entry_id):
        raise HTTPException(status_code=404, detail="School entry not found")
    return {"ok": True}


@router.get("/dashboard")
def get_dashboard(user: Dict = Depends(get_current_user)):
    """Aggregated dashboard data for the authenticated user."""
    schools = db.get_user_schools(user["sub"])

    status_counts = {}
    for s in schools:
        status = s.get("status", "researching")
        status_counts[status] = status_counts.get(status, 0) + 1

    return {
        "total_schools": len(schools),
        "status_breakdown": status_counts,
        "schools": schools,
    }
