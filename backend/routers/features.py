"""Phase 6 feature endpoints — comparison, profile analysis, essay versions, community decisions."""

import logging

from fastapi import APIRouter, HTTPException, Depends, Query, Request
from typing import Dict
from agents import (
    SCHOOL_DB,
    generate_scholarship_negotiation,
    generate_sculpted_goal,
    generate_storyteller_reply,
)
from auth import get_current_user, get_optional_user
from middleware import rate_limit
from models import (
    CompareSchoolsRequest,
    ProfileAnalysisRequest,
    SaveEssayVersionRequest,
    SubmitDecisionRequest,
    NegotiateScholarshipRequest,
    SculptGoalRequest,
    StorytellerRequest,
)
from compare_engine import load_gmatclub_data, compute_school_outcomes, compute_profile_fit, get_decisions_for_school
from run_evals import run_eval_pipeline
import db

router = APIRouter(prefix="/api", tags=["features"])


# ── School Comparison ────────────────────────────────────────────────────────

@router.post("/schools/compare")
def compare_schools(req: CompareSchoolsRequest):
    """Side-by-side comparison of 2-4 schools with outcome data and profile fit."""
    all_decisions = load_gmatclub_data()
    schools = []

    for sid in req.school_ids:
        school = SCHOOL_DB.get(sid)
        if not school:
            continue

        # Filter decisions for this school (handles ID mapping, e.g. "booth" → "chicago_booth")
        school_decisions = get_decisions_for_school(all_decisions, sid)

        # Compute outcomes from GMAT Club data
        outcomes = compute_school_outcomes(school_decisions) if school_decisions else None

        # Compute profile fit if user provided profile
        profile_fit = compute_profile_fit(school_decisions, req.profile) if school_decisions else None

        # Static data from school DB
        static = {
            "tuition_usd": school.get("tuition_usd"),
            "class_size": school.get("class_size"),
            "acceptance_rate": school.get("acceptance_rate"),
            "median_salary": school.get("median_salary"),
            "gmat_avg": school.get("gmat_avg"),
            "stem_designated": school.get("program_details", {}).get("stem_designated"),
            "program_duration": school.get("program_details", {}).get("duration"),
            "international_pct": school.get("program_details", {}).get("international_percentage"),
            "employment_rate": school.get("placement_stats", {}).get("employment_rate_3_months"),
            "specializations": school.get("specializations", []),
            "essay_count": len(school.get("essay_prompts", [])),
            "deadlines": school.get("admission_deadlines", []),
        }

        schools.append({
            "school_id": sid,
            "name": school.get("name"),
            "location": school.get("location", ""),
            "static": static,
            "outcomes": outcomes,
            "profile_fit": profile_fit,
        })

    if len(schools) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 valid school IDs")

    return {"schools": schools}


# ── Profile Strength Report ──────────────────────────────────────────────────

