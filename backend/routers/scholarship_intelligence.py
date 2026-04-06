"""Scholarship intelligence — data-driven scholarship analysis from real applicant outcomes.

Uses GMAT Club Decision Tracker data (self-reported) to provide:
1. School-level scholarship statistics (% who get money, average tier)
2. Profile-matched scholarship probability (based on similar applicants)
3. School list optimizer for scholarship yield
4. Scholarship negotiation leverage analysis
"""

import json
import logging
import math
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/scholarship-intel", tags=["scholarship-intelligence"])

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# ── Load decision data on import ─────────────────────────────────────────────

_decisions: list[dict] = []
_school_stats: dict[str, dict] = {}


def _load_decisions():
    """Load and index GMAT Club decision data."""
    global _decisions, _school_stats

    decisions_file = DATA_DIR / "gmatclub_decisions.json"
    if not decisions_file.exists():
        logger.warning("gmatclub_decisions.json not found — scholarship intel disabled")
        return

    with open(decisions_file) as f:
        _decisions = json.load(f)

    logger.info(f"Loaded {len(_decisions)} decisions for scholarship analysis")
    _build_school_stats()


def _tier_from_status(status: str) -> Optional[int]:
    """Extract scholarship tier (1-4) from status string.

    $ = 1 (partial ~25%), $$ = 2 (~50%), $$$ = 3 (~75%), $$$$ = 4 (full ride)
    """
    if "$$$$" in status:
        return 4
    if "$$$" in status:
        return 3
    if "$$" in status:
        return 2
    if "$" in status:
        return 1
    return None


def _is_admitted(status: str) -> bool:
    return any(
        s in status.lower()
        for s in ["admitted", "matriculating"]
    )


