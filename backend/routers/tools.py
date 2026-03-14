"""Standalone tool endpoints — evaluator, roaster, recommender, interview, outreach, waitlist."""

import random

from fastapi import APIRouter, HTTPException, Request
from middleware import rate_limit
from agents import (
    SCHOOL_DB,
    evaluate_essay_draft,
    roast_resume_bullet,
    generate_recommender_strategy,
    simulate_interview_pass,
    generate_outreach_strategy,
    generate_waitlist_strategy,
)
from models import (
    ResumeRoastRequest,
    EssayEvaluationRequest,
    RecommenderStrategyRequest,
    InterviewStartRequest,
    InterviewResponseRequest,
    ControlCenterInitRequest,
    OutreachStrategyRequest,
    WaitlistStrategyRequest,
)

router = APIRouter(prefix="/api", tags=["tools"])


# ── Resume Roaster ─────────────────────────────────────────────────────────────

@router.post("/roast_resume")
@rate_limit("10/minute")
def roast_resume(request: Request, req: ResumeRoastRequest):
    """Brutal AI roast of a resume bullet + MBA-level rewrite — powered by Claude."""
    return roast_resume_bullet(req.bullet)


# ── Essay Evaluator ────────────────────────────────────────────────────────────

@router.post("/evaluate_essay")
@rate_limit("10/minute")
def evaluate_essay(request: Request, req: EssayEvaluationRequest):
    """Rigorous AI Essay B.S. Detector."""
    return evaluate_essay_draft(req.school_id, req.prompt, req.essay_text)


# ── Recommender Strategy ──────────────────────────────────────────────────────

@router.post("/recommender_strategy")
@rate_limit("10/minute")
def get_recommender_strategy(request: Request, req: RecommenderStrategyRequest):
    """Generates a structured prep packet for recommenders."""
    recs_list = [r.model_dump() for r in req.recommenders]
    return generate_recommender_strategy(req.school_id, req.applicant_strengths, recs_list)


# ── Interview Simulator ──────────────────────────────────────────────────────

@router.post("/interview/start")
@rate_limit("10/minute")
def start_mock_interview(request: Request, req: InterviewStartRequest):
    """Starts a fresh mock interview for a school."""
    return simulate_interview_pass(req.school_id, [], difficulty=req.difficulty, question_count=req.question_count)


@router.post("/interview/respond")
@rate_limit("20/minute")
def respond_mock_interview(request: Request, req: InterviewResponseRequest):
    """Next prompt or final feedback based on session history."""
    return simulate_interview_pass(req.school_id, req.history, difficulty=req.difficulty, question_count=req.question_count)


# ── Control Center ────────────────────────────────────────────────────────────

@router.post("/control_center/init")
def get_application_logistics(req: ControlCenterInitRequest):
    """Returns real deadlines, essay counts, and requirements for a batch of target schools."""
    import re

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


# ── Decisions (GMAT Club scraped data) ────────────────────────────────────────

from fastapi import Query
from compare_engine import load_gmatclub_data


@router.get("/decisions")
def get_decisions(
    school_id: str = None,
    status: str = None,
    round: str = None,
    year: str = None,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, le=200),
):
    """Returns GMAT Club decision tracker data with optional filters."""
    data = load_gmatclub_data()

    if school_id:
        data = [d for d in data if d.get("school_id") == school_id]
    if status:
        data = [d for d in data if status.lower() in d.get("status", "").lower()]
    if round:
        data = [d for d in data if round.lower() in d.get("round", "").lower()]
    if year:
        data = [d for d in data if d.get("year") == year]

    total = len(data)
    page = data[offset : offset + limit]

    return {
        "decisions": page,
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.get("/decisions/stats")
def get_decision_stats():
    """Aggregate stats across all scraped decisions."""
    data = load_gmatclub_data()
    from collections import Counter

    school_counts = Counter(d.get("school_id", "") for d in data)
    status_counts = Counter(d.get("status", "") for d in data)

    # Compute averages
    gmat_scores = [d.get("gmat") or d.get("gmat_focus") for d in data if d.get("gmat") or d.get("gmat_focus")]
    gpa_scores = [d["gpa"] for d in data if d.get("gpa")]

    return {
        "total_decisions": len(data),
        "schools": len(school_counts),
        "by_school": dict(school_counts.most_common()),
        "by_status": dict(status_counts.most_common()),
        "avg_gmat": round(sum(gmat_scores) / len(gmat_scores)) if gmat_scores else None,
        "avg_gpa": round(sum(gpa_scores) / len(gpa_scores), 2) if gpa_scores else None,
    }
