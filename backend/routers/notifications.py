"""Accountability Engine — notifications + weekly recaps.

Generates personalized nudges and weekly progress recaps via Claude API.
Stores as Notification records.
"""

import json
import logging
import os
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/notifications", tags=["notifications"])

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

# ── In-memory store (V1 — swap for DB in production) ─────────────────────────

_notifications: dict[str, dict] = {}


# ── Models ───────────────────────────────────────────────────────────────────


class NotificationResponse(BaseModel):
    id: str
    userId: str
    type: str
    title: str
    body: str
    read: bool
    createdAt: str
    actionUrl: Optional[str] = None
    actionLabel: Optional[str] = None


class MarkReadResponse(BaseModel):
    id: str
    read: bool


class WeeklyRecapRequest(BaseModel):
    user_id: str
    tracked_schools: list[dict] = Field(default_factory=list)
    essay_progress: dict = Field(default_factory=dict)
    upcoming_deadlines: list[dict] = Field(default_factory=list)
    recent_activity: list[str] = Field(default_factory=list)


# ── Helpers ──────────────────────────────────────────────────────────────────


def _create_notification(
    user_id: str,
    notif_type: str,
    title: str,
    body: str,
    action_url: Optional[str] = None,
    action_label: Optional[str] = None,
) -> dict:
    notif_id = f"notif_{uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    notif = {
        "id": notif_id,
        "userId": user_id,
        "type": notif_type,
        "title": title,
        "body": body,
        "read": False,
        "createdAt": now,
        "actionUrl": action_url,
        "actionLabel": action_label,
    }
    _notifications[notif_id] = notif
    return notif


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("")
def list_notifications(
    user_id: str = Query(..., description="User ID"),
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
):
    """List notifications for a user, newest first."""
    user_notifs = [
        n for n in _notifications.values()
        if n["userId"] == user_id and (not unread_only or not n["read"])
    ]
    user_notifs.sort(key=lambda n: n["createdAt"], reverse=True)

    unread_count = sum(1 for n in _notifications.values() if n["userId"] == user_id and not n["read"])

    return {
        "notifications": user_notifs[:limit],
        "unread_count": unread_count,
        "total": len(user_notifs),
    }


@router.patch("/{notif_id}/read")
def mark_as_read(notif_id: str):
    """Mark a notification as read."""
    notif = _notifications.get(notif_id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif["read"] = True
    return {"id": notif_id, "read": True}


@router.patch("/read-all")
def mark_all_read(user_id: str = Query(...)):
    """Mark all notifications for a user as read."""
    count = 0
    for notif in _notifications.values():
        if notif["userId"] == user_id and not notif["read"]:
            notif["read"] = True
            count += 1
    return {"marked_read": count}


@router.post("/generate-weekly")
async def generate_weekly_recap(req: WeeklyRecapRequest):
    """Generate a personalized weekly recap via Claude API."""
    if not ANTHROPIC_API_KEY:
        # Fallback to template-based recap
        return _template_recap(req)

    import anthropic

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    prompt = f"""Generate a warm, motivating weekly recap for an MBA applicant. Be specific and actionable.

APPLICANT STATUS:
- Tracked Schools: {json.dumps(req.tracked_schools, indent=2)[:1500]}
- Essay Progress: {json.dumps(req.essay_progress)[:500]}
- Upcoming Deadlines: {json.dumps(req.upcoming_deadlines)[:500]}
- Recent Activity: {', '.join(req.recent_activity[-10:]) if req.recent_activity else 'No recent activity'}

Generate JSON:
{{
  "title": "Your Week in Review",
  "greeting": "personalized opening line",
  "wins": ["things they accomplished this week"],
  "urgent_actions": [
    {{"action": "what to do", "deadline": "when", "school": "which school", "priority": "high|medium"}}
  ],
  "motivation": "closing motivational line referencing their specific goals",
  "weekly_score": 1-10
}}"""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1500,
            system="You are a supportive but direct MBA admissions coach. Generate personalized weekly recaps that are specific, actionable, and motivating. Output valid JSON only.",
            messages=[{"role": "user", "content": prompt}],
        )

        response_text = message.content[0].text.strip()
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()

        recap_data = json.loads(response_text)

        # Store as notification
        notif = _create_notification(
            user_id=req.user_id,
            notif_type="weekly_recap",
            title=recap_data.get("title", "Your Week in Review"),
            body=json.dumps(recap_data),
            action_url="/dashboard",
            action_label="View Dashboard",
        )

        return {"notification": notif, "recap": recap_data}

    except Exception as e:
        logger.error("Failed to generate weekly recap via Claude: %s", str(e))
        return _template_recap(req)


@router.post("/nudge")
async def generate_nudge(
    user_id: str = Query(...),
    nudge_type: str = Query("deadline_alert", pattern=r"^(deadline_alert|inactivity|achievement)$"),
    context: str = Query(""),
):
    """Generate a personalized nudge notification."""
    nudge_templates = {
        "deadline_alert": {
            "title": "Deadline Approaching",
            "body": f"You have upcoming deadlines that need attention. {context}" if context else "Check your application timeline for approaching deadlines.",
            "action_url": "/upcoming-deadlines",
            "action_label": "View Deadlines",
        },
        "inactivity": {
            "title": "We Miss You!",
            "body": "Your MBA applications won't write themselves. Let's get back on track.",
            "action_url": "/dashboard",
            "action_label": "Resume Work",
        },
        "achievement": {
            "title": "Nice Work!",
            "body": context or "You're making great progress on your applications.",
            "action_url": "/dashboard",
            "action_label": "Keep Going",
        },
    }

    template = nudge_templates.get(nudge_type, nudge_templates["deadline_alert"])

    notif = _create_notification(
        user_id=user_id,
        notif_type=nudge_type,
        title=template["title"],
        body=template["body"],
        action_url=template.get("action_url"),
        action_label=template.get("action_label"),
    )

    return {"notification": notif}


def _template_recap(req: WeeklyRecapRequest) -> dict:
    """Fallback template-based weekly recap when Claude is unavailable."""
    school_count = len(req.tracked_schools)
    deadline_count = len(req.upcoming_deadlines)
    activity_count = len(req.recent_activity)

    recap_data = {
        "title": "Your Week in Review",
        "greeting": f"Here's your weekly MBA application update.",
        "wins": [f"Tracking {school_count} school{'s' if school_count != 1 else ''}"]
        + ([f"{activity_count} actions taken this week"] if activity_count > 0 else []),
        "urgent_actions": [
            {"action": d.get("action", "Check deadline"), "deadline": d.get("deadline", "Soon"), "school": d.get("school", ""), "priority": "high"}
            for d in req.upcoming_deadlines[:3]
        ],
        "motivation": "Every essay draft, every practice interview brings you one step closer. Keep pushing.",
        "weekly_score": min(10, 3 + activity_count),
    }

    notif = _create_notification(
        user_id=req.user_id,
        notif_type="weekly_recap",
        title="Your Week in Review",
        body=json.dumps(recap_data),
        action_url="/dashboard",
        action_label="View Dashboard",
    )

    return {"notification": notif, "recap": recap_data}
