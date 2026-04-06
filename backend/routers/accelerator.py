"""Application Accelerator — 8-week guided MBA application curriculum.

Solves the #1 user problem: 213 API routes, 100+ pages, but no guided journey.
Users don't know what to do first. This provides an opinionated, linear path
from "I'm thinking about MBA" to "I submitted."

Competes directly with ApplicantLab's 14-module structure by offering
a time-boxed 8-week plan tied to existing platform tools.
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/accelerator", tags=["accelerator"])

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
PROGRESS_FILE = DATA_DIR / "accelerator_progress.json"

# ── Curriculum Definition ────────────────────────────────────────────────────

CURRICULUM = [
    {
        "week": 1,
        "title": "Know Yourself",
        "subtitle": "Profile assessment",
        "description": "Before you research schools, understand where you stand. Complete your profile, run the odds calculator for your dream schools, and get an honest assessment of your strengths and gaps.",
        "links": ["/simulator", "/profile-report"],
        "tasks": [
            {
                "title": "Complete your profile",
                "description": "Enter your GMAT/GRE score, GPA, years of experience, industry, and career goals. This powers every recommendation on the platform.",
                "tool_link": "/simulator",
                "estimated_minutes": 10,
                "required": True,
            },
            {
                "title": "Run the odds calculator for 5+ schools",
                "description": "Use the simulator to check your admit chances at your dream schools. Don't just check the top 3 — include a range to calibrate expectations.",
                "tool_link": "/simulator",
                "estimated_minutes": 15,
                "required": True,
            },
            {
                "title": "Get your profile report",
                "description": "Generate a comprehensive profile report that shows your strengths, gaps, and how you compare to admitted applicants at your target schools.",
                "tool_link": "/profile-report",
                "estimated_minutes": 5,
                "required": True,
            },
        ],
    },
    {
        "week": 2,
        "title": "Build Your List",
        "subtitle": "School research",
        "description": "Turn gut feelings into a data-backed school list. Use smart filters to discover programs, run the List Health Check to balance reaches/targets/safeties, and check scholarship intelligence for affordability.",
        "links": ["/schools", "/list-check", "/finances?tab=scholarship-intel"],
        "tasks": [
            {
                "title": "Browse schools with smart search filters",
                "description": "Explore the school directory. Filter by location, class size, industry placement, GMAT range, and more. Add at least 8-10 schools to your list.",
                "tool_link": "/schools",
                "estimated_minutes": 25,
                "required": True,
            },
            {
                "title": "Run the List Health Check",
                "description": "Is your list balanced? The health check analyzes your reach/target/safety distribution and flags if you're top-heavy or missing safeties.",
                "tool_link": "/list-check",
                "estimated_minutes": 10,
                "required": True,
            },
            {
                "title": "Check scholarship intelligence for targets",
                "description": "Review scholarship data and financial aid profiles for your target schools. Know what's realistic before you fall in love with a program.",
                "tool_link": "/finances?tab=scholarship-intel",
                "estimated_minutes": 15,
                "required": False,
            },
        ],
    },
    {
        "week": 3,
        "title": "Understand Your Schools",
        "subtitle": "Deep research",
        "description": "Go beyond rankings. Read school detail pages, sync deadlines to your calendar, and connect with current students to get the real story.",
        "links": ["/school/[id]", "/calendar", "/connect"],
        "tasks": [
            {
                "title": "Read school detail pages for your top 5",
                "description": "Dive deep into class profiles, essay prompts, curriculum, career outcomes, and culture for each of your top 5 schools. Take notes on what excites you — you'll need it for essays.",
                "tool_link": "/schools",
                "estimated_minutes": 40,
                "required": True,
            },
            {
                "title": "Check deadline calendar and sync to iCal",
                "description": "View all your target schools' deadlines in one place. Export to iCal so you never miss a round. Plan which round you're targeting for each school.",
                "tool_link": "/calendar",
                "estimated_minutes": 10,
                "required": True,
            },
            {
                "title": "Connect with a current student",
                "description": "Reach out to a current student or recent alum at your top school. Ask about culture, career support, and what surprised them. This intel is gold for essays and interviews.",
                "tool_link": "/connect",
                "estimated_minutes": 15,
                "required": False,
            },
        ],
    },
    {
        "week": 4,
        "title": "Craft Your Narrative",
        "subtitle": "Essay strategy",
        "description": "The hardest part: figuring out what to say. Read real admitted essays, draft your core 'Why MBA' narrative, and start your first school-specific essay.",
        "links": ["/essays/examples", "/storyteller", "/evaluator"],
        "tasks": [
            {
                "title": "Read 10+ real essays from target schools",
                "description": "Study admitted essays from your target schools. Notice patterns in structure, tone, and specificity. What makes the great ones great?",
                "tool_link": "/essays/examples",
                "estimated_minutes": 45,
                "required": True,
            },
            {
                "title": "Draft your core 'Why MBA' narrative",
                "description": "Use the Storyteller to workshop your personal narrative. What's the thread connecting your past, present goals, and why this MBA? This narrative powers every essay.",
                "tool_link": "/storyteller",
                "estimated_minutes": 60,
                "required": True,
            },
            {
                "title": "Start your first school-specific essay",
                "description": "Pick your most important school and start drafting. Don't aim for perfect — aim for a complete first draft you can evaluate and refine.",
                "tool_link": "/evaluator",
                "estimated_minutes": 90,
                "required": True,
            },
        ],
    },
    {
        "week": 5,
        "title": "Write & Refine",
        "subtitle": "Essay execution",
        "description": "Heads down writing. Complete all essay drafts, run each through the AI evaluator for instant feedback, and consider expert review for your top choices.",
        "links": ["/essay-drafts", "/evaluator", "/connect/expert-review"],
        "tasks": [
            {
                "title": "Complete all essay drafts",
                "description": "Finish first drafts for every school on your list. Use the essay drafts manager to track progress across all schools and prompts.",
                "tool_link": "/essay-drafts",
                "estimated_minutes": 180,
                "required": True,
            },
            {
                "title": "Run each essay through the evaluator",
                "description": "Submit every draft to the AI essay evaluator. Focus on the specific feedback: structure, specificity, school fit, and authenticity scores.",
                "tool_link": "/evaluator",
                "estimated_minutes": 45,
                "required": True,
            },
            {
                "title": "Get expert review (premium)",
                "description": "For your top 2-3 schools, get a human expert review. Fresh eyes catch what you and AI miss — especially narrative gaps and cultural fit issues.",
                "tool_link": "/connect",
                "estimated_minutes": 30,
                "required": False,
            },
        ],
    },
    {
        "week": 6,
        "title": "Secure Recommendations",
        "subtitle": "Rec management",
        "description": "Recommendations are the most anxiety-inducing part because you're not in control. Generate briefing documents, send them early, and track everything in one place.",
        "links": ["/recommenders"],
        "tasks": [
            {
                "title": "Generate recommender briefing documents",
                "description": "Create personalized briefing docs for each recommender. Include your goals, key stories you'd like highlighted, and school-specific guidance on what adcoms look for.",
                "tool_link": "/recommenders",
                "estimated_minutes": 45,
                "required": True,
            },
            {
                "title": "Send briefings to recommenders",
                "description": "Share the briefing documents with your recommenders. Give them 3-4 weeks lead time. The earlier you ask, the better the letters.",
                "tool_link": "/recommenders",
                "estimated_minutes": 15,
                "required": True,
            },
            {
                "title": "Track submission status",
                "description": "Monitor which recommenders have submitted for which schools. Set up follow-up reminders for anyone who hasn't submitted 2 weeks before deadline.",
                "tool_link": "/recommenders",
                "estimated_minutes": 10,
                "required": True,
            },
        ],
    },
    {
        "week": 7,
        "title": "Prepare for Interviews",
        "subtitle": "Interview prep",
        "description": "Some schools interview before you submit, others after. Either way, preparation is the difference between a good interview and a great one.",
        "links": ["/interview", "/interview/questions", "/video-essay"],
        "tasks": [
            {
                "title": "Study school-specific interview formats",
                "description": "Each school interviews differently — blind vs. informed, alumni vs. adcom, behavioral vs. case. Know what to expect for every school on your list.",
                "tool_link": "/interview/questions",
                "estimated_minutes": 30,
                "required": True,
            },
            {
                "title": "Complete 3+ mock interview sessions",
                "description": "Practice with the AI mock interviewer. Focus on your 'Why MBA', 'Why this school', leadership examples, and handling curveball questions.",
                "tool_link": "/interview",
                "estimated_minutes": 90,
                "required": True,
            },
            {
                "title": "Practice video essays (if applicable)",
                "description": "Schools like Kellogg and Yale use video essays. Practice timed responses on camera until you feel natural and confident.",
                "tool_link": "/video-essay",
                "estimated_minutes": 45,
                "required": False,
            },
        ],
    },
    {
        "week": 8,
        "title": "Submit & Negotiate",
        "subtitle": "Final push",
        "description": "The finish line. Do a final review of every application, submit on time, and prepare your scholarship negotiation strategy for when the admits roll in.",
        "links": ["/sprint-plan", "/finances?tab=negotiate", "/waivers"],
        "tasks": [
            {
                "title": "Final application review",
                "description": "Use the Sprint Planner to verify every component is complete: essays, recs, test scores, resume, transcripts. One missing piece can tank an otherwise strong application.",
                "tool_link": "/sprint-plan",
                "estimated_minutes": 30,
                "required": True,
            },
            {
                "title": "Submit all applications",
                "description": "Hit submit. Seriously — don't overthink the last 2%. A submitted application beats a perfect draft sitting in your browser.",
                "tool_link": "/sprint-plan",
                "estimated_minutes": 60,
                "required": True,
            },
            {
                "title": "Prepare scholarship negotiation strategy",
                "description": "Plan your negotiation approach before admits arrive. Know your leverage points, competing offers, and what each school's scholarship culture looks like.",
                "tool_link": "/finances?tab=negotiate",
                "estimated_minutes": 20,
                "required": False,
            },
        ],
    },
]


# ── Models ───────────────────────────────────────────────────────────────────


class ProgressUpdate(BaseModel):
    week: int = Field(..., ge=1, le=8, description="Week number (1-8)")
    task_index: int = Field(..., ge=0, le=2, description="Task index within week (0-2)")
    completed: bool = Field(..., description="Whether the task is completed")


class TaskProgress(BaseModel):
    week: int
    task_index: int
    completed: bool
    completed_at: Optional[str] = None


# ── Helpers ──────────────────────────────────────────────────────────────────


def _load_progress() -> list[dict]:
    """Load progress from JSON file. Returns list of completed task records."""
    if not PROGRESS_FILE.exists():
        return []
    try:
        data = json.loads(PROGRESS_FILE.read_text())
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError) as e:
        logger.warning("Failed to load accelerator progress: %s", e)
        return []


def _save_progress(progress: list[dict]) -> None:
    """Save progress to JSON file."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    PROGRESS_FILE.write_text(json.dumps(progress, indent=2))


