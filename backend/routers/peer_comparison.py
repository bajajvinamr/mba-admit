"""Peer Comparison — percentile ranking against target school class profiles.

Computes where a user's GMAT, GPA, and work experience fall relative to each
target school's class profile using normal distribution approximation.
Generates strengths, gaps, and actionable recommendations.
"""

import math
from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from agents import SCHOOL_DB
from db import get_community_decisions

router = APIRouter(prefix="/api", tags=["peer-comparison"])


# ── Constants ────────────────────────────────────────────────────────────────

GMAT_STD_DEV = 30
GPA_STD_DEV = 0.2
WORK_YEARS_STD_DEV = 2

# Weights for overall percentile
WEIGHT_GMAT = 0.40
WEIGHT_GPA = 0.30
WEIGHT_WORK = 0.20
WEIGHT_OTHER = 0.10

# Industry preferences per school cluster
INDUSTRY_FIT: dict[str, list[str]] = {
    "hbs": ["consulting", "finance", "tech", "military", "nonprofit"],
    "gsb": ["tech", "entrepreneurship", "venture_capital", "social_impact"],
    "wharton": ["finance", "consulting", "tech", "healthcare"],
    "booth": ["finance", "consulting", "tech", "entrepreneurship"],
    "kellogg": ["consulting", "tech", "marketing", "nonprofit"],
    "cbs": ["finance", "consulting", "media", "real_estate"],
    "sloan": ["tech", "consulting", "engineering", "energy"],
    "tuck": ["consulting", "finance", "tech", "healthcare"],
    "haas": ["tech", "entrepreneurship", "social_impact", "consulting"],
    "ross": ["consulting", "tech", "manufacturing", "healthcare"],
    "fuqua": ["consulting", "tech", "healthcare", "energy"],
    "darden": ["consulting", "finance", "tech", "general_management"],
    "stern": ["finance", "tech", "media", "luxury"],
    "yale-som": ["nonprofit", "social_impact", "consulting", "healthcare"],
    "johnson": ["tech", "consulting", "finance", "real_estate"],
}


# ── Request / Response Models ────────────────────────────────────────────────


class PeerComparisonRequest(BaseModel):
    gmat: int = Field(ge=200, le=805, description="GMAT score (Classic 200-800 or Focus 205-805)")
    gmat_version: str = Field(default="focus", description="'focus' or 'classic'")
    gpa: float = Field(ge=0.0, le=4.0)
    work_years: int = Field(ge=0, le=30)
    industry: str = Field(default="")
    is_urm: bool = False
    is_international: bool = False
    target_schools: List[str] = Field(min_length=1, max_length=5)


class DimensionResult(BaseModel):
    value: float
    percentile: int
    school_median: Optional[float] = None
    school_avg: Optional[float] = None
    comparison: str


class SimilarProfiles(BaseModel):
    admitted: int
    rejected: int
    waitlisted: int
    total: int
    admit_rate_for_profile: int


class PeerComparisonResponse(BaseModel):
    overall_percentile: int
    dimensions: dict[str, DimensionResult]
    strengths: List[str]
    gaps: List[str]
    similar_profiles: SimilarProfiles
    recommendations: List[str]


# ── Helpers ──────────────────────────────────────────────────────────────────


def _phi(z: float) -> float:
    """Standard normal CDF approximation (Abramowitz and Stegun)."""
    return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))


def _percentile(user_value: float, school_center: float, std_dev: float) -> int:
    """Compute percentile of user_value relative to a school's distribution."""
    if std_dev <= 0:
        return 50
    z = (user_value - school_center) / std_dev
    pct = _phi(z) * 100
    return max(1, min(99, round(pct)))


def _comparison_label(percentile: int) -> str:
    """Human-readable comparison label."""
    if percentile >= 70:
        return "well above median"
    if percentile >= 58:
        return "above average"
    if percentile >= 42:
        return "at median"
    if percentile >= 30:
        return "slightly below median"
    return "below median"


def _normalize_gmat(gmat: int, version: str) -> int:
    """Normalize GMAT Focus (205-805) to Classic scale (200-800)."""
    if version == "focus":
        return round((gmat - 205) / 600 * 600 + 200)
    return gmat


def _school_gpa_median(school: dict) -> float:
    """Get GPA median for a school, default 3.6."""
    return school.get("gpa_median") or school.get("gpa_avg") or 3.6


def _school_work_avg(school: dict) -> float:
    """Get avg work experience years, default 4.5."""
    return school.get("avg_work_exp") or school.get("work_exp_avg") or 4.5


