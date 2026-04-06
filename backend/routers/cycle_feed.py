"""Cycle Feed — activity stream for school admissions cycles.

Aggregates decision waves, interview invite patterns, deadlines, and community
reports into a per-school timeline.
"""

import json
import logging
import os
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from agents import SCHOOL_DB

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["cycle-feed"])


# ── Historical Pattern Data ─────────────────────────────────────────────────

_CYCLE_PATTERNS: dict[str, list[dict]] = {
    "hbs": [
        {"month": "09", "day": "01", "type": "deadline", "description": "R1 application deadline"},
        {"month": "10", "day": "15", "type": "interview_invite", "description": "R1 interview invitations begin (historically mid-October)"},
        {"month": "12", "day": "10", "type": "decision", "description": "R1 decisions released"},
        {"month": "01", "day": "05", "type": "deadline", "description": "R2 application deadline"},
        {"month": "03", "day": "01", "type": "interview_invite", "description": "R2 interview invitations begin"},
        {"month": "03", "day": "27", "type": "decision", "description": "R2 decisions released"},
    ],
    "gsb": [
        {"month": "09", "day": "10", "type": "deadline", "description": "R1 application deadline"},
        {"month": "11", "day": "01", "type": "interview_invite", "description": "R1 interview invitations (historically early November)"},
        {"month": "12", "day": "15", "type": "decision", "description": "R1 decisions released"},
        {"month": "01", "day": "10", "type": "deadline", "description": "R2 application deadline"},
        {"month": "03", "day": "15", "type": "interview_invite", "description": "R2 interview invitations begin"},
        {"month": "04", "day": "01", "type": "decision", "description": "R2 decisions released"},
    ],
    "wharton": [
        {"month": "09", "day": "01", "type": "deadline", "description": "R1 application deadline"},
        {"month": "10", "day": "01", "type": "interview_invite", "description": "R1 TBD (Team-Based Discussion) invitations"},
        {"month": "12", "day": "15", "type": "decision", "description": "R1 decisions released"},
        {"month": "01", "day": "05", "type": "deadline", "description": "R2 application deadline"},
        {"month": "02", "day": "15", "type": "interview_invite", "description": "R2 TBD invitations begin"},
        {"month": "03", "day": "25", "type": "decision", "description": "R2 decisions released"},
    ],
    "booth": [
        {"month": "09", "day": "19", "type": "deadline", "description": "R1 application deadline"},
        {"month": "10", "day": "20", "type": "interview_invite", "description": "R1 interview invitations (historically mid-October)"},
        {"month": "12", "day": "12", "type": "decision", "description": "R1 decisions released"},
        {"month": "01", "day": "04", "type": "deadline", "description": "R2 application deadline"},
        {"month": "03", "day": "01", "type": "interview_invite", "description": "R2 interview invitations begin"},
        {"month": "03", "day": "22", "type": "decision", "description": "R2 decisions released"},
    ],
    "kellogg": [
        {"month": "09", "day": "11", "type": "deadline", "description": "R1 application deadline"},
        {"month": "10", "day": "10", "type": "interview_invite", "description": "R1 interview invitations (historically early October)"},
        {"month": "12", "day": "11", "type": "decision", "description": "R1 decisions released"},
        {"month": "01", "day": "08", "type": "deadline", "description": "R2 application deadline"},
        {"month": "02", "day": "20", "type": "interview_invite", "description": "R2 interview invitations begin"},
        {"month": "03", "day": "20", "type": "decision", "description": "R2 decisions released"},
    ],
    "sloan": [
        {"month": "09", "day": "25", "type": "deadline", "description": "R1 application deadline"},
        {"month": "10", "day": "25", "type": "interview_invite", "description": "R1 interview invitations begin"},
        {"month": "12", "day": "14", "type": "decision", "description": "R1 decisions released"},
        {"month": "01", "day": "17", "type": "deadline", "description": "R2 application deadline"},
        {"month": "03", "day": "10", "type": "interview_invite", "description": "R2 interview invitations begin"},
        {"month": "03", "day": "28", "type": "decision", "description": "R2 decisions released"},
    ],
    "cbs": [
        {"month": "08", "day": "23", "type": "deadline", "description": "ED application deadline"},
        {"month": "10", "day": "01", "type": "decision", "description": "ED decisions released"},
        {"month": "01", "day": "05", "type": "deadline", "description": "R1 application deadline"},
        {"month": "02", "day": "15", "type": "interview_invite", "description": "R1 interview invitations begin"},
        {"month": "03", "day": "20", "type": "decision", "description": "R1 decisions released"},
        {"month": "04", "day": "10", "type": "deadline", "description": "R2 application deadline"},
    ],
    "tuck": [
        {"month": "09", "day": "18", "type": "deadline", "description": "R1 application deadline"},
        {"month": "10", "day": "15", "type": "interview_invite", "description": "R1 interview invitations begin"},
        {"month": "12", "day": "15", "type": "decision", "description": "R1 decisions released"},
        {"month": "01", "day": "06", "type": "deadline", "description": "R2 application deadline"},
        {"month": "03", "day": "01", "type": "interview_invite", "description": "R2 interview invitations begin"},
        {"month": "03", "day": "15", "type": "decision", "description": "R2 decisions released"},
    ],
    "haas": [
        {"month": "09", "day": "21", "type": "deadline", "description": "R1 application deadline"},
        {"month": "10", "day": "25", "type": "interview_invite", "description": "R1 interview invitations begin"},
        {"month": "12", "day": "12", "type": "decision", "description": "R1 decisions released"},
        {"month": "01", "day": "05", "type": "deadline", "description": "R2 application deadline"},
        {"month": "03", "day": "01", "type": "interview_invite", "description": "R2 interview invitations begin"},
        {"month": "03", "day": "25", "type": "decision", "description": "R2 decisions released"},
    ],
    "ross": [
        {"month": "09", "day": "16", "type": "deadline", "description": "R1 application deadline"},
        {"month": "10", "day": "20", "type": "interview_invite", "description": "R1 interview invitations begin"},
        {"month": "12", "day": "18", "type": "decision", "description": "R1 decisions released"},
        {"month": "01", "day": "08", "type": "deadline", "description": "R2 application deadline"},
        {"month": "03", "day": "05", "type": "interview_invite", "description": "R2 interview invitations begin"},
        {"month": "03", "day": "22", "type": "decision", "description": "R2 decisions released"},
    ],
}

