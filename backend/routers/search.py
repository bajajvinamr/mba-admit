"""Advanced school search API with multi-filter support, sorting, and natural language query parsing."""

import logging
import math
import re
from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from agents import SCHOOL_DB

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["search"])

# ── Tier Classification ───────────────────────────────────────────────────────

TIER_M7 = {"hbs", "gsb", "wharton", "booth", "kellogg", "cbs", "sloan"}
TIER_T15 = {"tuck", "haas", "ross", "fuqua", "darden", "stern", "yale_som", "johnson"}
TIER_T25 = {
    "anderson", "tepper", "mccombs", "kenan_flagler", "georgetown",
    "olin", "marshall", "kelley", "mendoza", "foster",
}

ALL_TIER_IDS = TIER_M7 | TIER_T15 | TIER_T25


def _classify_tier(sid: str, school: dict) -> str | None:
    """Assign a tier label based on school ID or ranking heuristic."""
    if sid in TIER_M7:
        return "M7"
    if sid in TIER_T15:
        return "T15"
    if sid in TIER_T25:
        return "T25"
    # Heuristic: use acceptance_rate as a rough proxy for unclassified schools
    rate = _safe_float(school.get("acceptance_rate"))
    if rate is not None:
        if rate < 15:
            return "T50"
        if rate < 35:
            return "T100"
    return None


# ── Safe type coercions (matching schools.py conventions) ─────────────────────

def _safe_int(val, default=None):
    if val is None:
        return default
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def _safe_float(val, default=None):
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


# ── In-memory search index ────────────────────────────────────────────────────

class _SchoolIndex:
    """Pre-computed filterable fields for every school."""

    __slots__ = (
        "sid", "name", "name_lower", "country", "country_lower",
        "gmat_avg", "acceptance_rate", "tuition_usd", "tier",
        "formats", "concentrations", "test_optional", "school",
    )

    def __init__(self, sid: str, school: dict):
        self.sid = sid
        self.school = school
        self.name = school.get("name") or sid.replace("_", " ").title()
        self.name_lower = self.name.lower()
        self.country = school.get("country") or "Unknown"
        self.country_lower = self.country.lower()
        self.gmat_avg = _safe_int(school.get("gmat_avg"))
        self.acceptance_rate = _safe_float(school.get("acceptance_rate"))
        self.tuition_usd = _safe_int(school.get("tuition_usd"))
        self.tier = _classify_tier(sid, school)

        # Normalize program formats
        fmt = school.get("program_format") or ""
        raw_formats: list[str] = []
        if isinstance(fmt, list):
            raw_formats = [f.strip().lower() for f in fmt]
        elif isinstance(fmt, str) and fmt:
            raw_formats = [f.strip().lower() for f in fmt.split(",")]
        # Also check program_details
        pd = school.get("program_details") or {}
        if pd.get("format"):
            extra = pd["format"] if isinstance(pd["format"], list) else [pd["format"]]
            raw_formats.extend(f.strip().lower() for f in extra)
        self.formats = set(raw_formats) if raw_formats else set()

        # Concentrations / specializations
        specs = school.get("specializations") or school.get("concentrations") or []
        self.concentrations = [s.lower() for s in specs] if specs else []

        # Test-optional flag
        test_info = school.get("primary_admission_test") or ""
        self.test_optional = "optional" in str(test_info).lower() or school.get("test_optional", False)


def _build_index() -> list[_SchoolIndex]:
    return [_SchoolIndex(sid, school) for sid, school in SCHOOL_DB.items()]


_INDEX: list[_SchoolIndex] = []


def _get_index() -> list[_SchoolIndex]:
    global _INDEX
    if not _INDEX:
        _INDEX = _build_index()
        logger.info("Built search index with %d schools", len(_INDEX))
    return _INDEX


# ── Request / Response Models ─────────────────────────────────────────────────

class SearchFilters(BaseModel):
    gmat_min: int | None = None
    gmat_max: int | None = None
    acceptance_min: float | None = None
    acceptance_max: float | None = None
    tuition_min: int | None = None
    tuition_max: int | None = None
    countries: list[str] | None = None
    formats: list[str] | None = None
    concentrations: list[str] | None = None
    tier: list[str] | None = None
    test_optional: bool | None = None


