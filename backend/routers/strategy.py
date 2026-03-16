"""Strategy endpoints — outreach, waitlist, recommender, control center."""

import re

from fastapi import APIRouter, HTTPException, Request
from middleware import rate_limit
from agents import (
    SCHOOL_DB,
    generate_recommender_strategy,
    generate_outreach_strategy,
    generate_waitlist_strategy,
)
from models import (
    RecommenderStrategyRequest,
    ControlCenterInitRequest,
    OutreachStrategyRequest,
    WaitlistStrategyRequest,
)

router = APIRouter(prefix="/api", tags=["strategy"])


# ── Recommender Strategy ──────────────────────────────────────────────────────

@router.post("/recommender_strategy")
@rate_limit("10/minute")
def get_recommender_strategy(request: Request, req: RecommenderStrategyRequest):
    """Generates a structured prep packet for recommenders."""
    recs_list = [r.model_dump() for r in req.recommenders]
    return generate_recommender_strategy(req.school_id, req.applicant_strengths, recs_list)


# ── Control Center ────────────────────────────────────────────────────────────

@router.post("/control_center/init")
def get_application_logistics(req: ControlCenterInitRequest):
    """Returns real deadlines, essay counts, and requirements for a batch of target schools."""
    logistics = []
    for sid in req.school_ids:
        school = SCHOOL_DB.get(sid, {})
        if not school:
            continue

        # Extract real deadlines from school data
        deadlines = school.get("admission_deadlines", [])
        deadline_map = {}
        for d in deadlines:
            round_label = d.get("round", "")
            if "1" in round_label:
                deadline_map["deadline_r1"] = d.get("deadline", "TBD")
                deadline_map["decision_r1"] = d.get("decision", "TBD")
            elif "2" in round_label:
                deadline_map["deadline_r2"] = d.get("deadline", "TBD")
                deadline_map["decision_r2"] = d.get("decision", "TBD")
            elif "3" in round_label:
                deadline_map["deadline_r3"] = d.get("deadline", "TBD")
                deadline_map["decision_r3"] = d.get("decision", "TBD")

        # Extract recommendation count from requirements text
        req_text = school.get("admission_requirements", {}).get("recommendations", "")
        rec_match = re.search(r"(\d+)", req_text)
        rec_count = int(rec_match.group(1)) if rec_match else 2

        logistics.append({
            "id": sid,
            "name": school.get("name"),
            "country": school.get("country", ""),
            "essay_count": len(school.get("essay_prompts", [])),
            "essay_prompts": school.get("essay_prompts", []),
            "recommendation_count": rec_count,
            "application_fee": school.get("admission_requirements", {}).get("application_fee", ""),
            "interview": school.get("admission_requirements", {}).get("interview", ""),
            **deadline_map,
        })
    return {"logistics": logistics}


# ── Outreach ──────────────────────────────────────────────────────────────────

@router.post("/outreach_strategy")
@rate_limit("10/minute")
def get_outreach_strategy(request: Request, req: OutreachStrategyRequest):
    """Generates personalized cold-email templates for networking."""
    return generate_outreach_strategy(req.school_id, req.background, req.goal)


# ── Waitlist ──────────────────────────────────────────────────────────────────

@router.post("/waitlist_strategy")
@rate_limit("10/minute")
def get_waitlist_strategy(request: Request, req: WaitlistStrategyRequest):
    """Generates a waitlist reality check and update letter draft."""
    return generate_waitlist_strategy(req.school_id, req.profile_updates, req.previous_essay_themes)