def _build_school_stats():
    """Pre-compute scholarship statistics per school."""
    global _school_stats

    schools: dict[str, dict] = {}

    for d in _decisions:
        slug = d.get("school_slug", "")
        sid = d.get("school_id", slug)
        if not sid:
            continue

        if sid not in schools:
            from agents import SCHOOL_DB
            school_data = SCHOOL_DB.get(sid, {})
            schools[sid] = {
                "school_id": sid,
                "school_slug": slug,
                "school_name": school_data.get("name", sid.replace("_", " ").title()),
                "total_entries": 0,
                "admitted_total": 0,
                "scholarship_entries": 0,
                "tier_counts": {1: 0, 2: 0, 3: 0, 4: 0},
                "scholarship_gmat_scores": [],
                "scholarship_gpa_scores": [],
                "admitted_gmat_scores": [],
                "admitted_gpa_scores": [],
                "scholarship_yoe": [],
                "scholarship_industries": [],
                "scholarship_nationalities": [],
            }

        s = schools[sid]
        s["total_entries"] += 1
        status = d.get("status", "")

        if _is_admitted(status):
            s["admitted_total"] += 1
            gmat = d.get("gmat") or d.get("gmat_focus")
            gpa = d.get("gpa")
            if gmat:
                s["admitted_gmat_scores"].append(gmat)
            if gpa:
                s["admitted_gpa_scores"].append(gpa)

        tier = _tier_from_status(status)
        if tier is not None:
            s["scholarship_entries"] += 1
            s["tier_counts"][tier] += 1
            gmat = d.get("gmat") or d.get("gmat_focus")
            gpa = d.get("gpa")
            yoe = d.get("yoe")
            industry = d.get("industry")
            location = d.get("location")

            if gmat:
                s["scholarship_gmat_scores"].append(gmat)
            if gpa:
                s["scholarship_gpa_scores"].append(gpa)
            if yoe:
                s["scholarship_yoe"].append(yoe)
            if industry:
                s["scholarship_industries"].append(industry)
            if location:
                s["scholarship_nationalities"].append(location)

    # Compute derived stats
    for sid, s in schools.items():
        admitted = s["admitted_total"]
        scholarships = s["scholarship_entries"]

        s["scholarship_rate"] = round(scholarships / admitted * 100, 1) if admitted > 0 else 0
        s["avg_scholarship_gmat"] = (
            round(sum(s["scholarship_gmat_scores"]) / len(s["scholarship_gmat_scores"]))
            if s["scholarship_gmat_scores"]
            else None
        )
        s["avg_admitted_gmat"] = (
            round(sum(s["admitted_gmat_scores"]) / len(s["admitted_gmat_scores"]))
            if s["admitted_gmat_scores"]
            else None
        )
        s["avg_scholarship_gpa"] = (
            round(sum(s["scholarship_gpa_scores"]) / len(s["scholarship_gpa_scores"]), 2)
            if s["scholarship_gpa_scores"]
            else None
        )
        s["avg_scholarship_yoe"] = (
            round(sum(s["scholarship_yoe"]) / len(s["scholarship_yoe"]), 1)
            if s["scholarship_yoe"]
            else None
        )

        # Dominant tier
        if scholarships > 0:
            dominant_tier = max(s["tier_counts"], key=s["tier_counts"].get)
            s["dominant_tier"] = dominant_tier
            s["tier_distribution"] = {
                f"tier_{k}": round(v / scholarships * 100, 1)
                for k, v in s["tier_counts"].items()
                if v > 0
            }
        else:
            s["dominant_tier"] = None
            s["tier_distribution"] = {}

        # Top scholarship industries
        from collections import Counter

        industry_counts = Counter(s["scholarship_industries"])
        s["top_scholarship_industries"] = [
            {"industry": ind, "count": cnt}
            for ind, cnt in industry_counts.most_common(5)
        ]

        nationality_counts = Counter(s["scholarship_nationalities"])
        s["top_scholarship_nationalities"] = [
            {"nationality": nat, "count": cnt}
            for nat, cnt in nationality_counts.most_common(5)
        ]

        # Clean up large lists (don't send raw arrays)
        s["scholarship_data_points"] = len(s["scholarship_gmat_scores"])
        for key in [
            "scholarship_gmat_scores", "scholarship_gpa_scores",
            "admitted_gmat_scores", "admitted_gpa_scores",
            "scholarship_yoe", "scholarship_industries",
            "scholarship_nationalities",
        ]:
            del s[key]

    _school_stats = schools


# Initialize on import
_load_decisions()


# ── Request/Response Models ──────────────────────────────────────────────────


class ProfileInput(BaseModel):
    gmat: Optional[int] = Field(None, ge=200, le=800)
    gpa: Optional[float] = Field(None, ge=0, le=4.0)
    years_experience: Optional[int] = Field(None, ge=0, le=30)
    industry: Optional[str] = None
    nationality: Optional[str] = None


class ScholarshipOptimizeRequest(BaseModel):
    profile: ProfileInput
    target_schools: list[str] = Field(default_factory=list, max_length=20)
    min_scholarship_rate: float = Field(default=10.0, ge=0, le=100)
    max_results: int = Field(default=15, ge=1, le=30)


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("/schools")
def get_scholarship_rankings(
    sort_by: str = Query("scholarship_rate", pattern="^(scholarship_rate|avg_scholarship_gmat|scholarship_entries)$"),
    min_data_points: int = Query(10, ge=1),
    limit: int = Query(30, ge=1, le=100),
):
    """Rank schools by scholarship generosity based on real applicant data.

    Returns schools sorted by scholarship rate (% of admitted students who
    reported receiving scholarships), with breakdown by tier.
    """
    if not _school_stats:
        raise HTTPException(503, "Scholarship data not loaded")

    ranked = [
        s for s in _school_stats.values()
        if s["scholarship_entries"] >= min_data_points
    ]
    ranked.sort(key=lambda x: x.get(sort_by, 0), reverse=True)

    return {
        "schools": ranked[:limit],
        "total_schools": len(ranked),
        "total_data_points": sum(s["scholarship_entries"] for s in ranked),
        "data_source": "GMAT Club Decision Tracker (self-reported)",
        "tier_legend": {
            "tier_1": "Partial scholarship (~25% tuition)",
            "tier_2": "Half scholarship (~50% tuition)",
            "tier_3": "Major scholarship (~75% tuition)",
            "tier_4": "Full ride (100% tuition)",
        },
    }


