"""Smart Application Planner — generates personalized sprint plans with intelligent nudges.

Takes a user's school list + application rounds, works backward from deadlines,
and generates a week-by-week action plan with smart nudges about what's behind schedule.

No LLM calls — pure computation from school data.
"""

import logging
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from agents import SCHOOL_DB

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/planner", tags=["smart-planner"])


# ── Models ───────────────────────────────────────────────────────────────────


class SchoolApplication(BaseModel):
    school_id: str
    round: Optional[str] = None  # "R1", "R2", "R3", "ED", etc.
    deadline: Optional[str] = None  # ISO date override, else auto-detected
    essays_done: int = Field(default=0, ge=0)
    essays_total: Optional[int] = None
    resume_done: bool = False
    recs_requested: int = Field(default=0, ge=0)
    recs_needed: int = Field(default=2, ge=0)
    test_submitted: bool = False
    interview_scheduled: bool = False


class PlannerRequest(BaseModel):
    schools: list[SchoolApplication] = Field(min_length=1, max_length=15)
    today: Optional[str] = None  # ISO date, defaults to today


# ── Constants ────────────────────────────────────────────────────────────────

# Estimated days needed for each task (working at moderate pace)
TASK_DURATIONS = {
    "essay_research": 3,       # per essay: research school + brainstorm
    "essay_draft": 5,          # per essay: first draft
    "essay_revise": 4,         # per essay: revision + feedback cycle
    "essay_polish": 2,         # per essay: final polish
    "resume": 5,               # total: MBA resume formatting
    "recs_request": 7,         # lead time for requesting recommenders
    "recs_followup": 14,       # buffer for recommender completion
    "test_score_send": 7,      # GMAT/GRE score reporting
    "app_form": 3,             # filling out the application form
    "final_review": 2,         # final review before submit
    "buffer": 3,               # buffer for unexpected delays
}

# Total essay time per essay (research + draft + revise + polish)
DAYS_PER_ESSAY = (
    TASK_DURATIONS["essay_research"]
    + TASK_DURATIONS["essay_draft"]
    + TASK_DURATIONS["essay_revise"]
    + TASK_DURATIONS["essay_polish"]
)  # 14 days per essay


# ── Helpers ──────────────────────────────────────────────────────────────────


def _find_deadline(school_id: str, target_round: Optional[str]) -> Optional[date]:
    """Find the deadline for a school + round from the database."""
    school = SCHOOL_DB.get(school_id, {})
    deadlines = school.get("admission_deadlines") or []

    if not deadlines:
        return None

    for dl in deadlines:
        dl_round = (dl.get("round") or "").strip().upper()
        dl_date = dl.get("date")

        if not dl_date:
            continue

        try:
            parsed = date.fromisoformat(str(dl_date)[:10])
        except (ValueError, TypeError):
            continue

        # Match by round if specified
        if target_round:
            target_upper = target_round.strip().upper()
            if dl_round == target_upper or target_upper in dl_round:
                return parsed

    # If no round match, return the earliest future deadline
    today = date.today()
    future_deadlines = []
    for dl in deadlines:
        dl_date = dl.get("date")
        if dl_date:
            try:
                parsed = date.fromisoformat(str(dl_date)[:10])
                if parsed >= today:
                    future_deadlines.append(parsed)
            except (ValueError, TypeError):
                continue

    return min(future_deadlines) if future_deadlines else None


def _get_essay_count(school_id: str) -> int:
    """Get the number of essays required for a school."""
    school = SCHOOL_DB.get(school_id, {})
    prompts = school.get("essay_prompts") or school.get("application_questions") or []
    if isinstance(prompts, list):
        return max(len(prompts), 1)
    return 2  # default assumption


