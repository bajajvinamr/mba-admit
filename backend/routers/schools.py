"""School directory, odds calculator, and fit-score endpoints."""

import logging
import math
import re
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Response
from agents import SCHOOL_DB, SCHOOL_ALIASES, get_school_data_quality
from models import OddsRequest, FitScoreRequest, ApplicationFeesRequest
from routers.applicant_data import get_applicant_data_summary

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["schools"])


def _safe_int(val, default=None):
    """Coerce to int or return default. Prevents 'N/A' strings in numeric fields."""
    if val is None:
        return default
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def _safe_float(val, default=None):
    """Coerce to float or return default."""
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _school_summary(sid: str, school: dict) -> dict:
    """Standard school summary dict used by list and search endpoints.

    All numeric fields return int/float or None — never strings like 'N/A'.
    Frontend can safely do arithmetic on these without type errors.
    """
    dq = school.get("data_quality") or get_school_data_quality(sid)
    return {
        "id": sid,
        "name": school.get("name") or sid.replace("_", " ").title(),
        "location": school.get("location") or "Unknown Location",
        "country": school.get("country") or "Unknown",
        "gmat_avg": _safe_int(school.get("gmat_avg")),
        "median_salary": school.get("median_salary"),
        "acceptance_rate": _safe_float(school.get("acceptance_rate")),
        "class_size": _safe_int(school.get("class_size")),
        "specializations": school.get("specializations") or [],
        "tuition_usd": _safe_int(school.get("tuition_usd")),
        "program_duration": (school.get("program_details") or {}).get("duration"),
        "stem_designated": (school.get("program_details") or {}).get("stem_designated", False),
        "essay_count": len(school.get("essay_prompts") or []),
        "admission_deadlines": school.get("admission_deadlines") or [],
        "primary_admission_test": school.get("primary_admission_test"),
        "program_count": len(school.get("programs") or []),
        "degree_type": school.get("degree_type", "MBA"),
        "program_length_months": _safe_int(school.get("program_length_months")),
        "program_format": school.get("program_format"),
        "application_fee_usd": _safe_int(school.get("application_fee_usd")),
        "data_source": dq.get("source", "synthetic") if isinstance(dq, dict) else "synthetic",
        "data_confidence": dq.get("confidence", 0.0) if isinstance(dq, dict) else 0.0,
    }


@router.get("/schools")
def list_schools(
    response: Response,
    q: str = Query(default=None, description="Search query — matches name, ID, or common abbreviations"),
    country: str = Query(default=None, description="Filter by country name (case-insensitive)"),
    city: str = Query(default=None, description="Filter by city name (substring match, case-insensitive)"),
    degree_type: str = Query(default=None, description="Filter by degree type: MBA, MiM, Executive MBA, MBA (CAT)"),
    limit: int = Query(default=0, ge=0, le=500, description="Max results to return (0 = unlimited)"),
    offset: int = Query(default=0, ge=0, description="Number of results to skip (for pagination)"),
):
    """Returns the school directory, optionally filtered by search query, country, or city.

    Search matches against:
    - School name (e.g. 'London Business School')
    - School ID (e.g. 'lbs')
    - Common abbreviations (e.g. 'LBS', 'HBS', 'GSB')

    Use `limit` and `offset` for pagination.
    """
    if q:
        q_lower = q.strip().lower()
        matched: dict[str, int] = {}  # sid → relevance score (lower = better)

        # 1. Check alias map for abbreviation matches (highest relevance)
        for sid, aliases in SCHOOL_ALIASES.items():
            if any(q_lower == alias for alias in aliases):
                if sid in SCHOOL_DB:
                    matched[sid] = 0  # exact alias match
            elif any(q_lower in alias for alias in aliases):
                if sid in SCHOOL_DB:
                    matched.setdefault(sid, 5)

        # 2. Check school names and IDs — ranked by match quality
        for sid, school in SCHOOL_DB.items():
            name_lower = school.get("name", "").lower()
            if sid == q_lower:
                matched[sid] = 0  # exact ID match
            elif sid.startswith(q_lower):
                matched.setdefault(sid, 1)  # ID prefix
            elif name_lower.startswith(q_lower):
                matched.setdefault(sid, 2)  # name prefix
            elif q_lower in name_lower:
                matched.setdefault(sid, 3)  # name substring
            elif q_lower in sid:
                matched.setdefault(sid, 4)  # ID substring

        results = [_school_summary(sid, SCHOOL_DB[sid])
                   for sid in sorted(matched, key=lambda s: (matched[s], s))]
    else:
        # No query — return all schools
        results = [_school_summary(sid, school) for sid, school in SCHOOL_DB.items()]

    # Apply geo filters
    if country:
        country_lower = country.strip().lower()
        results = [s for s in results if s.get("country", "").lower() == country_lower]
    if city:
        city_lower = city.strip().lower()
        results = [s for s in results if city_lower in s.get("location", "").lower()]
    if degree_type:
        dt_lower = degree_type.strip().lower()
        results = [s for s in results if s.get("degree_type", "MBA").lower() == dt_lower]

    total_count = len(results)

    # Apply pagination if requested
    if offset > 0:
        results = results[offset:]
    if limit > 0:
        results = results[:limit]

    # Cache school list for 5 minutes (data changes infrequently)
    response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=600"
    response.headers["X-Total-Count"] = str(total_count)
    response.headers["Access-Control-Expose-Headers"] = "X-Total-Count"
    return results


@router.get("/schools/names")
def school_names():
    """Lightweight endpoint for dropdowns and autocomplete — just id, name, country.

    ~15KB gzipped vs ~36KB for the full school list.
    Use this for select dropdowns, search autocomplete, and name lookups.
    """
    return [
        {"id": sid, "name": s.get("name", sid), "country": s.get("country", "")}
        for sid, s in SCHOOL_DB.items()
    ]


@router.get("/schools/featured")
def featured_schools(response: Response):
    """Returns a curated set of top schools per program type for the directory landing."""
    response.headers["Cache-Control"] = "public, max-age=600"

    # Top MBA schools by lowest acceptance rate (proxy for prestige)
    mba = sorted(
        [(sid, s) for sid, s in SCHOOL_DB.items() if s.get("degree_type") == "MBA"],
        key=lambda x: x[1].get("acceptance_rate", 100),
    )[:15]

    # Top MiM by lowest acceptance rate
    mim = sorted(
        [(sid, s) for sid, s in SCHOOL_DB.items() if s.get("degree_type") == "MiM"],
        key=lambda x: x[1].get("acceptance_rate", 100),
    )[:10]

    # Top EMBA by highest GMAT
    emba = sorted(
        [(sid, s) for sid, s in SCHOOL_DB.items() if s.get("degree_type") == "Executive MBA"],
        key=lambda x: -(x[1].get("gmat_avg") or 0),
    )[:10]

    # Top CAT by lowest acceptance rate
    cat = sorted(
        [(sid, s) for sid, s in SCHOOL_DB.items() if s.get("degree_type") == "MBA (CAT)"],
        key=lambda x: x[1].get("acceptance_rate", 100),
    )[:10]

    def mini(sid: str, s: dict) -> dict:
        return {
            "id": sid, "name": s.get("name", sid), "location": s.get("location", ""),
            "country": s.get("country", ""), "gmat_avg": s.get("gmat_avg"),
            "acceptance_rate": s.get("acceptance_rate"), "tuition_usd": s.get("tuition_usd"),
            "degree_type": s.get("degree_type", "MBA"),
        }

    return {
        "mba": [mini(sid, s) for sid, s in mba],
        "mim": [mini(sid, s) for sid, s in mim],
        "emba": [mini(sid, s) for sid, s in emba],
        "cat": [mini(sid, s) for sid, s in cat],
        "total_schools": len(SCHOOL_DB),
    }