@router.get("/school/{school_id}")
def get_school_scholarship_detail(school_id: str):
    """Detailed scholarship intelligence for a specific school."""
    # Try both school_id and school_slug
    stats = _school_stats.get(school_id)
    if not stats:
        # Try matching by slug
        for sid, s in _school_stats.items():
            if s.get("school_slug") == school_id:
                stats = s
                break

    if not stats:
        raise HTTPException(404, f"No scholarship data for school: {school_id}")

    return {
        "school": stats,
        "insights": _generate_school_insights(stats),
    }


@router.post("/profile-match")
def profile_scholarship_match(profile: ProfileInput, school_ids: list[str] = []):
    """Estimate scholarship probability for a specific profile at target schools.

    Uses similarity matching against historical scholarship recipients to provide
    data-backed estimates rather than rule-based guesses.
    """
    if not _decisions:
        raise HTTPException(503, "Decision data not loaded")

    target_schools = school_ids if school_ids else list(_school_stats.keys())
    results = []

    for sid in target_schools:
        stats = _school_stats.get(sid)
        if not stats or stats["admitted_total"] == 0:
            continue

        match_score = _compute_profile_match(profile, stats)
        probability = _estimate_scholarship_probability(profile, stats, match_score)

        results.append({
            "school_id": sid,
            "school_slug": stats.get("school_slug", sid),
            "scholarship_probability_pct": probability["overall_pct"],
            "expected_tier": probability["expected_tier"],
            "confidence": probability["confidence"],
            "match_factors": match_score,
            "school_scholarship_rate": stats["scholarship_rate"],
            "data_points": stats["scholarship_entries"],
        })

    results.sort(key=lambda x: x["scholarship_probability_pct"], reverse=True)

    return {
        "profile": profile.dict(exclude_none=True),
        "results": results,
        "recommendation": _generate_recommendation(results),
    }


