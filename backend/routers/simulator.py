"""Admit Simulator (Monte Carlo) + GMAT Study Planner.

Monte Carlo simulator runs 10,000 admission simulations per school, modeling
each application component as a stochastic factor. Returns probability
distributions with percentile bands — much richer than a single odds number.

GMAT Study Planner generates a week-by-week study plan based on current score,
target score, and available study time.
"""

import math
import random
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from agents import SCHOOL_DB

router = APIRouter(prefix="/api", tags=["simulator"])

# ── Monte Carlo Admit Simulator ──────────────────────────────────────────────

NUM_SIMULATIONS = 10_000
RANDOM_SEED_BASE = 42  # reproducible for same inputs


class SimulatorRequest(BaseModel):
    gmat: Optional[int] = Field(default=None, ge=200, le=800)
    gpa: float = Field(ge=0, le=10.0)
    gpa_scale: Optional[str] = Field(default="4.0")
    work_exp_years: Optional[int] = Field(default=None, ge=0, le=30)
    school_ids: list[str] = Field(default=[], description="Schools to simulate (max 10). Empty = top 10 schools.")
    undergrad_tier: Optional[str] = None
    industry: Optional[str] = None
    leadership_roles: Optional[str] = None
    intl_experience: bool = False
    community_service: bool = False
    num_simulations: int = Field(default=10_000, ge=1000, le=50_000)


def _normalize_gpa(gpa: float, scale: str) -> float:
    """Normalize GPA to 4.0 scale."""
    s = float(scale) if scale else 4.0
    if s == 5.0:
        return max(0, min(4.0, (5.0 - gpa) / 4.0 * 4.0))
    elif s == 100:
        return max(0, min(4.0, (gpa - 50) / 50 * 4.0))
    elif s == 10.0:
        return max(0, min(4.0, gpa / 10.0 * 4.0))
    return min(4.0, gpa)


def _profile_modifier(req: SimulatorRequest) -> float:
    """Compute a profile strength modifier (0-1 scale)."""
    mod = 0.0

    # Undergrad tier
    if req.undergrad_tier == "top_10":
        mod += 0.08
    elif req.undergrad_tier == "top_50":
        mod += 0.04

    # Industry
    if req.industry in ("consulting", "finance"):
        mod += 0.03
    elif req.industry == "tech":
        mod += 0.04
    elif req.industry == "military":
        mod += 0.06

    # Leadership
    if req.leadership_roles in ("cxo", "manager"):
        mod += 0.05
    elif req.leadership_roles == "team_lead":
        mod += 0.03

    # Other factors
    if req.intl_experience:
        mod += 0.03
    if req.community_service:
        mod += 0.02

    # Work experience sweet spot
    yoe = req.work_exp_years or 0
    if 3 <= yoe <= 6:
        mod += 0.04
    elif 2 <= yoe < 3 or 6 < yoe <= 8:
        mod += 0.02

    return min(0.30, mod)


