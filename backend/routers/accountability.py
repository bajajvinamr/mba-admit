"""Accountability Engine — replaces the consultant's 'where's your essay?' call.

Activity check-ins, streak tracking, smart nudges, and weekly summaries.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone, timedelta, date
from pathlib import Path
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from agents import SCHOOL_DB

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/accountability", tags=["accountability"])

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "checkins.json"


# ── Helpers ──────────────────────────────────────────────────────────────────


def _load_checkins() -> list[dict]:
    if DATA_FILE.exists():
        try:
            return json.loads(DATA_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            logger.warning("Corrupt checkins.json — returning empty")
            return []
    return []


def _save_checkins(checkins: list[dict]) -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(json.dumps(checkins, indent=2, ensure_ascii=False), encoding="utf-8")


def _calculate_streak(checkins: list[dict]) -> tuple[int, int]:
    """Return (current_streak, longest_streak) from check-in dates."""
    if not checkins:
        return 0, 0

    dates: set[date] = set()
    for c in checkins:
        try:
            ts = datetime.fromisoformat(c.get("timestamp", "").replace("Z", "+00:00"))
            dates.add(ts.date())
        except (ValueError, AttributeError):
            continue

    if not dates:
        return 0, 0

    sorted_dates = sorted(dates, reverse=True)
    today = date.today()

    # Current streak: consecutive days ending today or yesterday
    current_streak = 0
    check_date = today
    if sorted_dates[0] < today - timedelta(days=1):
        current_streak = 0
    else:
        check_date = sorted_dates[0]
        for d in sorted_dates:
            if d == check_date:
                current_streak += 1
                check_date -= timedelta(days=1)
            elif d < check_date:
                break

    # Longest streak
    longest = 1
    run = 1
    for i in range(1, len(sorted_dates)):
        if sorted_dates[i] == sorted_dates[i - 1] - timedelta(days=1):
            run += 1
            longest = max(longest, run)
        elif sorted_dates[i] != sorted_dates[i - 1]:
            run = 1

    return current_streak, max(longest, current_streak)


def _encouragement(streak: int) -> str:
    if streak == 0:
        return "Start your streak today! Every day counts."
    if streak == 1:
        return "Great start! Keep the momentum going tomorrow."
    if streak < 5:
        return f"{streak} days in a row! You're building a habit."
    if streak < 14:
        return f"{streak}-day streak! You're in the zone. Top applicants are consistent."
    if streak < 30:
        return f"Incredible {streak}-day streak! This level of consistency puts you in the top 10% of applicants."
    return f"Legendary {streak}-day streak! Your discipline is your competitive advantage."


def _school_name(school_id: str) -> str:
    school = SCHOOL_DB.get(school_id, {})
    return school.get("name", school_id.upper())


# ── Models ───────────────────────────────────────────────────────────────────


class CheckInRequest(BaseModel):
    activity: str = Field(..., min_length=1, max_length=500)
    school_id: Optional[str] = None
    minutes_spent: int = Field(..., ge=1, le=1440)
    notes: Optional[str] = Field(None, max_length=1000)


class CheckInResponse(BaseModel):
    message: str
    streak_days: int
    encouragement: str
    total_checkins: int


class StreakResponse(BaseModel):
    streak_days: int
    longest_streak: int
    total_checkins: int
    last_checkin_date: Optional[str] = None
    motivation: str


class Nudge(BaseModel):
    severity: str  # "low", "medium", "high"
    message: str
    action_url: Optional[str] = None


class WeeklySummaryResponse(BaseModel):
    checkins_this_week: int
    checkins_last_week: int
    change: str  # "up", "down", "same"
    schools_worked_on: list[str]
    total_minutes: int
    avg_minutes_per_day: float


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.post("/check-in", response_model=CheckInResponse)
def check_in(req: CheckInRequest):
    """Log what you worked on today."""
    checkins = _load_checkins()

    entry = {
        "activity": req.activity,
        "minutes_spent": req.minutes_spent,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if req.school_id:
        entry["school_id"] = req.school_id
        entry["school_name"] = _school_name(req.school_id)
    if req.notes:
        entry["notes"] = req.notes

    checkins.insert(0, entry)
    _save_checkins(checkins)

    current, _ = _calculate_streak(checkins)

    return CheckInResponse(
        message="Check-in recorded!",
        streak_days=current,
        encouragement=_encouragement(current),
        total_checkins=len(checkins),
    )


@router.get("/streak", response_model=StreakResponse)
def get_streak():
    """Get current activity streak."""
    checkins = _load_checkins()
    current, longest = _calculate_streak(checkins)

    last_date = None
    if checkins:
        try:
            ts = datetime.fromisoformat(checkins[0].get("timestamp", "").replace("Z", "+00:00"))
            last_date = ts.strftime("%Y-%m-%d")
        except (ValueError, AttributeError):
            pass

    return StreakResponse(
        streak_days=current,
        longest_streak=longest,
        total_checkins=len(checkins),
        last_checkin_date=last_date,
        motivation=_encouragement(current),
    )


@router.get("/nudges", response_model=list[Nudge])
def get_nudges():
    """Smart nudges based on inactivity and upcoming deadlines."""
    checkins = _load_checkins()
    nudges: list[Nudge] = []
    now = datetime.now(timezone.utc)

    # Check last check-in
    days_inactive = 999
    if checkins:
        try:
            last_ts = datetime.fromisoformat(checkins[0].get("timestamp", "").replace("Z", "+00:00"))
            if last_ts.tzinfo is None:
                last_ts = last_ts.replace(tzinfo=timezone.utc)
            days_inactive = (now - last_ts).days
        except (ValueError, AttributeError):
            pass

    if days_inactive >= 7:
        nudges.append(Nudge(
            severity="high",
            message=f"You haven't logged any work in {days_inactive} days. Consistency is the #1 predictor of admissions success.",
            action_url="/accountability/check-in",
        ))
    elif days_inactive >= 3:
        nudges.append(Nudge(
            severity="medium",
            message=f"You haven't logged any work in {days_inactive} days. A little progress each day compounds.",
            action_url="/accountability/check-in",
        ))

    # Check upcoming deadlines from SCHOOL_DB
    schools_worked = set()
    for c in checkins[:50]:
        sid = c.get("school_id")
        if sid:
            schools_worked.add(sid)

    for sid in schools_worked:
        school = SCHOOL_DB.get(sid, {})
        deadlines = school.get("deadlines", {})
        name = school.get("name", sid.upper())

        for round_name, deadline_str in deadlines.items():
            try:
                dl = datetime.fromisoformat(deadline_str.replace("Z", "+00:00"))
                if dl.tzinfo is None:
                    dl = dl.replace(tzinfo=timezone.utc)
                days_until = (dl - now).days
                if 0 < days_until <= 30:
                    nudges.append(Nudge(
                        severity="high" if days_until <= 7 else "medium",
                        message=f"Your {name} {round_name} deadline is {days_until} days away.",
                        action_url=f"/school/{sid}",
                    ))
            except (ValueError, TypeError, AttributeError):
                continue

    if not nudges:
        nudges.append(Nudge(
            severity="low",
            message="You're on track! Keep up the great work.",
        ))

    return nudges


@router.get("/weekly-summary", response_model=WeeklySummaryResponse)
def weekly_summary():
    """Weekly progress summary."""
    checkins = _load_checkins()
    now = datetime.now(timezone.utc)

    # This week: Mon-Sun
    today = now.date()
    start_of_week = today - timedelta(days=today.weekday())
    start_of_last_week = start_of_week - timedelta(days=7)

    this_week: list[dict] = []
    last_week: list[dict] = []

    for c in checkins:
        try:
            ts = datetime.fromisoformat(c.get("timestamp", "").replace("Z", "+00:00"))
            d = ts.date()
        except (ValueError, AttributeError):
            continue

        if d >= start_of_week:
            this_week.append(c)
        elif d >= start_of_last_week:
            last_week.append(c)

    schools = list({c.get("school_name") or _school_name(c.get("school_id", "")) for c in this_week if c.get("school_id")})
    total_minutes = sum(c.get("minutes_spent", 0) for c in this_week)
    days_elapsed = max((today - start_of_week).days + 1, 1)

    tw_count = len(this_week)
    lw_count = len(last_week)

    if tw_count > lw_count:
        change = "up"
    elif tw_count < lw_count:
        change = "down"
    else:
        change = "same"

    return WeeklySummaryResponse(
        checkins_this_week=tw_count,
        checkins_last_week=lw_count,
        change=change,
        schools_worked_on=schools,
        total_minutes=total_minutes,
        avg_minutes_per_day=round(total_minutes / days_elapsed, 1),
    )
