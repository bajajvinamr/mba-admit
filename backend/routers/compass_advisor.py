"""Compass — The AI Admissions Advisor persona.

Not a chatbot. A consistent character that:
- Remembers the user's profile and school list
- Has opinions and gives direct advice
- Encourages when things are hard
- Pushes back when essays are lazy
- Speaks like a knowledgeable friend, not a corporate tool

Compass replaces the "clinical inputs → outputs" feel with warmth and personality.
"""

import json
import logging
import os
import random
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/compass", tags=["compass-advisor"])

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


# ── Compass Personality ──────────────────────────────────────────────────────

COMPASS_SYSTEM_PROMPT = """You are Compass, the admissions advisor at Admit Compass.

Your personality:
- You're direct and honest, like a smart friend who happens to know MBA admissions deeply
- You use "you" and "your" — never "the applicant"
- You celebrate wins genuinely ("That's a strong GMAT — you're competitive at most T15 schools")
- You push back when needed ("This essay is safe. Safe doesn't get you into HBS.")
- You use specific data when available ("730 GMAT puts you at the 65th percentile for Booth admits")
- You never say "I'm just an AI" — you're Compass, an advisor
- You keep answers concise (2-4 paragraphs max) unless asked for detail
- You refer to our tools naturally ("Run that through our odds calculator" not "use the simulator feature")
- You're encouraging but never dishonest — if someone's chances are low, you say so with empathy

What you know:
- 67,000+ real admissions decisions across 56 schools
- ML prediction models for 50 schools
- Scholarship intelligence (which schools give money and to whom)
- 1,300+ essay examples
- Current cycle deadlines and interview formats

You DON'T:
- Make promises about outcomes
- Claim to be human
- Give vague, hedging answers when you have data
- Use corporate language ("leverage", "holistic", "synergies")
- Overwhelm with too many options — give 1-2 clear recommendations"""


# ── Models ───────────────────────────────────────────────────────────────────


class CompassMessage(BaseModel):
    message: str = Field(max_length=2000)
    context: Optional[dict] = None  # {gmat, gpa, yoe, school_ids, current_page}


class QuickAdviceRequest(BaseModel):
    question_type: str  # "school_fit" | "essay_feedback" | "profile_assessment" | "deadline_panic" | "general"
    gmat: Optional[int] = None
    gpa: Optional[float] = None
    yoe: Optional[int] = None
    school_id: Optional[str] = None
    essay_snippet: Optional[str] = Field(None, max_length=1000)


# ── Quick Advice (No LLM — rule-based for speed) ────────────────────────────


def _profile_assessment(gmat: int, gpa: float, yoe: int) -> str:
    """Generate a Compass-style profile assessment."""
    strengths = []
    concerns = []

    if gmat >= 740:
        strengths.append(f"Your {gmat} GMAT is strong — top 10% of applicants. This opens doors at M7.")
    elif gmat >= 710:
        strengths.append(f"Your {gmat} GMAT is solid — competitive at most T15 schools.")
    elif gmat >= 680:
        concerns.append(f"A {gmat} GMAT is workable but limits your options at M7. Consider retaking if you can score 720+.")
    else:
        concerns.append(f"A {gmat} GMAT is below average for top programs. Strongly consider retaking, or focus on schools where your score is within range.")

    if gpa >= 3.7:
        strengths.append(f"Your {gpa} GPA is excellent — no red flags here.")
    elif gpa >= 3.4:
        strengths.append(f"Your {gpa} GPA is fine — won't hold you back at most schools.")
    elif gpa >= 3.0:
        concerns.append(f"A {gpa} GPA is on the lower end. Your GMAT and work experience need to compensate. Consider an optional essay explaining any GPA dip.")
    else:
        concerns.append(f"A {gpa} GPA is a concern. You'll need a very strong GMAT, compelling work experience, and potentially an addendum explaining your academic record.")

    if 3 <= yoe <= 6:
        strengths.append(f"{yoe} years of experience is the MBA sweet spot. You're right on time.")
    elif yoe < 3:
        concerns.append(f"With {yoe} years, you're on the younger side. Highlight leadership impact and maturity in your essays.")
    elif yoe <= 9:
        strengths.append(f"{yoe} years gives you rich material for essays. Show clear career progression.")
    else:
        concerns.append(f"At {yoe} years, you're more experienced than the typical MBA candidate. Make a strong case for 'why now' — schools will wonder why you didn't do this earlier.")

    assessment = ""
    if strengths:
        assessment += "**What's working for you:**\n" + "\n".join(f"- {s}" for s in strengths)
    if concerns:
        assessment += "\n\n**What to address:**\n" + "\n".join(f"- {c}" for c in concerns)

    # Overall verdict
    if len(concerns) == 0:
        assessment += "\n\n*Overall: You have a strong profile. Focus on essays and school fit — that's where you'll differentiate.*"
    elif len(strengths) >= len(concerns):
        assessment += "\n\n*Overall: Solid foundation with some areas to address. You're competitive — just need to be strategic about where you apply.*"
    else:
        assessment += "\n\n*Overall: There's work to do, but I've seen people with your profile get in. It comes down to essay quality and school selection. Let's make sure your list is realistic.*"

    return assessment


