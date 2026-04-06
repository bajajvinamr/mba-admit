"""School List Health Check — analyze whether an applicant's school list is balanced.

Categorizes each school as reach/target/safety based on ML-predicted admit probability,
scores the overall list balance, and suggests additions/removals for optimal outcomes.
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from agents import SCHOOL_DB
from ml.admit_predictor import predict_admission

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/list-health", tags=["list-health"])

# ── Try loading scholarship intelligence data ─────────────────────────────────

_scholarship_stats: dict[str, dict] = {}

try:
    from routers.scholarship_intelligence import _school_stats as _si_stats
    _scholarship_stats = _si_stats
except ImportError:
    logger.warning("scholarship_intelligence not available — scholarship data disabled")


# ── Request / Response Models ─────────────────────────────────────────────────

class ListHealthRequest(BaseModel):
    school_ids: list[str] = Field(min_length=1, max_length=15)
    gmat: int = Field(ge=200, le=800)
    gpa: float = Field(default=3.5, ge=0, le=4.0)
    yoe: int = Field(default=4, ge=0, le=30)
    app_round: str = Field(default="R2")


class SchoolResult(BaseModel):
    school_id: str
    school_name: str
    probability_pct: Optional[float]
    category: str  # "reach" | "target" | "safety" | "unknown"
    scholarship_rate: Optional[float] = None


class BalanceSummary(BaseModel):
    reaches: int
    targets: int
    safeties: int


class SuggestedSchool(BaseModel):
    school_id: str
    school_name: str
    probability_pct: Optional[float]
    reason: str


class SuggestedRemoval(BaseModel):
    school_id: str
    reason: str


class ListHealthResponse(BaseModel):
    health_score: int
    grade: str
    balance: BalanceSummary
    schools: list[SchoolResult]
    recommendations: list[str]
    suggested_adds: list[SuggestedSchool]
    suggested_removes: list[SuggestedRemoval]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _categorize(probability_pct: Optional[float]) -> str:
    """Categorize school based on admission probability."""
    if probability_pct is None:
        return "unknown"
    if probability_pct < 25:
        return "reach"
    if probability_pct <= 60:
        return "target"
    return "safety"


def _school_name(school_id: str) -> str:
    """Look up human-readable school name from SCHOOL_DB."""
    school = SCHOOL_DB.get(school_id, {})
    return school.get("name", school_id.replace("-", " ").title())


def _scholarship_rate_for(school_id: str) -> Optional[float]:
    """Get scholarship rate from scholarship intelligence data."""
    stats = _scholarship_stats.get(school_id)
    if stats and "scholarship_rate" in stats:
        return stats["scholarship_rate"]
    return None


def _compute_health_score(reaches: int, targets: int, safeties: int, total: int) -> int:
    """Score 0-100 based on list balance.

    Ideal: 1-2 reaches, 2-4 targets, 1-2 safeties within 4-8 total schools.
    Penalize: all-reach, all-safety, no targets, too few/many schools.
    """
    score = 100

    # Penalize bad target count (targets are most important)
    if targets == 0:
        score -= 35
    elif targets == 1:
        score -= 15
    elif targets > 4:
        score -= 5 * (targets - 4)

    # Penalize missing safeties
    if safeties == 0:
        score -= 25
    elif safeties > 3:
        score -= 5 * (safeties - 3)

    # Penalize too many reaches
    if reaches == 0 and total >= 3:
        score -= 5  # mild penalty — some ambition is good
    elif reaches > 3:
        score -= 10 * (reaches - 3)

    # Penalize list size
    if total < 3:
        score -= 20
    elif total < 4:
        score -= 10
    elif total > 8:
        score -= 5 * (total - 8)

    # All-reach or all-safety lists are fundamentally unbalanced
    if total > 1:
        if reaches == total:
            score -= 20
        elif safeties == total:
            score -= 20

    return max(0, min(100, score))


def _grade_from_score(score: int) -> str:
    """Map numeric score to letter grade."""
    if score >= 85:
        return "A"
    if score >= 70:
        return "B"
    if score >= 55:
        return "C"
    if score >= 40:
        return "D"
    return "F"


def _generate_recommendations(
    reaches: int,
    targets: int,
    safeties: int,
    total: int,
    school_results: list[SchoolResult],
) -> list[str]:
    """Generate actionable recommendations based on list composition."""
    recs: list[str] = []

    if total < 4:
        recs.append(
            "Most successful applicants apply to 4-8 schools. "
            "Consider adding more programs to improve your odds."
        )

    if total > 10:
        recs.append(
            "Applying to 10+ schools dilutes essay quality. "
            "Focus on 6-8 schools where you can craft compelling, tailored essays."
        )

    if reaches > 2 and reaches > targets:
        recs.append(
            "Your list is reach-heavy. "
            "Add more target schools (25-60% chance) where you can invest essay energy for realistic admits."
        )

    if targets == 0:
        recs.append(
            "You have no target schools — these are where admits most often happen. "
            "Add 2-3 programs where your stats sit at or above the class median."
        )

    if safeties == 0 and total >= 3:
        reach_or_target = [s for s in school_results if s.category in ("reach", "target")]
        if reach_or_target:
            recs.append(
                "Consider adding a safety school (>60% chance) to guarantee at least one admit. "
                "You don't want to go through a full cycle empty-handed."
            )

    if safeties > 3:
        recs.append(
            "You have many safety schools. Consider swapping 1-2 for targets or reaches "
            "to maximize the prestige of your eventual admit."
        )

    if reaches == total and total > 1:
        recs.append(
            "Every school on your list is a reach. This is a high-risk strategy — "
            "statistically, most applicants with all-reach lists end up reapplying."
        )

    if safeties == total and total > 1:
        recs.append(
            "Your entire list is safeties. You're likely underselling yourself. "
            "Consider adding 1-2 target schools that would stretch your ambition."
        )

    unknown_schools = [s for s in school_results if s.category == "unknown"]
    if unknown_schools:
        names = ", ".join(s.school_name for s in unknown_schools[:3])
        recs.append(
            f"We don't have enough data to predict odds for: {names}. "
            "Consider these schools carefully based on your own research."
        )

    return recs


def _find_suggested_adds(
    current_ids: set[str],
    gmat: int,
    gpa: float,
    yoe: int,
    app_round: str,
    reaches: int,
    targets: int,
    safeties: int,
) -> list[SuggestedSchool]:
    """Suggest schools to add based on gaps in list balance."""
    suggestions: list[SuggestedSchool] = []

    # Determine what categories are needed
    need_targets = targets < 2
    need_safeties = safeties == 0
    need_reaches = reaches == 0 and targets >= 2 and safeties >= 1

    if not (need_targets or need_safeties or need_reaches):
        return suggestions

    # Score candidate schools from SCHOOL_DB
    candidates: list[tuple[str, str, Optional[float], str]] = []

    for sid, school in SCHOOL_DB.items():
        if sid in current_ids:
            continue

        # Only suggest MBA programs
        if school.get("degree_type", "MBA") != "MBA":
            continue

        pred = predict_admission(sid, gmat, gpa, yoe, app_round)
        prob = pred.get("probability_pct")
        if prob is None:
            continue

        cat = _categorize(prob)
        name = school.get("name", sid.replace("-", " ").title())
        candidates.append((sid, name, prob, cat))

    # Pick best suggestions per needed category
    if need_safeties:
        safety_candidates = [
            c for c in candidates if c[3] == "safety"
        ]
        # Prefer schools with high scholarship rates
        safety_candidates.sort(
            key=lambda c: (_scholarship_rate_for(c[0]) or 0, c[2] or 0),
            reverse=True,
        )
        for sid, name, prob, _ in safety_candidates[:2]:
            schol_rate = _scholarship_rate_for(sid)
            reason = f"Safety school with {prob:.0f}% admit chance"
            if schol_rate and schol_rate > 30:
                reason += f" and {schol_rate:.0f}% scholarship rate"
            suggestions.append(SuggestedSchool(
                school_id=sid,
                school_name=name,
                probability_pct=prob,
                reason=reason,
            ))

    if need_targets:
        target_candidates = [
            c for c in candidates if c[3] == "target"
        ]
        target_candidates.sort(
            key=lambda c: (_scholarship_rate_for(c[0]) or 0, c[2] or 0),
            reverse=True,
        )
        for sid, name, prob, _ in target_candidates[:3]:
            schol_rate = _scholarship_rate_for(sid)
            reason = f"Target school with {prob:.0f}% admit chance"
            if schol_rate and schol_rate > 30:
                reason += f" and {schol_rate:.0f}% scholarship rate"
            suggestions.append(SuggestedSchool(
                school_id=sid,
                school_name=name,
                probability_pct=prob,
                reason=reason,
            ))

    if need_reaches:
        reach_candidates = [
            c for c in candidates if c[3] == "reach"
        ]
        reach_candidates.sort(key=lambda c: c[2] or 0, reverse=True)
        for sid, name, prob, _ in reach_candidates[:1]:
            suggestions.append(SuggestedSchool(
                school_id=sid,
                school_name=name,
                probability_pct=prob,
                reason=f"Aspirational reach at {prob:.0f}% — worth a shot",
            ))

    return suggestions[:5]


def _find_suggested_removes(
    school_results: list[SchoolResult],
    reaches: int,
    targets: int,
    safeties: int,
    total: int,
) -> list[SuggestedRemoval]:
    """Suggest schools to remove if the list is unbalanced."""
    removals: list[SuggestedRemoval] = []

    # Too many reaches
    if reaches > 3:
        reach_schools = sorted(
            [s for s in school_results if s.category == "reach"],
            key=lambda s: s.probability_pct or 0,
        )
        for s in reach_schools[: reaches - 2]:
            removals.append(SuggestedRemoval(
                school_id=s.school_id,
                reason=f"Only {s.probability_pct:.0f}% chance — consider replacing with a target",
            ))

    # Too many safeties
    if safeties > 3:
        safety_schools = sorted(
            [s for s in school_results if s.category == "safety"],
            key=lambda s: -(s.probability_pct or 0),
        )
        for s in safety_schools[: safeties - 2]:
            removals.append(SuggestedRemoval(
                school_id=s.school_id,
                reason=f"{s.probability_pct:.0f}% chance is very high — swap for a more ambitious target",
            ))

    # Total over 10
    if total > 10 and not removals:
        unknown_schools = [s for s in school_results if s.category == "unknown"]
        for s in unknown_schools[:2]:
            removals.append(SuggestedRemoval(
                school_id=s.school_id,
                reason="No prediction data available — consider dropping to keep list focused",
            ))

    return removals[:5]


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/analyze", response_model=ListHealthResponse)
def analyze_list(req: ListHealthRequest) -> ListHealthResponse:
    """Analyze a school list for balance, generate health score and recommendations."""

    school_results: list[SchoolResult] = []

    for sid in req.school_ids:
        pred = predict_admission(sid, req.gmat, req.gpa, req.yoe, req.app_round)
        prob = pred.get("probability_pct")
        cat = _categorize(prob)
        name = _school_name(sid)
        schol_rate = _scholarship_rate_for(sid)

        school_results.append(SchoolResult(
            school_id=sid,
            school_name=name,
            probability_pct=prob,
            category=cat,
            scholarship_rate=schol_rate,
        ))

    # Sort by probability descending (unknowns last)
    school_results.sort(
        key=lambda s: s.probability_pct if s.probability_pct is not None else -1,
        reverse=True,
    )

    reaches = sum(1 for s in school_results if s.category == "reach")
    targets = sum(1 for s in school_results if s.category == "target")
    safeties = sum(1 for s in school_results if s.category == "safety")
    total = len(school_results)

    health_score = _compute_health_score(reaches, targets, safeties, total)
    grade = _grade_from_score(health_score)

    recommendations = _generate_recommendations(
        reaches, targets, safeties, total, school_results,
    )

    suggested_adds = _find_suggested_adds(
        current_ids=set(req.school_ids),
        gmat=req.gmat,
        gpa=req.gpa,
        yoe=req.yoe,
        app_round=req.app_round,
        reaches=reaches,
        targets=targets,
        safeties=safeties,
    )

    suggested_removes = _find_suggested_removes(
        school_results, reaches, targets, safeties, total,
    )

    return ListHealthResponse(
        health_score=health_score,
        grade=grade,
        balance=BalanceSummary(reaches=reaches, targets=targets, safeties=safeties),
        schools=school_results,
        recommendations=recommendations,
        suggested_adds=suggested_adds,
        suggested_removes=suggested_removes,
    )
