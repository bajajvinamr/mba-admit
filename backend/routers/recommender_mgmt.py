"""Recommender Management System — track, brief, and follow up with recommenders.

Solves a real pain point: applicants need 2-3 recommenders per school, each needs
different briefing, deadlines vary, and follow-up is awkward.

Features:
- Add recommenders with their details and relationship
- Generate personalized briefing documents per school
- Track submission status across schools
- Auto-generate follow-up email templates
- Timeline view: what's due when
"""

import json
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from agents import SCHOOL_DB

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/recommenders", tags=["recommender-management"])

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


# ── Models ───────────────────────────────────────────────────────────────────


class Recommender(BaseModel):
    id: Optional[str] = None
    name: str
    title: str
    organization: str
    email: str
    relationship: str  # "direct_manager" | "senior_leader" | "client" | "professor" | "mentor"
    years_known: int = Field(ge=0, le=30)
    key_stories: list[str] = Field(default_factory=list, max_length=5)
    strengths_to_highlight: list[str] = Field(default_factory=list, max_length=5)


class SchoolRecAssignment(BaseModel):
    school_id: str
    recommender_id: str
    deadline: Optional[str] = None  # ISO date
    status: str = "not_started"  # not_started | briefed | drafting | submitted
    notes: Optional[str] = None


class BriefingRequest(BaseModel):
    recommender: Recommender
    school_id: str
    applicant_name: str
    applicant_role: str = ""
    why_mba: str = ""
    post_mba_goal: str = ""


class FollowUpRequest(BaseModel):
    recommender_name: str
    school_name: str
    deadline: str
    days_until_deadline: int
    tone: str = "polite"  # polite | friendly | urgent


# ── School Rec Requirements ──────────────────────────────────────────────────

# What each school wants in recommendations
SCHOOL_REC_REQUIREMENTS: dict[str, dict] = {
    "hbs": {
        "count": 2,
        "preferred_type": "professional",
        "notes": "HBS wants recommenders who have directly managed you. They send a structured form with specific questions about leadership, teamwork, and areas for improvement.",
        "questions": [
            "How does the applicant's performance compare to others in a similar role?",
            "Describe the most important constructive feedback you have given the applicant.",
            "Is there anything else you would like us to know?",
        ],
    },
    "gsb": {
        "count": 2,
        "preferred_type": "professional",
        "notes": "Stanford asks recommenders to evaluate intellectual vitality, demonstrated leadership, and personal qualities. They want candid, specific examples.",
        "questions": [
            "How does the candidate's performance compare to others?",
            "Describe a time when the candidate had a significant impact.",
            "What are the candidate's principal areas for development?",
        ],
    },
    "wharton": {
        "count": 2,
        "preferred_type": "professional",
        "notes": "Wharton uses the Common LOR form. Professional recommenders strongly preferred over academic. Current direct supervisor is ideal.",
        "questions": [
            "How long have you known the applicant and in what context?",
            "What are the applicant's key strengths?",
            "What are the applicant's key developmental areas?",
        ],
    },
    "insead": {
        "count": 2,
        "preferred_type": "professional",
        "notes": "INSEAD allows up to 3 recommenders but requires 2. They value international and cross-cultural examples.",
        "questions": [
            "What is the applicant's most outstanding talent or skill?",
            "How would you describe the applicant's interpersonal skills?",
            "How well does the applicant accept feedback?",
        ],
    },
    "isb": {
        "count": 2,
        "preferred_type": "professional",
        "notes": "ISB prefers professional recommenders who can speak to recent work. Academic recs acceptable for those with <2 years experience.",
        "questions": [
            "Please describe the applicant's key strengths.",
            "What areas does the applicant need to develop?",
            "How would you rate the applicant against peers?",
        ],
    },
}

DEFAULT_REC_REQUIREMENTS = {
    "count": 2,
    "preferred_type": "professional",
    "notes": "Most schools prefer direct supervisors or senior colleagues. Academic recommenders are acceptable for recent graduates.",
    "questions": [
        "How long have you known the applicant?",
        "What are the applicant's strengths?",
        "What areas need development?",
    ],
}


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("/requirements/{school_id}")
def get_rec_requirements(school_id: str):
    """Get recommendation letter requirements for a specific school."""
    school = SCHOOL_DB.get(school_id, {})
    if not school:
        raise HTTPException(404, f"School not found: {school_id}")

    reqs = SCHOOL_REC_REQUIREMENTS.get(school_id, DEFAULT_REC_REQUIREMENTS)

    return {
        "school_id": school_id,
        "school_name": school.get("name", school_id),
        **reqs,
    }