def _compute_summary(progress: list[dict]) -> dict:
    """Compute overall progress summary from raw progress data."""
    completed_set = {
        (p["week"], p["task_index"])
        for p in progress
        if p.get("completed", False)
    }

    total_tasks = sum(len(w["tasks"]) for w in CURRICULUM)
    completed_count = len(completed_set)
    overall_pct = round((completed_count / total_tasks) * 100) if total_tasks > 0 else 0

    # Current week = first week with incomplete tasks
    current_week = 8
    for week_data in CURRICULUM:
        week_num = week_data["week"]
        week_tasks = len(week_data["tasks"])
        week_done = sum(
            1 for i in range(week_tasks)
            if (week_num, i) in completed_set
        )
        if week_done < week_tasks:
            current_week = week_num
            break

    return {
        "completed_tasks": completed_count,
        "total_tasks": total_tasks,
        "overall_pct": overall_pct,
        "current_week": current_week,
    }


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("/curriculum")
def get_curriculum():
    """Return the full 8-week curriculum with all tasks."""
    return {
        "weeks": CURRICULUM,
        "total_weeks": len(CURRICULUM),
        "total_tasks": sum(len(w["tasks"]) for w in CURRICULUM),
    }


@router.get("/week/{week_number}")
def get_week(week_number: int):
    """Return detail for a specific week."""
    if week_number < 1 or week_number > 8:
        raise HTTPException(status_code=404, detail=f"Week {week_number} not found. Valid range: 1-8.")

    week_data = CURRICULUM[week_number - 1]

    # Include progress for this week
    progress = _load_progress()
    completed_set = {
        (p["week"], p["task_index"])
        for p in progress
        if p.get("completed", False)
    }

    tasks_with_status = []
    for i, task in enumerate(week_data["tasks"]):
        tasks_with_status.append({
            **task,
            "index": i,
            "completed": (week_number, i) in completed_set,
        })

    completed_count = sum(1 for t in tasks_with_status if t["completed"])

    return {
        **week_data,
        "tasks": tasks_with_status,
        "completed_count": completed_count,
        "total_count": len(tasks_with_status),
    }


