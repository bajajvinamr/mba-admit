"""Accountability cron job — generates weekly nudges for all active users.

Run via: python -m scripts.accountability_cron
Or schedule via cron/Railway/Render cron jobs.

For each user with tracked schools:
1. Compute upcoming deadlines and incomplete items
2. Generate personalized nudge via Claude (not template)
3. Store as Notification
4. Optionally send via email (Resend integration)
"""

import json
import logging
import os
import sys
from datetime import datetime, timezone, timedelta

# Add parent dir to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from logging_config import setup_logging

logger = setup_logging()

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")


def get_active_users() -> list[dict]:
    """Get users with tracked schools. In production, query the database."""
    # V1: In-memory placeholder — in production, query Prisma/Supabase
    # Return mock structure for the cron job framework
    return []


def compute_upcoming_deadlines(user: dict) -> list[dict]:
    """Compute deadlines within the next 14 days for a user's tracked schools."""
    from agents import SCHOOL_DB

    deadlines = []
    tracked = user.get("tracked_schools", [])

    for ts in tracked:
        slug = ts.get("school_slug", "")
        school = SCHOOL_DB.get(slug, {})
        if not school:
            continue

        admission_deadlines = school.get("admission_deadlines", [])
        now = datetime.now(timezone.utc)

        for dl in admission_deadlines:
            deadline_str = dl.get("deadline", "")
            try:
                # Try parsing various date formats
                for fmt in ["%B %d, %Y", "%Y-%m-%d", "%m/%d/%Y"]:
                    try:
                        deadline_date = datetime.strptime(deadline_str, fmt).replace(tzinfo=timezone.utc)
                        break
                    except ValueError:
                        continue
                else:
                    continue

                days_until = (deadline_date - now).days
                if 0 <= days_until <= 14:
                    deadlines.append({
                        "school": school.get("name", slug),
                        "school_slug": slug,
                        "round": dl.get("round", ""),
                        "deadline": deadline_str,
                        "days_until": days_until,
                    })
            except Exception:
                continue

    deadlines.sort(key=lambda d: d["days_until"])
    return deadlines


def generate_nudge_text(user: dict, deadlines: list[dict]) -> dict:
    """Generate personalized nudge via Claude API."""
    if not ANTHROPIC_API_KEY or not deadlines:
        return _fallback_nudge(deadlines)

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

        prompt = f"""Generate a brief, personalized nudge notification for an MBA applicant.

Upcoming deadlines (next 14 days):
{json.dumps(deadlines, indent=2)}

User info:
- Name: {user.get('name', 'there')}
- Tracked schools: {len(user.get('tracked_schools', []))}

Write a JSON response:
{{
  "title": "short attention-grabbing title (max 60 chars)",
  "body": "2-3 sentence personalized message referencing specific deadlines and schools. Be warm but urgent.",
  "priority": "high | medium | low"
}}"""

        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=300,
            system="You are a supportive MBA admissions coach. Generate brief, personalized nudge notifications. Output valid JSON only.",
            messages=[{"role": "user", "content": prompt}],
        )

        text = message.content[0].text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()

        return json.loads(text)

    except Exception as e:
        logger.error("Failed to generate nudge via Claude: %s", str(e))
        return _fallback_nudge(deadlines)


def _fallback_nudge(deadlines: list[dict]) -> dict:
    """Template-based fallback when Claude is unavailable."""
    if not deadlines:
        return {
            "title": "Stay on Track",
            "body": "Check your application dashboard for updates and upcoming tasks.",
            "priority": "low",
        }

    nearest = deadlines[0]
    return {
        "title": f"{nearest['days_until']} days until {nearest['school']} deadline",
        "body": f"Your {nearest['round']} application for {nearest['school']} is due on {nearest['deadline']}. "
                f"You have {len(deadlines)} deadline{'s' if len(deadlines) > 1 else ''} in the next 2 weeks.",
        "priority": "high" if nearest["days_until"] <= 3 else "medium",
    }


def send_email_notification(user: dict, nudge: dict) -> bool:
    """Send notification via Resend email API."""
    if not RESEND_API_KEY:
        logger.info("Resend not configured — skipping email for user %s", user.get("id"))
        return False

    try:
        import httpx

        response = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": "Admit Compass <notifications@admitcompass.ai>",
                "to": [user.get("email", "")],
                "subject": nudge["title"],
                "html": f"""
                <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
                    <h2 style="font-size: 18px; margin-bottom: 12px;">{nudge['title']}</h2>
                    <p style="font-size: 14px; color: #555; line-height: 1.6;">{nudge['body']}</p>
                    <a href="https://admitcompass.ai/dashboard"
                       style="display: inline-block; margin-top: 16px; padding: 10px 20px;
                              background: #000; color: #fff; text-decoration: none; font-size: 13px; font-weight: 600;">
                        Open Dashboard
                    </a>
                    <p style="margin-top: 24px; font-size: 11px; color: #999;">
                        You're receiving this because you have active applications on Admit Compass.
                    </p>
                </div>
                """,
            },
            timeout=10,
        )
        return response.status_code == 200
    except Exception as e:
        logger.error("Failed to send email: %s", str(e))
        return False


def run_accountability_check():
    """Main cron entry point — process all active users."""
    from routers.notifications import _create_notification

    logger.info("Starting accountability check...")
    users = get_active_users()
    logger.info("Processing %d active users", len(users))

    stats = {"processed": 0, "nudges_created": 0, "emails_sent": 0}

    for user in users:
        try:
            user_id = user.get("id", "")
            deadlines = compute_upcoming_deadlines(user)

            if not deadlines:
                continue

            nudge = generate_nudge_text(user, deadlines)

            # Store notification
            _create_notification(
                user_id=user_id,
                notif_type="deadline_alert",
                title=nudge["title"],
                body=nudge["body"],
                action_url="/upcoming-deadlines",
                action_label="View Deadlines",
            )
            stats["nudges_created"] += 1

            # Send email if configured
            if send_email_notification(user, nudge):
                stats["emails_sent"] += 1

            stats["processed"] += 1

        except Exception as e:
            logger.error("Error processing user %s: %s", user.get("id"), str(e))

    logger.info("Accountability check complete: %s", json.dumps(stats))
    return stats


if __name__ == "__main__":
    run_accountability_check()
