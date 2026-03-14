"""School directory and odds calculator endpoints."""

from fastapi import APIRouter, HTTPException, Query
from agents import SCHOOL_DB, SCHOOL_ALIASES, get_school_data_quality
from models import OddsRequest

router = APIRouter(prefix="/api", tags=["schools"])


def _school_summary(sid: str, school: dict) -> dict:
    """Standard school summary dict used by list and search endpoints."""
    dq = get_school_data_quality(sid)
    return {
        "id": sid,
        "name": school.get("name", sid),
        "location": school.get("location", "Unknown Location"),
        "country": school.get("country", "Unknown"),
        "gmat_avg": school.get("gmat_avg", 730),
        "median_salary": school.get("median_salary", "N/A"),
        "acceptance_rate": school.get("acceptance_rate", "N/A"),
        "class_size": school.get("class_size", "N/A"),
        "specializations": school.get("specializations", []),
        "tuition_usd": school.get("tuition_usd", "N/A"),
        "program_duration": school.get("program_details", {}).get("duration", "N/A"),
        "stem_designated": school.get("program_details", {}).get("stem_designated", False),
        "essay_count": len(school.get("essay_prompts") or []),
        "admission_deadlines": school.get("admission_deadlines") or [],
        "data_source": dq["source"],
        "data_confidence": dq["confidence"],
    }


@router.get("/schools")
def list_schools(
    q: str = Query(default=None, description="Search query — matches name, ID, or common abbreviations"),
    country: str = Query(default=None, description="Filter by country name (case-insensitive)"),
    city: str = Query(default=None, description="Filter by city name (substring match, case-insensitive)"),
):
    """Returns the school directory, optionally filtered by search query, country, or city.

    Search matches against:
    - School name (e.g. 'London Business School')
    - School ID (e.g. 'lbs')
    - Common abbreviations (e.g. 'LBS', 'HBS', 'GSB')
    """
    if q:
        q_lower = q.strip().lower()
        matched_ids: set[str] = set()

        # 1. Check alias map for abbreviation matches
        for sid, aliases in SCHOOL_ALIASES.items():
            if any(q_lower == alias or q_lower in alias for alias in aliases):
                if sid in SCHOOL_DB:
                    matched_ids.add(sid)

        # 2. Check school names and IDs directly
        for sid, school in SCHOOL_DB.items():
            if q_lower in school.get("name", "").lower() or q_lower in sid.lower():
                matched_ids.add(sid)

        results = [_school_summary(sid, SCHOOL_DB[sid]) for sid in sorted(matched_ids)]
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

    return results


@router.get("/schools/geo-meta")
def geo_meta():
    """Returns unique countries and cities with school counts for geo page generation."""
    from collections import Counter
    countries: Counter[str] = Counter()
    cities: Counter[str] = Counter()
    for school in SCHOOL_DB.values():
        c = school.get("country", "Unknown")
        if c and c not in ("?", "Unknown"):
            countries[c] += 1
        loc = school.get("location", "")
        if loc and loc not in ("?", "Unknown", "Unknown Location"):
            city_name = loc.split(",")[0].strip()
            if city_name:
                cities[city_name] += 1

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
    }


@router.get("/schools/{school_id}")
def get_school(school_id: str):
    """Returns detail for a single school including essay prompts and data quality."""
    if school_id not in SCHOOL_DB:
        raise HTTPException(status_code=404, detail="School not found")
    school = SCHOOL_DB[school_id]
    dq = get_school_data_quality(school_id)
    return {"id": school_id, **school, "data_quality_summary": dq}


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

    for sid, school in SCHOOL_DB.items():
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
        }
        if gmat_estimated:
            result["gmat_estimated"] = True
        results.append(result)

    # Sort: Targets first (most actionable), then Reaches (aspirational), then Safeties
    tier_order = {"Target": 0, "Reach": 1, "Safety": 2}
    results.sort(key=lambda x: (tier_order.get(x["tier"], 99), -x["prob"]))
    return results