def _simulate_school(
    school_id: str,
    school: dict,
    gmat_value: int,
    gpa_norm: float,
    profile_mod: float,
    n_sims: int,
    rng: random.Random,
) -> dict:
    """Run Monte Carlo admission simulation for a single school.

    Models admission as a stochastic process where each factor contributes
    a score drawn from a distribution centered on the applicant's strength
    relative to the school's profile.
    """
    school_gmat = school.get("gmat_avg") or 720
    accept_rate_raw = school.get("acceptance_rate")
    try:
        accept_rate = float(accept_rate_raw) if accept_rate_raw is not None else 30.0
    except (ValueError, TypeError):
        accept_rate = 30.0

    # Base admission threshold — lower acceptance rate = higher bar
    # This determines the "pass" threshold in each simulation
    if accept_rate < 8:
        threshold = 0.72
    elif accept_rate < 12:
        threshold = 0.65
    elif accept_rate < 18:
        threshold = 0.58
    elif accept_rate < 25:
        threshold = 0.50
    else:
        threshold = 0.42

    # GMAT factor: how far above/below school avg, normalized
    gmat_diff = (gmat_value - school_gmat) / 100.0  # per 100 points
    gmat_base = 0.5 + gmat_diff * 0.25  # center at 0.5, ±0.25 per 100

    # GPA factor
    expected_gpa = 3.6 if accept_rate < 15 else (3.4 if accept_rate < 25 else 3.2)
    gpa_diff = gpa_norm - expected_gpa
    gpa_base = 0.5 + gpa_diff * 0.15

    # Profile factor
    profile_base = 0.4 + profile_mod

    # Run simulations
    admits = 0
    scores: list[float] = []

    for _ in range(n_sims):
        # Each factor is drawn from a normal distribution centered on the base
        # This models the inherent randomness in admissions
        gmat_score = rng.gauss(gmat_base, 0.12)
        gpa_score = rng.gauss(gpa_base, 0.10)
        profile_score = rng.gauss(profile_base, 0.15)

        # "Holistic review" factor — random element modeling essays, interview, fit
        holistic = rng.gauss(0.5, 0.18)

        # Weighted composite
        composite = (
            gmat_score * 0.30
            + gpa_score * 0.20
            + profile_score * 0.25
            + holistic * 0.25
        )
        composite = max(0, min(1, composite))
        scores.append(composite)

        if composite >= threshold:
            admits += 1

    admit_rate = admits / n_sims
    scores.sort()

    # Percentile bands
    def pct(p: float) -> float:
        idx = int(p / 100 * len(scores))
        idx = min(idx, len(scores) - 1)
        return round(scores[idx], 4)

    # Classify outcome
    if admit_rate >= 0.60:
        outcome = "likely"
        emoji_label = "Strong"
    elif admit_rate >= 0.35:
        outcome = "competitive"
        emoji_label = "Competitive"
    elif admit_rate >= 0.15:
        outcome = "possible"
        emoji_label = "Possible"
    else:
        outcome = "unlikely"
        emoji_label = "Reach"

    return {
        "school_id": school_id,
        "school_name": school.get("name", school_id),
        "admit_probability": round(admit_rate * 100, 1),
        "outcome": outcome,
        "outcome_label": emoji_label,
        "simulations_run": n_sims,
        "percentiles": {
            "p10": pct(10),
            "p25": pct(25),
            "p50": pct(50),
            "p75": pct(75),
            "p90": pct(90),
        },
        "factors": {
            "gmat_strength": round(max(0, min(100, gmat_base * 100)), 1),
            "gpa_strength": round(max(0, min(100, gpa_base * 100)), 1),
            "profile_strength": round(max(0, min(100, profile_base * 100)), 1),
        },
        "school_stats": {
            "gmat_avg": school_gmat,
            "acceptance_rate": accept_rate,
        },
    }


@router.post("/admit-simulator")
def admit_simulator(req: SimulatorRequest):
    """Monte Carlo admission simulator — run thousands of simulations per school.

    Returns probability distributions with percentile bands, factor strengths,
    and scenario analysis. Much richer than a single odds number.
    """
    # Resolve GMAT value
    gmat_value = req.gmat if req.gmat is not None else 700

    # Normalize GPA
    gpa_norm = _normalize_gpa(req.gpa, req.gpa_scale)

    # Profile modifier
    profile_mod = _profile_modifier(req)

    # Determine schools to simulate
    school_ids = req.school_ids
    if not school_ids:
        # Default: top 10 real schools by selectivity
        real_schools = [
            (sid, s) for sid, s in SCHOOL_DB.items()
            if len(sid) <= 20 and s.get("gmat_avg")
        ]
        real_schools.sort(key=lambda x: x[1].get("acceptance_rate") or 50)
        school_ids = [sid for sid, _ in real_schools[:10]]

    if len(school_ids) > 10:
        raise HTTPException(400, "Maximum 10 schools per simulation")

    n_sims = min(req.num_simulations, 50_000)

    # Seed RNG for reproducibility with same inputs
    seed = hash((gmat_value, int(gpa_norm * 100), req.work_exp_years or 0)) % (2**31)
    rng = random.Random(seed)

    results = []
    for sid in school_ids:
        school = SCHOOL_DB.get(sid)
        if not school:
            continue
        sim = _simulate_school(sid, school, gmat_value, gpa_norm, profile_mod, n_sims, rng)
        results.append(sim)

    # Sort by admit probability descending
    results.sort(key=lambda x: -x["admit_probability"])

    # Scenario summary
    likely = [r for r in results if r["outcome"] == "likely"]
    competitive = [r for r in results if r["outcome"] == "competitive"]
    possible = [r for r in results if r["outcome"] == "possible"]
    unlikely = [r for r in results if r["outcome"] == "unlikely"]

    # Best and worst case
    best_case = results[0]["school_name"] if results else None
    worst_case = results[-1]["school_name"] if results else None

    return {
        "results": results,
        "summary": {
            "total_schools": len(results),
            "likely": len(likely),
            "competitive": len(competitive),
            "possible": len(possible),
            "unlikely": len(unlikely),
            "best_odds": results[0] if results else None,
            "worst_odds": results[-1] if results else None,
        },
        "profile_used": {
            "gmat": gmat_value,
            "gpa": round(gpa_norm, 2),
            "work_exp_years": req.work_exp_years,
            "profile_modifier": round(profile_mod, 3),
        },
        "methodology": "Monte Carlo simulation with stochastic modeling of GMAT, GPA, profile, and holistic review factors.",
    }