@router.get("/schools/geo-meta")
def geo_meta():
    """Returns unique countries and cities with school counts for geo page generation."""
    from collections import Counter
    countries: Counter[str] = Counter()
    cities: Counter[str] = Counter()
    degree_types: Counter[str] = Counter()
    for school in SCHOOL_DB.values():
        c = school.get("country", "Unknown")
        if c and c not in ("?", "Unknown"):
            countries[c] += 1
        loc = school.get("location", "")
        if loc and loc not in ("?", "Unknown", "Unknown Location"):
            city_name = loc.split(",")[0].strip()
            if city_name:
                cities[city_name] += 1
        dt = school.get("degree_type", "MBA")
        degree_types[dt] += 1

    def slugify(s: str) -> str:
        return s.lower().replace(" ", "-").replace(".", "")

    return {
        "countries": sorted(
            [{"name": c, "slug": slugify(c), "count": n} for c, n in countries.items()],
            key=lambda x: -x["count"],
        ),
        "cities": sorted(
            [{"name": c, "slug": slugify(c), "count": n} for c, n in cities.items() if n >= 2],
            key=lambda x: -x["count"],
        ),
        "degree_types": sorted(
            [{"name": dt, "count": n} for dt, n in degree_types.items()],
            key=lambda x: -x["count"],
        ),
        "total_schools": len(SCHOOL_DB),
    }


# ── Program Stats by Degree Type ──────────────────────────────────────────

@router.get("/schools/program-stats")
def program_stats(degree_type: Optional[str] = Query(default=None)):
    """Returns aggregate stats per degree type: count, avg GMAT, avg tuition, top countries."""
    from collections import Counter
    buckets: dict[str, list] = {}
    for school in SCHOOL_DB.values():
        dt = school.get("degree_type", "MBA")
        buckets.setdefault(dt, []).append(school)

    def stats_for(schools_list: list) -> dict:
        gmats = [s["gmat_avg"] for s in schools_list if s.get("gmat_avg")]
        tuitions = [s["tuition_usd"] for s in schools_list if s.get("tuition_usd")]
        countries = Counter(s.get("country", "?") for s in schools_list)
        top_countries = [{"name": c, "count": n} for c, n in countries.most_common(10) if c != "?"]
        return {
            "count": len(schools_list),
            "avg_gmat": round(sum(gmats) / len(gmats)) if gmats else None,
            "avg_tuition_usd": round(sum(tuitions) / len(tuitions)) if tuitions else None,
            "countries": len(set(s.get("country") for s in schools_list if s.get("country"))),
            "top_countries": top_countries,
        }

    if degree_type:
        matching = buckets.get(degree_type, [])
        if not matching:
            raise HTTPException(404, f"No programs found for degree_type={degree_type}")
        return {"degree_type": degree_type, **stats_for(matching)}

    return {
        "program_types": [
            {"degree_type": dt, **stats_for(schools)}
            for dt, schools in sorted(buckets.items(), key=lambda x: -len(x[1]))
        ],
        "total_schools": len(SCHOOL_DB),
    }


# ── Class Profile Comparison ──────────────────────────────────────────────

@router.get("/schools/class-profile")
def get_class_profiles(school_ids: str = Query(description="Comma-separated school IDs")):
    """Compare class profile data across schools."""
    ids = [s.strip() for s in school_ids.split(",") if s.strip()]
    if not ids:
        raise HTTPException(400, "Provide at least one school_id")

    profiles = []
    for sid in ids:
        sid_lower = sid.lower()
        school = SCHOOL_DB.get(sid_lower) or SCHOOL_DB.get(SCHOOL_ALIASES.get(sid_lower, ""))
        if not school:
            continue

        prog = school.get("program_details", {}) or {}
        cp = school.get("class_profile", {}) or {}
        placement = school.get("placement_stats", {}) or {}

        profiles.append({
            "school_id": sid_lower,
            "school_name": school.get("name", sid),
            "class_size": prog.get("class_size") or school.get("class_size", 0),
            "avg_age": prog.get("avg_age") or cp.get("avg_age"),
            "female_pct": prog.get("female_percentage") or cp.get("female_pct"),
            "international_pct": prog.get("international_percentage") or cp.get("international_pct"),
            "countries_represented": prog.get("countries_represented") or cp.get("countries"),
            "avg_gmat": school.get("gmat_avg"),
            "avg_gpa": cp.get("avg_gpa"),
            "avg_work_exp": prog.get("avg_work_experience") or cp.get("avg_work_exp"),
            "acceptance_rate": school.get("acceptance_rate"),
            "median_salary": school.get("median_salary"),
            "stem_designated": school.get("stem_designated", False),
            "employment_rate": (placement.get("employment_rate_3mo_pct")
                                or placement.get("employment_rate_3_months")),
        })

    return {
        "profiles": profiles,
        "school_count": len(profiles),
    }


# ── GMAT Score Targets ─────────────────────────────────────────────────

@router.get("/schools/gmat-targets")
def get_gmat_targets():
    """Get GMAT score targets for top schools, grouped by tier."""
    tiers: dict = {"M7": [], "T15": [], "T25": [], "Other": []}

    M7_IDS = {"hbs", "gsb", "wharton", "booth", "kellogg", "cbs", "sloan"}
    T15_IDS = {"tuck", "haas", "ross", "fuqua", "darden", "stern", "yale-som", "johnson"}
    T25_IDS = {"anderson", "tepper", "kenan-flagler", "mccombs", "marshall",
               "georgetown-mcdonough", "goizueta", "kelley", "olin", "foster"}

    for sid, school in SCHOOL_DB.items():
        gmat = school.get("gmat_avg")
        if not gmat or not isinstance(gmat, (int, float)):
            continue

        entry = {
            "school_id": sid,
            "school_name": school.get("name", sid),
            "gmat_avg": gmat,
            "acceptance_rate": school.get("acceptance_rate"),
        }

        if sid in M7_IDS:
            tiers["M7"].append(entry)
        elif sid in T15_IDS:
            tiers["T15"].append(entry)
        elif sid in T25_IDS:
            tiers["T25"].append(entry)
        else:
            tiers["Other"].append(entry)

    # Sort each tier by GMAT
    for tier in tiers.values():
        tier.sort(key=lambda x: x["gmat_avg"], reverse=True)

    return {
        "tiers": tiers,
        "summary": {
            "M7_avg": round(sum(s["gmat_avg"] for s in tiers["M7"]) / max(len(tiers["M7"]), 1)),
            "T15_avg": round(sum(s["gmat_avg"] for s in tiers["T15"]) / max(len(tiers["T15"]), 1)),
            "T25_avg": round(sum(s["gmat_avg"] for s in tiers["T25"]) / max(len(tiers["T25"]), 1)),
        },
    }


