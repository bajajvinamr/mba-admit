"""AI Profile Strategist — $10K-consultant-in-a-box.

Premium flagship feature: comprehensive MBA application strategy
generated via Claude API with streaming support.
"""

import json
import logging
import os
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from middleware import rate_limit

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/strategy", tags=["strategy-ai"])

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")


# ── Request / Response Models ────────────────────────────────────────────────


class StrategyInput(BaseModel):
    gmat: Optional[int] = Field(None, ge=200, le=805)
    gmat_type: Optional[str] = Field("focus", pattern=r"^(focus|classic)$")
    gpa: Optional[float] = Field(None, ge=0.0, le=4.0)
    undergrad_major: str = ""
    undergrad_school: str = ""
    years_experience: int = Field(0, ge=0, le=40)
    current_role: str = ""
    current_company_type: str = ""
    industry: str = ""
    target_industry: str = ""
    target_role: str = ""
    short_term_goal: str = ""
    long_term_goal: str = ""
    extracurriculars: list[str] = Field(default_factory=list)
    leadership_examples: str = ""
    international: bool = False
    urm: bool = False
    military: bool = False
    citizenship: str = ""
    target_schools: list[str] = Field(default_factory=list)
    weaknesses: str = ""
    why_mba: str = ""
    why_now: str = ""


class FollowUpInput(BaseModel):
    context: dict = Field(default_factory=dict)
    question: str = Field(..., min_length=1, max_length=2000)


# ── System Prompt Builder ────────────────────────────────────────────────────


def _build_system_prompt(school_data: dict[str, dict]) -> str:
    return """You are an elite MBA admissions strategist with 20+ years of experience,
combining the insight of former HBS/GSB/Wharton admissions committee members. You have
reviewed 50,000+ applications and coached 2,000+ admitted candidates.

Your evaluation framework:
1. ACADEMICS (20%): GMAT/GRE percentile vs. class median, GPA in context of major/school rigor, quantitative readiness
2. PROFESSIONAL (30%): Career progression velocity, leadership scope, impact quantification, brand recognition
3. PERSONAL (20%): Authenticity of story, diversity of experience, resilience/grit, cultural fit
4. CONTRIBUTION (15%): What you bring to classmates, clubs, learning teams, alumni network
5. GOALS ALIGNMENT (15%): Specificity, feasibility, why-MBA necessity, school-program fit

Applicant archetypes (detect and name):
- Overrepresented: MBB consultant, Big 4, IB analyst — need differentiation strategy
- Tech PM: Strong but common — emphasize unique impact angle
- Career Switcher: Compelling narrative needed — bridge current to future
- Entrepreneur: Show scalability of thinking, not just hustle
- International: Cultural bridge narrative, not just "global perspective"
- Military/Government: Translate impact to business language
- Unique Background: Lean into distinctiveness, connect to business

School-specific data available:
""" + json.dumps(
        {
            slug: {
                "name": s.get("name", slug),
                "values": s.get("specializations", [])[:5],
                "class_size": s.get("class_size"),
                "avg_gmat": s.get("avg_gmat"),
                "median_gpa": s.get("median_gpa"),
            }
            for slug, s in school_data.items()
        },
        indent=2,
    )[:4000]  # Truncate to stay within context limits


