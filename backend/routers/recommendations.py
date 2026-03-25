"""Smart school recommendations — combines odds scoring with real outcome data."""

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Literal

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


def _generate_fit_reason(
    tier: str,
    prob: int,
    fit: dict | None,
    similar_admits: int,
    total_decisions: int,
    school: dict,
    gmat_value: int,
    gpa_normalized: float,
) -> str:
    """Generate a concise, data-driven fit reason (no LLM needed)."""
    school_gmat = school.get("gmat_avg")

    # Priority 1: Strong social proof from similar admits
    if similar_admits >= 50:
        return f"{similar_admits} applicants with your stats were admitted"
    if similar_admits >= 20:
        return f"{similar_admits} similar profiles got in — solid match"

    # Priority 2: GMAT/CAT comparison when we have school data
    degree = school.get("degree_type", "MBA")
    if school_gmat and gmat_value:
        diff = gmat_value - school_gmat
        test_label = "CAT score" if degree == "MBA (CAT)" else "GMAT"
        avg_label = f"their {school_gmat} average" if degree != "MBA (CAT)" else f"their class profile"
        if diff >= 20:
            return f"Your {test_label} is {diff} points above {avg_label}"
        if diff >= 0:
            return f"Your {test_label} matches {avg_label} — competitive"
        if diff >= -15:
            return f"Your {test_label} is close to {avg_label} — within range"
        if tier == "Reach":
            return f"{avg_label.capitalize()} is above yours — strong story needed"

    # Priority 3: Percentile-based from profile fit
    if fit:
        gmat_pct = fit.get("gmat_percentile", 50)
        if gmat_pct >= 70:
            return f"Your stats rank in the top {100 - gmat_pct}% of admitted applicants"
        if gmat_pct >= 40:
            return "Your profile is competitive with recent admits"

    # Priority 4: Tier-based fallback
    if tier == "Safety":
        return "Strong profile match — high confidence"
    if tier == "Target":
        return "Good alignment with admitted class profile"
    return "Aspirational — differentiation will be key"


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
    degree_type: Optional[str] = Query(default=None),
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

    # Determine which degree types to include
    # If explicit degree_type filter, use it. Otherwise infer from test_type.
    allowed_types: set[str] | None = None
    if degree_type:
        allowed_types = {degree_type}
    elif tt in ("cat", "xat"):
        allowed_types = {"MBA (CAT)"}
    elif tt in ("gmat", "gre"):
        # GMAT/GRE users shouldn't see CAT-only programs by default
        allowed_types = {"MBA", "MiM", "Executive MBA", "Master of Finance"}

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
        # Apply degree type filter
        if allowed_types and school.get("degree_type", "MBA") not in allowed_types:
            continue
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

        # Generate a concise fit reason from available data
        fit_reason = _generate_fit_reason(
            result["tier"], result["prob"], fit, similar_admits,
            total_decisions, school, gmat_value, gpa_normalized,
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
            "degree_type": school.get("degree_type", "MBA"),
            "stem_designated": school.get("program_details", {}).get("stem_designated", False),
            "tier": result["tier"],
            "prob": result["prob"],
            "total_decisions": total_decisions,
            "admit_count": admit_count,
            "similar_admits": similar_admits,
            "profile_fit": fit,
            "fit_reason": fit_reason,
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


# ── Personalized Recommendation Engine ──────────────────────────────────────


class PersonalizedRecommendationRequest(BaseModel):
    gmat: int = Field(ge=200, le=805)
    gmat_version: Literal["focus", "classic"] = "focus"
    gpa: float = Field(ge=0.0, le=4.0)
    work_years: int = Field(ge=0, le=30)
    industry: str = ""
    target_industry: str = ""
    is_urm: bool = False
    is_international: bool = False
    citizenship: str = ""
    budget_max_usd: Optional[float] = None
    priorities: List[str] = Field(default_factory=list)
    preferred_countries: List[str] = Field(default_factory=list)


# Priority keywords → school fields that signal strength in that area
_PRIORITY_SIGNALS = {
    "career_outcomes": ["placement_stats"],
    "prestige": ["acceptance_rate"],
    "location": ["location"],
    "roi": ["tuition_usd", "median_salary"],
    "entrepreneurship": ["specializations"],
    "diversity": ["class_profile"],
    "international": ["class_profile"],
    "network": ["class_size"],
}


def _normalize_country(raw: str) -> str:
    """Map common country codes/abbreviations to SCHOOL_DB country strings."""
    mapping = {
        "US": "United States", "USA": "United States",
        "UK": "United Kingdom", "GB": "United Kingdom",
        "CA": "Canada", "AU": "Australia",
        "FR": "France", "DE": "Germany",
        "SG": "Singapore", "HK": "Hong Kong",
        "CN": "China", "IN": "India",
        "ES": "Spain", "IT": "Italy",
        "CH": "Switzerland", "NL": "Netherlands",
        "JP": "Japan", "KR": "South Korea",
        "AE": "UAE", "IE": "Ireland",
    }
    return mapping.get(raw.upper(), raw)


def _compute_fit_score(
    school: dict,
    gmat_classic: int,
    gpa: float,
    work_years: int,
    industry: str,
    target_industry: str,
    is_international: bool,
    priorities: list[str],
) -> int:
    """Compute a 0-100 fit score for a single school against the applicant profile.

    Scoring bands: ±30pts from GMAT median = 50, +60 = 90, -60 = 10.
    """
    components: list[float] = []
    weights: list[float] = []

    # ── GMAT fit (weight=0.35): ±30pts from median = 50, +60 = 90, -60 = 10 ──
    school_gmat = school.get("gmat_avg")
    if school_gmat:
        gmat_diff = gmat_classic - school_gmat
        # Steeper curve: each 30pts diff = 40 score points
        gmat_score = 50 + (gmat_diff / 30) * 40
        gmat_score = max(5, min(95, gmat_score))
        components.append(gmat_score)
        weights.append(0.35)

    # ── GPA fit (weight=0.20): similar curve around school's avg ──
    school_gpa = school.get("gpa_avg")
    if not school_gpa:
        accept = _safe_float(school.get("acceptance_rate"), 30)
        school_gpa = 3.7 if accept < 15 else (3.5 if accept < 25 else 3.3)
    gpa_diff = gpa - school_gpa
    gpa_score = 50 + (gpa_diff / 0.5) * 30  # each 0.5 GPA = ±30 points
    gpa_score = max(5, min(95, gpa_score))
    components.append(gpa_score)
    weights.append(0.20)

    # ── Selectivity adjustment (weight=0.20): harder schools drag score down ──
    accept_rate = _safe_float(school.get("acceptance_rate"), 30)
    if accept_rate < 8:
        selectivity_score = 10
    elif accept_rate < 12:
        selectivity_score = 20
    elif accept_rate < 18:
        selectivity_score = 35
    elif accept_rate < 25:
        selectivity_score = 50
    elif accept_rate < 40:
        selectivity_score = 65
    else:
        selectivity_score = 80
    components.append(selectivity_score)
    weights.append(0.20)

    # ── Work years fit (weight=0.10): penalize if <2 or >10 vs school avg ──
    cp = school.get("class_profile") or {}
    school_avg_yoe = cp.get("avg_work_experience_years")
    if school_avg_yoe is None:
        school_avg_yoe = 5
    yoe_diff = abs(work_years - school_avg_yoe)
    if yoe_diff <= 1:
        yoe_score = 70
    elif yoe_diff <= 3:
        yoe_score = 55
    elif yoe_diff <= 5:
        yoe_score = 35
    else:
        yoe_score = 15
    components.append(yoe_score)
    weights.append(0.10)

    # ── Industry alignment (weight=0.10) ──
    industry_score = 50
    if industry:
        high_value = {"consulting", "finance", "tech", "military", "nonprofit"}
        if industry.lower() in high_value:
            industry_score = 65
        if accept_rate < 15 and industry.lower() in ("consulting", "finance", "tech"):
            industry_score = 60  # these are common at top schools, less differentiating
    components.append(industry_score)
    weights.append(0.10)

    # Compute weighted average
    total_weight = sum(weights)
    score = sum(c * w for c, w in zip(components, weights)) / total_weight if total_weight > 0 else 50

    # ── International penalty: slight penalty at schools with <20% international ──
    if is_international:
        intl_pct = cp.get("international_pct")
        if intl_pct is not None and intl_pct < 20:
            score -= 5

    # ── Priority boost: +8 for schools strong in user's priority areas (max 2) ──
    priority_boosts = 0
    for priority in priorities:
        if priority_boosts >= 2:
            break
        if _school_matches_priority(school, priority, target_industry):
            score += 8
            priority_boosts += 1

    return max(0, min(100, int(round(score))))


def _safe_float(val, default: float) -> float:
    """Safely convert to float."""
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _school_matches_priority(school: dict, priority: str, target_industry: str) -> bool:
    """Check if a school is strong in the given priority area."""
    p = priority.lower()

    if p == "career_outcomes":
        ps = school.get("placement_stats", {})
        rate = ps.get("employment_rate_3mo_pct")
        if rate and rate >= 90:
            return True
        return False

    if p == "prestige":
        accept = _safe_float(school.get("acceptance_rate"), 50)
        return accept < 20

    if p == "roi":
        tuition = _safe_float(school.get("tuition_usd"), 999999)
        return tuition < 60000

    if p == "entrepreneurship":
        specs = school.get("specializations", [])
        return any("entrepreneur" in s.lower() for s in specs)

    if p == "diversity" or p == "international":
        cp = school.get("class_profile", {})
        intl = cp.get("international_pct")
        if intl and intl >= 30:
            return True
        women = cp.get("women_pct")
        if women and women >= 40:
            return True
        return False

    if p == "location":
        # A school in a major metro is considered strong for location priority
        loc = (school.get("location") or "").lower()
        major_cities = ["new york", "london", "san francisco", "boston", "chicago",
                        "singapore", "paris", "hong kong", "los angeles", "toronto"]
        return any(city in loc for city in major_cities)

    if p == "network":
        cs = school.get("class_size")
        if cs and cs >= 500:
            return True
        return False

    return False


def _generate_personalized_why(
    school: dict,
    fit_score: int,
    gmat_classic: int,
    gpa: float,
    work_years: int,
    industry: str,
    target_industry: str,
) -> str:
    """Generate a concise 'why' explanation for a school recommendation."""
    school_gmat = school.get("gmat_avg")
    name = school.get("name", "This school")
    parts = []

    # GMAT context
    if school_gmat:
        diff = gmat_classic - school_gmat
        if diff >= 20:
            parts.append(f"Your GMAT exceeds median by {diff}pts. Merit scholarship likely.")
        elif diff >= 0:
            parts.append(f"Your GMAT matches the {school_gmat} median. Competitive applicant.")
        elif diff >= -20:
            parts.append(f"Your GMAT is {abs(diff)}pts below median ({school_gmat}). Within range with strong profile.")
        else:
            parts.append(f"Your GMAT is below median ({school_gmat}). Strong work experience compensates.")

    # GPA context
    school_gpa = school.get("gpa_avg")
    if school_gpa:
        gpa_diff = gpa - school_gpa
        if gpa_diff >= 0.15:
            parts.append(f"GPA above class average ({school_gpa}).")
        elif gpa_diff < -0.2:
            parts.append(f"GPA below class average ({school_gpa}) — offset with strong narrative.")

    # Industry pipeline
    if target_industry and industry:
        specs = [s.lower() for s in (school.get("specializations") or [])]
        ps = school.get("placement_stats", {})
        top_industries = [i.lower() if isinstance(i, str) else (i.get("name", "") if isinstance(i, dict) else "").lower()
                          for i in (ps.get("top_industries") or [])]
        if any(target_industry.lower() in s for s in specs + top_industries):
            parts.append(f"Strong {industry}-to-{target_industry} pipeline.")
        elif industry:
            parts.append(f"Your {industry} background aligns well with median stats.")

    # Work experience
    cp = school.get("class_profile", {})
    avg_yoe = cp.get("avg_work_experience_years")
    if avg_yoe and abs(work_years - avg_yoe) <= 1:
        parts.append("Work experience matches class average.")

    if not parts:
        if fit_score >= 70:
            parts.append("Your profile aligns well with this program's class profile.")
        elif fit_score >= 40:
            parts.append("Competitive profile — emphasize differentiation in essays.")
        else:
            parts.append("Aspirational target — a strong narrative will be key.")

    return " ".join(parts[:3])


@router.post("/recommendations/personalized")
def get_personalized_recommendations(req: PersonalizedRecommendationRequest):
    """Personalized school recommendations based on detailed applicant profile.

    Evaluates all schools in SCHOOL_DB, computes a fit score (0-100),
    classifies into reach/target/safety, and returns top picks with explanations.
    """
    # Normalize GMAT Focus to classic scale
    if req.gmat_version == "focus":
        gmat_classic = req.gmat - 5
    else:
        gmat_classic = req.gmat
    gmat_classic = max(200, min(800, gmat_classic))

    # Normalize preferred countries
    country_filter: set[str] = set()
    for c in req.preferred_countries:
        country_filter.add(_normalize_country(c))

    total_evaluated = 0
    scored: list[dict] = []

    for sid, school in SCHOOL_DB.items():
        # Skip schools without GMAT avg (can't meaningfully score)
        if not school.get("gmat_avg"):
            continue

        total_evaluated += 1

        # Country filter
        school_country = school.get("country", "")
        if country_filter and school_country not in country_filter:
            continue

        # Budget filter
        tuition = _safe_float(school.get("tuition_usd"), 0)
        if req.budget_max_usd and tuition > 0 and tuition > req.budget_max_usd:
            continue

        # Compute fit score
        fit_score = _compute_fit_score(
            school=school,
            gmat_classic=gmat_classic,
            gpa=req.gpa,
            work_years=req.work_years,
            industry=req.industry,
            target_industry=req.target_industry,
            is_international=req.is_international,
            priorities=req.priorities,
        )

        # Generate why explanation
        why = _generate_personalized_why(
            school=school,
            fit_score=fit_score,
            gmat_classic=gmat_classic,
            gpa=req.gpa,
            work_years=req.work_years,
            industry=req.industry,
            target_industry=req.target_industry,
        )

        accept_rate = _safe_float(school.get("acceptance_rate"), None)

        scored.append({
            "school_id": sid,
            "name": school.get("name", sid),
            "fit_score": fit_score,
            "why": why,
            "gmat_avg": school.get("gmat_avg"),
            "acceptance_rate": accept_rate,
            "location": school.get("location", "Unknown"),
            "country": school_country,
            "tuition_usd": tuition if tuition > 0 else None,
            "median_salary": school.get("median_salary", "N/A"),
            "specializations": (school.get("specializations") or [])[:3],
            "class_size": school.get("class_size"),
            "degree_type": school.get("degree_type", "MBA"),
        })

    # Classify: fit_score < 45 = reach, 45-72 = target, 72+ = safety
    reach = sorted([s for s in scored if s["fit_score"] < 45], key=lambda x: -x["fit_score"])
    target = sorted([s for s in scored if 45 <= s["fit_score"] < 72], key=lambda x: -x["fit_score"])
    safety = sorted([s for s in scored if s["fit_score"] >= 72], key=lambda x: -x["fit_score"])

    # Generate profile summary
    profile_parts = []
    if req.is_international:
        profile_parts.append("international applicant")
    if req.is_urm:
        profile_parts.append("URM")
    if req.industry:
        profile_parts.append(f"with {req.industry} background")
    if req.target_industry:
        profile_parts.append(f"targeting {req.target_industry} pivot")

    gmat_tier = "M7" if gmat_classic >= 740 else ("T15" if gmat_classic >= 710 else ("T25" if gmat_classic >= 680 else "competitive"))
    profile_summary = f"{'Strong ' if req.gpa >= 3.5 else ''}{''.join(p + ' ' for p in profile_parts).strip()}. GMAT competitive for {gmat_tier}."
    if not profile_parts:
        profile_summary = f"GMAT competitive for {gmat_tier} programs."

    return {
        "reach": reach[:5],
        "target": target[:8],
        "safety": safety[:5],
        "profile_summary": profile_summary,
        "total_evaluated": total_evaluated,
    }
