"""School Events Aggregator — info sessions, campus visits, webinars for T25 schools."""

import json
import logging
import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["events"])


# ── Data Loading ────────────────────────────────────────────────────────────

_EVENTS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "school_events.json")
_events_cache: list[dict] | None = None


def _load_events() -> list[dict]:
    global _events_cache
    if _events_cache is not None:
        return _events_cache

    if os.path.isfile(_EVENTS_PATH):
        try:
            with open(_EVENTS_PATH) as f:
                _events_cache = json.load(f)
            return _events_cache
        except Exception as e:
            logger.error("Failed to load school events: %s", e)

    _events_cache = _generate_seed_events()
    # Save to disk for persistence
    try:
        with open(_EVENTS_PATH, "w") as f:
            json.dump(_events_cache, f, indent=2)
    except Exception as e:
        logger.error("Failed to save seed events: %s", e)

    return _events_cache


def _generate_seed_events() -> list[dict]:
    """Generate 60+ realistic events for T25 schools."""
    events = []
    idx = 0

    schools = [
        ("hbs", "Harvard Business School"),
        ("gsb", "Stanford GSB"),
        ("wharton", "Wharton"),
        ("booth", "Chicago Booth"),
        ("kellogg", "Kellogg"),
        ("sloan", "MIT Sloan"),
        ("cbs", "Columbia Business School"),
        ("tuck", "Dartmouth Tuck"),
        ("haas", "UC Berkeley Haas"),
        ("ross", "Michigan Ross"),
        ("fuqua", "Duke Fuqua"),
        ("darden", "UVA Darden"),
        ("stern", "NYU Stern"),
        ("som", "Yale SOM"),
        ("johnson", "Cornell Johnson"),
        ("anderson", "UCLA Anderson"),
        ("tepper", "Carnegie Mellon Tepper"),
        ("mccombs", "UT Austin McCombs"),
        ("marshall", "USC Marshall"),
        ("kelley", "Indiana Kelley"),
        ("kenan-flagler", "UNC Kenan-Flagler"),
        ("olin", "WashU Olin"),
        ("goizueta", "Emory Goizueta"),
        ("scheller", "Georgia Tech Scheller"),
        ("smith", "Maryland Smith"),
    ]

    event_templates = [
        {
            "name": "{school} MBA Virtual Information Session",
            "event_type": "info_session",
            "format": "virtual",
            "description": "Join our admissions team for an overview of the {school} MBA program, curriculum, and application process. Q&A included.",
            "duration_minutes": 60,
        },
        {
            "name": "{school} Campus Visit Day",
            "event_type": "campus_visit",
            "format": "in_person",
            "description": "Experience {school} firsthand. Attend a class, tour campus, meet current students, and speak with admissions.",
            "duration_minutes": 240,
        },
        {
            "name": "{school} MBA Application Workshop",
            "event_type": "workshop",
            "format": "virtual",
            "description": "Deep dive into the {school} MBA application. Tips on essays, recommendations, and interview preparation.",
            "duration_minutes": 90,
        },
        {
            "name": "{school} Student Panel: Life at {school}",
            "event_type": "student_panel",
            "format": "virtual",
            "description": "Hear from current {school} MBA students about academics, career opportunities, and campus life.",
            "duration_minutes": 60,
        },
        {
            "name": "{school} Regional Meetup",
            "event_type": "regional_meetup",
            "format": "in_person",
            "description": "Connect with {school} alumni and admissions representatives in your area. Informal networking and Q&A.",
            "duration_minutes": 120,
        },
        {
            "name": "{school} MBA Webinar: Career Outcomes",
            "event_type": "webinar",
            "format": "virtual",
            "description": "Learn about post-MBA career paths, employer partnerships, and placement statistics at {school}.",
            "duration_minutes": 45,
        },
    ]

    # Generate events across Apr-Sep 2026
    base_date = datetime(2026, 4, 1)
    for slug, school_name in schools:
        # 2-3 events per school
        import random
        num_events = random.randint(2, 3)
        selected_templates = random.sample(event_templates, min(num_events, len(event_templates)))

        for template in selected_templates:
            days_offset = random.randint(0, 180)
            event_date = base_date + timedelta(days=days_offset)
            hour = random.choice([10, 12, 14, 16, 18])

            events.append({
                "id": f"evt_{idx:04d}",
                "school_slug": slug,
                "school_name": school_name,
                "name": template["name"].replace("{school}", school_name),
                "date": event_date.strftime("%Y-%m-%d"),
                "time": f"{hour:02d}:00",
                "format": template["format"],
                "url": f"https://{slug}.edu/mba/events",
                "description": template["description"].replace("{school}", school_name),
                "event_type": template["event_type"],
                "duration_minutes": template["duration_minutes"],
            })
            idx += 1

    events.sort(key=lambda e: e["date"])
    return events


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/events")
def list_events(
    schools: Optional[str] = Query(default=None, description="Comma-separated school slugs"),
    month: Optional[str] = Query(default=None, description="YYYY-MM format"),
    event_type: Optional[str] = Query(default=None),
    format: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    """List school events with optional filters."""
    events = _load_events()

    filtered = events
    if schools:
        school_list = [s.strip().lower() for s in schools.split(",")]
        filtered = [e for e in filtered if e["school_slug"] in school_list]
    if month:
        filtered = [e for e in filtered if e["date"].startswith(month)]
    if event_type:
        filtered = [e for e in filtered if e["event_type"] == event_type]
    if format:
        filtered = [e for e in filtered if e["format"] == format]

    total = len(filtered)
    page = filtered[offset:offset + limit]

    # Collect unique values for filters
    all_types = sorted(set(e["event_type"] for e in events))
    all_formats = sorted(set(e["format"] for e in events))
    all_schools = sorted(set(e["school_slug"] for e in events))

    return {
        "events": page,
        "total": total,
        "limit": limit,
        "offset": offset,
        "filters": {
            "event_types": all_types,
            "formats": all_formats,
            "schools": all_schools,
        },
    }


@router.get("/events/upcoming")
def upcoming_events(
    days: int = Query(default=30, ge=1, le=90),
    limit: int = Query(default=20, ge=1, le=100),
):
    """Get events in the next N days."""
    events = _load_events()
    today = datetime.now().strftime("%Y-%m-%d")
    cutoff = (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d")

    upcoming = [e for e in events if today <= e["date"] <= cutoff]
    upcoming.sort(key=lambda e: e["date"])

    return {
        "events": upcoming[:limit],
        "total": len(upcoming),
        "range": {"from": today, "to": cutoff},
    }


@router.get("/events/my-schools")
def my_school_events(
    schools: str = Query(description="Comma-separated school slugs the user tracks"),
    limit: int = Query(default=30, ge=1, le=100),
):
    """Get events for user's tracked schools."""
    events = _load_events()
    school_list = [s.strip().lower() for s in schools.split(",")]

    filtered = [e for e in events if e["school_slug"] in school_list]
    filtered.sort(key=lambda e: e["date"])

    return {
        "events": filtered[:limit],
        "total": len(filtered),
        "tracked_schools": school_list,
    }