def _build_user_prompt(inp: StrategyInput) -> str:
    return f"""Analyze this MBA applicant and generate a comprehensive strategy document.

APPLICANT PROFILE:
- GMAT: {inp.gmat or 'Not taken'} ({inp.gmat_type})
- GPA: {inp.gpa or 'Not provided'} | Major: {inp.undergrad_major} | School: {inp.undergrad_school}
- Experience: {inp.years_experience} years | Role: {inp.current_role} | Company Type: {inp.current_company_type}
- Industry: {inp.industry} | Target Industry: {inp.target_industry} | Target Role: {inp.target_role}
- Short-term Goal: {inp.short_term_goal}
- Long-term Goal: {inp.long_term_goal}
- Extracurriculars: {', '.join(inp.extracurriculars) if inp.extracurriculars else 'None listed'}
- Leadership: {inp.leadership_examples}
- International: {inp.international} | URM: {inp.urm} | Military: {inp.military}
- Citizenship: {inp.citizenship}
- Target Schools: {', '.join(inp.target_schools) if inp.target_schools else 'Need recommendations'}
- Weaknesses: {inp.weaknesses}
- Why MBA: {inp.why_mba}
- Why Now: {inp.why_now}

Generate a structured strategy in this exact JSON format:
{{
  "profile_assessment": {{
    "archetype": "string — applicant archetype name",
    "archetype_description": "string — what this means for their application",
    "strengths": ["list of 3-5 key strengths with specifics"],
    "weaknesses": ["list of 2-4 weaknesses with honest assessment"],
    "adcom_perception": "string — how admissions committees will likely view this profile",
    "differentiation_angle": "string — the unique story only this applicant can tell",
    "overall_competitiveness": "strong | competitive | developing | needs_work"
  }},
  "school_list": {{
    "reach": [
      {{"school": "name", "slug": "slug", "reasoning": "why reach + specific fit", "probability": "10-25%"}}
    ],
    "target": [
      {{"school": "name", "slug": "slug", "reasoning": "why target + specific fit", "probability": "25-50%"}}
    ],
    "safety": [
      {{"school": "name", "slug": "slug", "reasoning": "why safety + why still excellent", "probability": "50-75%"}}
    ],
    "avoid": [
      {{"school": "name", "reasoning": "why this school is a poor fit despite prestige"}}
    ]
  }},
  "round_strategy": [
    {{
      "school": "name",
      "recommended_round": "R1 | R2 | R3",
      "reasoning": "specific reasoning for this school and this applicant",
      "deadline": "approximate date if known"
    }}
  ],
  "narrative_arc": {{
    "through_line": "string — the connecting thread from past to future",
    "origin_story": "string — where the MBA motivation began",
    "why_mba_refined": "string — polished why MBA narrative",
    "why_now_refined": "string — compelling timing argument",
    "goals_narrative": "string — how short and long term goals connect"
  }},
  "weakness_mitigation": [
    {{
      "weakness": "name of weakness",
      "severity": "high | medium | low",
      "strategy": "specific action to address this",
      "timeline": "when to address it"
    }}
  ],
  "timeline": [
    {{
      "week_range": "Weeks 1-2",
      "focus": "main focus area",
      "actions": ["specific action items"],
      "milestone": "what done looks like"
    }}
  ]
}}

Be brutally honest, specific, and actionable. No generic advice. Every recommendation must reference THIS applicant's specific situation."""


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.post("/generate")
@rate_limit("5/minute")
async def generate_strategy(request: Request, inp: StrategyInput):
    """Generate comprehensive MBA strategy via Claude API (streaming)."""
    from agents import SCHOOL_DB
    from observability import track_ai_interaction
    from usage import check_limit, increment_usage
    from middleware import _get_user_id

    user_id = _get_user_id(request)

    # Premium gate
    allowed, current, limit = check_limit(user_id, "strategy_ai")
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "usage_limit",
                "feature": "strategy_ai",
                "used": current,
                "limit": limit,
                "upgrade_url": "/pricing",
            },
        )

    if not ANTHROPIC_API_KEY:
        raise HTTPException(503, detail="AI service not configured")

    # Load school data for target schools
    target_data: dict[str, dict] = {}
    for slug in inp.target_schools:
        if slug in SCHOOL_DB:
            target_data[slug] = SCHOOL_DB[slug]
    # Also include top schools if no targets specified
    if not target_data:
        for slug in ["hbs", "gsb", "wharton", "chicago_booth", "kellogg", "mit_sloan", "columbia_business_school"]:
            if slug in SCHOOL_DB:
                target_data[slug] = SCHOOL_DB[slug]

    system_prompt = _build_system_prompt(target_data)
    user_prompt = _build_user_prompt(inp)

    import anthropic

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    async def stream_response():
        try:
            with client.messages.stream(
                model="claude-sonnet-4-20250514",
                max_tokens=8000,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            ) as stream:
                full_text = ""
                for text in stream.text_stream:
                    full_text += text
                    yield f"data: {json.dumps({'type': 'chunk', 'text': text})}\n\n"

                # Try to parse the complete response as JSON
                try:
                    # Extract JSON from potential markdown code blocks
                    json_text = full_text.strip()
                    if "```json" in json_text:
                        json_text = json_text.split("```json")[1].split("```")[0].strip()
                    elif "```" in json_text:
                        json_text = json_text.split("```")[1].split("```")[0].strip()

                    parsed = json.loads(json_text)
                    yield f"data: {json.dumps({'type': 'complete', 'strategy': parsed})}\n\n"
                except (json.JSONDecodeError, IndexError):
                    yield f"data: {json.dumps({'type': 'complete_raw', 'text': full_text})}\n\n"

                increment_usage(user_id, "strategy_ai")

        except anthropic.APIError as e:
            logger.error("Anthropic API error in strategy generation: %s", str(e))
            yield f"data: {json.dumps({'type': 'error', 'message': 'AI service temporarily unavailable'})}\n\n"

    with track_ai_interaction(
        user_input=f"strategy_ai:generate:{','.join(inp.target_schools)}",
        endpoint="strategy_ai_generate",
    ) as tracker:
        tracker["output"] = "streaming_strategy"
        return StreamingResponse(
            stream_response(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )


# ── Waitlist LOCI Coach ──────────────────────────────────────────────────────

class LociCoachRequest(BaseModel):
    school_slug: str = Field(max_length=100)
    whats_changed: str = Field(default="", max_length=3000)
    new_achievements: str = Field(default="", max_length=3000)
    school_interactions: str = Field(default="", max_length=2000)
    draft: Optional[str] = Field(default=None, max_length=5000)
    mode: str = Field(default="coach", pattern=r"^(coach|review)$")


@router.post("/waitlist/loci-coach")
@rate_limit("10/minute")
async def loci_coach(request: Request, req: LociCoachRequest):
    """AI LOCI (Letter of Continued Interest) coach — guides structure, does NOT ghostwrite."""
    from agents import SCHOOL_DB
    from observability import track_ai_interaction
    from guardrails import sanitize_for_llm, MAX_STRATEGY_CHARS

    try:
        if req.whats_changed:
            sanitize_for_llm(req.whats_changed, MAX_STRATEGY_CHARS, "whats_changed")
        if req.new_achievements:
            sanitize_for_llm(req.new_achievements, MAX_STRATEGY_CHARS, "new_achievements")
        if req.draft:
            sanitize_for_llm(req.draft, MAX_STRATEGY_CHARS, "draft")
    except ValueError as e:
        raise HTTPException(400, detail=str(e))

    school = SCHOOL_DB.get(req.school_slug, {})
    school_name = school.get("name", req.school_slug)

    if req.mode == "review" and req.draft:
        # Review mode: provide feedback on a user's draft
        system_prompt = f"""You are a LOCI (Letter of Continued Interest) review specialist for MBA waitlists.
The applicant is waitlisted at {school_name} and has written a draft LOCI.

Review their draft and return a JSON object with:
- "strengths": array of strings (what works well)
- "improvements": array of {{"issue": string, "suggestion": string}} (specific, actionable feedback)
- "word_count": int (count of words in the draft)
- "tone_assessment": string (is the tone right? not begging, not entitled)
- "overall_grade": "A"|"B"|"C"|"D" (how ready is this to send)
- "rewrite_suggestions": array of strings (specific sentences to rephrase)

Target: under 500 words, professional but warm, shows genuine new information.
DO NOT return any text outside the JSON object. No markdown fences."""

        human_msg = f"Draft LOCI for {school_name}:\n\n{req.draft}"

    else:
        # Coach mode: suggest structure and tips
        system_prompt = f"""You are a LOCI (Letter of Continued Interest) coach for MBA waitlists.
The applicant is waitlisted at {school_name}.

Your job is to COACH them on writing their LOCI, NOT to write it for them.
Ask clarifying questions if information is sparse. Suggest structure.

Based on what they've shared:
- What's changed since applying: {req.whats_changed or 'Not provided yet'}
- New achievements: {req.new_achievements or 'Not provided yet'}
- School interactions (visits, events, conversations): {req.school_interactions or 'None'}

Return a JSON object with:
- "structure": array of strings (recommended LOCI paragraph structure, 4-5 sections)
- "tips": array of strings (5-7 specific, actionable tips for this school)
- "clarifying_questions": array of strings (2-3 questions to help them write a stronger letter)
- "word_target": int (recommended word count, typically 300-500)
- "tone_guidance": string (how the tone should feel for this specific school)
- "avoid": array of strings (3-4 things to definitely NOT include)

Tailor everything to {school_name}'s culture and values.
DO NOT return any text outside the JSON object. No markdown fences."""

        human_msg = (
            f"I'm waitlisted at {school_name}. "
            f"What's changed: {req.whats_changed or 'Need to think about this'}. "
            f"New achievements: {req.new_achievements or 'Need to think about this'}. "
            f"School interactions: {req.school_interactions or 'None yet'}."
        )

    if not ANTHROPIC_API_KEY:
        raise HTTPException(503, detail="AI service not configured")

    import anthropic
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    with track_ai_interaction(
        user_input=f"loci_coach:{req.school_slug}:{req.mode}",
        endpoint="waitlist_loci_coach",
    ) as tracker:
        try:
            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                system=system_prompt,
                messages=[{"role": "user", "content": human_msg}],
            )
            content = message.content[0].text
            # Parse JSON
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].strip()
            result = json.loads(content)
            tracker["output"] = f"loci_{req.mode}_generated"
            return result
        except Exception as e:
            logger.error("LOCI coach failed: %s", e)
            tracker["output"] = f"error:{e}"
            if req.mode == "review":
                return {
                    "strengths": ["You've taken the important first step of writing a draft"],
                    "improvements": [{"issue": "Analysis unavailable", "suggestion": "Try again shortly for detailed feedback"}],
                    "word_count": len((req.draft or "").split()),
                    "tone_assessment": "Unable to assess — please retry",
                    "overall_grade": "B",
                    "rewrite_suggestions": [],
                }
            return {
                "structure": [
                    "Opening: Reaffirm genuine interest in the program",
                    "What's changed: New professional achievements or promotions",
                    "Personal growth: New extracurriculars, community involvement",
                    "School engagement: Campus visits, events attended, conversations with students/alumni",
                    "Closing: Reiterate fit and enthusiasm without desperation",
                ],
                "tips": [
                    "Keep it under 500 words",
                    f"Reference specific {school_name} programs or initiatives",
                    "Lead with your strongest new update",
                    "Show, don't tell — use specific examples",
                    "End with a forward-looking statement about your contribution",
                ],
                "clarifying_questions": [
                    "What is the single most impressive thing you've accomplished since applying?",
                    f"Have you visited {school_name}'s campus or attended any events?",
                    "Is there anything about your application you wish you could redo?",
                ],
                "word_target": 400,
                "tone_guidance": "Professional, warm, and confident. Not desperate or begging.",
                "avoid": [
                    "Don't repeat information from your original application",
                    "Don't make excuses for perceived weaknesses",
                    "Don't mention other schools' decisions",
                    "Don't contact admissions excessively",
                ],
            }


@router.post("/follow-up")
@rate_limit("10/minute")
async def strategy_follow_up(request: Request, inp: FollowUpInput):
    """Ask a follow-up question about a generated strategy."""
    from usage import check_limit, increment_usage
    from middleware import _get_user_id

    user_id = _get_user_id(request)

    allowed, current, limit = check_limit(user_id, "strategy_ai")
    if not allowed:
        raise HTTPException(429, detail={"error": "usage_limit", "feature": "strategy_ai"})

    if not ANTHROPIC_API_KEY:
        raise HTTPException(503, detail="AI service not configured")

    import anthropic

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    context_summary = json.dumps(inp.context, indent=2)[:3000] if inp.context else "No prior context"

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        system="You are an elite MBA admissions strategist. Answer follow-up questions about the applicant's strategy. Be specific, actionable, and reference their profile details.",
        messages=[
            {
                "role": "user",
                "content": f"Here is the applicant's strategy context:\n{context_summary}\n\nFollow-up question: {inp.question}",
            }
        ],
    )

    increment_usage(user_id, "strategy_ai")

    return {
        "answer": message.content[0].text,
        "model": message.model,
    }