# ── Culture Matcher ───────────────────────────────────────────────────────

from pydantic import BaseModel as _BaseModel


class CultureMatchRequest(_BaseModel):
    priorities: dict[str, int]  # e.g. {"collaboration": 5, "entrepreneurship": 4}
    school_ids: list[str] | None = None  # optional filter, defaults to top 30


SCHOOL_CULTURE = {
    "hbs": {"case_method": 95, "collaboration": 80, "entrepreneurship": 90, "global": 85, "social_impact": 75, "innovation": 85, "networking": 95, "diversity": 80},
    "gsb": {"case_method": 50, "collaboration": 90, "entrepreneurship": 95, "global": 80, "social_impact": 85, "innovation": 95, "networking": 90, "diversity": 85},
    "wharton": {"case_method": 40, "collaboration": 75, "entrepreneurship": 80, "global": 85, "social_impact": 60, "innovation": 80, "networking": 90, "diversity": 80},
    "booth": {"case_method": 30, "collaboration": 80, "entrepreneurship": 75, "global": 75, "social_impact": 55, "innovation": 80, "networking": 85, "diversity": 75},
    "kellogg": {"case_method": 35, "collaboration": 95, "entrepreneurship": 70, "global": 80, "social_impact": 65, "innovation": 75, "networking": 95, "diversity": 80},
    "cbs": {"case_method": 60, "collaboration": 70, "entrepreneurship": 80, "global": 80, "social_impact": 60, "innovation": 75, "networking": 90, "diversity": 75},
    "sloan": {"case_method": 30, "collaboration": 85, "entrepreneurship": 85, "global": 80, "social_impact": 70, "innovation": 95, "networking": 80, "diversity": 80},
    "tuck": {"case_method": 50, "collaboration": 95, "entrepreneurship": 65, "global": 70, "social_impact": 70, "innovation": 65, "networking": 95, "diversity": 70},
    "haas": {"case_method": 40, "collaboration": 90, "entrepreneurship": 85, "global": 80, "social_impact": 80, "innovation": 90, "networking": 80, "diversity": 85},
    "ross": {"case_method": 30, "collaboration": 90, "entrepreneurship": 70, "global": 75, "social_impact": 80, "innovation": 75, "networking": 80, "diversity": 75},
    "fuqua": {"case_method": 45, "collaboration": 90, "entrepreneurship": 65, "global": 75, "social_impact": 70, "innovation": 70, "networking": 85, "diversity": 75},
    "darden": {"case_method": 95, "collaboration": 85, "entrepreneurship": 60, "global": 70, "social_impact": 65, "innovation": 60, "networking": 85, "diversity": 70},
    "stern": {"case_method": 30, "collaboration": 75, "entrepreneurship": 80, "global": 85, "social_impact": 60, "innovation": 80, "networking": 85, "diversity": 80},
    "yale_som": {"case_method": 35, "collaboration": 85, "entrepreneurship": 70, "global": 80, "social_impact": 90, "innovation": 75, "networking": 80, "diversity": 80},
    "anderson": {"case_method": 30, "collaboration": 80, "entrepreneurship": 80, "global": 75, "social_impact": 65, "innovation": 80, "networking": 80, "diversity": 80},
}

_CULTURE_DISPLAY = {
    "hbs": "Harvard Business School",
    "gsb": "Stanford GSB",
    "wharton": "Wharton",
    "booth": "Chicago Booth",
    "kellogg": "Kellogg",
    "cbs": "Columbia Business School",
    "sloan": "MIT Sloan",
    "tuck": "Tuck",
    "haas": "Berkeley Haas",
    "ross": "Michigan Ross",
    "fuqua": "Duke Fuqua",
    "darden": "UVA Darden",
    "stern": "NYU Stern",
    "yale_som": "Yale SOM",
    "anderson": "UCLA Anderson",
}


@router.post("/schools/culture-match")
def culture_match(req: CultureMatchRequest):
    """Score schools against user culture priorities and return ranked matches."""
    if not req.priorities:
        raise HTTPException(400, "At least one priority is required")

    # Determine which schools to evaluate
    if req.school_ids:
        candidates = {sid: traits for sid, traits in SCHOOL_CULTURE.items() if sid in req.school_ids}
    else:
        candidates = dict(list(SCHOOL_CULTURE.items())[:30])

    matches = []
    total_weight = sum(req.priorities.values()) or 1

    for sid, traits in candidates.items():
        weighted_sum = 0
        trait_scores: list[tuple[str, float]] = []

        for trait, importance in req.priorities.items():
            school_val = traits.get(trait, 50)  # default 50 if trait not tracked
            weighted_sum += (school_val / 100) * importance
            trait_scores.append((trait, school_val * importance))

        match_pct = round((weighted_sum / total_weight) * 100)
        match_pct = max(0, min(100, match_pct))

        # Sort traits by weighted score
        trait_scores.sort(key=lambda x: -x[1])
        top_traits = [t[0] for t in trait_scores[:2]]

        trait_scores.sort(key=lambda x: x[1])
        weak_traits = [t[0] for t in trait_scores[:1] if t[1] < trait_scores[-1][1] * 0.6]

        school_name = _CULTURE_DISPLAY.get(sid) or SCHOOL_DB.get(sid, {}).get("name", sid)

        matches.append({
            "school_id": sid,
            "school_name": school_name,
            "match_pct": match_pct,
            "top_traits": top_traits,
            "weak_traits": weak_traits,
        })

    matches.sort(key=lambda x: -x["match_pct"])

    return {"matches": matches}


# ── Alumni Network Explorer ──────────────────────────────────────────────

