"""Profile Review endpoints — honest assessment + ding analysis."""

import json
import logging
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from middleware import rate_limit
from agents import SCHOOL_DB, get_llm
from guardrails import sanitize_for_llm, MAX_STRATEGY_CHARS, MAX_FIELD_CHARS
from langchain_core.messages import SystemMessage, HumanMessage

router = APIRouter(prefix="/api", tags=["profile-review"])
logger = logging.getLogger(__name__)


# ── Models ───────────────────────────────────────────────────────────────────

class HonestReviewRequest(BaseModel):
    gmat: Optional[int] = Field(default=None, ge=200, le=800)
    gpa: float = Field(ge=0, le=10.0)
    gpa_scale: Optional[str] = Field(default="4.0")
    industry: str = Field(max_length=200)
    years_experience: int = Field(ge=0, le=30)
    undergrad_tier: str = Field(default="", max_length=200)
    undergrad_major: str = Field(default="", max_length=200)
    leadership_roles: str = Field(default="", max_length=2000)
    intl_experience: bool = False
    community_service: bool = False
    career_goal: str = Field(default="", max_length=2000)
    nationality: str = Field(default="", max_length=100)
    gender: str = Field(default="", max_length=50)
    work_company_type: str = Field(default="", max_length=200)
    extracurriculars: str = Field(default="", max_length=2000)


class DingAnalysisRequest(BaseModel):
    school_slug: str = Field(max_length=100)
    round: str = Field(max_length=20)
    profile: HonestReviewRequest
    essay_summary: Optional[str] = Field(default=None, max_length=5000)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _parse_json_response(content: str) -> dict:
    """Parse JSON from LLM response, handling markdown code fences."""
    if "```json" in content:
        content = content.split("```json")[1].split("```")[0].strip()
    elif "```" in content:
        content = content.split("```")[1].strip()
    return json.loads(content)


def _profile_to_text(p: HonestReviewRequest) -> str:
    """Convert profile to a text summary for the LLM."""
    parts = [
        f"GMAT: {p.gmat or 'Not provided'}",
        f"GPA: {p.gpa}/{p.gpa_scale}",
        f"Industry: {p.industry}",
        f"Years of experience: {p.years_experience}",
    ]
    if p.undergrad_tier:
        parts.append(f"Undergrad tier: {p.undergrad_tier}")
    if p.undergrad_major:
        parts.append(f"Major: {p.undergrad_major}")
    if p.leadership_roles:
        parts.append(f"Leadership: {p.leadership_roles}")
    if p.intl_experience:
        parts.append("Has international experience")
    if p.community_service:
        parts.append("Has community service")
    if p.career_goal:
        parts.append(f"Career goal: {p.career_goal}")
    if p.nationality:
        parts.append(f"Nationality: {p.nationality}")
    if p.gender:
        parts.append(f"Gender: {p.gender}")
    if p.work_company_type:
        parts.append(f"Company type: {p.work_company_type}")
    if p.extracurriculars:
        parts.append(f"Extracurriculars: {p.extracurriculars}")
    return "\n".join(parts)


# ── Honest Profile Review ────────────────────────────────────────────────────

@router.post("/profile/honest-review")
@rate_limit("10/minute")
def honest_profile_review(request: Request, req: HonestReviewRequest):
    """Brutally honest MBA profile assessment with realistic odds."""
    from observability import track_ai_interaction

    try:
        if req.career_goal:
            sanitize_for_llm(req.career_goal, MAX_STRATEGY_CHARS, "career goal")
        if req.leadership_roles:
            sanitize_for_llm(req.leadership_roles, MAX_STRATEGY_CHARS, "leadership roles")
        if req.extracurriculars:
            sanitize_for_llm(req.extracurriculars, MAX_STRATEGY_CHARS, "extracurriculars")
    except ValueError as e:
        raise HTTPException(400, detail=str(e))

    profile_text = _profile_to_text(req)
    llm = get_llm()

    system_prompt = """You are a brutally honest MBA admissions consultant. Do not sugarcoat. The user is paying for honest assessment, not validation. Use specific numbers and data to justify every claim. If their GMAT is below median, say so directly. If they're in an overrepresented bucket, say so. If their goals are vague, call it out.

Analyze the applicant profile and return a JSON object with EXACTLY these fields:
- "honest_assessment": string (2-3 paragraphs of direct, no-BS feedback)
- "strengths": array of {"area": string, "detail": string}
- "weaknesses": array of {"area": string, "detail": string, "severity": "critical"|"moderate"|"minor"}
- "realistic_odds": {"m7": string like "15-25%", "t15": string like "40-55%", "t25": string like "60-75%"}
- "game_changers": array of strings (prioritized actions, biggest levers first)
- "archetype": string (e.g. "Overrepresented Indian Male in Tech", "Military Officer with Leadership Edge")
- "overrepresented": boolean
- "bottom_line": string (one sentence verdict)

Key data points to reference:
- M7 median GMAT: ~730, T15: ~710, T25: ~700
- Overrepresented: Indian male IT/consulting, Chinese finance, US finance/consulting
- Average work experience: 5 years for most T15 programs
- GPA context varies by scale — 3.5/4.0 is solid, 8.0/10.0 from India is good

DO NOT return any text outside the JSON object. No markdown fences."""

    with track_ai_interaction(
        user_input=f"honest_review:gmat={req.gmat}",
        endpoint="profile_honest_review",
    ) as tracker:
        try:
            response = llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=f"Applicant Profile:\n{profile_text}"),
            ])
            result = _parse_json_response(response.content)
            tracker["output"] = "review_generated"
            return result
        except Exception as e:
            logger.error("Honest review failed: %s", e)
            tracker["output"] = f"error:{e}"
            # Return a structured fallback
            return {
                "honest_assessment": (
                    f"Based on your GMAT of {req.gmat or 'N/A'} and {req.years_experience} years in {req.industry}, "
                    "you have a mixed profile. Without a full AI analysis, here's the baseline: "
                    "your stats need to be contextualized against your target schools' medians."
                ),
                "strengths": [{"area": "Work Experience", "detail": f"{req.years_experience} years in {req.industry}"}],
                "weaknesses": [{"area": "Analysis Unavailable", "detail": "Full AI assessment temporarily unavailable. Try again shortly.", "severity": "minor"}],
                "realistic_odds": {"m7": "10-30%", "t15": "25-50%", "t25": "40-65%"},
                "game_changers": ["Retake GMAT if below 720", "Strengthen leadership narrative", "Add community service"],
                "archetype": "Profile pending detailed analysis",
                "overrepresented": False,
                "bottom_line": "Submit your profile again for a complete honest assessment.",
            }


