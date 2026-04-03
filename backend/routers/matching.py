"""Smart School Matching Engine — weighted multi-factor scoring."""

import re
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional

from agents import SCHOOL_DB

router = APIRouter(prefix="/api", tags=["matching"])


# ── Request / Response Models ────────────────────────────────────────────────

class MatchRequest(BaseModel):
    gmat: int = Field(ge=200, le=800)
    gpa: float = Field(ge=0, le=4.0)
    work_years: int = Field(ge=0, le=30)
    target_countries: list[str] = []
    goals: list[str] = []
    budget_usd: Optional[int] = None


class FitBreakdown(BaseModel):
    gmat: float
    gpa: float
    work_experience: float
    country: float
    budget: float
    program_strength: float


class MatchedSchool(BaseModel):
    school_id: str
    name: str
    fit_score: float
    fit_breakdown: FitBreakdown
    classification: str  # Reach / Target / Safety
    key_highlights: list[str]
    country: str
    location: str
    tuition_usd: Optional[int] = None
    gmat_avg: Optional[int] = None
    acceptance_rate: Optional[float] = None
    median_salary: Optional[str] = None


class MatchResponse(BaseModel):
    matches: list[MatchedSchool]
    profile_summary: dict
    tier_counts: dict


# ── Scoring Helpers ──────────────────────────────────────────────────────────

# Weights (must sum to 1.0)
W_GMAT = 0.25
W_GPA = 0.15
W_WORK = 0.10
W_COUNTRY = 0.15
W_BUDGET = 0.15
W_GOALS = 0.20


def _parse_years(raw: str | None) -> float | None:
    """Extract numeric years from strings like '4 years', '3-5 years'."""
    if raw is None:
        return None
    nums = re.findall(r"[\d.]+", str(raw))
    if not nums:
        return None
    # If range like "3-5", take the midpoint
    vals = [float(n) for n in nums]
    return sum(vals) / len(vals)


def _score_gmat(user_gmat: int, school_gmat: int | None) -> float:
    """Score 0-100 based on how close user GMAT is to school average.
    ±30 is considered good. Being above is better than below."""
    if school_gmat is None:
        return 50.0  # neutral if no data
    diff = user_gmat - school_gmat
    if diff >= 0:
        # At or above average — great fit, diminishing returns past +50
        return min(100, 70 + diff)
    else:
        # Below average — penalty increases with distance
        # At -30: score ~50, at -60: score ~20, at -100: score ~5
        return max(5, 70 + diff * (20 / 30))


def _score_gpa(user_gpa: float, school: dict) -> float:
    """Score GPA fit. Use acceptance rate as proxy for expected GPA."""
    accept_rate = 30.0
    try:
        accept_rate = float(school.get("acceptance_rate", 30))
    except (ValueError, TypeError):
        pass

    # Estimate expected GPA from selectivity
    if accept_rate < 12:
        expected = 3.7
    elif accept_rate < 20:
        expected = 3.6
    elif accept_rate < 35:
        expected = 3.4
    else:
        expected = 3.2

    diff = user_gpa - expected
    if diff >= 0:
        return min(100, 70 + diff * 60)
    else:
        return max(5, 70 + diff * 80)


def _score_work_experience(user_years: int, school: dict) -> float:
    """Score work experience fit against school's average/recommended."""
    avg_raw = school.get("admission_requirements", {}).get("avg_work_experience")
    avg_years = _parse_years(avg_raw)
    if avg_years is None:
        avg_years = 4.0  # default MBA sweet spot

    diff = abs(user_years - avg_years)
    if diff <= 1:
        return 90.0
    elif diff <= 2:
        return 70.0
    elif diff <= 3:
        return 50.0
    elif diff <= 5:
        return 30.0
    else:
        return 15.0


def _score_country(target_countries: list[str], school_country: str) -> float:
    """100 if country matches, 0 if not. Case-insensitive."""
    if not target_countries:
        return 50.0  # no preference — neutral
    normalized = [c.strip().lower() for c in target_countries]
    if school_country.strip().lower() in normalized:
        return 100.0
    return 0.0