class SearchRequest(BaseModel):
    query: str | None = None
    filters: SearchFilters = Field(default_factory=SearchFilters)
    sort: str = "ranking"
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=20, ge=1, le=100)


class SearchResponse(BaseModel):
    schools: list[dict]
    total: int
    page: int
    per_page: int
    filters_applied: dict


# ── Text matching ─────────────────────────────────────────────────────────────

def _text_match(entry: _SchoolIndex, query: str) -> bool:
    """Case-insensitive substring match on name, ID, country, and specializations."""
    q = query.lower()
    if q in entry.name_lower:
        return True
    if q in entry.sid.lower():
        return True
    if q in entry.country_lower:
        return True
    for spec in entry.concentrations:
        if q in spec:
            return True
    return False


# ── Filter pipeline ───────────────────────────────────────────────────────────

def _apply_filters(entries: list[_SchoolIndex], req: SearchRequest) -> list[_SchoolIndex]:
    """Apply text query + all filters as AND conditions."""
    result = entries

    # Text search
    if req.query:
        q = req.query.strip()
        if q:
            result = [e for e in result if _text_match(e, q)]

    f = req.filters

    if f.gmat_min is not None:
        result = [e for e in result if e.gmat_avg is not None and e.gmat_avg >= f.gmat_min]

    if f.gmat_max is not None:
        result = [e for e in result if e.gmat_avg is not None and e.gmat_avg <= f.gmat_max]

    if f.acceptance_min is not None:
        result = [e for e in result if e.acceptance_rate is not None and e.acceptance_rate >= f.acceptance_min]

    if f.acceptance_max is not None:
        result = [e for e in result if e.acceptance_rate is not None and e.acceptance_rate <= f.acceptance_max]

    if f.tuition_min is not None:
        result = [e for e in result if e.tuition_usd is not None and e.tuition_usd >= f.tuition_min]

    if f.tuition_max is not None:
        result = [e for e in result if e.tuition_usd is not None and e.tuition_usd <= f.tuition_max]

    if f.countries:
        countries_lower = {c.lower() for c in f.countries}
        result = [e for e in result if e.country_lower in countries_lower]

    if f.formats:
        formats_lower = {fmt.lower() for fmt in f.formats}
        result = [e for e in result if e.formats & formats_lower]

    if f.concentrations:
        conc_lower = {c.lower() for c in f.concentrations}
        result = [e for e in result if any(c in conc_lower for c in e.concentrations)]

    if f.tier:
        tiers_upper = {t.upper() for t in f.tier}
        result = [e for e in result if e.tier and e.tier.upper() in tiers_upper]

    if f.test_optional is not None:
        result = [e for e in result if e.test_optional == f.test_optional]

    return result


# ── Sorting ───────────────────────────────────────────────────────────────────

_TIER_RANK = {"M7": 0, "T15": 1, "T25": 2, "T50": 3, "T100": 4}


def _sort_key(entry: _SchoolIndex, sort_field: str):
    """Return a sort key tuple. None values sort last."""
    if sort_field == "ranking":
        tier_val = _TIER_RANK.get(entry.tier, 99)
        rate = entry.acceptance_rate if entry.acceptance_rate is not None else 999
        return (tier_val, rate)
    if sort_field == "acceptance":
        return (entry.acceptance_rate if entry.acceptance_rate is not None else 999,)
    if sort_field == "tuition":
        return (entry.tuition_usd if entry.tuition_usd is not None else 999_999,)
    if sort_field == "gmat":
        # Higher GMAT first → negate
        return (-(entry.gmat_avg or 0),)
    if sort_field == "name":
        return (entry.name_lower,)
    if sort_field == "deadline":
        # Placeholder: sort by tier + name (deadlines not yet in data model)
        tier_val = _TIER_RANK.get(entry.tier, 99)
        return (tier_val, entry.name_lower)
    if sort_field == "fit_score":
        # Fit score: lower acceptance rate + known tier = better "fit" ranking
        tier_val = _TIER_RANK.get(entry.tier, 99)
        rate = entry.acceptance_rate if entry.acceptance_rate is not None else 999
        return (tier_val, rate)
    # Default: ranking
    tier_val = _TIER_RANK.get(entry.tier, 99)
    return (tier_val, entry.name_lower)


