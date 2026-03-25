"""Country comparison endpoints — MBA destination profiles.

Serves country-level data from /data/countries/*.json for the
compare-countries and mba-in/[country] pages.
"""

import json
import logging
import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/countries", tags=["countries"])
logger = logging.getLogger(__name__)

DATA_DIR = Path(os.path.dirname(__file__)).parent / "data" / "countries"

# ── In-memory cache ──────────────────────────────────────────────────────────

_COUNTRY_CACHE: dict[str, dict] = {}


def _load_countries() -> dict[str, dict]:
    """Load all country JSON files from data/countries/."""
    if _COUNTRY_CACHE:
        return _COUNTRY_CACHE

    if not DATA_DIR.exists():
        logger.warning("Country data directory not found: %s", DATA_DIR)
        return {}

    for fpath in sorted(DATA_DIR.glob("*.json")):
        try:
            with open(fpath, "r") as f:
                data = json.load(f)
            slug = fpath.stem  # e.g., "us", "uk"
            data["slug"] = slug
            _COUNTRY_CACHE[slug] = data
        except (json.JSONDecodeError, OSError) as exc:
            logger.error("Failed to load country file %s: %s", fpath, exc)

    logger.info("Loaded %d country profiles", len(_COUNTRY_CACHE))
    return _COUNTRY_CACHE


def _summary(c: dict) -> dict:
    """Return summary-level fields for list views."""
    return {
        "slug": c.get("slug"),
        "country_name": c.get("country_name"),
        "flag": c.get("flag", ""),
        "avg_tuition_usd": c.get("avg_tuition_usd"),
        "avg_post_mba_salary_usd": c.get("avg_post_mba_salary_usd"),
        "program_length_years": c.get("program_length_years"),
        "post_study_work_visa": c.get("post_study_work_visa", {}),
        "cost_of_living_index": c.get("cost_of_living_index"),
        "top_schools_count": len(c.get("top_schools", [])),
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.get("")
def list_countries():
    """List all countries with summary stats."""
    countries = _load_countries()
    return {
        "countries": [_summary(c) for c in countries.values()],
        "total": len(countries),
    }


@router.get("/compare")
def compare_countries(countries: str = Query(..., description="Comma-separated slugs, e.g. us,uk,canada")):
    """Side-by-side comparison of 2-4 countries."""
    slugs = [s.strip().lower() for s in countries.split(",") if s.strip()]
    if len(slugs) < 2:
        raise HTTPException(400, "Provide at least 2 country slugs for comparison")
    if len(slugs) > 4:
        raise HTTPException(400, "Maximum 4 countries for comparison")

    all_countries = _load_countries()
    results = []
    for slug in slugs:
        if slug not in all_countries:
            raise HTTPException(404, f"Country not found: {slug}")
        results.append(all_countries[slug])

    # Build comparison dimensions
    dimensions = [
        "avg_tuition_usd", "avg_living_cost_usd", "program_length_years",
        "avg_post_mba_salary_usd", "cost_of_living_index", "safety_index",
        "scholarship_availability", "language_requirement", "path_to_pr",
        "test_policy",
    ]

    comparison: dict[str, dict] = {}
    for dim in dimensions:
        comparison[dim] = {}
        for c in results:
            comparison[dim][c["slug"]] = c.get(dim)

    return {
        "countries": results,
        "comparison": comparison,
        "dimensions": dimensions,
    }


@router.get("/{slug}")
def get_country(slug: str):
    """Full country profile."""
    all_countries = _load_countries()
    slug = slug.lower().strip()
    if slug not in all_countries:
        raise HTTPException(404, f"Country not found: {slug}")
    return all_countries[slug]