@router.post("/optimize")
def optimize_school_list(request: ScholarshipOptimizeRequest):
    """Optimize a school list to maximize total scholarship yield.

    Analyzes each school's scholarship patterns against the applicant profile
    and recommends a balanced list of reach/target/safety schools for maximum
    financial aid.
    """
    if not _school_stats:
        raise HTTPException(503, "Scholarship data not loaded")

    profile = request.profile
    all_schools = request.target_schools if request.target_schools else list(_school_stats.keys())

    scored_schools = []
    for sid in all_schools:
        stats = _school_stats.get(sid)
        if not stats or stats["scholarship_entries"] < 5:
            continue

        match = _compute_profile_match(profile, stats)
        prob = _estimate_scholarship_probability(profile, stats, match)

        scored_schools.append({
            "school_id": sid,
            "school_slug": stats.get("school_slug", sid),
            "scholarship_probability_pct": prob["overall_pct"],
            "expected_tier": prob["expected_tier"],
            "scholarship_rate": stats["scholarship_rate"],
            "category": _categorize_school(prob["overall_pct"]),
            "data_points": stats["scholarship_entries"],
        })

    scored_schools.sort(key=lambda x: x["scholarship_probability_pct"], reverse=True)

    # Build balanced list: 3-4 high probability, 4-5 medium, 2-3 reach
    high = [s for s in scored_schools if s["category"] == "strong_chance"]
    medium = [s for s in scored_schools if s["category"] == "moderate_chance"]
    reach = [s for s in scored_schools if s["category"] == "reach"]

    max_results = request.max_results
    recommended = []
    # Prioritize: some high, some medium, a few reach
    recommended.extend(high[:min(5, max_results // 3)])
    recommended.extend(medium[:min(6, max_results // 3)])
    recommended.extend(reach[:min(4, max_results // 3)])
    recommended = recommended[:max_results]

    return {
        "profile": profile.dict(exclude_none=True),
        "optimized_list": recommended,
        "all_ranked": scored_schools[:30],
        "summary": {
            "strong_chance_count": len(high),
            "moderate_chance_count": len(medium),
            "reach_count": len(reach),
            "avg_probability": (
                round(sum(s["scholarship_probability_pct"] for s in scored_schools) / len(scored_schools), 1)
                if scored_schools
                else 0
            ),
        },
    }


# ── Internal Analysis Functions ──────────────────────────────────────────────


def _compute_profile_match(profile: ProfileInput, stats: dict) -> dict:
    """Compute how well a profile matches historical scholarship recipients."""
    factors = {}

    # GMAT match
    if profile.gmat and stats.get("avg_scholarship_gmat"):
        delta = profile.gmat - stats["avg_scholarship_gmat"]
        factors["gmat_delta"] = delta
        factors["gmat_score"] = min(1.0, max(0.0, 0.5 + delta / 80))
    else:
        factors["gmat_score"] = 0.5  # neutral

    # GPA match
    if profile.gpa and stats.get("avg_scholarship_gpa"):
        delta = profile.gpa - stats["avg_scholarship_gpa"]
        factors["gpa_delta"] = round(delta, 2)
        factors["gpa_score"] = min(1.0, max(0.0, 0.5 + delta / 0.6))
    else:
        factors["gpa_score"] = 0.5

    # YOE match
    if profile.years_experience and stats.get("avg_scholarship_yoe"):
        delta = profile.years_experience - stats["avg_scholarship_yoe"]
        # Slight premium for 3-6 years (sweet spot)
        if 3 <= profile.years_experience <= 6:
            factors["yoe_score"] = 0.65
        else:
            factors["yoe_score"] = min(1.0, max(0.0, 0.5 - abs(delta) / 8))
    else:
        factors["yoe_score"] = 0.5

    # Industry match
    if profile.industry and stats.get("top_scholarship_industries"):
        top_industries = [i["industry"].lower() for i in stats["top_scholarship_industries"]]
        if profile.industry.lower() in top_industries:
            factors["industry_score"] = 0.7
        else:
            factors["industry_score"] = 0.4
    else:
        factors["industry_score"] = 0.5

    # Weighted composite
    weights = {"gmat_score": 0.40, "gpa_score": 0.25, "yoe_score": 0.20, "industry_score": 0.15}
    composite = sum(factors.get(k, 0.5) * w for k, w in weights.items())
    factors["composite_score"] = round(composite, 3)

    return factors


def _estimate_scholarship_probability(
    profile: ProfileInput,
    stats: dict,
    match: dict,
) -> dict:
    """Estimate scholarship probability based on profile match and school rate."""
    base_rate = stats["scholarship_rate"] / 100  # Convert % to 0-1
    composite = match["composite_score"]

    # Probability = base_rate adjusted by how well profile matches recipients
    # If composite > 0.5 (better than average recipient), probability increases
    # If composite < 0.5, probability decreases
    adjustment = (composite - 0.5) * 2  # -1 to 1 range
    probability = base_rate * (1 + adjustment * 0.6)  # ±60% swing
    probability = min(0.95, max(0.02, probability))

    overall_pct = round(probability * 100, 1)

    # Expected tier
    if probability > 0.6 and composite > 0.65:
        expected_tier = 3
    elif probability > 0.4 and composite > 0.55:
        expected_tier = 2
    elif probability > 0.15:
        expected_tier = 1
    else:
        expected_tier = 0

    # Confidence based on data volume
    data_points = stats.get("scholarship_data_points", 0)
    if data_points >= 50:
        confidence = "high"
    elif data_points >= 20:
        confidence = "medium"
    else:
        confidence = "low"

    return {
        "overall_pct": overall_pct,
        "expected_tier": expected_tier,
        "confidence": confidence,
    }


def _categorize_school(probability_pct: float) -> str:
    if probability_pct >= 40:
        return "strong_chance"
    elif probability_pct >= 20:
        return "moderate_chance"
    else:
        return "reach"


def _generate_school_insights(stats: dict) -> list[str]:
    """Generate human-readable insights for a school's scholarship patterns."""
    insights = []
    rate = stats["scholarship_rate"]
    entries = stats["scholarship_entries"]
    admitted = stats["admitted_total"]

    if rate >= 30:
        insights.append(
            f"This school is relatively generous — {rate}% of admitted applicants "
            f"reported receiving scholarships ({entries} out of {admitted} admits)."
        )
    elif rate >= 15:
        insights.append(
            f"This school offers moderate scholarship opportunities — {rate}% of "
            f"admits reported receiving aid."
        )
    else:
        insights.append(
            f"Scholarships are competitive here — only {rate}% of admits reported "
            f"receiving financial aid."
        )

    # GMAT insight
    if stats.get("avg_scholarship_gmat") and stats.get("avg_admitted_gmat"):
        gmat_diff = stats["avg_scholarship_gmat"] - stats["avg_admitted_gmat"]
        if gmat_diff > 15:
            insights.append(
                f"Scholarship recipients averaged {stats['avg_scholarship_gmat']} GMAT — "
                f"{gmat_diff} points above the average admit ({stats['avg_admitted_gmat']}). "
                f"A strong test score significantly increases your scholarship odds."
            )
        else:
            insights.append(
                f"Scholarship recipients averaged {stats['avg_scholarship_gmat']} GMAT, "
                f"close to the overall admit average ({stats['avg_admitted_gmat']}). "
                f"This school may weight holistic factors in aid decisions."
            )

    # Tier insight
    tier_dist = stats.get("tier_distribution", {})
    if tier_dist:
        tier_4 = tier_dist.get("tier_4", 0)
        if tier_4 > 20:
            insights.append(
                f"{tier_4}% of scholarship recipients reported full rides ($$$$). "
                f"This school invests heavily in top candidates."
            )
        tier_1 = tier_dist.get("tier_1", 0)
        if tier_1 > 50:
            insights.append(
                f"Most scholarships here are partial ({tier_1}% at tier $). "
                f"Full rides are rare — plan for partial tuition coverage."
            )

    # Top industries
    top_ind = stats.get("top_scholarship_industries", [])
    if len(top_ind) >= 2:
        industries = ", ".join(i["industry"] for i in top_ind[:3])
        insights.append(
            f"Scholarship recipients most commonly come from: {industries}."
        )

    return insights


def _generate_recommendation(results: list[dict]) -> dict:
    """Generate an overall recommendation from profile match results."""
    if not results:
        return {"summary": "No matching schools found.", "top_picks": []}

    high_prob = [r for r in results if r["scholarship_probability_pct"] >= 40]
    medium_prob = [r for r in results if 20 <= r["scholarship_probability_pct"] < 40]

    top_picks = [r["school_id"] for r in results[:5]]

    if len(high_prob) >= 3:
        summary = (
            f"Strong scholarship prospects! {len(high_prob)} schools show high "
            f"probability of financial aid for your profile."
        )
    elif len(high_prob) + len(medium_prob) >= 3:
        summary = (
            f"Moderate scholarship prospects. {len(high_prob)} schools show high "
            f"probability and {len(medium_prob)} show moderate probability."
        )
    else:
        summary = (
            "Scholarship opportunities may be limited for your current profile. "
            "Consider schools with higher scholarship rates or strengthening your test scores."
        )

    return {
        "summary": summary,
        "top_picks": top_picks,
        "high_probability_count": len(high_prob),
        "moderate_probability_count": len(medium_prob),
    }