def _compute_similar_profiles(
    target_schools: List[str],
    gmat: int,
    gpa: float,
    work_years: int,
    industry: str,
) -> SimilarProfiles:
    """Find similar profiles from community decisions."""
    admitted = 0
    rejected = 0
    waitlisted = 0

    for school_id in target_schools:
        try:
            decisions = get_community_decisions(school_id=school_id, limit=200)
        except Exception:
            decisions = []

        for d in decisions:
            d_gmat = d.get("gmat")
            d_gpa = d.get("gpa")
            d_work = d.get("work_years")
            if d_gmat is None and d_gpa is None:
                continue

            # Check similarity: within reasonable range
            gmat_close = d_gmat is None or abs(d_gmat - gmat) <= 40
            gpa_close = d_gpa is None or abs(d_gpa - gpa) <= 0.3
            work_close = d_work is None or abs(d_work - work_years) <= 2

            if gmat_close and gpa_close and work_close:
                status = d.get("status", "").lower()
                if "admit" in status:
                    admitted += 1
                elif "ding" in status or "reject" in status:
                    rejected += 1
                elif "waitlist" in status:
                    waitlisted += 1

    total = admitted + rejected + waitlisted

    # If no community data, estimate from school acceptance rates
    if total == 0:
        for school_id in target_schools:
            school = SCHOOL_DB.get(school_id)
            if not school:
                continue
            rate = school.get("acceptance_rate") or 25
            try:
                rate = float(rate)
            except (ValueError, TypeError):
                rate = 25.0
            # Estimate ~8 similar profiles per school
            est_total = 8
            est_admitted = round(est_total * rate / 100)
            est_rejected = est_total - est_admitted - 1
            admitted += max(1, est_admitted)
            rejected += max(1, est_rejected)
            waitlisted += 1

        total = admitted + rejected + waitlisted

    admit_rate = round(admitted / total * 100) if total > 0 else 0

    return SimilarProfiles(
        admitted=admitted,
        rejected=rejected,
        waitlisted=waitlisted,
        total=total,
        admit_rate_for_profile=admit_rate,
    )


def _generate_strengths(
    gmat_pct: int,
    gpa_pct: int,
    work_pct: int,
    industry: str,
    is_urm: bool,
    is_international: bool,
    target_schools: List[str],
    work_years: int,
) -> List[str]:
    """Generate strength statements based on profile dimensions."""
    strengths: List[str] = []

    if gmat_pct >= 60:
        strengths.append("GMAT score at or above the median for target schools")
    if gpa_pct >= 60:
        strengths.append("GPA competitive with admitted class profile")
    if work_pct >= 60:
        strengths.append("Work experience depth")

    # Industry fit
    industry_lower = industry.lower() if industry else ""
    for sid in target_schools:
        fit_industries = INDUSTRY_FIT.get(sid, [])
        if industry_lower in fit_industries:
            school = SCHOOL_DB.get(sid)
            school_name = school.get("name", sid) if school else sid
            strengths.append(f"{industry.title()} background valued at {school_name}")
            break

    if is_urm:
        strengths.append("URM status strengthens diversity contribution")
    if is_international:
        strengths.append("International perspective adds to class diversity")
    if work_years >= 6:
        strengths.append("Above-average professional maturity for MBA cohort")

    return strengths[:5]


def _generate_gaps(
    gmat_pct: int,
    gpa_pct: int,
    work_pct: int,
    gmat: int,
    gpa: float,
    work_years: int,
    avg_school_gmat: float,
) -> List[str]:
    """Generate gap statements."""
    gaps: List[str] = []

    if gmat_pct < 42:
        diff = round(avg_school_gmat - gmat)
        gaps.append(f"GMAT {diff}pts below median at reach schools")
        gaps.append("Consider retaking or submitting GRE if stronger")
    elif gmat_pct < 50:
        diff = round(avg_school_gmat - gmat)
        gaps.append(f"GMAT {diff}-{diff + 10}pts below median at reach schools")

    if gpa_pct < 42:
        gaps.append("GPA below the admitted class median — strengthen other areas")
    if work_pct < 35:
        gaps.append("Less work experience than typical admits — emphasize leadership impact")
    if work_pct > 85:
        gaps.append("Higher-than-average work experience — address 'why now' clearly in essays")

    return gaps[:4]


def _generate_recommendations(
    overall_pct: int,
    industry: str,
    is_international: bool,
    is_urm: bool,
    target_schools: List[str],
    gmat_pct: int,
    gpa_pct: int,
) -> List[str]:
    """Generate actionable recommendations."""
    recs: List[str] = []

    # Overall competitiveness
    if overall_pct >= 70:
        recs.append("Your profile is highly competitive. Focus on crafting exceptional essays and demonstrating leadership.")
    elif overall_pct >= 50:
        school_tier = "T15" if len(target_schools) <= 3 else "T25"
        recs.append(f"Your profile is competitive at {school_tier} schools. Consider adding 1-2 T25 safeties.")
    elif overall_pct >= 35:
        recs.append("Your profile is in the competitive range but below median — strong essays and recommendations are critical.")
    else:
        recs.append("Your profile faces an uphill battle at these schools. Consider broadening your school list.")

    # Industry-specific
    industry_lower = industry.lower() if industry else ""
    school_names = []
    for sid in target_schools:
        fit_industries = INDUSTRY_FIT.get(sid, [])
        if industry_lower in fit_industries:
            school = SCHOOL_DB.get(sid)
            if school:
                school_names.append(school.get("name", sid))
    if school_names and industry:
        names_str = " and ".join(school_names[:2])
        recs.append(f"{industry.title()} background is well-represented at {names_str}.")

    # International applicant advice
    if is_international:
        recs.append("As an international applicant, highlight unique perspectives and cross-cultural leadership in essays.")

    # URM advice
    if is_urm:
        recs.append("Leverage your URM status by authentically sharing your unique background and how it shapes your goals.")

    # GMAT-specific
    if gmat_pct < 40:
        recs.append("A GMAT retake of 20-30 points would significantly improve your competitiveness.")

    # GPA-specific
    if gpa_pct < 40:
        recs.append("Consider taking quantitative courses (CFA, online certificates) to offset GPA concerns.")

    return recs[:5]