# Fallback pattern for schools not in the map
_DEFAULT_PATTERNS = [
    {"month": "09", "day": "15", "type": "deadline", "description": "R1 application deadline (estimated)"},
    {"month": "10", "day": "15", "type": "interview_invite", "description": "R1 interview invitations (estimated)"},
    {"month": "12", "day": "15", "type": "decision", "description": "R1 decisions (estimated)"},
    {"month": "01", "day": "10", "type": "deadline", "description": "R2 application deadline (estimated)"},
    {"month": "03", "day": "01", "type": "interview_invite", "description": "R2 interview invitations (estimated)"},
    {"month": "03", "day": "25", "type": "decision", "description": "R2 decisions (estimated)"},
]


def _build_cycle_events(school_slug: str, round_filter: Optional[str] = None) -> list[dict]:
    """Build the activity feed from historical patterns and community data."""
    patterns = _CYCLE_PATTERNS.get(school_slug, _DEFAULT_PATTERNS)
    school_name = SCHOOL_DB.get(school_slug, {}).get("name", school_slug)

    events = []
    current_year = 2026

    for pattern in patterns:
        month = int(pattern["month"])
        # Academic year: Sept-Dec = current year, Jan-Apr = next year
        year = current_year if month >= 8 else current_year + 1
        event_date = f"{year}-{pattern['month']}-{pattern['day']}"

        # Determine which round this event belongs to
        event_round = "R1" if month >= 8 and month <= 12 else "R2"
        if "ED" in pattern["description"]:
            event_round = "ED"

        if round_filter and event_round != round_filter:
            continue

        events.append({
            "date": event_date,
            "type": pattern["type"],
            "description": pattern["description"],
            "school_slug": school_slug,
            "school_name": school_name,
            "round": event_round,
            "source": "historical_pattern",
            "confidence": "high" if school_slug in _CYCLE_PATTERNS else "estimated",
        })

    # Add community-sourced decision waves from gmatclub data if available
    try:
        from agents import load_community_decisions
        decisions = load_community_decisions()
        school_decisions = [d for d in decisions if d.get("school_slug") == school_slug]

        # Group by date to find "waves"
        date_groups: dict[str, list[dict]] = defaultdict(list)
        for d in school_decisions:
            date = d.get("date") or d.get("created_at", "")[:10]
            if date:
                date_groups[date].append(d)

        for date, group in date_groups.items():
            if len(group) >= 3:  # 3+ decisions on same day = wave
                results = Counter(d.get("result", "unknown") for d in group)
                result_summary = ", ".join(f"{c} {r}" for r, c in results.most_common())
                events.append({
                    "date": date,
                    "type": "decision_wave",
                    "description": f"Decision wave: {len(group)} reports ({result_summary})",
                    "school_slug": school_slug,
                    "school_name": school_name,
                    "round": group[0].get("round", "unknown"),
                    "source": "community",
                    "confidence": "reported",
                    "aggregate_data": {
                        "total_reports": len(group),
                        "results": dict(results),
                    },
                })
    except Exception as e:
        logger.debug("Could not load community decisions for cycle feed: %s", e)

    events.sort(key=lambda e: e["date"])
    return events


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/cycle/{school_slug}/{round}")
def get_cycle_feed(school_slug: str, round: str):
    """Get the activity stream for a specific school and round."""
    valid_rounds = {"R1", "R2", "R3", "ED"}
    if round not in valid_rounds:
        raise HTTPException(400, detail=f"Invalid round. Must be one of: {valid_rounds}")

    events = _build_cycle_events(school_slug.lower(), round_filter=round)

    return {
        "school_slug": school_slug,
        "round": round,
        "events": events,
        "total": len(events),
    }


@router.get("/cycle/{school_slug}")
def get_cycle_feed_all(school_slug: str):
    """Get the full activity stream for a school across all rounds."""
    events = _build_cycle_events(school_slug.lower())

    return {
        "school_slug": school_slug,
        "events": events,
        "total": len(events),
    }


@router.get("/cycle-feed/schools")
def get_available_cycle_schools():
    """List schools that have cycle feed data available."""
    schools_with_data = []
    for slug in _CYCLE_PATTERNS:
        name = SCHOOL_DB.get(slug, {}).get("name", slug)
        events = _build_cycle_events(slug)
        schools_with_data.append({
            "slug": slug,
            "name": name,
            "event_count": len(events),
        })

    return {"schools": schools_with_data}