# ── GMAT Study Planner ──────────────────────────────────────────────────────


class StudyPlanRequest(BaseModel):
    current_score: int = Field(ge=200, le=800, description="Current or most recent practice score")
    target_score: int = Field(ge=200, le=800, description="Target GMAT score")
    weeks_available: int = Field(ge=1, le=52, description="Weeks until test date")
    hours_per_week: int = Field(ge=1, le=40, description="Study hours available per week")
    weak_areas: list[str] = Field(
        default=[],
        description="Weak areas: quant, verbal, data_insights, reading_comprehension, critical_reasoning, sentence_correction",
    )


# Study topic weights and descriptions
_STUDY_TOPICS = {
    "quant": {
        "display": "Quantitative Reasoning",
        "subtopics": ["Arithmetic & Number Properties", "Algebra & Equations", "Geometry", "Word Problems", "Data Sufficiency Strategy"],
        "score_impact": 0.45,
        "typical_hours": 60,
    },
    "verbal": {
        "display": "Verbal Reasoning",
        "subtopics": ["Reading Comprehension", "Critical Reasoning", "Sentence Correction"],
        "score_impact": 0.35,
        "typical_hours": 50,
    },
    "data_insights": {
        "display": "Data Insights",
        "subtopics": ["Multi-Source Reasoning", "Table Analysis", "Graphics Interpretation", "Two-Part Analysis", "Data Sufficiency"],
        "score_impact": 0.20,
        "typical_hours": 30,
    },
}

_SCORE_MILESTONES = [
    (760, "M7 competitive — top 4% of test takers"),
    (740, "T15 competitive — top 6% of test takers"),
    (720, "T25 competitive — top 10% of test takers"),
    (700, "Strong baseline — competitive at most programs"),
    (680, "Solid foundation — above average"),
    (650, "Average range — room for improvement"),
    (600, "Below average — significant improvement needed"),
]


def _score_gap_analysis(current: int, target: int) -> dict:
    """Analyze the score gap and estimated effort."""
    gap = target - current
    if gap <= 0:
        return {
            "gap": 0,
            "difficulty": "at_target",
            "message": "You've already reached your target score!",
            "estimated_hours": 0,
        }

    # Approximate hours needed per 10-point improvement
    # Gets harder as you go higher (diminishing returns)
    if current >= 700:
        hours_per_10 = 15  # hardest at the top
    elif current >= 650:
        hours_per_10 = 10
    elif current >= 600:
        hours_per_10 = 8
    else:
        hours_per_10 = 6  # easiest gains at lower scores

    estimated_hours = int((gap / 10) * hours_per_10)

    if gap <= 20:
        difficulty = "achievable"
    elif gap <= 50:
        difficulty = "moderate"
    elif gap <= 80:
        difficulty = "challenging"
    else:
        difficulty = "ambitious"

    return {
        "gap": gap,
        "difficulty": difficulty,
        "message": f"{gap}-point improvement needed — {difficulty} with focused preparation",
        "estimated_hours": estimated_hours,
    }