def _compute_school_plan(
    app: SchoolApplication,
    current_date: date,
) -> dict:
    """Compute the plan for a single school application."""
    school = SCHOOL_DB.get(app.school_id, {})
    school_name = school.get("name", app.school_id)

    # Resolve deadline
    if app.deadline:
        try:
            deadline = date.fromisoformat(app.deadline)
        except ValueError:
            deadline = None
    else:
        deadline = _find_deadline(app.school_id, app.round)

    if not deadline:
        return {
            "school_id": app.school_id,
            "school_name": school_name,
            "round": app.round,
            "error": "No deadline found. Set a deadline manually.",
        }

    days_remaining = (deadline - current_date).days

    # Essay count
    essays_total = app.essays_total or _get_essay_count(app.school_id)
    essays_remaining = max(0, essays_total - app.essays_done)

    # Calculate time needed
    essay_days = essays_remaining * DAYS_PER_ESSAY
    rec_days = (
        TASK_DURATIONS["recs_request"] + TASK_DURATIONS["recs_followup"]
        if app.recs_requested < app.recs_needed
        else 0
    )
    resume_days = TASK_DURATIONS["resume"] if not app.resume_done else 0
    test_days = TASK_DURATIONS["test_score_send"] if not app.test_submitted else 0
    form_days = TASK_DURATIONS["app_form"]
    review_days = TASK_DURATIONS["final_review"]
    buffer_days = TASK_DURATIONS["buffer"]

    # Total days needed (essays are the bottleneck, other tasks overlap)
    # Parallel: resume, test scores, rec requests can happen during essay writing
    parallel_tasks_days = max(rec_days, resume_days, test_days)
    total_days_needed = essay_days + form_days + review_days + buffer_days
    # If parallel tasks take longer than essays, add the difference
    if parallel_tasks_days > essay_days:
        total_days_needed += parallel_tasks_days - essay_days

    days_slack = days_remaining - total_days_needed

    # Status
    if days_remaining <= 0:
        status = "past_due"
    elif days_slack < -14:
        status = "critical"
    elif days_slack < 0:
        status = "behind"
    elif days_slack < 7:
        status = "tight"
    elif days_slack < 21:
        status = "on_track"
    else:
        status = "ahead"

    # Generate milestones (working backward from deadline)
    milestones = []
    cursor = deadline

    # Submit day
    milestones.append({
        "task": "Submit application",
        "date": cursor.isoformat(),
        "days_from_now": (cursor - current_date).days,
        "done": False,
    })

    # Final review
    cursor -= timedelta(days=review_days)
    milestones.append({
        "task": "Final review & polish",
        "date": cursor.isoformat(),
        "days_from_now": (cursor - current_date).days,
        "done": False,
    })

    # Application form
    cursor -= timedelta(days=form_days)
    milestones.append({
        "task": "Complete application form",
        "date": cursor.isoformat(),
        "days_from_now": (cursor - current_date).days,
        "done": False,
    })

    # Essays (one milestone per essay, reverse order)
    for i in range(essays_remaining):
        essay_num = essays_total - i
        cursor -= timedelta(days=DAYS_PER_ESSAY)
        milestones.append({
            "task": f"Essay {essay_num}: draft + revise + polish",
            "date": cursor.isoformat(),
            "days_from_now": (cursor - current_date).days,
            "done": essay_num <= app.essays_done,
        })

    # Parallel tasks (place at the start)
    if not app.resume_done:
        milestones.append({
            "task": "Finalize MBA resume",
            "date": cursor.isoformat(),
            "days_from_now": (cursor - current_date).days,
            "done": app.resume_done,
        })

    if app.recs_requested < app.recs_needed:
        rec_date = cursor - timedelta(days=TASK_DURATIONS["recs_followup"])
        milestones.append({
            "task": f"Request recommenders ({app.recs_needed - app.recs_requested} remaining)",
            "date": rec_date.isoformat(),
            "days_from_now": (rec_date - current_date).days,
            "done": app.recs_requested >= app.recs_needed,
        })

    if not app.test_submitted:
        milestones.append({
            "task": "Send GMAT/GRE scores",
            "date": cursor.isoformat(),
            "days_from_now": (cursor - current_date).days,
            "done": app.test_submitted,
        })

    # Sort milestones by date
    milestones.sort(key=lambda m: m["date"])

    # Compute completion percentage
    total_tasks = essays_total + 4  # essays + resume + recs + test + form
    done_tasks = app.essays_done + (1 if app.resume_done else 0) + min(app.recs_requested, app.recs_needed) + (1 if app.test_submitted else 0)
    completion_pct = round(done_tasks / total_tasks * 100) if total_tasks > 0 else 0

    return {
        "school_id": app.school_id,
        "school_name": school_name,
        "round": app.round,
        "deadline": deadline.isoformat(),
        "days_remaining": days_remaining,
        "days_needed": total_days_needed,
        "days_slack": days_slack,
        "status": status,
        "completion_pct": completion_pct,
        "essays": {
            "done": app.essays_done,
            "total": essays_total,
            "remaining": essays_remaining,
            "days_needed": essay_days,
        },
        "milestones": milestones,
    }