ALUMNI_DATA = {
    "hbs": {"total_alumni": 85000, "industries": {"Consulting": 25, "Finance": 22, "Tech": 18, "Healthcare": 8, "Entrepreneurship": 12, "PE/VC": 8, "Other": 7}, "top_companies": ["McKinsey", "BCG", "Goldman Sachs", "Amazon", "Google", "Bain"], "notable_alumni": ["Michael Bloomberg", "Sheryl Sandberg", "Jamie Dimon"]},
    "gsb": {"total_alumni": 32000, "industries": {"Tech": 30, "Entrepreneurship": 20, "PE/VC": 15, "Consulting": 12, "Finance": 10, "Nonprofit": 5, "Other": 8}, "top_companies": ["Google", "Apple", "Sequoia", "A16Z", "Nike", "McKinsey"], "notable_alumni": ["Phil Knight", "Sundar Pichai", "Mary Barra"]},
    "wharton": {"total_alumni": 100000, "industries": {"Finance": 30, "Consulting": 20, "Tech": 15, "PE/VC": 12, "Real Estate": 8, "Healthcare": 7, "Other": 8}, "top_companies": ["Goldman Sachs", "JP Morgan", "McKinsey", "Google", "Blackstone", "BCG"], "notable_alumni": ["Elon Musk", "Warren Buffett", "Sundar Pichai"]},
    "booth": {"total_alumni": 55000, "industries": {"Finance": 28, "Consulting": 22, "Tech": 15, "PE/VC": 12, "Entrepreneurship": 10, "Healthcare": 6, "Other": 7}, "top_companies": ["McKinsey", "BCG", "Goldman Sachs", "Citadel", "Amazon", "Google"], "notable_alumni": ["Satya Nadella", "Susan Wojcicki"]},
    "kellogg": {"total_alumni": 65000, "industries": {"Consulting": 28, "Tech": 18, "Finance": 15, "CPG/Marketing": 12, "Healthcare": 10, "Entrepreneurship": 8, "Other": 9}, "top_companies": ["McKinsey", "BCG", "Amazon", "Google", "Deloitte", "P&G"], "notable_alumni": ["Jacqueline Mars", "Rick Waddell"]},
    "cbs": {"total_alumni": 49000, "industries": {"Finance": 32, "Consulting": 18, "Media/Entertainment": 10, "Tech": 15, "PE/VC": 10, "Real Estate": 8, "Other": 7}, "top_companies": ["Goldman Sachs", "JP Morgan", "McKinsey", "Deloitte", "Amazon", "Blackstone"], "notable_alumni": ["Warren Buffett", "Henry Kravis"]},
    "sloan": {"total_alumni": 28000, "industries": {"Tech": 32, "Consulting": 18, "Finance": 12, "Entrepreneurship": 15, "Healthcare": 10, "Manufacturing": 6, "Other": 7}, "top_companies": ["Amazon", "Google", "McKinsey", "Microsoft", "Apple", "BCG"], "notable_alumni": ["Kofi Annan", "Robin Chase"]},
    "tuck": {"total_alumni": 11000, "industries": {"Consulting": 25, "Finance": 20, "Tech": 15, "CPG": 12, "Healthcare": 10, "Entrepreneurship": 8, "Other": 10}, "top_companies": ["McKinsey", "BCG", "Bain", "Amazon", "Goldman Sachs", "Google"], "notable_alumni": ["Timothy Geithner"]},
    "haas": {"total_alumni": 22000, "industries": {"Tech": 35, "Entrepreneurship": 18, "Consulting": 12, "Finance": 10, "Social Impact": 10, "Healthcare": 8, "Other": 7}, "top_companies": ["Google", "Apple", "Amazon", "Meta", "McKinsey", "Bain"], "notable_alumni": ["Walter Haas Jr.", "Steve Blank"]},
    "ross": {"total_alumni": 25000, "industries": {"Consulting": 22, "Tech": 20, "Finance": 15, "Healthcare": 12, "Social Impact": 10, "Manufacturing": 8, "Other": 13}, "top_companies": ["McKinsey", "Amazon", "Google", "Deloitte", "Ford", "BCG"], "notable_alumni": ["Stephen Ross"]},
    "fuqua": {"total_alumni": 20000, "industries": {"Consulting": 24, "Tech": 18, "Finance": 16, "Healthcare": 14, "Entrepreneurship": 10, "Energy": 8, "Other": 10}, "top_companies": ["McKinsey", "Deloitte", "Amazon", "BCG", "Google", "Goldman Sachs"], "notable_alumni": ["Melinda French Gates", "Tim Cook"]},
    "darden": {"total_alumni": 18000, "industries": {"Consulting": 26, "Finance": 22, "Tech": 16, "Healthcare": 10, "Entrepreneurship": 8, "CPG": 8, "Other": 10}, "top_companies": ["McKinsey", "BCG", "Bain", "Amazon", "Deloitte", "Goldman Sachs"], "notable_alumni": ["Steven Reinemund"]},
    "stern": {"total_alumni": 40000, "industries": {"Finance": 30, "Consulting": 18, "Tech": 16, "Media/Entertainment": 10, "PE/VC": 8, "Real Estate": 8, "Other": 10}, "top_companies": ["Goldman Sachs", "JP Morgan", "McKinsey", "Deloitte", "Google", "Amazon"], "notable_alumni": ["Alan Greenspan", "Richard Fuld"]},
    "yale_som": {"total_alumni": 12000, "industries": {"Consulting": 22, "Tech": 18, "Finance": 15, "Social Impact": 15, "Healthcare": 12, "Entrepreneurship": 8, "Other": 10}, "top_companies": ["McKinsey", "BCG", "Amazon", "Google", "Bridgewater", "Bain"], "notable_alumni": ["Indra Nooyi"]},
    "anderson": {"total_alumni": 24000, "industries": {"Tech": 28, "Entrepreneurship": 16, "Consulting": 14, "Finance": 14, "Entertainment": 10, "Healthcare": 8, "Other": 10}, "top_companies": ["Amazon", "Google", "McKinsey", "Disney", "Goldman Sachs", "BCG"], "notable_alumni": ["Hank McKinnell"]},
}

_ALUMNI_DISPLAY_NAMES = {
    "hbs": "Harvard Business School",
    "gsb": "Stanford GSB",
    "wharton": "Wharton",
    "booth": "Chicago Booth",
    "kellogg": "Kellogg",
    "cbs": "Columbia Business School",
    "sloan": "MIT Sloan",
    "tuck": "Tuck",
    "haas": "Berkeley Haas",
    "ross": "Michigan Ross",
    "fuqua": "Duke Fuqua",
    "darden": "UVA Darden",
    "stern": "NYU Stern",
    "yale_som": "Yale SOM",
    "anderson": "UCLA Anderson",
}


@router.get("/schools/alumni-network")
def get_alumni_network(school_ids: str = Query(description="Comma-separated school IDs")):
    """Get alumni network data for one or more schools."""
    ids = [s.strip() for s in school_ids.split(",") if s.strip()]
    if not ids:
        raise HTTPException(400, "Provide at least one school_id")

    results = []
    for sid in ids:
        sid_lower = sid.lower()
        data = ALUMNI_DATA.get(sid_lower)
        if not data:
            continue
        school_name = _ALUMNI_DISPLAY_NAMES.get(sid_lower) or SCHOOL_DB.get(sid_lower, {}).get("name", sid)
        results.append({
            "school_id": sid_lower,
            "school_name": school_name,
            "total_alumni": data["total_alumni"],
            "industries": data["industries"],
            "top_companies": data["top_companies"],
            "notable_alumni": data["notable_alumni"],
        })

    return {"schools": results, "school_count": len(results)}


