"""Deadline & Round Tracker — deadlines for user's tracked schools."""

import json
import logging
import os
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from agents import SCHOOL_DB
from auth import get_current_user, get_optional_user
import db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/deadlines", tags=["deadlines"])

# ── Subscriber storage (file-backed) ────────────────────────────────────────

_SUBSCRIBERS_PATH = Path(os.path.dirname(__file__)).parent / "data" / "deadline_subscribers.json"
_subscribers: Dict[str, Dict] = {}  # email -> {email, user_id, subscribed_at}


def _load_subscribers() -> None:
    """Load subscribers from JSON file into memory."""
    global _subscribers
    if _SUBSCRIBERS_PATH.exists():
        try:
            data = json.loads(_SUBSCRIBERS_PATH.read_text())
            _subscribers = {entry["email"]: entry for entry in data}
            logger.info("Loaded %d deadline subscribers from disk", len(_subscribers))
        except Exception as e:
            logger.warning("Could not load subscribers file: %s", e)
            _subscribers = {}
    else:
        _subscribers = {}


def _save_subscribers() -> None:
    """Persist subscribers to JSON file."""
    try:
        _SUBSCRIBERS_PATH.parent.mkdir(parents=True, exist_ok=True)
        _SUBSCRIBERS_PATH.write_text(json.dumps(list(_subscribers.values()), indent=2))
    except Exception as e:
        logger.warning("Could not save subscribers file: %s", e)


# Load on module import
_load_subscribers()


# ── Helpers ──────────────────────────────────────────────────────────────────


def _parse_deadline_date(raw: str) -> Optional[datetime]:
    """Parse deadline strings like 'September 2025', 'January 2026', 'March 15, 2026'."""
    if not raw or not isinstance(raw, str):
        return None
    # Skip non-date strings
    skip_keywords = ["rolling", "review", "week", "contact", "tbd", "n/a"]
    if any(kw in raw.lower() for kw in skip_keywords):
        return None
    for fmt in ("%B %d, %Y", "%B %Y", "%b %d, %Y", "%b %Y"):
        try:
            return datetime.strptime(raw.strip(), fmt)
        except ValueError:
            continue
    return None


def _urgency(days_remaining: int) -> str:
    """Classify urgency based on days remaining."""
    if days_remaining < 0:
        return "overdue"
    if days_remaining <= 7:
        return "urgent"
    if days_remaining <= 30:
        return "soon"
    if days_remaining <= 90:
        return "upcoming"
    return "future"


def _build_deadline_entries(school_id: str, school_data: dict, now: datetime) -> List[dict]:
    """Extract all deadline entries from a school's data."""
    deadlines = school_data.get("admission_deadlines", []) or school_data.get("deadlines", [])
    school_name = school_data.get("name", school_id)
    entries = []

    for dl in deadlines:
        raw_deadline = dl.get("deadline", "")
        parsed = _parse_deadline_date(raw_deadline)
        if not parsed:
            continue

        days_remaining = (parsed - now).days
        raw_decision = dl.get("decision", "")
        decision_parsed = _parse_deadline_date(raw_decision)

        entries.append({
            "school_id": school_id,
            "school_name": school_name,
            "round": dl.get("round", ""),
            "deadline_date": parsed.strftime("%Y-%m-%d"),
            "deadline_display": raw_deadline,
            "decision_date": decision_parsed.strftime("%Y-%m-%d") if decision_parsed else None,
            "decision_display": raw_decision if decision_parsed else None,
            "days_remaining": days_remaining,
            "urgency": _urgency(days_remaining),
        })

    return entries


# ── GET /api/deadlines ───────────────────────────────────────────────────────


@router.get("")
def get_deadlines(
    user: Dict = Depends(get_optional_user),
    include_all: bool = Query(default=False, description="If true, return deadlines for all schools (not just tracked)"),
):
    """Return all deadlines for user's tracked schools, merged with scraped data."""
    now = datetime.now()
    all_entries: List[dict] = []

    if user and not include_all:
        user_id = user.get("sub", "anonymous")
        user_schools = db.get_user_schools(user_id)
        school_ids = {entry.get("school_id", "") for entry in user_schools}
    else:
        # If no user or include_all, return top schools' deadlines
        school_ids = set(list(SCHOOL_DB.keys())[:50])

    for sid in school_ids:
        school_data = SCHOOL_DB.get(sid, {})
        if not school_data:
            continue
        all_entries.extend(_build_deadline_entries(sid, school_data, now))

    # Sort by deadline date
    all_entries.sort(key=lambda d: d["deadline_date"])

    return {
        "deadlines": all_entries,
        "total": len(all_entries),
        "school_count": len(school_ids),
    }


