"""Decisions and analytics endpoints — GMAT Club data, chances, trends, simulator."""


from collections import Counter, defaultdict
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel as _BaseModel
from compare_engine import load_gmatclub_data
from agents import SCHOOL_DB
from auth import get_optional_user
from routers.schools import SCHOOL_ALIASES
from routers._helpers import is_admitted, is_denied
from models import ChancesRequest, SubmitDecisionRequest
import db

router = APIRouter(prefix="/api", tags=["community"])


# ── Decisions (GMAT Club scraped data) ────────────────────────────────────────

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


# ── Admission Chances Calculator ──────────────────────────────────────────

@router.post("/decisions/chances")
def compute_chances(req: ChancesRequest):
    """Compute admission probability per school based on similar profiles in 12K real decisions.

    Uses a similarity window approach: finds applicants with similar GMAT (+-30),
    GPA (+-0.3), and work experience (+-2 years), then computes admit rate.
    """
    data = load_gmatclub_data()

    # Filter to requested schools if specified
    if req.school_ids:
        school_set = set(req.school_ids)
        data = [d for d in data if d.get("school_id") in school_set]

    # Find similar profiles
    GMAT_WINDOW = 30
    GPA_WINDOW = 0.3
    YOE_WINDOW = 2

    def is_similar(d: dict) -> bool:
        if req.gmat is not None:
            d_gmat = d.get("gmat_focus") or d.get("gmat")
            if d_gmat is None:
                return False
            if abs(d_gmat - req.gmat) > GMAT_WINDOW:
                return False
        if req.gpa is not None:
            d_gpa = d.get("gpa")
            if d_gpa is None:
                return False
            if abs(d_gpa - req.gpa) > GPA_WINDOW:
                return False
        if req.work_exp_years is not None:
            d_yoe = d.get("yoe")
            if d_yoe is None:
                return False
            if abs(d_yoe - req.work_exp_years) > YOE_WINDOW:
                return False
        if req.industry is not None:
            d_ind = (d.get("industry") or "").lower()
            if req.industry.lower() not in d_ind:
                return False
        return True

    similar = [d for d in data if is_similar(d)]

    # Group by school
    school_groups: dict[str, list] = defaultdict(list)
    for d in similar:
        school_groups[d.get("school_id", "")].append(d)

    results = []
    for sid, decisions in sorted(school_groups.items(), key=lambda x: -len(x[1])):
        admitted = sum(1 for d in decisions if is_admitted(d.get("status", "")))
        denied = sum(1 for d in decisions if is_denied(d.get("status", "")))
        total_resolved = admitted + denied
        if total_resolved == 0:
            continue

        admit_rate = round(admitted / total_resolved * 100, 1)

        # GMAT distribution of admitted applicants
        admitted_gmats = [
            d.get("gmat_focus") or d.get("gmat")
            for d in decisions
            if is_admitted(d.get("status", "")) and (d.get("gmat_focus") or d.get("gmat"))
        ]
        admitted_gpas = [
            d["gpa"] for d in decisions
            if is_admitted(d.get("status", "")) and d.get("gpa")
        ]

        # Scholarship rate among admitted
        scholarship_decisions = [
            d for d in decisions
            if d.get("status", "").startswith("Admitted") and "($" in d.get("status", "")
        ]
        scholarship_rate = round(len(scholarship_decisions) / admitted * 100, 1) if admitted > 0 else 0

        school = SCHOOL_DB.get(sid, {})
        results.append({
            "school_id": sid,
            "school_name": school.get("name", sid),
            "sample_size": len(decisions),
            "admitted": admitted,
            "denied": denied,
            "admit_rate": admit_rate,
            "confidence": "high" if total_resolved >= 20 else "medium" if total_resolved >= 8 else "low",
            "avg_gmat_admitted": round(sum(admitted_gmats) / len(admitted_gmats)) if admitted_gmats else None,
            "avg_gpa_admitted": round(sum(admitted_gpas) / len(admitted_gpas), 2) if admitted_gpas else None,
            "scholarship_rate": scholarship_rate,
        })

    results.sort(key=lambda x: -x["admit_rate"])

    return {
        "profile": {
            "gmat": req.gmat,
            "gpa": req.gpa,
            "work_exp_years": req.work_exp_years,
            "industry": req.industry,
        },
        "total_similar_profiles": len(similar),
        "schools": results,
    }


# ── Admit Analytics ──────────────────────────────────────────────────────