def _school_fit_advice(school_id: str, gmat: Optional[int], gpa: Optional[float]) -> str:
    """Quick school fit assessment."""
    from agents import SCHOOL_DB

    school = SCHOOL_DB.get(school_id, {})
    if not school:
        return f"I don't have data on '{school_id}'. Check the school directory for the right ID."

    name = school.get("name", school_id)
    school_gmat = school.get("gmat_avg")
    accept_rate = school.get("acceptance_rate")

    advice = f"**{name}**\n\n"

    if gmat and school_gmat:
        diff = gmat - school_gmat
        if diff >= 20:
            advice += f"Your {gmat} GMAT is {diff} points above {name}'s average ({school_gmat}). That's a strong position — you'd be in the top half of their class.\n\n"
        elif diff >= -10:
            advice += f"Your {gmat} GMAT is close to {name}'s average ({school_gmat}). You're competitive, but this is a target school, not a safety.\n\n"
        else:
            advice += f"Your {gmat} GMAT is {abs(diff)} points below {name}'s average ({school_gmat}). This is a reach — your essays and experience need to compensate heavily.\n\n"

    if accept_rate:
        if accept_rate < 15:
            advice += f"With a {accept_rate}% acceptance rate, {name} is highly selective. Even strong candidates get rejected — apply, but don't bet everything on this one."
        elif accept_rate < 30:
            advice += f"{accept_rate}% acceptance rate — selective but achievable with a strong application."
        else:
            advice += f"{accept_rate}% acceptance rate — more accessible than M7, which means your odds are real if your profile fits."

    # Check if we have ML prediction
    try:
        from ml.admit_predictor import predict_admission
        pred = predict_admission(school_id, gmat or 700, gpa or 3.5, 4)
        if pred.get("probability_pct"):
            advice += f"\n\n*Our ML model (trained on {pred['model_stats']['samples']} real decisions) estimates your probability at **{pred['probability_pct']}%**.*"
    except Exception:
        pass

    return advice


def _deadline_panic(school_id: Optional[str]) -> str:
    """Calm them down and give a plan."""
    messages = [
        "Take a breath. Panicking doesn't write essays — focused work does.",
        "I've seen people submit 48 hours before deadline and get into M7. It's about quality, not how early you finish.",
        "Here's what I'd prioritize right now:",
        "",
        "1. **Finish the essay that's closest to done** — momentum matters more than perfection",
        "2. **Send your recommenders a gentle follow-up** — they probably haven't started yet, and that's normal",
        "3. **Skip the optional essay** unless you have a genuine gap to explain",
        "4. **Proofread once, then submit** — over-editing at this stage usually makes essays worse, not better",
        "",
        "*The application you submit is infinitely better than the perfect application you never finish.*",
    ]

    if school_id:
        messages.insert(0, f"You're stressed about your {school_id.replace('_', ' ').title()} application. I get it.\n")

    return "\n".join(messages)


