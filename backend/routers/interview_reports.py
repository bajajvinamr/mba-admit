"""Interview Report Database — crowdsourced interview reports with aggregate stats."""

import json
import logging
import os
import time
from collections import Counter
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field
from middleware import rate_limit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["interview-reports"])


# ── Models ──────────────────────────────────────────────────────────────────

class InterviewReportSubmission(BaseModel):
    school_slug: str
    round: str = Field(description="R1, R2, R3, ED")
    date: str = Field(description="ISO date string")
    format: str = Field(description="virtual_alumni | virtual_adcom | inperson_alumni | inperson_adcom")
    duration: int = Field(ge=5, le=180, description="Duration in minutes")
    questions: list[str] = Field(min_length=1, max_length=20)
    style: str = Field(description="conversational | challenging | case_based | by_the_book")
    feeling: str = Field(description="great | good | okay | rough")
    advice: str = Field(max_length=2000)
    outcome: Optional[str] = Field(default=None, description="admitted | rejected | waitlisted")
    anonymous: bool = True


class InterviewReport(BaseModel):
    id: str
    school_slug: str
    round: str
    date: str
    format: str
    duration: int
    questions: list[str]
    style: str
    feeling: str
    advice: str
    outcome: Optional[str] = None
    anonymous: bool = True
    created_at: str


# ── In-Memory Storage (production: Supabase/Postgres) ───────────────────────

_REPORTS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "interview_reports.json")
_reports_cache: list[dict] | None = None


def _load_reports() -> list[dict]:
    global _reports_cache
    if _reports_cache is not None:
        return _reports_cache

    if os.path.isfile(_REPORTS_PATH):
        try:
            with open(_REPORTS_PATH) as f:
                _reports_cache = json.load(f)
            return _reports_cache
        except Exception as e:
            logger.error("Failed to load interview reports: %s", e)

    # Seed with sample data
    _reports_cache = _generate_seed_data()
    return _reports_cache


def _save_reports(reports: list[dict]) -> None:
    global _reports_cache
    _reports_cache = reports
    try:
        with open(_REPORTS_PATH, "w") as f:
            json.dump(reports, f, indent=2)
    except Exception as e:
        logger.error("Failed to save interview reports: %s", e)


