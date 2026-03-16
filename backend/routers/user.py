"""User-specific endpoints — school shortlist, dashboard."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Optional
from auth import get_current_user, get_optional_user
from models import AddSchoolRequest, UpdateSchoolStatusRequest
from agents import SCHOOL_DB
from compare_engine import load_gmatclub_data, get_decisions_for_school, compute_profile_fit
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
        status=req.status,
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
def get_dashboard(
    gmat: Optional[int] = Query(default=None, description="User's GMAT score for profile fit"),
    gpa: Optional[float] = Query(default=None, description="User's GPA for profile fit"),
    yoe: Optional[int] = Query(default=None, description="User's years of experience"),
    user: Dict = Depends(get_current_user),
):
    """Enriched dashboard: schools with deadlines, outcome stats, and profile fit."""
    user_schools = db.get_user_schools(user["sub"])
    all_decisions = load_gmatclub_data()

    # Build profile dict if any params provided
    profile = None
    if gmat or gpa or yoe:
        profile = {}
        if gmat:
            profile["gmat"] = gmat
        if gpa:
            profile["gpa"] = gpa
        if yoe:
            profile["yoe"] = yoe

    status_counts: Dict[str, int] = {}
    enriched_schools = []
    upcoming_deadlines = []

    for entry in user_schools:
        sid = entry.get("school_id", "")
        status = entry.get("status", "researching")
        status_counts[status] = status_counts.get(status, 0) + 1

        school_data = SCHOOL_DB.get(sid, {})
        school_name = school_data.get("name", sid)

        # -- Deadlines --
        deadlines = school_data.get("admission_deadlines", [])
        next_deadline = None
        for dl in deadlines:
            raw = dl.get("deadline", "")
            # Try parsing "Month Year" format
            parsed = _parse_month_year(raw)
            if parsed and parsed >= datetime.now():
                if next_deadline is None or parsed < next_deadline["date"]:
                    next_deadline = {
                        "date": parsed,
                        "round": dl.get("round", ""),
                        "deadline_str": raw,
                        "decision_str": dl.get("decision", ""),
                    }

        if next_deadline:
            days_left = (next_deadline["date"] - datetime.now()).days
            upcoming_deadlines.append({
                "school_id": sid,
                "school_name": school_name,
                "round": next_deadline["round"],
                "deadline": next_deadline["deadline_str"],
                "decision": next_deadline["decision_str"],
                "days_left": days_left,
                "status": status,
            })

        # -- Outcome stats (lightweight: just counts + admit rate) --
        school_decisions = get_decisions_for_school(all_decisions, sid)
        total_decisions = len(school_decisions)
        admit_count = sum(
            1 for d in school_decisions
            if any(k in d.get("status", "").lower() for k in ("admitted", "admit"))
        )
        admit_rate_real = round(admit_count / total_decisions * 100, 1) if total_decisions > 0 else None

        # -- Profile fit (if profile provided) --
        fit = compute_profile_fit(school_decisions, profile) if profile else None

        # -- Next action based on status --
        next_action = _suggest_next_action(status, school_data)

        enriched_schools.append({
            **entry,
            "name": school_name,
            "location": school_data.get("location", ""),
            "gmat_avg": school_data.get("gmat_avg"),
            "acceptance_rate": school_data.get("acceptance_rate"),
            "essay_count": len(school_data.get("essay_prompts", [])),
            "total_decisions": total_decisions,
            "admit_rate_real": admit_rate_real,
            "next_deadline": upcoming_deadlines[-1] if next_deadline else None,
            "profile_fit": fit,
            "next_action": next_action,
        })

    # Sort deadlines by urgency
    upcoming_deadlines.sort(key=lambda d: d["days_left"])

    return {
        "total_schools": len(user_schools),
        "status_breakdown": status_counts,
        "schools": enriched_schools,
        "upcoming_deadlines": upcoming_deadlines[:8],
    }


def _parse_month_year(s: str) -> Optional[datetime]:
    """Parse 'September 2025' or 'January 2026' into a datetime."""
    for fmt in ("%B %Y", "%b %Y"):
        try:
            return datetime.strptime(s.strip(), fmt)
        except ValueError:
            continue
    return None


def _suggest_next_action(status: str, school_data: dict) -> dict:
    """Suggest the single most valuable next action based on application status."""
    essay_count = len(school_data.get("essay_prompts", []))

    actions = {
        "researching": {
            "label": "Compare with targets",
            "href": "/compare",
            "urgency": "low",
        },
        "preparing": {
            "label": f"Draft {essay_count} essay{'s' if essay_count != 1 else ''}",
            "href": "/evaluator",
            "urgency": "medium",
        },
        "submitted": {
            "label": "Prep for interview",
            "href": "/interview",
            "urgency": "medium",
        },
        "interview": {
            "label": "Run mock interview",
            "href": "/interview",
            "urgency": "high",
        },
        "decision": {
            "label": "Check waitlist strategy",
            "href": "/waitlist",
            "urgency": "low",
        },
    }
    return actions.get(status, actions["researching"])
