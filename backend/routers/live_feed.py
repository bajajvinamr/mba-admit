"""Live Application Cycle Feed — ClearAdmit LiveWire competitor.

Real-time anonymized feed of admissions activity: self-reports, activity summaries,
and school-specific timelines.
"""

from __future__ import annotations

import json
import logging
import random
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from agents import SCHOOL_DB

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/feed", tags=["live-feed"])

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "live_feed.json"
GMATCLUB_FILE = Path(__file__).resolve().parent.parent / "data" / "gmatclub_decisions.json"


# ── Helpers ──────────────────────────────────────────────────────────────────


def _load_feed() -> list[dict]:
    if DATA_FILE.exists():
        try:
            return json.loads(DATA_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            logger.warning("Corrupt live_feed.json — returning empty feed")
            return []
    return []


def _save_feed(entries: list[dict]) -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(json.dumps(entries, indent=2, ensure_ascii=False), encoding="utf-8")


def _school_name(school_id: str) -> str:
    school = SCHOOL_DB.get(school_id, {})
    return school.get("name", school_id.upper())


def _relative_time(ts: str) -> str:
    """Convert ISO timestamp to relative time string like '2h ago'."""
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return "recently"

    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    delta = now - dt
    seconds = int(delta.total_seconds())

    if seconds < 60:
        return "just now"
    if seconds < 3600:
        m = seconds // 60
        return f"{m}m ago"
    if seconds < 86400:
        h = seconds // 3600
        return f"{h}h ago"
    if seconds < 604800:
        d = seconds // 86400
        return f"{d}d ago"
    if seconds < 2592000:
        w = seconds // 604800
        return f"{w}w ago"
    return dt.strftime("%b %d")


# ── Seed data on first load ──────────────────────────────────────────────────

_STATUS_MAP = {
    "Admitted": "admitted",
    "Admitted, ($$$)": "admitted",
    "Admitted, ($$$$)": "admitted",
    "Admitted from WL": "admitted",
    "Matriculating": "admitted",
    "Matriculating, ($$$)": "admitted",
    "Matriculating, ($$)": "admitted",
    "Invited to Interview": "interview_invite",
    "Interviewed": "interviewed",
    "Denied with Interview": "rejected",
    "Denied without Interview": "rejected",
    "Waitlisted with Interview": "waitlisted",
    "Waitlisted without Interview": "waitlisted",
    "Withdrawn Application": "applied",
}


def _seed_feed() -> list[dict]:
    """Seed ~50 realistic entries from gmatclub_decisions.json."""
    if not GMATCLUB_FILE.exists():
        logger.warning("gmatclub_decisions.json not found — skipping seed")
        return []

    try:
        raw = json.loads(GMATCLUB_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []

    # Pick a diverse sample
    sample = random.sample(raw, min(200, len(raw)))
    now = datetime.now(timezone.utc)
    entries: list[dict] = []

    nationalities = [
        "United States", "India", "China", "Brazil", "United Kingdom",
        "Canada", "South Korea", "Japan", "Nigeria", "Germany",
        "France", "Mexico", "Australia", "Singapore", "UAE",
    ]

    for item in sample:
        status = _STATUS_MAP.get(item.get("status", ""), None)
        if not status:
            continue

        school_id = item.get("school_id", "")
        if not school_id:
            continue

        # Random timestamp within last 30 days
        days_ago = random.randint(0, 29)
        hours_ago = random.randint(0, 23)
        ts = now - timedelta(days=days_ago, hours=hours_ago)

        gmat = item.get("gmat_focus") or item.get("gmat") or None
        if gmat and not isinstance(gmat, int):
            try:
                gmat = int(gmat)
            except (ValueError, TypeError):
                gmat = None

        entry = {
            "school_id": school_id,
            "school_name": _school_name(school_id),
            "status": status,
            "round": item.get("round", "Round 1"),
            "timestamp": ts.isoformat(),
        }
        if gmat:
            entry["gmat"] = gmat
        if item.get("location"):
            entry["nationality"] = item["location"]
        else:
            entry["nationality"] = random.choice(nationalities)

        entries.append(entry)

        if len(entries) >= 50:
            break

    # Sort by timestamp descending
    entries.sort(key=lambda e: e.get("timestamp", ""), reverse=True)
    _save_feed(entries)
    logger.info("Seeded live feed with %d entries", len(entries))
    return entries


def _ensure_feed() -> list[dict]:
    """Load feed, seeding if empty."""
    feed = _load_feed()
    if not feed:
        feed = _seed_feed()
    return feed


# ── Models ───────────────────────────────────────────────────────────────────


class FeedReport(BaseModel):
    school_id: str = Field(..., min_length=1)
    status: str = Field(..., pattern=r"^(applied|interview_invite|interviewed|admitted|rejected|waitlisted)$")
    gmat: Optional[int] = Field(None, ge=200, le=900)
    round: Optional[str] = None
    nationality: Optional[str] = None


class FeedEntry(BaseModel):
    school_id: str
    school_name: str
    status: str
    gmat: Optional[int] = None
    round: Optional[str] = None
    nationality: Optional[str] = None
    time_ago: str
    timestamp: str


class SchoolActivity(BaseModel):
    school_id: str
    school_name: str
    reports_this_month: int
    most_recent_status: Optional[str] = None
    trending: str  # "up", "down", "stable"


class ActivitySummaryResponse(BaseModel):
    total_reports: int
    active_schools: int
    schools: list[SchoolActivity]


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.post("/report")
def submit_report(report: FeedReport):
    """Anonymous self-report of admissions activity."""
    feed = _load_feed()

    entry = {
        "school_id": report.school_id,
        "school_name": _school_name(report.school_id),
        "status": report.status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if report.gmat is not None:
        entry["gmat"] = report.gmat
    if report.round:
        entry["round"] = report.round
    if report.nationality:
        entry["nationality"] = report.nationality

    feed.insert(0, entry)
    _save_feed(feed)

    return {"message": "Report submitted", "total_reports": len(feed)}


@router.get("/recent", response_model=list[FeedEntry])
def get_recent_feed(
    school_id: Optional[str] = Query(None, description="Filter by school"),
    limit: int = Query(50, ge=1, le=200),
):
    """Get recent feed entries, optionally filtered by school."""
    feed = _ensure_feed()

    if school_id:
        feed = [e for e in feed if e.get("school_id") == school_id]

    entries = feed[:limit]

    return [
        FeedEntry(
            school_id=e["school_id"],
            school_name=e.get("school_name", _school_name(e["school_id"])),
            status=e["status"],
            gmat=e.get("gmat"),
            round=e.get("round"),
            nationality=e.get("nationality"),
            time_ago=_relative_time(e.get("timestamp", "")),
            timestamp=e.get("timestamp", ""),
        )
        for e in entries
    ]


@router.get("/activity-summary", response_model=ActivitySummaryResponse)
def get_activity_summary():
    """Current cycle summary — where the action is."""
    feed = _ensure_feed()
    now = datetime.now(timezone.utc)
    this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)

    school_this_month: dict[str, list[dict]] = {}
    school_last_month: dict[str, int] = {}

    for entry in feed:
        sid = entry.get("school_id", "")
        try:
            ts = datetime.fromisoformat(entry.get("timestamp", "").replace("Z", "+00:00"))
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
        except (ValueError, AttributeError):
            continue

        if ts >= this_month_start:
            school_this_month.setdefault(sid, []).append(entry)
        elif ts >= last_month_start:
            school_last_month[sid] = school_last_month.get(sid, 0) + 1

    schools: list[SchoolActivity] = []
    for sid, entries in sorted(school_this_month.items(), key=lambda x: len(x[1]), reverse=True):
        this_count = len(entries)
        last_count = school_last_month.get(sid, 0)

        if this_count > last_count:
            trending = "up"
        elif this_count < last_count:
            trending = "down"
        else:
            trending = "stable"

        most_recent = entries[0].get("status") if entries else None

        schools.append(SchoolActivity(
            school_id=sid,
            school_name=_school_name(sid),
            reports_this_month=this_count,
            most_recent_status=most_recent,
            trending=trending,
        ))

    return ActivitySummaryResponse(
        total_reports=len(feed),
        active_schools=len(schools),
        schools=schools,
    )


@router.get("/school/{school_id}/timeline")
def get_school_timeline(school_id: str):
    """School-specific activity timeline, grouped by date."""
    feed = _ensure_feed()
    school_entries = [e for e in feed if e.get("school_id") == school_id]

    if not school_entries:
        return {"school_id": school_id, "school_name": _school_name(school_id), "timeline": []}

    # Group by date
    by_date: dict[str, list[dict]] = {}
    for entry in school_entries:
        try:
            ts = datetime.fromisoformat(entry.get("timestamp", "").replace("Z", "+00:00"))
            date_key = ts.strftime("%Y-%m-%d")
        except (ValueError, AttributeError):
            date_key = "unknown"

        by_date.setdefault(date_key, []).append({
            "status": entry.get("status"),
            "gmat": entry.get("gmat"),
            "round": entry.get("round"),
            "nationality": entry.get("nationality"),
            "time_ago": _relative_time(entry.get("timestamp", "")),
        })

    timeline = [
        {"date": date, "entries": entries}
        for date, entries in sorted(by_date.items(), reverse=True)
    ]

    return {
        "school_id": school_id,
        "school_name": _school_name(school_id),
        "total_reports": len(school_entries),
        "timeline": timeline,
    }