# ── Endpoint ─────────────────────────────────────────────────────────────────


@router.post("/peer-comparison")
def peer_comparison(req: PeerComparisonRequest) -> PeerComparisonResponse:
    """Compare applicant profile against target school class profiles.

    Computes percentile rankings for GMAT, GPA, and work experience using
    normal distribution approximation, then generates strengths, gaps, and
    actionable recommendations.
    """
    gmat_normalized = _normalize_gmat(req.gmat, req.gmat_version)

    # Aggregate school stats across target schools
    gmat_percentiles: list[int] = []
    gpa_percentiles: list[int] = []
    work_percentiles: list[int] = []
    school_gmat_medians: list[float] = []
    school_gpa_medians: list[float] = []
    school_work_avgs: list[float] = []

    for sid in req.target_schools:
        school = SCHOOL_DB.get(sid)
        if not school:
            continue

        school_gmat = school.get("gmat_avg") or 720
        school_gpa = _school_gpa_median(school)
        school_work = _school_work_avg(school)

        school_gmat_medians.append(school_gmat)
        school_gpa_medians.append(school_gpa)
        school_work_avgs.append(school_work)

        gmat_percentiles.append(_percentile(gmat_normalized, school_gmat, GMAT_STD_DEV))
        gpa_percentiles.append(_percentile(req.gpa, school_gpa, GPA_STD_DEV))
        work_percentiles.append(_percentile(req.work_years, school_work, WORK_YEARS_STD_DEV))

    # Average percentiles across target schools
    n_schools = max(len(gmat_percentiles), 1)
    avg_gmat_pct = round(sum(gmat_percentiles) / n_schools) if gmat_percentiles else 50
    avg_gpa_pct = round(sum(gpa_percentiles) / n_schools) if gpa_percentiles else 50
    avg_work_pct = round(sum(work_percentiles) / n_schools) if work_percentiles else 50

    avg_school_gmat = sum(school_gmat_medians) / n_schools if school_gmat_medians else 720
    avg_school_gpa = sum(school_gpa_medians) / n_schools if school_gpa_medians else 3.6
    avg_school_work = sum(school_work_avgs) / n_schools if school_work_avgs else 4.5

    # Other factors bonus (URM, international, industry fit)
    other_pct = 50
    if req.is_urm:
        other_pct += 15
    if req.is_international:
        other_pct += 5
    industry_lower = req.industry.lower() if req.industry else ""
    for sid in req.target_schools:
        if industry_lower in INDUSTRY_FIT.get(sid, []):
            other_pct += 8
            break
    other_pct = min(95, other_pct)

    # Overall percentile (weighted average)
    overall_pct = round(
        avg_gmat_pct * WEIGHT_GMAT
        + avg_gpa_pct * WEIGHT_GPA
        + avg_work_pct * WEIGHT_WORK
        + other_pct * WEIGHT_OTHER
    )
    overall_pct = max(1, min(99, overall_pct))

    # Build dimension results
    dimensions = {
        "gmat": DimensionResult(
            value=gmat_normalized,
            percentile=avg_gmat_pct,
            school_median=round(avg_school_gmat),
            comparison=_comparison_label(avg_gmat_pct),
        ),
        "gpa": DimensionResult(
            value=req.gpa,
            percentile=avg_gpa_pct,
            school_median=round(avg_school_gpa, 1),
            comparison=_comparison_label(avg_gpa_pct),
        ),
        "work_experience": DimensionResult(
            value=req.work_years,
            percentile=avg_work_pct,
            school_avg=round(avg_school_work, 1),
            comparison=_comparison_label(avg_work_pct),
        ),
    }

    # Similar profiles from community data
    similar = _compute_similar_profiles(
        req.target_schools, gmat_normalized, req.gpa, req.work_years, req.industry
    )

    # Generate insights
    strengths = _generate_strengths(
        avg_gmat_pct, avg_gpa_pct, avg_work_pct,
        req.industry, req.is_urm, req.is_international,
        req.target_schools, req.work_years,
    )
    gaps = _generate_gaps(
        avg_gmat_pct, avg_gpa_pct, avg_work_pct,
        gmat_normalized, req.gpa, req.work_years, avg_school_gmat,
    )
    recommendations = _generate_recommendations(
        overall_pct, req.industry, req.is_international, req.is_urm,
        req.target_schools, avg_gmat_pct, avg_gpa_pct,
    )

    return PeerComparisonResponse(
        overall_percentile=overall_pct,
        dimensions=dimensions,
        strengths=strengths,
        gaps=gaps,
        similar_profiles=similar,
        recommendations=recommendations,
    )
