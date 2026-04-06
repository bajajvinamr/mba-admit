"""iCal Export — generate .ics files with MBA application deadlines."""

from __future__ import annotations

import hashlib
import re
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

router = APIRouter(prefix="/api/ical", tags=["ical-export"])


# ── Helpers ───────────────────────────────────────────────────────────────────


def _parse_deadline_date(raw: str) -> Optional[datetime]:
    """Best-effort parse of deadline strings like 'September 2025', 'January 4, 2026', '2025-09-04'."""
    if not raw:
        return None
    raw = raw.strip()

    formats = [
        "%Y-%m-%d",
        "%B %d, %Y",
        "%B %Y",
        "%b %d, %Y",
        "%b %Y",
        "%m/%d/%Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            continue
    return None


def _uid(school_id: str, round_name: str) -> str:
    """Deterministic UID for a VEVENT so re-exports don't duplicate."""
    h = hashlib.sha256(f"{school_id}:{round_name}".encode()).hexdigest()[:16]
    return f"{h}@mba-admissions-ai"


def _escape_ics(text: str) -> str:
    """Escape special characters for iCalendar text fields."""
    return text.replace("\\", "\\\\").replace(",", "\\,").replace(";", "\\;").replace("\n", "\\n")


def _build_vevent(
    school_name: str,
    school_id: str,
    round_name: str,
    dt: datetime,
) -> str:
    date_str = dt.strftime("%Y%m%d")
    now_stamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    summary = _escape_ics(f"{school_name} - {round_name} Deadline")
    description = _escape_ics(f"Application deadline for {school_name} MBA program")

    return (
        "BEGIN:VEVENT\r\n"
        f"UID:{_uid(school_id, round_name)}\r\n"
        f"DTSTAMP:{now_stamp}\r\n"
        f"DTSTART;VALUE=DATE:{date_str}\r\n"
        f"SUMMARY:{summary}\r\n"
        f"DESCRIPTION:{description}\r\n"
        # 7-day reminder
        "BEGIN:VALARM\r\n"
        "TRIGGER:-P7D\r\n"
        "ACTION:DISPLAY\r\n"
        f"DESCRIPTION:7 days until {summary}\r\n"
        "END:VALARM\r\n"
        # 1-day reminder
        "BEGIN:VALARM\r\n"
        "TRIGGER:-P1D\r\n"
        "ACTION:DISPLAY\r\n"
        f"DESCRIPTION:Tomorrow: {summary}\r\n"
        "END:VALARM\r\n"
        "END:VEVENT\r\n"
    )


def _build_ics(events: list[str]) -> str:
    header = (
        "BEGIN:VCALENDAR\r\n"
        "VERSION:2.0\r\n"
        "PRODID:-//MBA Admissions AI//Deadline Export//EN\r\n"
        "CALSCALE:GREGORIAN\r\n"
        "METHOD:PUBLISH\r\n"
        "X-WR-CALNAME:MBA Application Deadlines\r\n"
    )
    footer = "END:VCALENDAR\r\n"
    return header + "".join(events) + footer


def _events_for_school(school_id: str, school: dict) -> list[str]:
    """Return VEVENT strings for every parseable deadline in a school entry."""
    school_name = school.get("name", school.get("school_name", school_id))
    deadlines = school.get("admission_deadlines", [])
    events: list[str] = []

    for dl in deadlines:
        round_name = dl.get("round", "")
        raw_date = dl.get("deadline", "")
        dt = _parse_deadline_date(raw_date)
        if dt is None:
            continue
        events.append(_build_vevent(school_name, school_id, round_name, dt))

    return events


def _ics_response(ics_body: str, filename: str) -> Response:
    return Response(
        content=ics_body,
        media_type="text/calendar",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.get("/deadlines")
def export_deadlines(school_ids: str = Query(..., description="Comma-separated school IDs")):
    """Export deadlines for multiple schools as a single .ics file."""
    from agents import SCHOOL_DB

    ids = [s.strip() for s in school_ids.split(",") if s.strip()]
    if not ids:
        raise HTTPException(status_code=400, detail="school_ids query param is required")

    all_events: list[str] = []
    found_any = False

    for sid in ids:
        school = SCHOOL_DB.get(sid)
        if school is None:
            continue
        found_any = True
        all_events.extend(_events_for_school(sid, school))

    if not found_any:
        raise HTTPException(status_code=404, detail="No matching schools found")

    if not all_events:
        raise HTTPException(
            status_code=404,
            detail="Schools found but no parseable deadlines available",
        )

    return _ics_response(_build_ics(all_events), "mba-deadlines.ics")


@router.get("/school/{school_id}")
def export_school_deadlines(school_id: str):
    """Export deadlines for a single school as an .ics file."""
    from agents import SCHOOL_DB

    school = SCHOOL_DB.get(school_id)
    if school is None:
        raise HTTPException(status_code=404, detail=f"School '{school_id}' not found")

    events = _events_for_school(school_id, school)
    if not events:
        raise HTTPException(
            status_code=404,
            detail=f"No parseable deadlines for school '{school_id}'",
        )

    return _ics_response(_build_ics(events), f"{school_id}-deadlines.ics")