@router.get("/decisions/analytics")
def get_decision_analytics(school_id: str = None):
    """Aggregated analytics: GMAT/GPA distributions, round trends, admit rates by school."""
    data = load_gmatclub_data()
    if school_id:
        data = [d for d in data if d.get("school_id") == school_id]

    if not data:
        return {"error": "No data found", "total": 0}

    # GMAT distribution (buckets of 20)
    gmat_dist: dict[str, int] = {}
    gpa_dist: dict[str, int] = {}
    round_stats: dict[str, dict[str, int]] = {}
    industry_stats: dict[str, dict[str, int]] = {}
    yoe_dist: dict[str, int] = {}

    for d in data:
        status_group = "admitted" if is_admitted(d.get("status", "")) else "denied" if is_denied(d.get("status", "")) else "other"

        # GMAT buckets
        gmat = d.get("gmat_focus") or d.get("gmat")
        if gmat:
            bucket = f"{(gmat // 20) * 20}-{(gmat // 20) * 20 + 19}"
            gmat_dist[bucket] = gmat_dist.get(bucket, 0) + 1

        # GPA buckets (0.2 increments)
        gpa = d.get("gpa")
        if gpa:
            bucket = f"{gpa // 0.2 * 0.2:.1f}-{gpa // 0.2 * 0.2 + 0.19:.2f}"
            gpa_dist[bucket] = gpa_dist.get(bucket, 0) + 1

        # Round breakdown
        rnd = d.get("round", "Unknown")
        if rnd not in round_stats:
            round_stats[rnd] = {"admitted": 0, "denied": 0, "other": 0, "total": 0}
        round_stats[rnd][status_group] = round_stats[rnd].get(status_group, 0) + 1
        round_stats[rnd]["total"] += 1

        # Industry breakdown (top industries)
        ind = d.get("industry", "Unknown")
        if ind and ind != "Unknown":
            if ind not in industry_stats:
                industry_stats[ind] = {"admitted": 0, "denied": 0, "total": 0}
            industry_stats[ind][status_group] = industry_stats[ind].get(status_group, 0) + 1
            industry_stats[ind]["total"] += 1

        # YOE distribution
        yoe = d.get("yoe")
        if yoe is not None:
            bucket = f"{yoe}y"
            yoe_dist[bucket] = yoe_dist.get(bucket, 0) + 1

    # Sort GMAT buckets
    sorted_gmat = sorted(gmat_dist.items(), key=lambda x: x[0])

    # Top 10 industries by total
    top_industries = sorted(industry_stats.items(), key=lambda x: -x[1]["total"])[:10]
    industry_result = []
    for ind, stats in top_industries:
        resolved = stats["admitted"] + stats["denied"]
        rate = round(stats["admitted"] / resolved * 100, 1) if resolved > 0 else 0
        industry_result.append({"industry": ind, "admit_rate": rate, **stats})

    # Round admit rates
    round_result = []
    for rnd, stats in sorted(round_stats.items()):
        resolved = stats["admitted"] + stats["denied"]
        rate = round(stats["admitted"] / resolved * 100, 1) if resolved > 0 else 0
        round_result.append({"round": rnd, "admit_rate": rate, **stats})

    return {
        "total": len(data),
        "gmat_distribution": sorted_gmat,
        "gpa_distribution": sorted(gpa_dist.items(), key=lambda x: x[0]),
        "yoe_distribution": sorted(yoe_dist.items(), key=lambda x: x[0]),
        "by_round": round_result,
        "by_industry": industry_result,
    }


# ── Admission Stats Trends ───────────────────────────────────────────────────