@router.get("/schools/{school_id}")
def get_school(school_id: str):
    """Returns detail for a single school including essay prompts and data quality."""
    if school_id not in SCHOOL_DB:
        raise HTTPException(status_code=404, detail="School not found")
    school = dict(SCHOOL_DB[school_id])  # shallow copy to avoid mutating global
    dq = get_school_data_quality(school_id)

    # Merge enriched `deadlines` into `admission_deadlines` if the former is richer
    raw_deadlines = school.get("deadlines") or []
    existing_ad = school.get("admission_deadlines") or []
    if raw_deadlines and isinstance(raw_deadlines, list) and len(raw_deadlines) >= len(existing_ad):
        merged = []
        for dl in raw_deadlines:
            try:
                dt = datetime.strptime(dl.get("date", ""), "%Y-%m-%d")
                readable = dt.strftime("%B %d, %Y")
            except (ValueError, TypeError):
                readable = dl.get("date", "TBD")
            try:
                dec_dt = datetime.strptime(dl.get("decision_date", "") or "", "%Y-%m-%d")
                dec_readable = dec_dt.strftime("%B %d, %Y")
            except (ValueError, TypeError):
                dec_readable = dl.get("decision_date") or "TBD"
            merged.append({
                "round": dl.get("round", ""),
                "deadline": readable,
                "decision": dec_readable,
            })
        school["admission_deadlines"] = merged

    # Normalize placement_stats field names for frontend compatibility
    raw_ps = school.get("placement_stats") or {}
    if raw_ps:
        top_industries = raw_ps.get("top_industries") or []
        # Convert flat industry list to industry_breakdown format if needed
        industry_breakdown = raw_ps.get("industry_breakdown")
        if not industry_breakdown and isinstance(top_industries, list) and top_industries:
            industry_breakdown = [
                {"industry": ind, "percentage": 0} if isinstance(ind, str) else ind
                for ind in top_industries
            ]
        elif isinstance(industry_breakdown, dict):
            industry_breakdown = [{"industry": k, "percentage": v} for k, v in industry_breakdown.items()]

        # Format employment rate as display string with % if it's a bare number
        emp_rate = raw_ps.get("employment_rate_3_months") or raw_ps.get("employment_rate_3mo_pct")
        if emp_rate is not None and isinstance(emp_rate, (int, float)):
            emp_rate = f"{emp_rate}%"

        school["placement_stats"] = {
            "employment_rate_3_months": emp_rate,
            "median_base_salary": raw_ps.get("median_base_salary") or raw_ps.get("median_base_salary_usd"),
            "median_signing_bonus": raw_ps.get("median_signing_bonus") or raw_ps.get("median_signing_bonus_usd"),
            "industry_breakdown": industry_breakdown or [],
            "top_recruiters": raw_ps.get("top_recruiters") or raw_ps.get("top_employers") or [],
            "internship_rate": raw_ps.get("internship_rate"),
        }

    # Inline community data if available
    community = get_applicant_data_summary(school_id)

    return {"id": school_id, **school, "data_quality_summary": dq, "community_data": community}


@router.post("/calculate_odds")
def calculate_odds(req: OddsRequest):
    """Returns tier for every school based on GMAT + GPA + selectivity + advanced criteria."""
    results = []

    # Determine GMAT-equivalent score based on test_type
    test_type = (req.test_type or "gmat").lower()
    gmat_estimated = False

    if test_type == "gre" and req.test_score is not None:
        # GRE (260-340) → approximate GMAT equivalent
        gmat_value = int((req.test_score - 260) / 80 * 400 + 400)
        gmat_value = max(200, min(800, gmat_value))
    elif test_type == "cat" and req.test_score is not None:
        # CAT percentile (0-100) → GMAT equivalent (99th ≈ 800)
        gmat_value = int(500 + (req.test_score / 100) * 300)
        gmat_value = max(200, min(800, gmat_value))
    elif test_type == "xat" and req.test_score is not None:
        # XAT percentile (0-100) → GMAT equivalent, similar to CAT
        gmat_value = int(500 + (req.test_score / 100) * 300)
        gmat_value = max(200, min(800, gmat_value))
    elif test_type == "waiver":
        gmat_value = 700
        gmat_estimated = True
    else:
        # Default: use GMAT score directly, or estimate at 700
        gmat_value = req.gmat if req.gmat is not None else 700
        gmat_estimated = req.gmat is None

    # Normalize GPA to a 4.0 scale for scoring
    gpa_scale = float(req.gpa_scale) if req.gpa_scale else 4.0
    if gpa_scale == 5.0:
        # German system: 1.0 is best, 5.0 is worst — invert to 4.0 scale
        gpa_normalized = max(0, min(4.0, (5.0 - req.gpa) / 4.0 * 4.0))
    elif gpa_scale == 100:
        # Percentage → 4.0 scale (90%+ = 4.0, 60% = 2.0)
        gpa_normalized = max(0, min(4.0, (req.gpa - 50) / 50 * 4.0))
    elif gpa_scale == 10.0:
        # Indian 10-point → 4.0 scale
        gpa_normalized = max(0, min(4.0, req.gpa / 10.0 * 4.0))
    else:
        gpa_normalized = min(4.0, req.gpa)

    # Profile modifier from extracurriculars/background
    modifier = 0
    if req.undergrad_tier == "top_10": modifier += 8
    elif req.undergrad_tier == "top_50": modifier += 4

    if req.industry in ["finance", "consulting"]: modifier += 2
    elif req.industry == "tech": modifier += 3
    elif req.industry == "military": modifier += 6

    if req.leadership_roles in ["cxo", "manager"]: modifier += 5
    if req.intl_experience: modifier += 3
    if req.community_service: modifier += 2

    # Work experience modifier
    work_exp = getattr(req, 'work_exp', 0) or 0
    if work_exp >= 3 and work_exp <= 7:
        modifier += 3  # sweet spot
    elif work_exp >= 1 and work_exp < 3:
        modifier += 1
    elif work_exp > 7:
        modifier += 1  # diminishing returns

    # Degree type filtering — same logic as recommendations
    allowed_types: set | None = None
    if req.degree_type:
        allowed_types = {req.degree_type}
    elif test_type in ("cat", "xat"):
        allowed_types = {"MBA (CAT)"}
    elif test_type in ("gmat", "gre"):
        allowed_types = {"MBA", "MiM", "Executive MBA", "Master of Finance"}

    for sid, school in SCHOOL_DB.items():
        if allowed_types and school.get("degree_type", "MBA") not in allowed_types:
            continue
        school_gmat = school.get("gmat_avg", 720)
        # Cap GMAT advantage to prevent it from dominating
        gmat_diff = max(-80, min(30, gmat_value - school_gmat))

        # Parse acceptance rate as selectivity signal (lower = harder)
        accept_rate = 30.0  # default
        try:
            accept_rate = float(school.get("acceptance_rate", 30))
        except (ValueError, TypeError):
            pass

        # Selectivity penalty scales with how selective the school is
        if accept_rate < 8:
            selectivity_penalty = -25   # HBS, GSB level
        elif accept_rate < 12:
            selectivity_penalty = -18   # Wharton, Booth level
        elif accept_rate < 18:
            selectivity_penalty = -12   # Kellogg, CBS level
        elif accept_rate < 25:
            selectivity_penalty = -6    # Tuck, Fuqua level
        else:
            selectivity_penalty = 0

        # GPA component: compare normalized GPA against expected
        expected_gpa = 3.7 if accept_rate < 15 else (3.5 if accept_rate < 25 else 3.3)
        gpa_diff = gpa_normalized - expected_gpa
        gpa_modifier = int(gpa_diff * 12)  # slightly stronger GPA impact

        # Combined scoring
        raw_score = gmat_diff + gpa_modifier + selectivity_penalty + modifier

        if raw_score >= 8:
            base_prob = min(85, 52 + raw_score)
        elif raw_score >= -8:
            base_prob = max(20, 40 + raw_score * 2)
        else:
            base_prob = max(3, 18 + raw_score)

        final_prob = max(3, min(95, base_prob))

        # Classify tier based on probability
        if final_prob >= 60:
            final_tier = "Safety"
        elif final_prob >= 25:
            final_tier = "Target"
        else:
            final_tier = "Reach"

        result = {
            "school_id": sid,
            "school": school.get("name", sid),
            "tier": final_tier,
            "prob": final_prob,
            "degree_type": school.get("degree_type", "MBA"),
            "country": school.get("country", "Unknown"),
            "program_count": len(school.get("programs") or []),
            "gmat_avg": school.get("gmat_avg"),
            "acceptance_rate": accept_rate,
        }
        if gmat_estimated:
            result["gmat_estimated"] = True
        results.append(result)

    # Sort: Targets first (most actionable), then Reaches (aspirational), then Safeties
    tier_order = {"Target": 0, "Reach": 1, "Safety": 2}
    results.sort(key=lambda x: (tier_order.get(x["tier"], 99), -x["prob"]))
    return results