def _score_budget(budget_usd: int | None, tuition_usd: int | None) -> float:
    """Score budget fit — how well tuition fits within budget."""
    if budget_usd is None or tuition_usd is None:
        return 50.0  # neutral if unknown

    if tuition_usd <= budget_usd:
        # Within budget — closer to budget = still fine
        ratio = tuition_usd / budget_usd if budget_usd > 0 else 0
        return 70 + 30 * (1 - ratio)  # cheaper = slightly better
    else:
        # Over budget — penalty by how much
        overshoot = (tuition_usd - budget_usd) / budget_usd if budget_usd > 0 else 1
        return max(5, 60 - overshoot * 100)


# Map goal keywords to industry/specialization keywords
GOAL_KEYWORDS = {
    "consulting": ["consulting", "strategy", "management consulting"],
    "tech": ["technology", "tech", "product management", "data", "analytics"],
    "finance": ["finance", "banking", "investment", "private equity", "venture capital"],
    "entrepreneurship": ["entrepreneurship", "startup", "venture", "innovation"],
    "healthcare": ["healthcare", "health", "pharma", "biotech"],
    "marketing": ["marketing", "brand", "consumer", "digital marketing"],
    "operations": ["operations", "supply chain", "logistics", "manufacturing"],
    "real estate": ["real estate", "property"],
    "social impact": ["social", "nonprofit", "sustainability", "impact"],
    "energy": ["energy", "oil", "renewable", "cleantech"],
    "general management": ["general management", "leadership"],
}


def _score_program_strength(goals: list[str], school: dict) -> float:
    """Score how well school's programs/placements align with user goals."""
    if not goals:
        return 50.0  # no preference — neutral

    # Collect school's strength signals
    specs = [s.lower() for s in (school.get("specializations") or [])]
    industries = []
    for ind in (school.get("placement_stats") or {}).get("industry_breakdown", []):
        industries.append((ind.get("industry", "").lower(), ind.get("percentage", 0)))
    features = " ".join(school.get("unique_features") or []).lower()

    total_score = 0.0
    for goal in goals:
        goal_lower = goal.strip().lower()
        keywords = GOAL_KEYWORDS.get(goal_lower, [goal_lower])
        best = 0.0

        # Check specializations
        for kw in keywords:
            for spec in specs:
                if kw in spec:
                    best = max(best, 80.0)

        # Check placement stats — industry match with high % is strong signal
        for kw in keywords:
            for ind_name, pct in industries:
                if kw in ind_name:
                    # 30% placement in your target industry = great
                    best = max(best, min(100, 40 + pct * 2))

        # Check unique features
        for kw in keywords:
            if kw in features:
                best = max(best, 60.0)

        total_score += best if best > 0 else 20.0  # 20 base if no match found

    return min(100, total_score / len(goals))


def _generate_highlights(
    school: dict,
    user_gmat: int,
    goals: list[str],
    budget_usd: int | None,
) -> list[str]:
    """Generate 2-4 key highlights for the school card."""
    highlights = []

    # GMAT comparison
    school_gmat = school.get("gmat_avg")
    if school_gmat:
        diff = user_gmat - school_gmat
        if diff >= 20:
            highlights.append(f"Your GMAT is {diff} pts above their {school_gmat} avg")
        elif diff >= -10:
            highlights.append(f"GMAT {school_gmat} avg — you're competitive")
        else:
            highlights.append(f"GMAT avg is {school_gmat} — above your score")

    # Acceptance rate
    try:
        ar = float(school.get("acceptance_rate", 0))
        if ar > 0:
            if ar < 15:
                highlights.append(f"Highly selective ({ar:.0f}% acceptance rate)")
            elif ar < 30:
                highlights.append(f"Selective ({ar:.0f}% acceptance rate)")
            else:
                highlights.append(f"{ar:.0f}% acceptance rate")
    except (ValueError, TypeError):
        pass

    # Goal alignment
    specs = school.get("specializations") or []
    placement = school.get("placement_stats") or {}
    top_industries = sorted(
        placement.get("industry_breakdown", []),
        key=lambda x: x.get("percentage", 0),
        reverse=True,
    )
    if top_industries:
        top = top_industries[0]
        highlights.append(f"{top['percentage']}% placed in {top['industry']}")

    # Budget
    tuition = school.get("tuition_usd")
    if tuition and budget_usd:
        if tuition <= budget_usd:
            highlights.append(f"Within budget (${tuition:,} tuition)")
        else:
            over = tuition - budget_usd
            highlights.append(f"${over:,} over budget (${tuition:,} tuition)")
    elif tuition:
        highlights.append(f"Tuition: ${tuition:,}")

    # STEM designation
    stem = school.get("stem_designated") or school.get("program_details", {}).get("stem_designated", False)
    if stem:
        highlights.append("STEM-designated program")

    # Salary
    salary = school.get("median_salary")
    if salary and salary != "N/A":
        highlights.append(f"Median salary: {salary}")

    return highlights[:4]


