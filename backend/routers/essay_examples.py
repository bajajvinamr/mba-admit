"""Essay Examples Library — anonymized real essay examples with coach notes."""

import json
import os
from collections import Counter

from fastapi import APIRouter, HTTPException, Query
from logging_config import setup_logging

logger = setup_logging()

router = APIRouter(prefix="/api/essays", tags=["essay-examples"])

_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
_examples_cache: list[dict] | None = None


def _load_json(path: str) -> list[dict]:
    """Safely load a JSON array file."""
    if not os.path.isfile(path):
        return []
    try:
        with open(path) as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except Exception:
        return []


def _load_examples() -> list[dict]:
    """Load essay examples from all sources with caching."""
    global _examples_cache
    if _examples_cache is not None:
        return _examples_cache

    all_essays: list[dict] = []

    # 1. Hand-crafted examples (highest quality, with coach notes)
    curated = _load_json(os.path.join(_DATA_DIR, "essay_examples.json"))
    for e in curated:
        e.setdefault("source_type", "curated")
        e.setdefault("quality", "featured")
    all_essays.extend(curated)

    # 2. ARINGO real essays (scraped from public site)
    aringo = _load_json(os.path.join(_DATA_DIR, "aringo_essays.json"))
    for e in aringo:
        e.setdefault("source_type", "real")
        e.setdefault("quality", "real_example")
        # Normalize fields to match curated schema
        e.setdefault("school", e.get("school_id"))
        e.setdefault("school_name", e.get("page_title", ""))
    all_essays.extend(aringo)

    # 3. Claude-generated corpus (diverse, labeled with outcomes)
    generated = _load_json(os.path.join(_DATA_DIR, "essay_corpus.json"))
    for e in generated:
        e.setdefault("source_type", "generated")
        e.setdefault("quality", "ai_generated")
        e.setdefault("school", e.get("school_id"))
    all_essays.extend(generated)

    _examples_cache = all_essays
    logger.info(
        "Loaded %d essay examples (curated=%d, real=%d, generated=%d)",
        len(all_essays), len(curated), len(aringo), len(generated),
    )
    return _examples_cache


@router.get("/examples")
def list_examples(
    school: str | None = Query(None, description="Filter by school slug (e.g. hbs, gsb)"),
    theme: str | None = Query(None, description="Filter by theme (e.g. leadership, failure)"),
    industry: str | None = Query(None, description="Filter by background industry"),
    limit: int = Query(20, ge=1, le=50, description="Max results to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
):
    """List essay examples with optional filters.

    Returns card-level data (no full essay content) for browsing.
    Use GET /examples/{id} for the full essay.
    """
    examples = _load_examples()

    # Apply filters
    if school:
        school_lower = school.lower()
        examples = [e for e in examples if e["school"].lower() == school_lower]

    if theme:
        theme_lower = theme.lower()
        examples = [e for e in examples if theme_lower in [t.lower() for t in e.get("themes", [])]]

    if industry:
        industry_lower = industry.lower()
        examples = [
            e for e in examples
            if industry_lower in e.get("background", {}).get("industry", "").lower()
        ]

    total = len(examples)

    # Paginate
    paginated = examples[offset : offset + limit]

    # Return card-level data (no full content)
    cards = []
    for ex in paginated:
        cards.append({
            "id": ex["id"],
            "school": ex.get("school", ""),
            "school_name": ex.get("school_name", ""),
            "prompt": ex.get("prompt", ""),
            "year": ex.get("year", ""),
            "word_count": ex.get("word_count", 0),
            "background": ex.get("background", {}),
            "themes": ex.get("themes", []),
            "strengths": ex.get("strengths", []),
            "source_type": ex.get("source_type", ""),
            "quality": ex.get("quality", ""),
        })

    return {
        "examples": cards,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/examples/themes")
def list_themes():
    """List all available themes with counts."""
    examples = _load_examples()
    theme_counts: Counter[str] = Counter()
    for ex in examples:
        for theme in ex.get("themes", []):
            theme_counts[theme] += 1

    return {
        "themes": [
            {"theme": theme, "count": count}
            for theme, count in theme_counts.most_common()
        ],
        "total_themes": len(theme_counts),
    }


@router.get("/examples/stats")
def example_stats():
    """Aggregate stats: counts by school, theme, industry, outcome."""
    examples = _load_examples()

    school_counts: Counter[str] = Counter()
    theme_counts: Counter[str] = Counter()
    industry_counts: Counter[str] = Counter()
    outcome_counts: Counter[str] = Counter()

    for ex in examples:
        school_counts[ex.get("school_name", "Unknown")] += 1
        for theme in ex.get("themes", []):
            theme_counts[theme] += 1
        bg = ex.get("background", {})
        industry_counts[bg.get("industry", "Unknown")] += 1
        outcome_counts[bg.get("outcome", "unknown")] += 1

    return {
        "total_examples": len(examples),
        "by_school": [
            {"school": s, "count": c} for s, c in school_counts.most_common()
        ],
        "by_theme": [
            {"theme": t, "count": c} for t, c in theme_counts.most_common()
        ],
        "by_industry": [
            {"industry": i, "count": c} for i, c in industry_counts.most_common()
        ],
        "by_outcome": dict(outcome_counts),
    }


@router.get("/examples/{example_id}")
def get_example(example_id: str):
    """Get a single essay example by ID — includes full content and coach notes."""
    examples = _load_examples()
    for ex in examples:
        if ex["id"] == example_id:
            return ex
    raise HTTPException(404, detail=f"Essay example not found: {example_id}")