# ── Ding Analysis ────────────────────────────────────────────────────────────

@router.post("/profile/ding-analysis")
@rate_limit("10/minute")
def ding_analysis(request: Request, req: DingAnalysisRequest):
    """Analyze why a profile was likely rejected from a specific school."""
    from observability import track_ai_interaction

    school = SCHOOL_DB.get(req.school_slug, {})
    school_name = school.get("name", req.school_slug)

    try:
        if req.essay_summary:
            sanitize_for_llm(req.essay_summary, MAX_STRATEGY_CHARS, "essay summary")
    except ValueError as e:
        raise HTTPException(400, detail=str(e))

    profile_text = _profile_to_text(req.profile)
    llm = get_llm()

    # Build school context
    school_context = f"School: {school_name}\n"
    if school.get("gmat_avg"):
        school_context += f"Median GMAT: {school['gmat_avg']}\n"
    if school.get("acceptance_rate"):
        school_context += f"Acceptance rate: {school['acceptance_rate']}%\n"
    if school.get("class_size"):
        school_context += f"Class size: {school['class_size']}\n"
    if school.get("specializations"):
        school_context += f"Known for: {', '.join(school['specializations'][:5])}\n"

    system_prompt = f"""You are an MBA admissions debrief specialist. Analyze why this applicant was likely rejected from {school_name} in {req.round}.

{school_context}

Provide a realistic post-mortem. Consider:
1. Stats vs. school medians
2. Overrepresentation in applicant pool
3. Essay quality signals (if summary provided)
4. Career goal clarity and school fit
5. Profile differentiation
6. Round-specific dynamics ({req.round} competitiveness)

Return a JSON object with EXACTLY these fields:
- "likely_reasons": array of {{"reason": string, "probability": "high"|"medium"|"low", "detail": string}} (3-5 reasons, ranked by likelihood)
- "if_reapplying": array of {{"action": string, "priority": int (1=highest), "detail": string}} (3-5 concrete actions)
- "alternative_schools": array of {{"slug": string, "name": string, "why": string}} (3-4 schools that might be better fits)
- "reapplication_timing": string (when to reapply and whether it's worth it)

DO NOT return any text outside the JSON object. No markdown fences."""

    essay_context = f"\nEssay Summary: {req.essay_summary}" if req.essay_summary else ""

    with track_ai_interaction(
        user_input=f"ding_analysis:{req.school_slug}:{req.round}",
        endpoint="profile_ding_analysis",
    ) as tracker:
        try:
            response = llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=f"Applicant Profile:\n{profile_text}{essay_context}"),
            ])
            result = _parse_json_response(response.content)
            tracker["output"] = "ding_analysis_generated"
            return result
        except Exception as e:
            logger.error("Ding analysis failed: %s", e)
            tracker["output"] = f"error:{e}"
            return {
                "likely_reasons": [
                    {"reason": "Stats below median", "probability": "medium", "detail": f"Check your GMAT/GPA against {school_name}'s published medians."},
                    {"reason": "Overrepresented profile", "probability": "medium", "detail": "Your background may be common in the applicant pool."},
                    {"reason": "Fit concerns", "probability": "medium", "detail": "Your stated goals may not align with the school's strengths."},
                ],
                "if_reapplying": [
                    {"action": "Improve test scores", "priority": 1, "detail": "A higher GMAT is the single biggest lever."},
                    {"action": "Strengthen extracurriculars", "priority": 2, "detail": "Show leadership and community impact outside work."},
                    {"action": "Rewrite essays with clearer goals", "priority": 3, "detail": "Make your why-MBA and why-this-school narrative airtight."},
                ],
                "alternative_schools": [
                    {"slug": "ross", "name": "Michigan Ross", "why": "Strong action-based learning with slightly lower stats bar."},
                    {"slug": "fuqua", "name": "Duke Fuqua", "why": "Values team culture and collaborative leadership."},
                    {"slug": "darden", "name": "UVA Darden", "why": "Case method school with strong general management focus."},
                ],
                "reapplication_timing": "Wait at least one full cycle. Reapply in Round 1 next year with meaningful profile updates.",
            }