@router.post("/briefing")
def generate_briefing(req: BriefingRequest):
    """Generate a personalized recommender briefing document.

    This is the document you share with your recommender to help them
    write a strong, specific letter.
    """
    school = SCHOOL_DB.get(req.school_id, {})
    school_name = school.get("name", req.school_id)
    reqs = SCHOOL_REC_REQUIREMENTS.get(req.school_id, DEFAULT_REC_REQUIREMENTS)

    stories_section = ""
    if req.recommender.key_stories:
        stories_section = "\n**Key stories/examples you might reference:**\n" + "\n".join(
            f"- {story}" for story in req.recommender.key_stories
        )

    strengths_section = ""
    if req.recommender.strengths_to_highlight:
        strengths_section = "\n**Qualities I'd love highlighted:**\n" + "\n".join(
            f"- {s}" for s in req.recommender.strengths_to_highlight
        )

    questions_section = ""
    if reqs.get("questions"):
        questions_section = "\n**Questions the school will ask:**\n" + "\n".join(
            f"- {q}" for q in reqs["questions"]
        )

    briefing = f"""# Recommendation Letter Briefing
## For: {school_name} MBA Application

Dear {req.recommender.name},

Thank you so much for agreeing to write a recommendation letter for my MBA application to **{school_name}**. I know this takes real time and I'm genuinely grateful.

**About the program:**
{school_name} is a top MBA program that values {reqs.get('notes', 'strong professional recommendations')}. They ask for {reqs.get('count', 2)} recommendation letters, preferably from {reqs.get('preferred_type', 'professional')} contacts.

**Why I'm pursuing an MBA:**
{req.why_mba or 'I want to accelerate my career growth and gain the skills to take on larger leadership roles.'}

**My post-MBA goal:**
{req.post_mba_goal or 'I plan to transition into a senior leadership role where I can have broader impact.'}
{stories_section}
{strengths_section}
{questions_section}

**Logistics:**
- Please submit through the online portal (you'll receive an email invitation)
- Ideal submission: 2 weeks before the deadline
- Length: 1-2 pages is typical
- The school values **specific examples** over general praise

**What makes a great recommendation:**
1. Open with how you know me and for how long
2. Give 2-3 specific examples that show impact/leadership/growth
3. Be honest about areas for development (this actually helps — schools want authentic recs)
4. Keep it concise — admissions readers review hundreds of these

If you have any questions, please don't hesitate to reach out. Thank you again.

Best regards,
{req.applicant_name}"""

    return {
        "school_id": req.school_id,
        "school_name": school_name,
        "recommender_name": req.recommender.name,
        "briefing_document": briefing,
        "school_questions": reqs.get("questions", []),
        "submission_format": f"{reqs.get('count', 2)} letters required, {reqs.get('preferred_type', 'professional')} preferred",
    }


@router.post("/follow-up-email")
def generate_follow_up(req: FollowUpRequest):
    """Generate a tactful follow-up email for a recommender."""

    if req.days_until_deadline > 14:
        # Gentle check-in
        subject = f"Quick check-in: {req.school_name} recommendation"
        body = f"""Hi {req.recommender_name},

I hope you're doing well. I wanted to check in about the recommendation letter for {req.school_name}.

The deadline is {req.deadline} ({req.days_until_deadline} days from now), so there's still plenty of time. Just wanted to make sure you received the portal invitation and have everything you need from my end.

Please let me know if you have any questions or if I can provide additional context.

Thank you so much for your support,"""

    elif req.days_until_deadline > 7:
        # Friendly reminder
        subject = f"Reminder: {req.school_name} letter due {req.deadline}"
        body = f"""Hi {req.recommender_name},

Just a friendly reminder that the {req.school_name} recommendation letter is due on {req.deadline} — that's {req.days_until_deadline} days from now.

If you haven't started yet, the letter typically takes 30-45 minutes. The key things they're looking for are specific examples of leadership and impact.

Would it be helpful if I sent over a few talking points? Happy to make this as easy as possible for you.

Thank you again,"""

    else:
        # Urgent but respectful
        subject = f"Urgent: {req.school_name} letter due in {req.days_until_deadline} days"
        body = f"""Hi {req.recommender_name},

I'm reaching out because the {req.school_name} recommendation deadline is coming up quickly — it's due on {req.deadline}, which is {req.days_until_deadline} days away.

I completely understand if you've been busy. If it would help, I'm happy to:
- Draft some bullet points you can build from
- Schedule a quick 10-minute call to discuss what to highlight
- Provide any additional information

This recommendation is really important to my application, and I'd be so grateful for your help.

Thank you,"""

    return {
        "subject": subject,
        "body": body,
        "tone": "gentle" if req.days_until_deadline > 14 else "friendly" if req.days_until_deadline > 7 else "urgent",
        "tips": [
            "Always express gratitude — they're doing you a favor",
            "Never guilt-trip or make them feel bad for being late",
            "Offer to make it easier (talking points, call, etc.)",
            "If they're truly unresponsive after 3 follow-ups, have a backup recommender ready",
        ],
    }


@router.get("/timeline")
def recommender_timeline(
    school_ids: str = Query(..., description="Comma-separated school IDs"),
    days_buffer: int = Query(14, description="Days before deadline to have rec submitted"),
):
    """Generate a timeline for when recommenders need to submit for each school.

    Returns a chronological list of rec submission targets.
    """
    ids = [s.strip() for s in school_ids.split(",") if s.strip()]
    today = datetime.now(timezone.utc).date()
    timeline = []

    for sid in ids:
        school = SCHOOL_DB.get(sid, {})
        if not school:
            continue

        school_name = school.get("name", sid)
        deadlines = school.get("admission_deadlines") or []
        reqs = SCHOOL_REC_REQUIREMENTS.get(sid, DEFAULT_REC_REQUIREMENTS)

        for dl in deadlines:
            date_str = dl.get("date")
            if not date_str:
                continue
            try:
                from datetime import date as date_type
                deadline_date = date_type.fromisoformat(str(date_str)[:10])
            except (ValueError, TypeError):
                continue

            rec_due = deadline_date - timedelta(days=days_buffer)
            days_until = (rec_due - today).days

            timeline.append({
                "school_id": sid,
                "school_name": school_name,
                "app_deadline": deadline_date.isoformat(),
                "rec_target_date": rec_due.isoformat(),
                "days_until_rec_due": days_until,
                "round": dl.get("round", ""),
                "recs_needed": reqs.get("count", 2),
                "urgency": "overdue" if days_until < 0 else "urgent" if days_until < 7 else "soon" if days_until < 21 else "on_track",
            })

    timeline.sort(key=lambda x: x["rec_target_date"])

    return {
        "timeline": timeline,
        "total_schools": len(ids),
        "total_recs_needed": sum(t["recs_needed"] for t in timeline),
    }
