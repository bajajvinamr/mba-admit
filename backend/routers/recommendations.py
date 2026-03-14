"""Smart school recommendations — combines odds scoring with real outcome data."""

from fastapi import APIRouter, Query
from typing import Optional

from agents import SCHOOL_DB
from compare_engine import (
    load_gmatclub_data,
    get_decisions_for_school,
    compute_profile_fit,
)

router = APIRouter(prefix="/api", tags=["recommendations"])


def _score_school(
    sid: str,
    school: dict,
    gmat_value: int,
    gpa_normalized: float,
    modifier: int,
) -> dict:
    """Score a single school — mirrors calculate_odds logic but returns richer data."""
    school_gmat = school.get("gmat_avg")
    if school_gmat is None:
        school_gmat = 720  # fallback for CAT-primary schools when scoring

    gmat_diff = max(-80, min(30, gmat_value - school_gmat))

    accept_rate = 30.0
    try:
        accept_rate = float(school.get("acceptance_rate", 30))
    except (ValueError, TypeError):
        pass

    if accept_rate < 8:
        selectivity_penalty = -25
    elif accept_rate < 12:
        selectivity_penalty = -18
    elif accept_rate < 18:
        selectivity_penalty = -12
    elif accept_rate < 25:
        selectivity_penalty = -6
    else:
        selectivity_penalty = 0

    expected_gpa = 3.7 if accept_rate < 15 else (3.5 if accept_rate < 25 else 3.3)
    gpa_diff = gpa_normalized - expected_gpa
    gpa_modifier = int(gpa_diff * 12)

    raw_score = gmat_diff + gpa_modifier + selectivity_penalty + modifier

    if raw_score >= 8:
        base_prob = min(85, 52 + raw_score)
    elif raw_score >= -8:
        base_prob = max(20, 40 + raw_score * 2)
    else:
        base_prob = max(3, 18 + raw_score)

    final_prob = max(3, min(95, base_prob))

    if final_prob >= 60:
        tier = "Safety"
    elif final_prob >= 25:
        tier = "Target"
    else:
        tier = "Reach"

    return {"prob": final_prob, "tier": tier}


