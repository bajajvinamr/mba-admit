"""Interview Intelligence — school-specific interview guides for T25 programs."""

import json
import os

from fastapi import APIRouter, HTTPException
from logging_config import setup_logging

logger = setup_logging()

router = APIRouter(prefix="/api", tags=["interview-guides"])

_GUIDES_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "interview_guides")
_guides_cache: dict[str, dict] = {}


def _load_guide(slug: str) -> dict | None:
    """Load a single interview guide from JSON file with caching."""
    if slug in _guides_cache:
        return _guides_cache[slug]

    path = os.path.join(_GUIDES_DIR, f"{slug}.json")
    if not os.path.isfile(path):
        return None

    try:
        with open(path) as f:
            data = json.load(f)
        _guides_cache[slug] = data
        return data
    except Exception as e:
        logger.error("Failed to load interview guide %s: %s", slug, e)
        return None


def _list_available_slugs() -> list[str]:
    """List all available interview guide slugs."""
    if not os.path.isdir(_GUIDES_DIR):
        return []
    return sorted(
        f.replace(".json", "")
        for f in os.listdir(_GUIDES_DIR)
        if f.endswith(".json")
    )


@router.get("/interviews/guide/{school_slug}")
def get_interview_guide(school_slug: str):
    """Get the interview intelligence guide for a specific school."""
    slug = school_slug.strip().lower()
    guide = _load_guide(slug)
    if not guide:
        available = _list_available_slugs()
        raise HTTPException(
            404,
            detail=f"Interview guide not found for '{slug}'. Available: {', '.join(available)}",
        )
    return {"school_slug": slug, **guide}


@router.get("/interviews/guides")
def list_interview_guides():
    """List all available interview guides with summary info."""
    slugs = _list_available_slugs()
    summaries = []
    for slug in slugs:
        guide = _load_guide(slug)
        if guide:
            fmt = guide.get("format", {})
            summaries.append({
                "school_slug": slug,
                "interviewer_type": fmt.get("interviewer_type", "unknown"),
                "duration": fmt.get("duration", "unknown"),
                "is_blind": fmt.get("is_blind", False),
                "style": guide.get("style", []),
                "reports_count": guide.get("reports_count", 0),
            })
    return {"guides": summaries, "total": len(summaries)}