# ── GET /api/deadlines/calendar ──────────────────────────────────────────────


@router.get("/calendar")
def get_calendar(
    month: Optional[str] = Query(default=None, description="Filter by month: YYYY-MM"),
    user: Dict = Depends(get_optional_user),
):
    """Return deadlines grouped by date for calendar view."""
    now = datetime.now()

    if user:
        user_id = user.get("sub", "anonymous")
        user_schools = db.get_user_schools(user_id)
        school_ids = {entry.get("school_id", "") for entry in user_schools}
    else:
        school_ids = set(list(SCHOOL_DB.keys())[:50])

    all_entries: List[dict] = []
    for sid in school_ids:
        school_data = SCHOOL_DB.get(sid, {})
        if not school_data:
            continue
        all_entries.extend(_build_deadline_entries(sid, school_data, now))

    # Filter by month if specified
    if month:
        all_entries = [e for e in all_entries if e["deadline_date"].startswith(month)]

    # Group by date
    by_date: Dict[str, List[dict]] = defaultdict(list)
    for entry in all_entries:
        by_date[entry["deadline_date"]].append(entry)

    # Also group by month for overview
    by_month: Dict[str, List[dict]] = defaultdict(list)
    for entry in all_entries:
        month_key = entry["deadline_date"][:7]  # YYYY-MM
        by_month[month_key].append(entry)

    return {
        "by_date": dict(by_date),
        "by_month": dict(by_month),
        "total": len(all_entries),
    }


# ── POST /api/deadlines/subscribe ───────────────────────────────────────────


class SubscribeRequest(BaseModel):
    email: str = Field(min_length=5, max_length=200)


@router.post("/subscribe")
def subscribe_to_reminders(req: SubscribeRequest, user: Dict = Depends(get_optional_user)):
    """Subscribe user email to deadline reminders."""
    email = req.email.strip().lower()
    # Basic validation
    if "@" not in email or "." not in email:
        raise HTTPException(status_code=400, detail="Invalid email address")

    user_id = user.get("sub", "anonymous") if user else "anonymous"
    logger.info("Deadline reminder subscription: user=%s email=%s", user_id, email)

    already_subscribed = email in _subscribers
    _subscribers[email] = {
        "email": email,
        "user_id": user_id,
        "subscribed_at": datetime.now().isoformat(),
    }
    _save_subscribers()

    return {
        "ok": True,
        "email": email,
        "already_subscribed": already_subscribed,
        "message": "You'll receive deadline reminders at this email address.",
    }


# ── POST /api/deadlines/send-reminders ────────────────────────────────────


@router.post("/send-reminders")
def send_reminders():
    """Find deadlines within 7 days for all subscribers and return formatted reminder data.

    Returns a list of email payloads (one per subscriber) containing the
    subscriber's upcoming deadlines.  An external email service or cron job
    can call this endpoint and actually dispatch the emails.
    """
    now = datetime.now()
    window_end = now + timedelta(days=7)
    emails_to_send: List[dict] = []

    for subscriber in _subscribers.values():
        email = subscriber["email"]
        user_id = subscriber.get("user_id", "anonymous")

        # Determine which schools this user tracks
        if user_id and user_id != "anonymous":
            user_schools = db.get_user_schools(user_id)
            school_ids = {entry.get("school_id", "") for entry in user_schools}
        else:
            # For anonymous subscribers, check top schools
            school_ids = set(list(SCHOOL_DB.keys())[:50])

        # Collect deadlines within the 7-day window
        upcoming: List[dict] = []
        for sid in school_ids:
            school_data = SCHOOL_DB.get(sid, {})
            if not school_data:
                continue
            entries = _build_deadline_entries(sid, school_data, now)
            for entry in entries:
                if 0 <= entry["days_remaining"] <= 7:
                    upcoming.append(entry)

        if not upcoming:
            continue

        # Sort by closest deadline first
        upcoming.sort(key=lambda d: d["days_remaining"])

        emails_to_send.append({
            "to": email,
            "user_id": user_id,
            "subject": f"MBA Deadline Reminder: {len(upcoming)} deadline{'s' if len(upcoming) != 1 else ''} within 7 days",
            "deadlines": upcoming,
        })

    return {
        "emails_to_send": emails_to_send,
        "total_subscribers": len(_subscribers),
        "total_emails": len(emails_to_send),
    }