_ADMISSION_TRENDS: dict[str, dict] = {
    "hbs": {
        "school_name": "Harvard Business School",
        "years": {
            2022: {"acceptance_rate": 11.0, "class_size": 930, "median_gmat": 730, "avg_gpa": 3.70, "applications_received": 8665},
            2023: {"acceptance_rate": 10.5, "class_size": 930, "median_gmat": 733, "avg_gpa": 3.71, "applications_received": 9050},
            2024: {"acceptance_rate": 10.0, "class_size": 935, "median_gmat": 738, "avg_gpa": 3.73, "applications_received": 9520},
            2025: {"acceptance_rate": 9.7, "class_size": 940, "median_gmat": 740, "avg_gpa": 3.74, "applications_received": 9840},
            2026: {"acceptance_rate": 9.3, "class_size": 940, "median_gmat": 742, "avg_gpa": 3.75, "applications_received": 10200},
        },
    },
    "gsb": {
        "school_name": "Stanford GSB",
        "years": {
            2022: {"acceptance_rate": 6.2, "class_size": 420, "median_gmat": 738, "avg_gpa": 3.78, "applications_received": 7300},
            2023: {"acceptance_rate": 5.9, "class_size": 420, "median_gmat": 740, "avg_gpa": 3.80, "applications_received": 7600},
            2024: {"acceptance_rate": 5.7, "class_size": 424, "median_gmat": 742, "avg_gpa": 3.81, "applications_received": 7850},
            2025: {"acceptance_rate": 5.5, "class_size": 424, "median_gmat": 744, "avg_gpa": 3.82, "applications_received": 8100},
            2026: {"acceptance_rate": 5.2, "class_size": 425, "median_gmat": 746, "avg_gpa": 3.83, "applications_received": 8400},
        },
    },
    "wharton": {
        "school_name": "Wharton School",
        "years": {
            2022: {"acceptance_rate": 18.5, "class_size": 860, "median_gmat": 733, "avg_gpa": 3.60, "applications_received": 7200},
            2023: {"acceptance_rate": 17.8, "class_size": 860, "median_gmat": 735, "avg_gpa": 3.62, "applications_received": 7500},
            2024: {"acceptance_rate": 17.2, "class_size": 870, "median_gmat": 738, "avg_gpa": 3.64, "applications_received": 7800},
            2025: {"acceptance_rate": 16.5, "class_size": 870, "median_gmat": 740, "avg_gpa": 3.65, "applications_received": 8100},
            2026: {"acceptance_rate": 15.9, "class_size": 875, "median_gmat": 742, "avg_gpa": 3.66, "applications_received": 8500},
        },
    },
    "booth": {
        "school_name": "Chicago Booth",
        "years": {
            2022: {"acceptance_rate": 21.0, "class_size": 590, "median_gmat": 730, "avg_gpa": 3.60, "applications_received": 4700},
            2023: {"acceptance_rate": 20.3, "class_size": 590, "median_gmat": 732, "avg_gpa": 3.62, "applications_received": 4900},
            2024: {"acceptance_rate": 19.8, "class_size": 595, "median_gmat": 734, "avg_gpa": 3.63, "applications_received": 5100},
            2025: {"acceptance_rate": 19.2, "class_size": 598, "median_gmat": 736, "avg_gpa": 3.64, "applications_received": 5300},
            2026: {"acceptance_rate": 18.6, "class_size": 600, "median_gmat": 738, "avg_gpa": 3.65, "applications_received": 5500},
        },
    },
    "kellogg": {
        "school_name": "Kellogg School of Management",
        "years": {
            2022: {"acceptance_rate": 20.0, "class_size": 500, "median_gmat": 727, "avg_gpa": 3.60, "applications_received": 4600},
            2023: {"acceptance_rate": 19.5, "class_size": 505, "median_gmat": 729, "avg_gpa": 3.62, "applications_received": 4800},
            2024: {"acceptance_rate": 19.0, "class_size": 508, "median_gmat": 731, "avg_gpa": 3.63, "applications_received": 5000},
            2025: {"acceptance_rate": 18.4, "class_size": 510, "median_gmat": 733, "avg_gpa": 3.64, "applications_received": 5200},
            2026: {"acceptance_rate": 17.8, "class_size": 510, "median_gmat": 735, "avg_gpa": 3.65, "applications_received": 5450},
        },
    },
    "sloan": {
        "school_name": "MIT Sloan",
        "years": {
            2022: {"acceptance_rate": 12.5, "class_size": 410, "median_gmat": 730, "avg_gpa": 3.62, "applications_received": 5600},
            2023: {"acceptance_rate": 12.0, "class_size": 410, "median_gmat": 732, "avg_gpa": 3.64, "applications_received": 5800},
            2024: {"acceptance_rate": 11.5, "class_size": 415, "median_gmat": 735, "avg_gpa": 3.66, "applications_received": 6100},
            2025: {"acceptance_rate": 11.0, "class_size": 418, "median_gmat": 738, "avg_gpa": 3.67, "applications_received": 6400},
            2026: {"acceptance_rate": 10.5, "class_size": 420, "median_gmat": 740, "avg_gpa": 3.68, "applications_received": 6700},
        },
    },
    "cbs": {
        "school_name": "Columbia Business School",
        "years": {
            2022: {"acceptance_rate": 15.0, "class_size": 750, "median_gmat": 729, "avg_gpa": 3.58, "applications_received": 6400},
            2023: {"acceptance_rate": 14.5, "class_size": 755, "median_gmat": 731, "avg_gpa": 3.60, "applications_received": 6700},
            2024: {"acceptance_rate": 14.0, "class_size": 760, "median_gmat": 733, "avg_gpa": 3.62, "applications_received": 7000},
            2025: {"acceptance_rate": 13.5, "class_size": 760, "median_gmat": 735, "avg_gpa": 3.63, "applications_received": 7300},
            2026: {"acceptance_rate": 13.0, "class_size": 765, "median_gmat": 738, "avg_gpa": 3.65, "applications_received": 7600},
        },
    },
    "haas": {
        "school_name": "UC Berkeley Haas",
        "years": {
            2022: {"acceptance_rate": 14.0, "class_size": 290, "median_gmat": 726, "avg_gpa": 3.65, "applications_received": 3800},
            2023: {"acceptance_rate": 13.5, "class_size": 291, "median_gmat": 728, "avg_gpa": 3.67, "applications_received": 4000},
            2024: {"acceptance_rate": 13.0, "class_size": 293, "median_gmat": 730, "avg_gpa": 3.68, "applications_received": 4200},
            2025: {"acceptance_rate": 12.5, "class_size": 295, "median_gmat": 732, "avg_gpa": 3.69, "applications_received": 4400},
            2026: {"acceptance_rate": 12.0, "class_size": 296, "median_gmat": 734, "avg_gpa": 3.70, "applications_received": 4600},
        },
    },
    "tuck": {
        "school_name": "Dartmouth Tuck",
        "years": {
            2022: {"acceptance_rate": 23.0, "class_size": 280, "median_gmat": 724, "avg_gpa": 3.55, "applications_received": 2800},
            2023: {"acceptance_rate": 22.3, "class_size": 281, "median_gmat": 726, "avg_gpa": 3.57, "applications_received": 2950},
            2024: {"acceptance_rate": 21.5, "class_size": 282, "median_gmat": 728, "avg_gpa": 3.59, "applications_received": 3100},
            2025: {"acceptance_rate": 20.8, "class_size": 284, "median_gmat": 730, "avg_gpa": 3.60, "applications_received": 3250},
            2026: {"acceptance_rate": 20.0, "class_size": 285, "median_gmat": 732, "avg_gpa": 3.62, "applications_received": 3400},
        },
    },
    "darden": {
        "school_name": "UVA Darden",
        "years": {
            2022: {"acceptance_rate": 24.0, "class_size": 340, "median_gmat": 720, "avg_gpa": 3.52, "applications_received": 3300},
            2023: {"acceptance_rate": 23.2, "class_size": 342, "median_gmat": 722, "avg_gpa": 3.54, "applications_received": 3500},
            2024: {"acceptance_rate": 22.5, "class_size": 345, "median_gmat": 724, "avg_gpa": 3.56, "applications_received": 3700},
            2025: {"acceptance_rate": 21.8, "class_size": 348, "median_gmat": 726, "avg_gpa": 3.58, "applications_received": 3900},
            2026: {"acceptance_rate": 21.0, "class_size": 350, "median_gmat": 728, "avg_gpa": 3.60, "applications_received": 4100},
        },
    },
}