# ── Main Endpoint ────────────────────────────────────────────────────────────

@router.post("/match", response_model=MatchResponse)
def match_schools(req: MatchRequest):
    """Score all schools against user profile and return top 30 matches.

    Uses weighted multi-factor scoring:
    - GMAT fit (25%), Program strength (20%), GPA fit (15%),
    - Country match (15%), Budget fit (15%), Work experience (10%)
    """
    scored = []

    for sid, school in SCHOOL_DB.items():
        # Skip schools with very incomplete data
        if not school.get("name"):
            continue

        # Compute individual factor scores (0-100)
        gmat_score = _score_gmat(req.gmat, school.get("gmat_avg"))
        gpa_score = _score_gpa(req.gpa, school)
        work_score = _score_work_experience(req.work_years, school)
        country_score = _score_country(req.target_countries, school.get("country", ""))
        budget_score = _score_budget(req.budget_usd, school.get("tuition_usd"))
        goals_score = _score_program_strength(req.goals, school)

        # Weighted composite
        fit_score = (
            gmat_score * W_GMAT
            + gpa_score * W_GPA
            + work_score * W_WORK
            + country_score * W_COUNTRY
            + budget_score * W_BUDGET
            + goals_score * W_GOALS
        )
        fit_score = round(min(100, max(0, fit_score)), 1)

        # Classification
        if fit_score > 70:
            classification = "Safety"
        elif fit_score >= 40:
            classification = "Target"
        else:
            classification = "Reach"

        highlights = _generate_highlights(school, req.gmat, req.goals, req.budget_usd)

        scored.append(MatchedSchool(
            school_id=sid,
            name=school.get("name", sid),
            fit_score=fit_score,
            fit_breakdown=FitBreakdown(
                gmat=round(gmat_score, 1),
                gpa=round(gpa_score, 1),
                work_experience=round(work_score, 1),
                country=round(country_score, 1),
                budget=round(budget_score, 1),
                program_strength=round(goals_score, 1),
            ),
            classification=classification,
            key_highlights=highlights,
            country=school.get("country", "Unknown"),
            location=school.get("location", "Unknown"),
            tuition_usd=school.get("tuition_usd"),
            gmat_avg=school.get("gmat_avg"),
            acceptance_rate=school.get("acceptance_rate"),
            median_salary=school.get("median_salary"),
        ))

    # Sort by fit_score descending, take top 30
    scored.sort(key=lambda s: -s.fit_score)
    top_30 = scored[:30]

    tier_counts = {
        "reach": sum(1 for s in top_30 if s.classification == "Reach"),
        "target": sum(1 for s in top_30 if s.classification == "Target"),
        "safety": sum(1 for s in top_30 if s.classification == "Safety"),
    }

    return MatchResponse(
        matches=top_30,
        profile_summary={
            "gmat": req.gmat,
            "gpa": req.gpa,
            "work_years": req.work_years,
            "target_countries": req.target_countries,
            "goals": req.goals,
            "budget_usd": req.budget_usd,
        },
        tier_counts=tier_counts,
    )
