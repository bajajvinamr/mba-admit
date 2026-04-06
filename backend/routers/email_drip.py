"""Email drip sequence system for MBA applicant nurturing.

Manages a multi-day email sequence that guides new subscribers through
the platform's features, timed to their application journey.

Drip sequences:
1. Welcome (Day 0) — What the platform offers
2. Odds Calculator (Day 1) — Check your chances
3. School Research (Day 3) — Build your list
4. Essay Strategy (Day 5) — Start writing
5. Scholarship Intel (Day 7) — Find money
6. Interview Prep (Day 10) — Practice
7. Sprint Planner (Day 14) — Stay on track
8. Success Stories (Day 21) — Social proof

No actual email sending — generates content + schedule.
Integrate with Resend, SendGrid, or Mailchimp for delivery.
"""

import json
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/email", tags=["email-drip"])

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
WAITLIST_FILE = DATA_DIR / "waitlist.json"

# ── Drip Sequence Content ────────────────────────────────────────────────────

DRIP_SEQUENCE = [
    {
        "day": 0,
        "id": "welcome",
        "subject": "Welcome to Admit Compass — here's what 67,000 decisions tell us",
        "preview": "You just joined 5,000+ MBA applicants who stopped guessing.",
        "body_html": """
<h2>Welcome to Admit Compass</h2>
<p>You just joined 5,000+ MBA applicants who use real data instead of expensive consultants.</p>
<p>Here's what you now have access to:</p>
<ul>
  <li><strong>67,000+ real admissions decisions</strong> — see what actually works at your target schools</li>
  <li><strong>905 MBA programs</strong> — compared side-by-side with real stats</li>
  <li><strong>ML-powered predictions</strong> — trained on real outcomes, not guesswork</li>
  <li><strong>1,000+ essay examples</strong> — including 341 real essays from admitted students</li>
</ul>
<p>Start with the Odds Calculator — it's free and takes 30 seconds:</p>
<p><a href="https://admitcompass.ai/simulator">Check My Chances →</a></p>
<p>— The Admit Compass Team</p>
""",
        "cta_url": "/simulator",
        "cta_text": "Check My Chances — Free",
    },
    {
        "day": 1,
        "id": "odds_calculator",
        "subject": "Your GMAT is [score]. Here's what that means at M7 schools.",
        "preview": "We analyzed 67,000 real decisions to show you exactly where you stand.",
        "body_html": """
<h2>Know your real chances before you apply</h2>
<p>Most applicants waste time (and application fees) on schools that were never realistic — or skip schools where they actually had a strong shot.</p>
<p>Our Odds Calculator uses ML models trained on 67,000+ real admissions decisions to show you:</p>
<ul>
  <li>Which schools are <strong>reaches</strong>, <strong>targets</strong>, and <strong>safeties</strong></li>
  <li>Your probability at each school (not a vague "competitive" — an actual percentage)</li>
  <li>How your profile compares to admitted students</li>
</ul>
<p>It's free. No signup required. Takes 30 seconds.</p>
<p><a href="https://admitcompass.ai/simulator">Run My Simulation →</a></p>
""",
        "cta_url": "/simulator",
        "cta_text": "Run My Simulation",
    },
    {
        "day": 3,
        "id": "school_research",
        "subject": "The school list mistake that costs most applicants an admit",
        "preview": "Applying to 8 reaches and 0 targets is the #1 mistake we see.",
        "body_html": """
<h2>Build the right school list</h2>
<p>The #1 mistake we see in 67,000 decisions: applicants who apply to 6-8 reach schools and zero targets.</p>
<p>Result? Rejected everywhere.</p>
<p>The fix is simple: use data to build a balanced list.</p>
<ul>
  <li><strong>Compare 905 programs</strong> side-by-side — GMAT, acceptance rate, salary, class size</li>
  <li><strong>Filter by what matters to you</strong> — "GMAT under 700 in Europe" or "part-time in USA"</li>
  <li><strong>See scholarship generosity</strong> — Tepper gives aid to 89% of admits. Harvard gives almost none.</li>
</ul>
<p><a href="https://admitcompass.ai/schools">Browse All 905 Programs →</a></p>
""",
        "cta_url": "/schools",
        "cta_text": "Browse Programs",
    },
    {
        "day": 5,
        "id": "essay_strategy",
        "subject": "What 341 successful MBA essays have in common",
        "preview": "We studied real admitted essays. Here's the pattern.",
        "body_html": """
<h2>Write essays that actually get you in</h2>
<p>We've collected 341 real essays from admitted students and 600+ AI-generated examples across every school and essay type.</p>
<p>The pattern in successful essays:</p>
<ol>
  <li><strong>Specific details</strong> — names, numbers, places. Not vague platitudes.</li>
  <li><strong>Genuine vulnerability</strong> — the best essays show failure, not just triumph.</li>
  <li><strong>Clear school fit</strong> — why THIS school, not just "a top MBA."</li>
</ol>
<p>Read real essays from your target schools:</p>
<p><a href="https://admitcompass.ai/essays/examples">Browse Essay Examples →</a></p>
""",
        "cta_url": "/essays/examples",
        "cta_text": "Read Real Essays",
    },
    {
        "day": 7,
        "id": "scholarship_intel",
        "subject": "These schools give scholarships to 89% of admits (data inside)",
        "preview": "Stop leaving money on the table. See which schools actually give aid.",
        "body_html": """
<h2>Maximize your scholarship</h2>
<p>We analyzed 2,700+ scholarship data points from real applicants. Here's what most people don't know:</p>
<ul>
  <li><strong>Tepper:</strong> 89% of admits get scholarships (75% at half-tuition level)</li>
  <li><strong>Kenan-Flagler:</strong> 47% get aid, and 34% of those are FULL RIDES</li>
  <li><strong>Stern:</strong> Only 22% get money — but 69% of those are full rides</li>
  <li><strong>Harvard:</strong> Less than 5% scholarship rate (merit aid barely exists)</li>
</ul>
<p>Enter your GMAT and GPA to see your personal scholarship probability at each school:</p>
<p><a href="https://admitcompass.ai/finances?tab=scholarship-intel">Check My Scholarship Odds →</a></p>
""",
        "cta_url": "/finances?tab=scholarship-intel",
        "cta_text": "Check Scholarship Odds",
    },
    {
        "day": 10,
        "id": "interview_prep",
        "subject": "The 3 interview questions every school asks (and how to nail them)",
        "preview": "Mock interview practice with school-specific questions.",
        "body_html": """
<h2>Nail your MBA interview</h2>
<p>Every MBA interview — whether HBS, Booth, or INSEAD — hits three themes:</p>
<ol>
  <li><strong>"Walk me through your resume"</strong> — They want a 2-minute narrative, not a chronological list.</li>
  <li><strong>"Why MBA? Why now?"</strong> — Connect past → present → future in one clear arc.</li>
  <li><strong>"Why our school?"</strong> — Show you've done homework beyond the rankings page.</li>
</ol>
<p>Our AI mock interviewer asks school-specific questions and gives instant feedback on content, delivery, and strategy.</p>
<p><a href="https://admitcompass.ai/interview">Start Mock Interview →</a></p>
""",
        "cta_url": "/interview",
        "cta_text": "Practice Now",
    },
    {
        "day": 14,
        "id": "sprint_planner",
        "subject": "Are you on track? Your personalized deadline analysis",
        "preview": "Enter your schools and deadlines — we'll tell you if you're behind.",
        "body_html": """
<h2>Stop wondering if you're on track</h2>
<p>The Smart Sprint Planner builds a personalized week-by-week action plan based on your actual schools and deadlines.</p>
<p>It tells you:</p>
<ul>
  <li>Exactly how many days of work you need vs. how many you have</li>
  <li>Which school to prioritize RIGHT NOW</li>
  <li>Whether your recommenders are on track</li>
  <li>If you should switch to a later round</li>
</ul>
<p><a href="https://admitcompass.ai/sprint-plan">Build My Sprint Plan →</a></p>
""",
        "cta_url": "/sprint-plan",
        "cta_text": "Build My Plan",
    },
    {
        "day": 21,
        "id": "success_stories",
        "subject": "710 GMAT → ISB with 50% scholarship. Here's how.",
        "preview": "Real outcomes from applicants who used data instead of consultants.",
        "body_html": """
<h2>Real results from our community</h2>
<p>Here are some recent outcomes from applicants who used Admit Compass:</p>
<ul>
  <li><strong>710 GMAT → Admitted to ISB with 50% scholarship</strong> — Used scholarship intelligence to target schools that give aid to his profile type.</li>
  <li><strong>3.2 GPA → Admitted to Booth + Ross</strong> — The odds calculator showed Ross was a hidden target. His consultant had never mentioned it.</li>
  <li><strong>Career switcher → Admitted to Wharton R2</strong> — Read 15 real admitted essays from career switchers before writing his own.</li>
</ul>
<p>Your turn. Everything is free to start.</p>
<p><a href="https://admitcompass.ai/simulator">Start Here →</a></p>
""",
        "cta_url": "/simulator",
        "cta_text": "Start Free",
    },
]


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("/drip-sequence")
def get_drip_sequence():
    """Get the full email drip sequence content and schedule."""
    return {
        "sequence": DRIP_SEQUENCE,
        "total_emails": len(DRIP_SEQUENCE),
        "duration_days": DRIP_SEQUENCE[-1]["day"],
    }