def _generate_nudges(plans: list[dict], current_date: date) -> list[dict]:
    """Generate smart nudges based on the full application portfolio."""
    nudges = []

    # Sort by deadline (nearest first)
    active_plans = [p for p in plans if "error" not in p]
    active_plans.sort(key=lambda p: p.get("deadline", "9999"))

    for plan in active_plans:
        school = plan["school_name"]
        status = plan["status"]
        days_left = plan["days_remaining"]
        essays_left = plan["essays"]["remaining"]
        days_slack = plan["days_slack"]

        if status == "past_due":
            nudges.append({
                "severity": "critical",
                "school_id": plan["school_id"],
                "message": f"{school} deadline has passed. Check if late submission is accepted or switch to a later round.",
            })
        elif status == "critical":
            nudges.append({
                "severity": "critical",
                "school_id": plan["school_id"],
                "message": f"{school}: {days_left} days left but you need ~{plan['days_needed']} days. Cut scope or consider next round.",
            })
        elif status == "behind":
            nudges.append({
                "severity": "warning",
                "school_id": plan["school_id"],
                "message": f"{school}: You're {abs(days_slack)} days behind schedule. Prioritize this over lower-priority apps.",
            })

            if essays_left > 0:
                nudges.append({
                    "severity": "action",
                    "school_id": plan["school_id"],
                    "message": f"Start {school} essay now — {essays_left} essay{'s' if essays_left > 1 else ''} left, "
                               f"~{essays_left * DAYS_PER_ESSAY} days of work, only {days_left} days until deadline.",
                })
        elif status == "tight":
            if essays_left > 0:
                nudges.append({
                    "severity": "info",
                    "school_id": plan["school_id"],
                    "message": f"{school}: On track but tight. {essays_left} essay{'s' if essays_left > 1 else ''} to finish in {days_left} days.",
                })

    # Cross-school nudges
    if len(active_plans) >= 2:
        # Find overlapping essay periods
        essay_heavy = [p for p in active_plans if p["essays"]["remaining"] > 1 and p["days_remaining"] < 45]
        if len(essay_heavy) >= 2:
            schools_str = " and ".join(p["school_name"] for p in essay_heavy[:3])
            total_essays = sum(p["essays"]["remaining"] for p in essay_heavy)
            nudges.append({
                "severity": "warning",
                "school_id": None,
                "message": f"Heads up: {total_essays} essays due in the next 45 days across {schools_str}. "
                           f"Consider staggering or finding common themes to reuse across schools.",
            })

    # Rec letter nudge
    for plan in active_plans:
        if plan.get("days_remaining", 999) < 30:
            # Check milestones for undone rec tasks
            for m in plan.get("milestones", []):
                if "recommender" in m.get("task", "").lower() and not m.get("done"):
                    nudges.append({
                        "severity": "warning",
                        "school_id": plan["school_id"],
                        "message": f"Recommendation letters for {plan['school_name']} not confirmed yet. "
                                   f"Follow up with recommenders — they need 2-3 weeks minimum.",
                    })
                    break

    # Positive nudge if things are going well
    ahead = [p for p in active_plans if p["status"] == "ahead"]
    if len(ahead) >= 2 and len(ahead) == len(active_plans):
        nudges.append({
            "severity": "positive",
            "school_id": None,
            "message": "You're ahead of schedule on all applications. Use the buffer for essay polish and mock interviews.",
        })

    return nudges


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.post("/sprint")
def generate_sprint_plan(request: PlannerRequest):
    """Generate a personalized application sprint plan.

    Returns week-by-week milestones, status indicators, and smart nudges
    for each school in the portfolio.
    """
    try:
        current_date = date.fromisoformat(request.today) if request.today else date.today()
    except ValueError:
        current_date = date.today()

    plans = [_compute_school_plan(app, current_date) for app in request.schools]
    nudges = _generate_nudges(plans, current_date)

    # Sort: critical first, then by deadline
    status_order = {"past_due": 0, "critical": 1, "behind": 2, "tight": 3, "on_track": 4, "ahead": 5}
    plans.sort(key=lambda p: (status_order.get(p.get("status", "on_track"), 9), p.get("deadline", "9999")))

    # Summary stats
    active = [p for p in plans if "error" not in p]
    return {
        "plans": plans,
        "nudges": nudges,
        "summary": {
            "total_schools": len(plans),
            "critical": sum(1 for p in active if p.get("status") in ("past_due", "critical")),
            "behind": sum(1 for p in active if p.get("status") == "behind"),
            "on_track": sum(1 for p in active if p.get("status") in ("on_track", "ahead", "tight")),
            "total_essays_remaining": sum(p.get("essays", {}).get("remaining", 0) for p in active),
            "nearest_deadline": min((p["deadline"] for p in active), default=None),
            "avg_completion_pct": (
                round(sum(p.get("completion_pct", 0) for p in active) / len(active))
                if active
                else 0
            ),
        },
    }


@router.get("/quick-status")
def quick_status(
    school_ids: str = Query(..., description="Comma-separated school IDs"),
):
    """Quick status check — are you on track? Returns traffic-light status per school.

    Lighter weight than /sprint — no milestones, just status + top nudge.
    Designed for dashboard widgets.
    """
    ids = [s.strip() for s in school_ids.split(",") if s.strip()]
    if not ids:
        raise HTTPException(400, "No school IDs provided")

    current_date = date.today()
    statuses = []

    for sid in ids[:15]:
        app = SchoolApplication(school_id=sid)
        plan = _compute_school_plan(app, current_date)
        if "error" in plan:
            statuses.append({"school_id": sid, "status": "unknown", "error": plan["error"]})
        else:
            statuses.append({
                "school_id": sid,
                "school_name": plan["school_name"],
                "status": plan["status"],
                "deadline": plan["deadline"],
                "days_remaining": plan["days_remaining"],
                "completion_pct": plan["completion_pct"],
            })

    return {"statuses": statuses}