# ── Fee Parsing Utility ──────────────────────────────────────────────────────

_FEE_PATTERN = re.compile(r'[\d,]+(?:\.\d{1,2})?')

# Known US-based countries for default fee logic
_US_COUNTRIES = {"USA", "United States", "US"}


def _parse_fee(raw) -> Optional[float]:
    """Extract a numeric fee from various formats: '$275', '275 USD', 275, etc."""
    if raw is None:
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    raw_str = str(raw).strip()
    if not raw_str:
        return None
    match = _FEE_PATTERN.search(raw_str)
    if match:
        return float(match.group().replace(",", ""))
    return None


@router.post("/schools/application-fees")
def calculate_application_fees(req: ApplicationFeesRequest):
    """Compute total application fees across a user's school list."""
    schools_out = []
    estimated_count = 0

    for sid in req.school_ids:
        if sid not in SCHOOL_DB:
            schools_out.append({
                "school_id": sid,
                "school_name": "Unknown",
                "fee": 0,
                "fee_source": "not_found",
            })
            continue

        school = SCHOOL_DB[sid]
        school_name = school.get("name", sid)

        # Prefer enriched fee field, fall back to parsing admission_requirements
        enriched_fee = school.get("application_fee_usd")
        if enriched_fee is not None:
            schools_out.append({
                "school_id": sid,
                "school_name": school_name,
                "fee": float(enriched_fee),
                "currency": "USD",
                "fee_source": "database",
            })
        else:
            raw_fee = school.get("admission_requirements", {}).get("application_fee")
            parsed = _parse_fee(raw_fee)
            if parsed is not None:
                schools_out.append({
                    "school_id": sid,
                    "school_name": school_name,
                    "fee": parsed,
                    "currency": "USD",
                    "fee_source": "parsed",
                })
            else:
                country = school.get("country", "Unknown")
                default_fee = 250.0 if country in _US_COUNTRIES else 200.0
                schools_out.append({
                    "school_id": sid,
                    "school_name": school_name,
                    "fee": default_fee,
                    "currency": "USD",
                    "fee_source": "estimated",
                })
                estimated_count += 1

    total = sum(s["fee"] for s in schools_out)

    return {
        "schools": schools_out,
        "total_fees": total,
        "school_count": len(schools_out),
        "estimated_count": estimated_count,
    }


# ── Similar Schools Recommender ──────────────────────────────────────────────

_HEX_ID = re.compile(r'^[0-9a-f]{6,}$')

# Normalization ranges and weights for similarity dimensions
_SIM_DIMENSIONS = {
    "gmat_avg":        {"min": 400, "max": 800, "weight": 3},
    "tuition_usd":     {"min": 0,   "max": 200_000, "weight": 2},
    "median_salary":   {"min": 0,   "max": 250_000, "weight": 2},
    "acceptance_rate": {"min": 0,   "max": 100, "weight": 2},
}


def _parse_numeric(val) -> Optional[float]:
    """Coerce a value to float, stripping currency symbols if needed."""
    if val is None or val == "N/A":
        return None
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        cleaned = val.replace("$", "").replace(",", "").strip()
        try:
            return float(cleaned)
        except ValueError:
            return None
    return None


def _jaccard(a: list, b: list) -> float:
    """Jaccard similarity between two lists treated as sets."""
    sa, sb = set(s.lower() for s in a), set(s.lower() for s in b)
    if not sa and not sb:
        return 1.0
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def _compute_similarity(source: dict, candidate: dict) -> tuple[float, dict]:
    """Compute weighted euclidean similarity between two schools.

    Returns (similarity_score 0-1, per_dimension_scores dict).
    """
    weighted_sq_sum = 0.0
    total_weight = 0.0
    dim_scores: dict[str, float] = {}

    # Numeric dimensions
    for key, cfg in _SIM_DIMENSIONS.items():
        src_val = _parse_numeric(source.get(key))
        cand_val = _parse_numeric(candidate.get(key))
        if src_val is None or cand_val is None:
            continue  # skip missing
        rng = cfg["max"] - cfg["min"]
        diff = abs(src_val - cand_val) / rng if rng else 0.0
        dim_scores[key] = 1.0 - diff
        weighted_sq_sum += cfg["weight"] * (diff ** 2)
        total_weight += cfg["weight"]

    # Country match (weight 1)
    src_country = (source.get("country") or "").strip().lower()
    cand_country = (candidate.get("country") or "").strip().lower()
    if src_country and cand_country:
        country_diff = 0.0 if src_country == cand_country else 1.0
        dim_scores["country"] = 1.0 - country_diff
        weighted_sq_sum += 1 * (country_diff ** 2)
        total_weight += 1

    # Specializations overlap (weight 1)
    src_specs = source.get("specializations") or []
    cand_specs = candidate.get("specializations") or []
    if src_specs or cand_specs:
        jaccard = _jaccard(src_specs, cand_specs)
        dim_scores["specializations"] = jaccard
        weighted_sq_sum += 1 * ((1.0 - jaccard) ** 2)
        total_weight += 1

    if total_weight == 0:
        return 0.0, dim_scores

    distance = math.sqrt(weighted_sq_sum / total_weight)
    similarity = round(max(0.0, 1.0 - distance), 4)
    return similarity, dim_scores