@router.get("/drip/{email_id}")
def get_drip_email(email_id: str):
    """Get a single drip email by ID."""
    for email in DRIP_SEQUENCE:
        if email["id"] == email_id:
            return email
    raise HTTPException(404, f"Email not found: {email_id}")


@router.get("/subscribers")
def get_subscribers(limit: int = Query(50, ge=1, le=500)):
    """Get waitlist subscribers and their drip schedule status."""
    if not WAITLIST_FILE.exists():
        return {"subscribers": [], "total": 0}

    entries = json.loads(WAITLIST_FILE.read_text())

    # Calculate drip status for each subscriber
    now = datetime.now(timezone.utc)
    enriched = []
    for entry in entries[-limit:]:
        sub_time = datetime.fromisoformat(entry["timestamp"].replace("Z", "+00:00"))
        days_since = (now - sub_time).days

        # Determine which drip emails should have been sent
        sent = [d for d in DRIP_SEQUENCE if d["day"] <= days_since]
        next_email = next((d for d in DRIP_SEQUENCE if d["day"] > days_since), None)

        enriched.append({
            **entry,
            "days_since_signup": days_since,
            "emails_due": len(sent),
            "next_email": next_email["id"] if next_email else None,
            "next_email_in_days": next_email["day"] - days_since if next_email else None,
        })

    return {
        "subscribers": enriched,
        "total": len(entries),
        "showing": len(enriched),
    }