@router.post("/progress")
def save_progress(update: ProgressUpdate):
    """Save a task completion status."""
    # Validate week/task exist
    if update.week < 1 or update.week > len(CURRICULUM):
        raise HTTPException(status_code=400, detail=f"Invalid week: {update.week}")
    week_data = CURRICULUM[update.week - 1]
    if update.task_index < 0 or update.task_index >= len(week_data["tasks"]):
        raise HTTPException(status_code=400, detail=f"Invalid task_index: {update.task_index} for week {update.week}")

    progress = _load_progress()

    # Find existing entry or create new
    existing_idx = None
    for idx, p in enumerate(progress):
        if p["week"] == update.week and p["task_index"] == update.task_index:
            existing_idx = idx
            break

    now = datetime.now(timezone.utc).isoformat()
    entry = {
        "week": update.week,
        "task_index": update.task_index,
        "completed": update.completed,
        "completed_at": now if update.completed else None,
    }

    if existing_idx is not None:
        progress[existing_idx] = entry
    else:
        progress.append(entry)

    _save_progress(progress)

    summary = _compute_summary(progress)
    return {
        "saved": entry,
        **summary,
    }


@router.get("/progress")
def get_progress():
    """Get the user's full accelerator progress."""
    progress = _load_progress()
    completed_set = {
        (p["week"], p["task_index"])
        for p in progress
        if p.get("completed", False)
    }

    summary = _compute_summary(progress)

    # Build per-week breakdown
    weeks = []
    for week_data in CURRICULUM:
        week_num = week_data["week"]
        task_count = len(week_data["tasks"])
        week_completed = sum(
            1 for i in range(task_count)
            if (week_num, i) in completed_set
        )
        tasks = []
        for i in range(task_count):
            is_done = (week_num, i) in completed_set
            completion_record = next(
                (p for p in progress if p["week"] == week_num and p["task_index"] == i and p.get("completed")),
                None,
            )
            tasks.append({
                "index": i,
                "title": week_data["tasks"][i]["title"],
                "completed": is_done,
                "completed_at": completion_record["completed_at"] if completion_record else None,
            })
        weeks.append({
            "week": week_num,
            "title": week_data["title"],
            "completed_count": week_completed,
            "total_count": task_count,
            "status": "complete" if week_completed == task_count else ("in_progress" if week_completed > 0 else "not_started"),
            "tasks": tasks,
        })

    return {
        **summary,
        "weeks": weeks,
    }