ENCOURAGEMENT = [
    "You're doing the work. That already puts you ahead of most applicants who just think about it.",
    "Every essay draft brings you closer. The first draft is supposed to be bad — that's how writing works.",
    "Remember: the people who get in aren't the smartest. They're the ones who told the most compelling story.",
    "You're investing in yourself. That takes courage. Keep going.",
    "The admissions committee is looking for someone exactly like you. Your job is to show them why.",
]


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.post("/advice")
def get_quick_advice(req: QuickAdviceRequest):
    """Get quick, personality-driven advice from Compass.

    No LLM call — rule-based for instant response.
    Use /api/compass/chat for full conversational AI.
    """
    if req.question_type == "profile_assessment":
        if not req.gmat:
            raise HTTPException(400, "GMAT score required for profile assessment")
        advice = _profile_assessment(req.gmat, req.gpa or 3.5, req.yoe or 4)

    elif req.question_type == "school_fit":
        if not req.school_id:
            raise HTTPException(400, "school_id required for school fit advice")
        advice = _school_fit_advice(req.school_id, req.gmat, req.gpa)

    elif req.question_type == "deadline_panic":
        advice = _deadline_panic(req.school_id)

    elif req.question_type == "essay_feedback" and req.essay_snippet:
        word_count = len(req.essay_snippet.split())
        if word_count < 20:
            advice = "I need more text to give useful feedback. Paste at least a paragraph."
        else:
            advice = (
                f"Quick take on your {word_count}-word snippet:\n\n"
                "For detailed feedback, run your full essay through the Essay Evaluator "
                "— it scores structure, authenticity, school fit, and gives line-by-line suggestions.\n\n"
                f"*[Run Essay Evaluator →](/evaluator)*"
            )

    else:
        advice = random.choice(ENCOURAGEMENT)

    return {
        "advisor": "Compass",
        "advice": advice,
        "follow_up_tools": _suggest_tools(req.question_type),
    }


@router.get("/encouragement")
def get_encouragement():
    """Get a random motivational message from Compass."""
    return {
        "advisor": "Compass",
        "message": random.choice(ENCOURAGEMENT),
    }


@router.get("/system-prompt")
def get_system_prompt():
    """Get Compass's system prompt for LLM integration.

    Use this with Claude API to create a full conversational experience.
    Pass this as the system message when calling the LLM.
    """
    return {
        "system_prompt": COMPASS_SYSTEM_PROMPT,
        "model_recommendation": "claude-haiku-4-5-20251001",
        "notes": "Use Haiku for speed. Inject user profile data into the first user message for context.",
    }


def _suggest_tools(question_type: str) -> list[dict]:
    """Suggest relevant tools based on the question type."""
    tools = {
        "profile_assessment": [
            {"label": "Run Odds Calculator", "href": "/simulator"},
            {"label": "Get List Health Check", "href": "/list-check"},
        ],
        "school_fit": [
            {"label": "Compare Schools", "href": "/compare"},
            {"label": "Check Scholarship Odds", "href": "/finances?tab=scholarship-intel"},
        ],
        "essay_feedback": [
            {"label": "Essay Evaluator", "href": "/evaluator"},
            {"label": "Read Real Essays", "href": "/essays/examples"},
        ],
        "deadline_panic": [
            {"label": "Sprint Planner", "href": "/sprint-plan"},
            {"label": "Deadline Calendar", "href": "/calendar"},
        ],
        "general": [
            {"label": "Start Accelerator", "href": "/accelerator"},
            {"label": "Browse Schools", "href": "/schools"},
        ],
    }
    return tools.get(question_type, tools["general"])