class SendDripRequest(BaseModel):
    """Request to mark a drip email as sent (for integration with email providers)."""
    email: str
    drip_id: str


@router.post("/drip/mark-sent")
def mark_drip_sent(req: SendDripRequest):
    """Mark a drip email as sent for a subscriber.

    This endpoint is for integration with email providers (Resend, SendGrid, etc.)
    to track which drip emails have been delivered.
    """
    if not WAITLIST_FILE.exists():
        raise HTTPException(404, "No subscribers found")

    entries = json.loads(WAITLIST_FILE.read_text())
    for entry in entries:
        if entry["email"] == req.email:
            sent_drips = entry.get("sent_drips", [])
            if req.drip_id not in sent_drips:
                sent_drips.append(req.drip_id)
                entry["sent_drips"] = sent_drips

                WAITLIST_FILE.write_text(json.dumps(entries, indent=2))
                return {"status": "marked", "email": req.email, "drip_id": req.drip_id}
            return {"status": "already_sent", "email": req.email, "drip_id": req.drip_id}

    raise HTTPException(404, f"Subscriber not found: {req.email}")


@router.get("/drip/pending")
def get_pending_drips():
    """Get all drip emails that should be sent now but haven't been.

    Returns a list of (subscriber, drip_email) pairs ready for delivery.
    Use this with a cron job + email provider to automate the drip.
    """
    if not WAITLIST_FILE.exists():
        return {"pending": [], "total": 0}

    entries = json.loads(WAITLIST_FILE.read_text())
    now = datetime.now(timezone.utc)
    pending = []

    for entry in entries:
        sub_time = datetime.fromisoformat(entry["timestamp"].replace("Z", "+00:00"))
        days_since = (now - sub_time).days
        sent_drips = set(entry.get("sent_drips", []))

        for drip in DRIP_SEQUENCE:
            if drip["day"] <= days_since and drip["id"] not in sent_drips:
                pending.append({
                    "email": entry["email"],
                    "drip_id": drip["id"],
                    "drip_subject": drip["subject"],
                    "drip_day": drip["day"],
                    "days_overdue": days_since - drip["day"],
                })

    pending.sort(key=lambda x: x["days_overdue"], reverse=True)

    return {
        "pending": pending,
        "total": len(pending),
    }