def _generate_seed_data() -> list[dict]:
    """Generate realistic seed interview reports for T15 schools."""
    import random

    schools = [
        ("hbs", "R1"), ("hbs", "R2"), ("gsb", "R1"), ("gsb", "R2"),
        ("wharton", "R1"), ("wharton", "R2"), ("booth", "R1"), ("booth", "R2"),
        ("kellogg", "R1"), ("kellogg", "R2"), ("sloan", "R1"), ("cbs", "R1"),
        ("cbs", "R2"), ("tuck", "R1"), ("haas", "R1"), ("haas", "R2"),
        ("ross", "R1"), ("fuqua", "R1"), ("stern", "R1"), ("som", "R1"),
    ]

    formats = ["virtual_alumni", "virtual_adcom", "inperson_alumni", "inperson_adcom"]
    styles = ["conversational", "challenging", "case_based", "by_the_book"]
    feelings = ["great", "good", "okay", "rough"]
    outcomes = ["admitted", "rejected", "waitlisted", None, None]

    common_questions = [
        "Walk me through your resume.",
        "Why an MBA? Why now?",
        "Tell me about a time you led a team through a challenge.",
        "What's your biggest weakness?",
        "Where do you see yourself in 5 years?",
        "Tell me about a failure and what you learned.",
        "Why this school specifically?",
        "How will you contribute to the class?",
        "Describe a time you influenced someone without authority.",
        "What would your colleagues say about you?",
        "Tell me about an ethical dilemma you faced.",
        "What's the most impactful project you've worked on?",
        "How do you handle conflict in a team?",
        "What communities are you part of?",
        "Tell me about yourself.",
        "What are your short-term and long-term career goals?",
        "Describe a time you had to adapt to a major change.",
        "What unique perspective do you bring?",
        "How did you choose your career path?",
        "What book has influenced you the most?",
    ]

    advice_templates = [
        "Be authentic and specific with your examples. They really probe for details.",
        "The interviewer was very friendly but asked tough follow-ups. Prepare deep STAR stories.",
        "Know the school inside out. They asked very specific questions about programs and clubs.",
        "Keep your answers concise — 2-3 minutes max. They want to cover many questions.",
        "Practice your 'tell me about yourself' until it's natural but not rehearsed.",
        "Have 2-3 questions ready to ask them. It shows genuine interest.",
        "The case discussion was unexpected. Brush up on frameworks just in case.",
        "They focused heavily on teamwork and collaboration. Have multiple team examples ready.",
        "Don't memorize answers — they can tell. Have talking points but be conversational.",
        "The interview felt more like a conversation. Be personable and show genuine enthusiasm.",
        "They asked about my failures more than my successes. Be ready to be vulnerable.",
        "Time flew by. I wish I had been more concise in my early answers.",
    ]

    reports = []
    for i in range(120):
        school_slug, round_name = random.choice(schools)
        num_questions = random.randint(4, 8)
        selected_questions = random.sample(common_questions, min(num_questions, len(common_questions)))

        month = random.choice(["09", "10", "11", "12", "01", "02"])
        day = str(random.randint(1, 28)).zfill(2)
        year = random.choice(["2024", "2025"])

        reports.append({
            "id": f"ir_{i:04d}",
            "school_slug": school_slug,
            "round": round_name,
            "date": f"{year}-{month}-{day}",
            "format": random.choice(formats),
            "duration": random.choice([25, 30, 30, 30, 35, 40, 45]),
            "questions": selected_questions,
            "style": random.choice(styles),
            "feeling": random.choice(feelings),
            "advice": random.choice(advice_templates),
            "outcome": random.choice(outcomes),
            "anonymous": True,
            "created_at": f"{year}-{month}-{day}T10:00:00Z",
        })

    return reports


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/interview-reports")
def list_interview_reports(
    school: Optional[str] = Query(default=None),
    round: Optional[str] = Query(default=None),
    format: Optional[str] = Query(default=None),
    style: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    """List interview reports with optional filters."""
    reports = _load_reports()

    filtered = reports
    if school:
        filtered = [r for r in filtered if r["school_slug"] == school.lower()]
    if round:
        filtered = [r for r in filtered if r["round"] == round]
    if format:
        filtered = [r for r in filtered if r["format"] == format]
    if style:
        filtered = [r for r in filtered if r["style"] == style]

    # Sort by date descending
    filtered.sort(key=lambda r: r.get("date", ""), reverse=True)

    total = len(filtered)
    page = filtered[offset:offset + limit]

    return {
        "reports": page,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/interview-reports/stats/{school_slug}")
def get_interview_report_stats(school_slug: str):
    """Aggregate stats for a school: most common questions, avg duration, style distribution."""
    reports = _load_reports()
    school_reports = [r for r in reports if r["school_slug"] == school_slug.lower()]

    if not school_reports:
        raise HTTPException(404, detail=f"No reports found for {school_slug}")

    # Most common questions
    question_counter: Counter = Counter()
    for r in school_reports:
        for q in r.get("questions", []):
            question_counter[q] += 1

    top_questions = [
        {"question": q, "count": c, "pct": round(c / len(school_reports) * 100)}
        for q, c in question_counter.most_common(10)
    ]

    # Average duration
    durations = [r["duration"] for r in school_reports if r.get("duration")]
    avg_duration = round(sum(durations) / len(durations)) if durations else 30

    # Style distribution
    style_counter = Counter(r.get("style", "unknown") for r in school_reports)
    style_dist = {s: round(c / len(school_reports) * 100) for s, c in style_counter.items()}

    # Format distribution
    format_counter = Counter(r.get("format", "unknown") for r in school_reports)
    format_dist = {f: round(c / len(school_reports) * 100) for f, c in format_counter.items()}

    # Feeling distribution
    feeling_counter = Counter(r.get("feeling", "unknown") for r in school_reports)
    feeling_dist = {f: round(c / len(school_reports) * 100) for f, c in feeling_counter.items()}

    # Outcome distribution (excluding None)
    outcome_reports = [r for r in school_reports if r.get("outcome")]
    outcome_counter = Counter(r["outcome"] for r in outcome_reports)
    outcome_dist = {
        o: round(c / len(outcome_reports) * 100) if outcome_reports else 0
        for o, c in outcome_counter.items()
    }

    # Round distribution
    round_counter = Counter(r.get("round", "unknown") for r in school_reports)

    return {
        "school_slug": school_slug,
        "total_reports": len(school_reports),
        "top_questions": top_questions,
        "avg_duration_minutes": avg_duration,
        "style_distribution": style_dist,
        "format_distribution": format_dist,
        "feeling_distribution": feeling_dist,
        "outcome_distribution": outcome_dist,
        "round_distribution": dict(round_counter),
    }


@router.post("/interview-reports")
@rate_limit("5/minute")
def submit_interview_report(request: Request, report: InterviewReportSubmission):
    """Submit a new interview report."""
    # Validate format and style
    valid_formats = {"virtual_alumni", "virtual_adcom", "inperson_alumni", "inperson_adcom"}
    valid_styles = {"conversational", "challenging", "case_based", "by_the_book"}
    valid_feelings = {"great", "good", "okay", "rough"}
    valid_outcomes = {"admitted", "rejected", "waitlisted", None}

    if report.format not in valid_formats:
        raise HTTPException(400, detail=f"Invalid format. Must be one of: {valid_formats}")
    if report.style not in valid_styles:
        raise HTTPException(400, detail=f"Invalid style. Must be one of: {valid_styles}")
    if report.feeling not in valid_feelings:
        raise HTTPException(400, detail=f"Invalid feeling. Must be one of: {valid_feelings}")
    if report.outcome is not None and report.outcome not in valid_outcomes:
        raise HTTPException(400, detail=f"Invalid outcome. Must be one of: {valid_outcomes}")

    reports = _load_reports()
    new_id = f"ir_{len(reports):04d}"

    new_report = {
        "id": new_id,
        "school_slug": report.school_slug.lower(),
        "round": report.round,
        "date": report.date,
        "format": report.format,
        "duration": report.duration,
        "questions": report.questions,
        "style": report.style,
        "feeling": report.feeling,
        "advice": report.advice,
        "outcome": report.outcome,
        "anonymous": report.anonymous,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    reports.append(new_report)
    _save_reports(reports)

    return {"id": new_id, "message": "Report submitted successfully"}