# ── School summary builder ────────────────────────────────────────────────────

def _to_summary(entry: _SchoolIndex) -> dict:
    """Produce a search-result summary dict. All numeric fields are int/float or None."""
    return {
        "id": entry.sid,
        "name": entry.name,
        "country": entry.country,
        "location": entry.school.get("location") or "Unknown Location",
        "gmat_avg": entry.gmat_avg,
        "acceptance_rate": entry.acceptance_rate,
        "tuition_usd": entry.tuition_usd,
        "tier": entry.tier,
        "formats": sorted(entry.formats) if entry.formats else [],
        "concentrations": entry.concentrations[:5],
        "test_optional": entry.test_optional,
        "program_format": entry.school.get("program_format"),
        "class_size": _safe_int(entry.school.get("class_size")),
        "median_salary": entry.school.get("median_salary"),
    }


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/schools/search", response_model=SearchResponse)
def search_schools(req: SearchRequest):
    """Advanced school search with multi-filter support, text matching, and sorting.

    Filters are applied as AND conditions. Text query matches against
    school name, ID, country, and specializations (case-insensitive substring).
    """
    index = _get_index()

    # Apply filters
    matched = _apply_filters(index, req)

    # Sort
    matched.sort(key=lambda e: _sort_key(e, req.sort))

    # Paginate
    total = len(matched)
    start = (req.page - 1) * req.per_page
    end = start + req.per_page
    page_results = matched[start:end]

    # Build filters_applied summary
    filters_applied = {
        k: v
        for k, v in req.filters.model_dump().items()
        if v is not None
    }
    if req.query:
        filters_applied["query"] = req.query

    return SearchResponse(
        schools=[_to_summary(e) for e in page_results],
        total=total,
        page=req.page,
        per_page=req.per_page,
        filters_applied=filters_applied,
    )


# ── Natural Language Query Parser ────────────────────────────────────────────

# Patterns: "GMAT under 700", "acceptance rate above 30%", "tuition below 60000",
# "in Europe", "in USA", "STEM", "part-time", "class size over 200"
_NL_PATTERNS: list[tuple[re.Pattern, str, str]] = [
    # GMAT
    (re.compile(r"gmat\s*(?:under|below|<|less than)\s*(\d{3})", re.I), "gmat_max", "int"),
    (re.compile(r"gmat\s*(?:above|over|>|greater than|more than|at least)\s*(\d{3})", re.I), "gmat_min", "int"),
    (re.compile(r"gmat\s*(\d{3})\s*[-–to]+\s*(\d{3})", re.I), "gmat_range", "range"),
    # Acceptance rate
    (re.compile(r"accept(?:ance)?\s*(?:rate)?\s*(?:above|over|>|greater than|more than|at least)\s*(\d{1,3})%?", re.I), "acceptance_min", "float"),
    (re.compile(r"accept(?:ance)?\s*(?:rate)?\s*(?:under|below|<|less than)\s*(\d{1,3})%?", re.I), "acceptance_max", "float"),
    # Tuition
    (re.compile(r"tuition\s*(?:under|below|<|less than|cheaper than)\s*\$?(\d[\d,]*)", re.I), "tuition_max", "money"),
    (re.compile(r"tuition\s*(?:above|over|>|more than|at least)\s*\$?(\d[\d,]*)", re.I), "tuition_min", "money"),
    # Countries/regions
    (re.compile(r"\bin\s+(usa|us|united states|america)", re.I), "country", "USA"),
    (re.compile(r"\bin\s+(uk|united kingdom|england|britain)", re.I), "country", "United Kingdom"),
    (re.compile(r"\bin\s+(europe|eu)\b", re.I), "region", "europe"),
    (re.compile(r"\bin\s+(asia)\b", re.I), "region", "asia"),
    (re.compile(r"\bin\s+(canada)\b", re.I), "country", "Canada"),
    (re.compile(r"\bin\s+(india)\b", re.I), "country", "India"),
    (re.compile(r"\bin\s+(france)\b", re.I), "country", "France"),
    (re.compile(r"\bin\s+(spain)\b", re.I), "country", "Spain"),
    (re.compile(r"\bin\s+(singapore)\b", re.I), "country", "Singapore"),
    # Format
    (re.compile(r"\b(part[- ]?time)\b", re.I), "format", "part-time"),
    (re.compile(r"\b(full[- ]?time)\b", re.I), "format", "full-time"),
    (re.compile(r"\b(online|remote)\b", re.I), "format", "online"),
    (re.compile(r"\b(executive|emba)\b", re.I), "format", "executive"),
    # STEM
    (re.compile(r"\bstem\b", re.I), "stem", "true"),
]