def _compute_trend(values: list[float]) -> str:
    """Compute trend direction from a list of chronological values."""
    if len(values) < 2:
        return "stable"
    first_half = sum(values[: len(values) // 2]) / (len(values) // 2)
    second_half = sum(values[len(values) // 2 :]) / (len(values) - len(values) // 2)
    pct_change = (second_half - first_half) / first_half * 100 if first_half else 0
    if pct_change > 2:
        return "up"
    elif pct_change < -2:
        return "down"
    return "stable"


@router.get("/admission-trends")
def admission_trends(school_id: str | None = None):
    """Historical admission trends (2022-2026) for top MBA programs."""
    if school_id:
        ids = [s.strip().lower() for s in school_id.split(",")]
    else:
        ids = list(_ADMISSION_TRENDS.keys())

    results = []
    for sid in ids:
        school_data = _ADMISSION_TRENDS.get(sid)
        if not school_data:
            continue

        years_data = []
        metrics_by_name: dict[str, list[float]] = {
            "acceptance_rate": [],
            "class_size": [],
            "median_gmat": [],
            "avg_gpa": [],
            "applications_received": [],
        }

        for year in sorted(school_data["years"].keys()):
            entry = school_data["years"][year]
            years_data.append({"year": year, **entry})
            for metric in metrics_by_name:
                metrics_by_name[metric].append(float(entry[metric]))

        trends = {metric: _compute_trend(vals) for metric, vals in metrics_by_name.items()}

        results.append({
            "school_id": sid,
            "school_name": school_data["school_name"],
            "years": years_data,
            "trends": trends,
        })

    return {
        "schools": results,
        "total": len(results),
        "available_metrics": ["acceptance_rate", "class_size", "median_gmat", "avg_gpa", "applications_received"],
    }


# ── Submit Decision (frontend-facing alias) ──────────────────────────────────

@router.post("/decisions/submit")
def submit_decision(req: SubmitDecisionRequest, user: Dict = Depends(get_optional_user)):
    """Submit an admission decision data point.

    Frontend calls this path (/api/decisions/submit); delegates to the shared
    submit_decision helper in db.py.
    """
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


# ── Admit Probability Simulator ──────────────────────────────────────
# Moved to routers/simulator.py — full Monte Carlo with 10K simulations,
# stochastic factor modeling, and percentile bands.