def _generate_match_reasons(source: dict, candidate: dict, dim_scores: dict) -> list[str]:
    """Generate 2-3 human-readable reasons based on highest-scoring dimensions."""
    reasons: list[str] = []

    # Sort dimensions by score descending, pick top contributors
    ranked = sorted(dim_scores.items(), key=lambda x: -x[1])

    for dim, score in ranked:
        if len(reasons) >= 3:
            break
        if score < 0.7:
            continue  # only mention good matches

        if dim == "gmat_avg":
            src_g = _parse_numeric(source.get("gmat_avg"))
            cand_g = _parse_numeric(candidate.get("gmat_avg"))
            if src_g is not None and cand_g is not None:
                reasons.append(f"Similar GMAT range ({int(min(src_g, cand_g))}-{int(max(src_g, cand_g))})")
        elif dim == "tuition_usd":
            reasons.append("Comparable tuition")
        elif dim == "median_salary":
            reasons.append("Similar post-MBA salary outcomes")
        elif dim == "acceptance_rate":
            src_a = _parse_numeric(source.get("acceptance_rate"))
            cand_a = _parse_numeric(candidate.get("acceptance_rate"))
            if src_a is not None and cand_a is not None:
                reasons.append(f"Similar selectivity ({int(min(src_a, cand_a))}-{int(max(src_a, cand_a))}%)")
        elif dim == "country":
            reasons.append("Same region")
        elif dim == "specializations":
            reasons.append("Overlapping program strengths")

    # Ensure at least 2 reasons
    if len(reasons) < 2:
        for dim, score in ranked:
            if len(reasons) >= 2:
                break
            label = {
                "gmat_avg": "Comparable academic profile",
                "tuition_usd": "Similar cost of attendance",
                "median_salary": "Comparable career outcomes",
                "acceptance_rate": "Similar admissions competitiveness",
                "country": "Same geographic region",
                "specializations": "Related program focus areas",
            }.get(dim)
            if label and label not in reasons:
                reasons.append(label)

    return reasons[:3]


@router.get("/schools/{school_id}/similar")
def similar_schools(school_id: str):
    """Returns the top 5 most similar schools based on weighted feature similarity."""
    if school_id not in SCHOOL_DB:
        raise HTTPException(status_code=404, detail="School not found")

    source = SCHOOL_DB[school_id]
    scored: list[tuple[str, float, dict]] = []

    source_degree = source.get("degree_type", "MBA")

    for sid, school in SCHOOL_DB.items():
        # Skip self, synthetic schools, and different degree types
        if sid == school_id or _HEX_ID.match(sid):
            continue
        if school.get("degree_type", "MBA") != source_degree:
            continue
        sim, dim_scores = _compute_similarity(source, school)
        scored.append((sid, sim, dim_scores))

    # Sort by similarity descending
    scored.sort(key=lambda x: -x[1])
    top5 = scored[:5]

    similar = []
    for sid, sim, dim_scores in top5:
        candidate = SCHOOL_DB[sid]
        similar.append({
            "school_id": sid,
            "school_name": candidate.get("name", sid),
            "similarity_score": sim,
            "match_reasons": _generate_match_reasons(source, candidate, dim_scores),
        })

    return {
        "school_id": school_id,
        "school_name": source.get("name", school_id),
        "similar_schools": similar,
    }


# ── Fit Score Helpers ──────────────────────────────────────────────────────


def _academic_fit(gmat: Optional[int], gpa: Optional[float], school: dict) -> tuple[int, list, list]:
    """Academic fit (0-30). Compare GMAT and GPA to school averages."""
    highlights: list[str] = []
    concerns: list[str] = []
    school_gmat = school.get("gmat_avg")

    # GMAT component (up to 20 pts)
    if gmat is not None and school_gmat is not None:
        diff = gmat - school_gmat
        if diff >= 0:
            gmat_pts = min(20, 15 + (diff / 10) * 2)
        else:
            gmat_pts = max(3, 15 + (diff / 10) * 3)

        if diff >= 10:
            highlights.append(f"Strong GMAT match (+{diff} vs avg {school_gmat})")
        elif diff <= -20:
            concerns.append(f"GMAT below school average by {abs(diff)} points")
    else:
        gmat_pts = 12  # neutral

    # GPA component (up to 10 pts)
    if gpa is not None:
        expected_gpa = 3.6
        gpa_diff = gpa - expected_gpa
        gpa_pts = max(2, min(10, 5 + gpa_diff * 8))

        if gpa >= 3.7:
            highlights.append(f"Strong GPA ({gpa})")
        elif gpa < 3.2:
            concerns.append(f"GPA ({gpa}) below typical MBA average")
    else:
        gpa_pts = 5  # neutral

    score = int(max(0, min(30, gmat_pts + gpa_pts)))
    return score, highlights, concerns


def _experience_fit(work_exp_years: Optional[int]) -> tuple[int, list, list]:
    """Experience fit (0-20). Sweet spot is 3-6 years."""
    if work_exp_years is None:
        return 10, [], []

    highlights: list[str] = []
    concerns: list[str] = []

    if 3 <= work_exp_years <= 6:
        score = 20
        highlights.append(f"{work_exp_years} years experience — ideal range")
    elif 2 <= work_exp_years < 3 or 6 < work_exp_years <= 8:
        score = 15
    elif work_exp_years == 1:
        score = 8
        concerns.append("Limited work experience (1 year)")
    elif work_exp_years == 0:
        score = 4
        concerns.append("No work experience — most MBA programs expect 2+ years")
    else:
        # > 8 years
        distance = work_exp_years - 8
        score = max(5, 15 - distance * 2)
        concerns.append(f"{work_exp_years} years — above typical MBA range, consider EMBA")

    return int(max(0, min(20, score))), highlights, concerns


def _career_fit(target_industry: Optional[str], school: dict) -> tuple[int, list, list]:
    """Career fit (0-20). Match target industry to school specializations/placements."""
    if not target_industry:
        return 10, [], []

    highlights: list[str] = []
    concerns: list[str] = []
    target_lower = target_industry.lower()

    specializations = [s.lower() for s in (school.get("specializations") or [])]
    placements = school.get("placement_industries") or {}
    placement_names = [k.lower() for k in placements.keys()]
    all_keywords = specializations + placement_names

    if any(target_lower in kw or kw in target_lower for kw in all_keywords):
        score = 20
        highlights.append(f"Industry alignment with {target_industry}")
    elif _fuzzy_industry_match(target_lower, all_keywords):
        score = 10
        highlights.append(f"Partial industry alignment with {target_industry}")
    else:
        score = 5
        if specializations:
            concerns.append(f"{target_industry} not among school specializations")

    return int(max(0, min(20, score))), highlights, concerns


def _fuzzy_industry_match(target: str, keywords: list[str]) -> bool:
    """Check for partial/fuzzy industry matches (e.g., 'tech' matches 'technology')."""
    aliases = {
        "tech": ["technology", "tech", "software", "engineering"],
        "consulting": ["consulting", "management consulting", "strategy"],
        "finance": ["finance", "banking", "investment", "financial services"],
        "healthcare": ["healthcare", "health", "biotech", "pharma"],
        "marketing": ["marketing", "brand management", "advertising"],
        "entrepreneurship": ["entrepreneurship", "startup", "venture"],
    }
    for group_terms in aliases.values():
        if any(target in t or t in target for t in group_terms):
            if any(any(kw_term in kw or kw in kw_term for kw_term in group_terms) for kw in keywords):
                return True
    return False


def _financial_fit(budget_max: Optional[float], school: dict) -> tuple[int, list, list]:
    """Financial fit (0-15). Compare budget to tuition."""
    tuition = _parse_numeric(school.get("tuition_usd")) or 0
    if budget_max is None or tuition == 0:
        return 8, [], []

    highlights: list[str] = []
    concerns: list[str] = []

    if tuition <= budget_max:
        score = 15
        highlights.append("Tuition within budget")
    else:
        overshoot_pct = ((tuition - budget_max) / budget_max) * 100
        if overshoot_pct <= 20:
            score = 10
            concerns.append(f"Tuition exceeds budget by {overshoot_pct:.0f}%")
        else:
            score = 5
            concerns.append(f"Tuition exceeds budget by {overshoot_pct:.0f}%")

    return int(max(0, min(15, score))), highlights, concerns