EUROPEAN_COUNTRIES = {
    "United Kingdom", "France", "Spain", "Germany", "Italy", "Netherlands",
    "Switzerland", "Belgium", "Sweden", "Denmark", "Norway", "Finland",
    "Ireland", "Portugal", "Austria",
}
ASIAN_COUNTRIES = {
    "India", "China", "Singapore", "Japan", "South Korea", "Hong Kong",
    "Thailand", "Philippines", "Indonesia", "Malaysia", "Taiwan",
}


def _parse_natural_language(q: str) -> tuple[SearchFilters, str]:
    """Parse natural language query into structured filters + remaining text query."""
    filters = SearchFilters()
    remaining = q

    for pattern, field, field_type in _NL_PATTERNS:
        match = pattern.search(remaining)
        if not match:
            continue

        # Remove matched portion from remaining text
        remaining = remaining[:match.start()] + remaining[match.end():]

        if field == "gmat_max" and field_type == "int":
            filters.gmat_max = int(match.group(1))
        elif field == "gmat_min" and field_type == "int":
            filters.gmat_min = int(match.group(1))
        elif field == "gmat_range":
            filters.gmat_min = int(match.group(1))
            filters.gmat_max = int(match.group(2))
        elif field == "acceptance_min":
            filters.acceptance_min = float(match.group(1))
        elif field == "acceptance_max":
            filters.acceptance_max = float(match.group(1))
        elif field == "tuition_max" and field_type == "money":
            filters.tuition_max = int(match.group(1).replace(",", ""))
        elif field == "tuition_min" and field_type == "money":
            filters.tuition_min = int(match.group(1).replace(",", ""))
        elif field == "country":
            filters.countries = filters.countries or []
            filters.countries.append(field_type)
        elif field == "region":
            if field_type == "europe":
                filters.countries = list(EUROPEAN_COUNTRIES)
            elif field_type == "asia":
                filters.countries = list(ASIAN_COUNTRIES)
        elif field == "format":
            filters.formats = filters.formats or []
            filters.formats.append(field_type)

    # Clean up remaining text
    remaining = re.sub(r"\s+", " ", remaining).strip()
    # Remove dangling conjunctions
    remaining = re.sub(r"^(and|with|that have|where|which)\s+", "", remaining, flags=re.I)
    remaining = re.sub(r"\s+(and|with)$", "", remaining, flags=re.I)

    return filters, remaining if remaining else None


@router.get("/search/smart")
def smart_search(
    q: str = Query(..., min_length=2, description="Natural language search query"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort: str = Query("ranking"),
):
    """Natural language school search.

    Parses queries like:
    - "schools with GMAT under 700 and acceptance rate above 30%"
    - "MBA programs in Europe with tuition below $60,000"
    - "part-time MBA in USA"
    - "STEM programs in Asia"

    Extracts structured filters from the query and applies them.
    Any remaining text is used as a free-text search.
    """
    filters, remaining_text = _parse_natural_language(q)

    req = SearchRequest(
        query=remaining_text,
        filters=filters,
        sort=sort,
        page=page,
        per_page=per_page,
    )

    # Reuse existing search logic
    return search_schools(req)
