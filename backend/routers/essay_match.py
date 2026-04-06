"""Essay Similarity Matching — filter and find MBA essays by profile criteria."""

from __future__ import annotations

import json
import logging
import os
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/essays/match", tags=["essay-match"])

logger = logging.getLogger(__name__)

_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")


# ── Data Loading ──────────────────────────────────────────────────────────────


def _load_json(filename: str) -> list[dict]:
    path = os.path.join(_DATA_DIR, filename)
    try:
        with open(path, "r") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except (FileNotFoundError, json.JSONDecodeError) as exc:
        logger.warning("Could not load %s: %s", filename, exc)
        return []


def _load_all_essays() -> list[dict]:
    """Load and tag essays from all three sources with a priority rank."""
    curated = _load_json("essay_examples.json")
    for e in curated:
        e.setdefault("source_type", "curated")
        e["_rank"] = 0

    real = _load_json("aringo_essays.json")
    for e in real:
        e.setdefault("source_type", "real")
        e["_rank"] = 1

    generated = _load_json("essay_corpus.json")
    for e in generated:
        e.setdefault("source_type", "generated")
        e["_rank"] = 2

    return curated + real + generated


# ── Request / Response Models ─────────────────────────────────────────────────


class EssayMatchRequest(BaseModel):
    school_id: str | None = None
    industry: str | None = None
    gmat_min: int | None = None
    gmat_max: int | None = None
    outcome: str | None = None  # "admitted" | "rejected" | "waitlisted"
    essay_type: str | None = None
    limit: int = Field(default=10, ge=1, le=50)


class EssayMatchResult(BaseModel):
    id: str
    school_id: str | None
    school_name: str | None
    prompt: str | None
    content: str | None
    word_count: int | None
    source_type: str
    outcome: str | None


# ── Filtering Logic ───────────────────────────────────────────────────────────


def _get_school_id(essay: dict) -> str | None:
    return essay.get("school_id") or essay.get("school") or None


def _get_school_name(essay: dict) -> str | None:
    return essay.get("school_name") or None


def _get_gmat(essay: dict) -> int | None:
    """Extract GMAT from various nesting patterns across sources."""
    for key in ("background", "profile"):
        nested = essay.get(key)
        if isinstance(nested, dict):
            gmat = nested.get("gmat")
            if gmat is not None:
                try:
                    return int(gmat)
                except (ValueError, TypeError):
                    pass
    raw = essay.get("gmat")
    if raw is not None:
        try:
            return int(raw)
        except (ValueError, TypeError):
            pass
    return None


def _get_outcome(essay: dict) -> str | None:
    for key in ("outcome", "background", "profile"):
        if key == "outcome":
            val = essay.get("outcome")
        else:
            nested = essay.get(key)
            val = nested.get("outcome") if isinstance(nested, dict) else None
        if val:
            return str(val).lower()
    return None


def _get_industry(essay: dict) -> str | None:
    for key in ("background", "profile"):
        nested = essay.get(key)
        if isinstance(nested, dict) and nested.get("industry"):
            return str(nested["industry"]).lower()
    return essay.get("industry", "").lower() or None


def _matches(essay: dict, req: EssayMatchRequest) -> bool:
    if req.school_id:
        sid = _get_school_id(essay)
        if sid is None or req.school_id.lower() != sid.lower():
            return False

    if req.industry:
        ind = _get_industry(essay)
        if ind is None or req.industry.lower() not in ind:
            return False

    if req.gmat_min is not None or req.gmat_max is not None:
        gmat = _get_gmat(essay)
        if gmat is None:
            return False
        if req.gmat_min is not None and gmat < req.gmat_min:
            return False
        if req.gmat_max is not None and gmat > req.gmat_max:
            return False

    if req.outcome:
        outcome = _get_outcome(essay)
        if outcome is None or req.outcome.lower() != outcome:
            return False

    if req.essay_type:
        etype = (essay.get("essay_type") or "").lower()
        if req.essay_type.lower() != etype:
            return False

    return True


def _truncate(text: str | None, max_len: int) -> str | None:
    if text is None:
        return None
    if len(text) <= max_len:
        return text
    return text[:max_len] + "..."


def _to_result(essay: dict) -> EssayMatchResult:
    return EssayMatchResult(
        id=essay.get("id", "unknown"),
        school_id=_get_school_id(essay),
        school_name=_get_school_name(essay),
        prompt=_truncate(essay.get("prompt"), 200),
        content=_truncate(essay.get("content"), 500),
        word_count=essay.get("word_count"),
        source_type=essay.get("source_type", "unknown"),
        outcome=_get_outcome(essay),
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.post("")
def match_essays(req: EssayMatchRequest) -> list[EssayMatchResult]:
    """Filter essays by school, industry, GMAT range, outcome, and essay type."""
    essays = _load_all_essays()

    matched = [e for e in essays if _matches(e, req)]
    matched.sort(key=lambda e: e.get("_rank", 99))
    matched = matched[: req.limit]

    return [_to_result(e) for e in matched]


@router.get("/similar-profile")
def similar_profile(
    gmat: int = Query(..., description="Applicant GMAT score"),
    industry: str = Query(..., description="Applicant industry"),
    school_id: str | None = Query(None, description="Target school ID"),
) -> list[EssayMatchResult]:
    """Find essays from applicants with a similar profile (GMAT +-30, same industry)."""
    essays = _load_all_essays()
    results: list[dict] = []

    for essay in essays:
        essay_gmat = _get_gmat(essay)
        essay_industry = _get_industry(essay)

        # GMAT within +-30
        if essay_gmat is None or abs(essay_gmat - gmat) > 30:
            continue

        # Industry match (substring)
        if essay_industry is None or industry.lower() not in essay_industry:
            continue

        # Optional school filter
        if school_id:
            sid = _get_school_id(essay)
            if sid is None or school_id.lower() != sid.lower():
                continue

        results.append(essay)

    results.sort(key=lambda e: e.get("_rank", 99))
    results = results[:10]

    return [_to_result(e) for e in results]