def _selectivity_fit(
    gmat: Optional[int], gpa: Optional[float], school: dict
) -> tuple[int, list, list]:
    """Selectivity match (0-15). Higher acceptance = easier, lower = bonus if strong."""
    accept_rate = _parse_numeric(school.get("acceptance_rate")) or 30
    school_gmat = school.get("gmat_avg")

    highlights: list[str] = []
    concerns: list[str] = []

    # Determine profile strength
    strength = 0  # -1 weak, 0 average, 1 strong
    if gmat is not None and school_gmat is not None:
        if gmat >= school_gmat + 20:
            strength = 1
        elif gmat < school_gmat - 20:
            strength = -1

    if accept_rate >= 30:
        score = 12 if strength >= 0 else 10
        if strength >= 0:
            highlights.append("Favorable acceptance rate")
    elif accept_rate >= 15:
        if strength >= 1:
            score = 13
        elif strength == 0:
            score = 9
        else:
            score = 6
            concerns.append("Moderately selective — below-average profile metrics")
    else:
        # Highly selective (< 15%)
        if strength >= 1:
            score = 12
            highlights.append("Strong profile for a highly selective program")
        elif strength == 0:
            score = 7
            concerns.append("Highly selective program — competitive admission")
        else:
            score = 4
            concerns.append("Very selective program — profile below school averages")

    return int(max(0, min(15, score))), highlights, concerns


@router.post("/schools/fit-score")
def compute_fit_score(req: FitScoreRequest):
    """Compute a profile-school fit score (0-100) for each requested school. Pure math, no LLM."""
    results = []
    errors = []

    for sid in req.school_ids:
        school = SCHOOL_DB.get(sid)
        if not school:
            errors.append({"school_id": sid, "error": "School not found"})
            continue

        academic_pts, academic_hl, academic_cn = _academic_fit(req.gmat, req.gpa, school)
        experience_pts, exp_hl, exp_cn = _experience_fit(req.work_exp_years)
        career_pts, career_hl, career_cn = _career_fit(req.target_industry, school)
        financial_pts, fin_hl, fin_cn = _financial_fit(req.budget_max, school)
        selectivity_pts, sel_hl, sel_cn = _selectivity_fit(req.gmat, req.gpa, school)

        fit_score = academic_pts + experience_pts + career_pts + financial_pts + selectivity_pts
        fit_score = max(0, min(100, fit_score))

        highlights = academic_hl + exp_hl + career_hl + fin_hl + sel_hl
        concerns = academic_cn + exp_cn + career_cn + fin_cn + sel_cn

        results.append({
            "school_id": sid,
            "school_name": school.get("name", sid),
            "fit_score": fit_score,
            "breakdown": {
                "academic": academic_pts,
                "experience": experience_pts,
                "career": career_pts,
                "financial": financial_pts,
                "selectivity": selectivity_pts,
            },
            "highlights": highlights,
            "concerns": concerns,
        })

    # Sort by fit_score descending
    results.sort(key=lambda x: -x["fit_score"])

    return {
        "results": results,
        "errors": errors if errors else None,
    }


# ── Deadline Calendar ─────────────────────────────────────────────────────


def _parse_deadline_date(date_str: str) -> Optional[str]:
    """Parse 'Month Year' format into ISO date string."""
    if not date_str:
        return None
    try:
        dt = datetime.strptime(date_str.strip(), "%B %Y")
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        try:
            dt = datetime.strptime(date_str.strip(), "%b %Y")
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            return None


@router.get("/schools/deadlines/calendar")
def get_deadline_calendar(school_ids: str = None):
    """Get all deadlines across schools in chronological order for calendar view.

    school_ids: comma-separated list of school IDs (optional, defaults to all real schools)
    """
    if school_ids:
        ids = [s.strip() for s in school_ids.split(",")]
    else:
        # All real schools (filter out hex-hash synthetic ones)
        ids = [sid for sid in SCHOOL_DB if len(sid) <= 30 and not all(c in "0123456789abcdef" for c in sid)]

    events = []
    for sid in ids:
        school = SCHOOL_DB.get(sid)
        if not school:
            continue
        deadlines = school.get("admission_deadlines", [])
        for dl in deadlines:
            if not isinstance(dl, dict):
                continue
            deadline_date = _parse_deadline_date(dl.get("deadline", ""))
            decision_date = _parse_deadline_date(dl.get("decision", ""))
            if not deadline_date:
                continue
            events.append({
                "school_id": sid,
                "school_name": school.get("name", sid),
                "round": dl.get("round", ""),
                "deadline_date": deadline_date,
                "decision_date": decision_date,
                "type": "deadline",
            })
            if decision_date:
                events.append({
                    "school_id": sid,
                    "school_name": school.get("name", sid),
                    "round": dl.get("round", ""),
                    "deadline_date": decision_date,
                    "decision_date": None,
                    "type": "decision",
                })

    events.sort(key=lambda x: x["deadline_date"])

    # Group by month
    months: dict[str, list] = {}
    for e in events:
        month_key = e["deadline_date"][:7]  # YYYY-MM
        if month_key not in months:
            months[month_key] = []
        months[month_key].append(e)

    return {
        "events": events,
        "total_events": len(events),
        "months": months,
        "school_count": len(set(e["school_id"] for e in events)),
    }


@router.get("/upcoming-deadlines")
def upcoming_deadlines(
    days: int = Query(default=90, ge=1, le=365, description="Show deadlines within N days"),
    degree_type: str = Query(default=None, description="Filter by degree type"),
    limit: int = Query(default=20, ge=1, le=100),
):
    """Returns upcoming application deadlines across all schools, sorted by date.

    Great for applicants tracking multiple schools' timelines.
    """
    today = datetime.now()
    cutoff = today + __import__("datetime").timedelta(days=days)
    upcoming = []

    for sid, school in SCHOOL_DB.items():
        if degree_type and school.get("degree_type", "MBA") != degree_type:
            continue

        deadlines = school.get("deadlines") or []
        for dl in deadlines:
            date_str = dl.get("date", "")
            try:
                dt = datetime.strptime(date_str, "%Y-%m-%d")
            except (ValueError, TypeError):
                continue
            if today <= dt <= cutoff:
                days_away = (dt - today).days
                upcoming.append({
                    "school_id": sid,
                    "school_name": school.get("name", sid),
                    "round": dl.get("round", ""),
                    "deadline": dt.strftime("%B %d, %Y"),
                    "deadline_date": date_str,
                    "days_away": days_away,
                    "decision_date": dl.get("decision_date"),
                    "degree_type": school.get("degree_type", "MBA"),
                    "urgency": "critical" if days_away <= 7 else "soon" if days_away <= 30 else "upcoming",
                })

    upcoming.sort(key=lambda x: x["deadline_date"])
    return {
        "deadlines": upcoming[:limit],
        "total": len(upcoming),
        "window_days": days,
    }