@router.get("/recommendations")
def get_recommendations(
    gmat: Optional[int] = Query(default=None, ge=200, le=800),
    gpa: Optional[float] = Query(default=None, ge=0, le=10.0),
    gpa_scale: Optional[str] = Query(default="4.0"),
    yoe: Optional[int] = Query(default=None, ge=0, le=30),
    test_type: Optional[str] = Query(default="gmat"),
    test_score: Optional[int] = Query(default=None),
    industry: Optional[str] = Query(default=None),
    undergrad_tier: Optional[str] = Query(default=None),
    limit: int = Query(default=12, ge=4, le=30),
):
    """Smart school recommendations combining odds scoring with real GMAT Club data.

    Returns top schools grouped by tier (Reach/Target/Safety) with:
    - Probability score from the odds engine
    - Real admit counts from GMAT Club data
    - Profile fit percentiles for similar applicants
    - School metadata for display
    """
    # Determine GMAT-equivalent
    tt = (test_type or "gmat").lower()
    if tt == "gre" and test_score is not None:
        gmat_value = int((test_score - 260) / 80 * 400 + 400)
        gmat_value = max(200, min(800, gmat_value))
    elif tt in ("cat", "xat") and test_score is not None:
        gmat_value = int(500 + (test_score / 100) * 300)
        gmat_value = max(200, min(800, gmat_value))
    elif tt == "waiver":
        gmat_value = 700
    else:
        gmat_value = gmat if gmat is not None else 700

    # Normalize GPA
    scale = float(gpa_scale) if gpa_scale else 4.0
    raw_gpa = gpa if gpa is not None else 3.5
    if scale == 5.0:
        gpa_normalized = max(0, min(4.0, (5.0 - raw_gpa) / 4.0 * 4.0))
    elif scale == 100:
        gpa_normalized = max(0, min(4.0, (raw_gpa - 50) / 50 * 4.0))
    elif scale == 10.0:
        gpa_normalized = max(0, min(4.0, raw_gpa / 10.0 * 4.0))
    else:
        gpa_normalized = min(4.0, raw_gpa)

    # Profile modifier
    modifier = 0
    if undergrad_tier == "top_10":
        modifier += 8
    elif undergrad_tier == "top_50":
        modifier += 4

    if industry in ("finance", "consulting"):
        modifier += 2
    elif industry == "tech":
        modifier += 3
    elif industry == "military":
        modifier += 6

    work_exp = yoe or 0
    if 3 <= work_exp <= 7:
        modifier += 3
    elif 1 <= work_exp < 3:
        modifier += 1
    elif work_exp > 7:
        modifier += 1

    # Score every school
    all_decisions = load_gmatclub_data()
    profile_dict = {}
    if gmat:
        profile_dict["gmat"] = gmat
    if gpa:
        profile_dict["gpa"] = gpa
    if yoe:
        profile_dict["yoe"] = yoe

    scored = []
    for sid, school in SCHOOL_DB.items():
        result = _score_school(sid, school, gmat_value, gpa_normalized, modifier)

        # Enrich with GMAT Club data
        decisions = get_decisions_for_school(all_decisions, sid)
        total_decisions = len(decisions)
        admit_count = sum(
            1 for d in decisions
            if any(k in d.get("status", "").lower() for k in ("admitted", "admit"))
        )

        # Profile fit from real data
        fit = compute_profile_fit(decisions, profile_dict) if profile_dict else None

        # Similar applicant count (rough match: GMAT ±30)
        similar_admits = 0
        if gmat and decisions:
            similar_admits = sum(
                1 for d in decisions
                if any(k in d.get("status", "").lower() for k in ("admitted", "admit"))
                and d.get("gmat") and abs(d["gmat"] - gmat) <= 30
            )

        scored.append({
            "school_id": sid,
            "name": school.get("name", sid),
            "location": school.get("location", "Unknown"),
            "country": school.get("country", "Unknown"),
            "gmat_avg": school.get("gmat_avg"),
            "acceptance_rate": school.get("acceptance_rate"),
            "median_salary": school.get("median_salary", "N/A"),
            "tuition_usd": school.get("tuition_usd"),
            "tuition_inr": school.get("tuition_inr"),
            "specializations": (school.get("specializations") or [])[:3],
            "primary_admission_test": school.get("primary_admission_test"),
            "stem_designated": school.get("program_details", {}).get("stem_designated", False),
            "tier": result["tier"],
            "prob": result["prob"],
            "total_decisions": total_decisions,
            "admit_count": admit_count,
            "similar_admits": similar_admits,
            "profile_fit": fit,
        })

    # Sort by probability descending within each tier group
    tier_order = {"Target": 0, "Reach": 1, "Safety": 2}
    scored.sort(key=lambda x: (tier_order.get(x["tier"], 99), -x["prob"]))

    # Pick top recommendations per tier for a balanced list
    reach = [s for s in scored if s["tier"] == "Reach"]
    target = [s for s in scored if s["tier"] == "Target"]
    safety = [s for s in scored if s["tier"] == "Safety"]

    # Balanced selection: prioritize schools with real decision data
    def rank_within_tier(schools: list[dict]) -> list[dict]:
        """Rank by: has real data > higher prob > name."""
        return sorted(
            schools,
            key=lambda s: (
                -(1 if s["total_decisions"] > 0 else 0),
                -s["prob"],
                s["name"],
            ),
        )

    reach = rank_within_tier(reach)
    target = rank_within_tier(target)
    safety = rank_within_tier(safety)

    # Build balanced recommendation list
    # 3-4 reaches (aspirational), 4-5 targets (best fit), 2-3 safeties
    reach_count = min(4, len(reach), max(3, limit // 3))
    safety_count = min(3, len(safety), max(2, limit // 4))
    target_count = min(len(target), limit - reach_count - safety_count)

    recommendations = (
        target[:target_count] + reach[:reach_count] + safety[:safety_count]
    )

    # Re-sort for display
    recommendations.sort(key=lambda x: (tier_order.get(x["tier"], 99), -x["prob"]))

    return {
        "recommendations": recommendations,
        "profile_summary": {
            "gmat": gmat_value,
            "gpa": round(gpa_normalized, 2),
            "yoe": yoe,
            "gmat_estimated": gmat is None and test_score is None,
        },
        "tier_counts": {
            "reach": len(reach),
            "target": len(target),
            "safety": len(safety),
        },
    }