def _generate_weekly_plan(
    weeks: int,
    hours_per_week: int,
    weak_areas: list[str],
    gap: int,
) -> list[dict]:
    """Generate a week-by-week study plan."""
    total_hours = weeks * hours_per_week
    plan: list[dict] = []

    # Determine topic allocation
    # Default split: 45% quant, 35% verbal, 20% data insights
    alloc = {"quant": 0.45, "verbal": 0.35, "data_insights": 0.20}

    # Shift allocation toward weak areas
    if weak_areas:
        boost = 0.10 / len(weak_areas)
        for area in weak_areas:
            base_area = area.lower().replace(" ", "_")
            if base_area in ("reading_comprehension", "critical_reasoning", "sentence_correction"):
                base_area = "verbal"
            if base_area in alloc:
                alloc[base_area] = min(0.60, alloc[base_area] + boost)
        # Renormalize
        total_alloc = sum(alloc.values())
        alloc = {k: v / total_alloc for k, v in alloc.items()}

    # Build week-by-week plan
    for week_num in range(1, weeks + 1):
        progress_pct = week_num / weeks

        # Phase: Foundation → Practice → Review → Test Day
        if progress_pct <= 0.30:
            phase = "Foundation"
            focus = "Learn concepts and build fundamentals"
        elif progress_pct <= 0.65:
            phase = "Practice"
            focus = "Apply concepts with timed practice problems"
        elif progress_pct <= 0.85:
            phase = "Review"
            focus = "Full-length practice tests and error analysis"
        else:
            phase = "Test Day Prep"
            focus = "Light review, timing strategy, rest"

        # Hours per topic this week
        week_topics = {}
        for topic, pct in alloc.items():
            topic_info = _STUDY_TOPICS[topic]
            hours = round(hours_per_week * pct, 1)

            # Adjust subtopic focus by phase
            if phase == "Foundation":
                activity = f"Study: {', '.join(topic_info['subtopics'][:2])}"
            elif phase == "Practice":
                activity = f"Timed practice: {', '.join(topic_info['subtopics'][:3])}"
            elif phase == "Review":
                activity = f"Error review + full sections: {topic_info['display']}"
            else:
                activity = f"Light refresh: {topic_info['display']} key formulas"

            week_topics[topic] = {
                "hours": hours,
                "activity": activity,
            }

        # Practice test schedule
        practice_test = None
        if phase == "Practice" and week_num % 2 == 0:
            practice_test = "Take a full-length practice test (3.5 hours)"
        elif phase == "Review":
            practice_test = "Full practice test + detailed error analysis"
        elif phase == "Test Day Prep" and week_num == weeks:
            practice_test = "Final practice test (if 3+ days before real test) or rest"

        plan.append({
            "week": week_num,
            "phase": phase,
            "focus": focus,
            "hours": hours_per_week,
            "topics": week_topics,
            "practice_test": practice_test,
        })

    return plan


@router.post("/gmat-study-plan")
def create_study_plan(req: StudyPlanRequest):
    """Generate a personalized, week-by-week GMAT study plan.

    Analyzes score gap, allocates study time across topics (with extra
    weight on weak areas), and phases the plan through Foundation →
    Practice → Review → Test Day Prep.
    """
    gap_analysis = _score_gap_analysis(req.current_score, req.target_score)

    total_hours = req.weeks_available * req.hours_per_week

    # Feasibility check
    feasibility = "on_track"
    feasibility_message = "Your plan has enough hours to reach your target."
    if gap_analysis["estimated_hours"] > total_hours * 1.5:
        feasibility = "aggressive"
        feasibility_message = (
            f"Your target requires ~{gap_analysis['estimated_hours']} hours but you have "
            f"{total_hours} hours planned. Consider extending your timeline or increasing study hours."
        )
    elif gap_analysis["estimated_hours"] > total_hours:
        feasibility = "tight"
        feasibility_message = (
            f"Tight but achievable — you'll need to maximize every study session. "
            f"Focus on high-impact areas."
        )

    # Weekly plan
    weekly_plan = _generate_weekly_plan(
        req.weeks_available,
        req.hours_per_week,
        req.weak_areas,
        gap_analysis["gap"],
    )

    # Resources
    resources = [
        {"name": "GMAT Official Practice Exams", "type": "practice_tests", "priority": "essential"},
        {"name": "GMAT Official Guide", "type": "problem_sets", "priority": "essential"},
        {"name": "Manhattan Prep Complete Strategy Guide Set", "type": "textbook", "priority": "recommended"},
        {"name": "TTP (Target Test Prep)", "type": "online_course", "priority": "recommended"},
        {"name": "GMAT Club Question Bank", "type": "practice_problems", "priority": "supplementary"},
    ]

    # Score milestones
    milestones = []
    for score, desc in _SCORE_MILESTONES:
        if req.current_score <= score <= req.target_score:
            milestones.append({"score": score, "description": desc})

    # Target school alignment
    target_schools = []
    m7_schools = ["hbs", "gsb", "wharton", "booth", "kellogg", "cbs", "sloan"]
    for sid in m7_schools:
        school = SCHOOL_DB.get(sid)
        if school:
            avg = school.get("gmat_avg") or 720
            delta = req.target_score - avg
            target_schools.append({
                "school_id": sid,
                "school_name": school.get("name", sid),
                "gmat_avg": avg,
                "target_delta": delta,
                "assessment": (
                    "Above average" if delta >= 10
                    else "At average" if delta >= -10
                    else "Below average"
                ),
            })

    return {
        "gap_analysis": gap_analysis,
        "feasibility": feasibility,
        "feasibility_message": feasibility_message,
        "plan_summary": {
            "current_score": req.current_score,
            "target_score": req.target_score,
            "weeks": req.weeks_available,
            "hours_per_week": req.hours_per_week,
            "total_hours": total_hours,
            "weak_areas": req.weak_areas,
        },
        "weekly_plan": weekly_plan,
        "milestones": milestones,
        "target_schools": target_schools,
        "resources": resources,
    }