@router.post("/profile/analyze")
@rate_limit("10/minute")
def analyze_profile(request: Request, req: ProfileAnalysisRequest):
    """Compute a profile strength spider chart across 6 dimensions."""
    # Academics (GMAT + GPA weighted)
    gmat_pct = min(100, max(0, (req.gmat - 200) / 600 * 100))
    # Normalize GPA to 0-100 regardless of scale
    gpa_scale = float(req.gpa_scale) if req.gpa_scale else 4.0
    if gpa_scale == 5.0:
        # German system: 1.0 is best, 5.0 is worst — invert
        gpa_pct = min(100, max(0, (5.0 - req.gpa) / 4.0 * 100))
    else:
        gpa_pct = min(100, max(0, req.gpa / gpa_scale * 100))
    academics = int(gmat_pct * 0.6 + gpa_pct * 0.4)

    # Work experience
    exp_score = min(100, req.years_experience * 15)
    if req.industry in ("consulting", "finance", "tech"):
        exp_score = min(100, exp_score + 15)
    work_experience = int(exp_score)

    # Leadership
    leadership = 30
    if req.leadership_roles == "cxo":
        leadership = 90
    elif req.leadership_roles == "manager":
        leadership = 70
    elif req.leadership_roles == "team_lead":
        leadership = 55

    # Diversity / unique factors
    diversity = 30
    if req.intl_experience:
        diversity += 25
    if req.community_service:
        diversity += 20
    if req.industry in ("military", "nonprofit", "government"):
        diversity += 25
    diversity = min(100, diversity)

    # Extracurriculars
    extracurriculars = 40
    if req.community_service:
        extracurriculars += 30
    if req.intl_experience:
        extracurriculars += 15
    extracurriculars = min(100, extracurriculars)

    # Undergrad pedigree
    pedigree = 40
    if req.undergrad_tier == "top_10":
        pedigree = 90
    elif req.undergrad_tier == "top_50":
        pedigree = 70
    elif req.undergrad_tier == "top_100":
        pedigree = 55

    dimensions = {
        "academics": academics,
        "work_experience": work_experience,
        "leadership": leadership,
        "diversity": diversity,
        "extracurriculars": extracurriculars,
        "pedigree": pedigree,
    }
    overall = int(sum(dimensions.values()) / len(dimensions))

    # Per-school fit scores
    school_fits = []
    target_ids = req.target_school_ids or list(SCHOOL_DB.keys())[:10]
    for sid in target_ids:
        school = SCHOOL_DB.get(sid)
        if not school:
            continue
        gmat_diff = req.gmat - school.get("gmat_avg", 720)
        fit = max(10, min(95, 50 + gmat_diff + (overall - 50) // 3))
        school_fits.append({
            "school_id": sid,
            "school_name": school["name"],
            "fit_score": fit,
            "strongest": max(dimensions, key=dimensions.get),
            "weakest": min(dimensions, key=dimensions.get),
        })

    school_fits.sort(key=lambda x: x["fit_score"], reverse=True)

    return {
        "dimensions": dimensions,
        "overall": overall,
        "school_fits": school_fits,
    }


# ── Essay Versioning ─────────────────────────────────────────────────────────

@router.get("/essays/{session_id}/{school_id}/{prompt_index}/versions")
def get_essay_versions(session_id: str, school_id: str, prompt_index: int):
    """Get all versions of a specific essay."""
    versions = db.get_essay_versions(session_id, school_id, prompt_index)
    return {"versions": versions}


@router.post("/essays/{session_id}/{school_id}/{prompt_index}/versions")
def save_essay_version(
    session_id: str,
    school_id: str,
    prompt_index: int,
    req: SaveEssayVersionRequest,
):
    """Save a new version of an essay."""
    version = db.save_essay_version(
        session_id=session_id,
        school_id=school_id,
        prompt_index=prompt_index,
        content=req.content,
        source=req.source,
    )
    return version


# ── Community Decisions ──────────────────────────────────────────────────────

@router.post("/community/decisions")
def submit_community_decision(req: SubmitDecisionRequest, user: Dict = Depends(get_optional_user)):
    """Submit an admission decision to the community tracker."""
    decision = {
        "user_id": user["sub"] if user else "anonymous",
        "school_id": req.school_id,
        "round": req.round,
        "status": req.status,
        "gmat": req.gmat,
        "gpa": req.gpa,
        "work_years": req.work_years,
        "industry": req.industry,
        "is_anonymous": req.is_anonymous,
    }
    return db.submit_decision(decision)


@router.get("/community/decisions")
def list_community_decisions(
    school_id: str = None,
    status: str = None,
    limit: int = Query(default=50, le=200),
):
    """Get community-submitted decisions with optional filters."""
    decisions = db.get_community_decisions(school_id=school_id, status=status, limit=limit)
    return {"decisions": decisions}


# ── Scholarship Negotiator (Phase 21) ─────────────────────────────────────────

@router.post("/negotiate_scholarship")
@rate_limit("10/minute")
def negotiate_scholarship(request: Request, req: NegotiateScholarshipRequest):
    """Draft a professional scholarship negotiation letter built on competing offers."""
    return generate_scholarship_negotiation(
        primary_school_id=req.primary_school_id,
        primary_offer=req.primary_offer,
        competing_school_id=req.competing_school_id,
        competing_offer=req.competing_offer,
    )

# ── CTO Eval Dashboard (Phase 22) ─────────────────────────────────────────────

@router.post("/eval/run")
@rate_limit("10/minute")
def run_evals(request: Request):
    """Trigger the LLM Judge evaluation pipeline and return the statistical results."""
    try:
        results = run_eval_pipeline()
        return {"status": "success", "data": results}
    except Exception as e:
        logging.error(f"Error running evaluations: {e}")
        raise HTTPException(status_code=500, detail="Evaluation pipeline failed.")


# ── Career Goal Sculptor (Phase 23) ───────────────────────────────────────────

@router.post("/goals/sculpt")
@rate_limit("10/minute")
def sculpt_career_goal(request: Request, req: SculptGoalRequest):
    """Transform a vague career goal into a highly specific, AdCom-ready narrative."""
    return generate_sculpted_goal(
        current_role=req.current_role,
        industry=req.industry,
        vague_goal=req.vague_goal,
        target_school_id=req.target_school_id
    )


# ── Master Storyteller (Phase 24) ─────────────────────────────────────────────

@router.post("/essays/storyteller")
@rate_limit("10/minute")
def storyteller_chat(request: Request, req: StorytellerRequest):
    """Interactive multi-turn chat to ideate essay narratives."""
    return generate_storyteller_reply(
        school_name=req.school_name,
        essay_prompt=req.essay_prompt,
        chat_history=req.chat_history,
        new_message=req.new_message
    )
