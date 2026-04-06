"""Narrative Arc Builder — premium consultant-replacement feature.

Synthesizes 10 introspective answers into a cohesive MBA application narrative
with per-school adaptations. Also checks essay consistency against the arc.
"""

import json
import logging

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional
from middleware import rate_limit
from agents import SCHOOL_DB, get_llm
from guardrails import sanitize_for_llm, MAX_ESSAY_CHARS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["narrative"])


# ── Models ──────────────────────────────────────────────────────────────────

class NarrativeAnswers(BaseModel):
    q1: str = Field(description="Professional achievement you're most proud of")
    q2: str = Field(description="A failure that changed how you think")
    q3: str = Field(description="One problem in the world you'd solve")
    q4: str = Field(description="What your best friend would say is your biggest flaw")
    q5: str = Field(description="Why you need an MBA specifically")
    q6: str = Field(description="Where you see yourself in 10 years")
    q7: str = Field(description="What about your background most people misunderstand")
    q8: str = Field(description="Who influenced you the most and why")
    q9: str = Field(description="Communities you belong to and your role")
    q10: str = Field(description="What you'd bring to a classroom that nobody else would")


class NarrativeGenerateRequest(BaseModel):
    answers: NarrativeAnswers
    target_schools: list[str] = Field(min_length=1, max_length=10)


class EssayInput(BaseModel):
    school: str
    content: str


class NarrativeCheckRequest(BaseModel):
    narrative_arc: dict
    essays: list[EssayInput]


# ── Narrative Generation ────────────────────────────────────────────────────

NARRATIVE_SYSTEM_PROMPT = """You are the world's top MBA admissions strategist — someone who has placed 500+ candidates at M7 schools. You think in narrative arcs, not bullet points.

Given 10 deeply personal answers from an MBA candidate, synthesize a cohesive narrative arc that ties everything together into one compelling story.

The 10 questions they answered:
1. Professional achievement they're most proud of
2. A failure that changed how they think
3. One problem they'd solve in the world
4. What their best friend says is their biggest flaw
5. Why they need an MBA specifically
6. Where they see themselves in 10 years
7. What about their background most people misunderstand
8. Who influenced them the most and why
9. Communities they belong to and their role
10. What they'd bring to a classroom that nobody else would

Your output MUST be valid JSON with this exact structure:
{
  "core_identity": "You are a [archetype] who [unique positioning statement]",
  "why_mba": "A 2-3 sentence explanation connecting the MBA to a clear gap in their story",
  "why_now": "A 2-3 sentence explanation tied to a career inflection point",
  "short_term_goal": "Specific, credible short-term post-MBA goal",
  "long_term_goal": "Ambitious but grounded long-term vision",
  "the_thread": "ONE theme that connects everything — the golden thread of their narrative",
  "key_stories": ["3-5 specific stories/anecdotes from their answers that are most powerful"],
  "blind_spots": ["2-3 areas where their narrative has gaps or potential weaknesses"],
  "school_adaptations": {
    "<school_slug>": {
      "school_name": "<full school name>",
      "angle": "How to position this narrative specifically for this school",
      "emphasize": ["2-3 elements to highlight for this school"],
      "connect_to": "Specific program, professor, club, or initiative at this school"
    }
  }
}

Be brutally specific. No generic advice. Every word should feel tailored to THIS person."""


@router.post("/narrative/generate")
@rate_limit("5/minute")
def generate_narrative(request: Request, req: NarrativeGenerateRequest):
    """Synthesize 10 introspective answers into a cohesive MBA narrative arc."""
    from langchain_core.messages import HumanMessage, SystemMessage
    from observability import track_ai_interaction

    # Sanitize all answers
    sanitized_answers = {}
    for i in range(1, 11):
        key = f"q{i}"
        raw = getattr(req.answers, key)
        try:
            sanitized_answers[key] = sanitize_for_llm(raw, MAX_ESSAY_CHARS, f"question {i}")
        except ValueError as e:
            raise HTTPException(400, detail=f"Question {i}: {str(e)}")

    # Build school context
    school_context_parts = []
    for slug in req.target_schools:
        school = SCHOOL_DB.get(slug, {})
        name = school.get("name", slug)
        school_context_parts.append(f"- {slug}: {name}")

    user_message = f"""Here are the candidate's answers:

1. Professional achievement: {sanitized_answers['q1']}
2. Failure that changed thinking: {sanitized_answers['q2']}
3. One problem to solve: {sanitized_answers['q3']}
4. Best friend's view of biggest flaw: {sanitized_answers['q4']}
5. Why MBA specifically: {sanitized_answers['q5']}
6. 10-year vision: {sanitized_answers['q6']}
7. What people misunderstand: {sanitized_answers['q7']}
8. Most influential person: {sanitized_answers['q8']}
9. Communities and role: {sanitized_answers['q9']}
10. Unique classroom contribution: {sanitized_answers['q10']}

Target schools:
{chr(10).join(school_context_parts)}

Generate the narrative arc with school-specific adaptations for each target school listed above."""

    with track_ai_interaction(
        user_input="narrative:generate",
        endpoint="narrative/generate",
    ) as tracker:
        try:
            llm = get_llm()
            response = llm.invoke([
                SystemMessage(content=NARRATIVE_SYSTEM_PROMPT),
                HumanMessage(content=user_message),
            ])
            content = response.content

            # Strip markdown code fences if present
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].strip()

            result = json.loads(content)
            tracker["output"] = result.get("core_identity", "")
            return result

        except json.JSONDecodeError as e:
            logger.error("Narrative generate JSON parse failed: %s", e)
            raise HTTPException(502, detail="AI returned invalid format. Please try again.")
        except Exception as e:
            logger.error("Narrative generate failed: %s", e)
            raise HTTPException(502, detail="Narrative generation temporarily unavailable.")


# ── Consistency Check ───────────────────────────────────────────────────────

CONSISTENCY_SYSTEM_PROMPT = """You are an expert MBA admissions consultant reviewing an applicant's essays against their master narrative arc.

Analyze each essay for:
1. Alignment: Does this essay reinforce or contradict the core narrative?
2. Voice consistency: Does the writing voice match across essays?
3. Story repetition: Are the same anecdotes overused?
4. Gap coverage: Are narrative blind spots addressed or ignored?
5. School fit: Does each essay connect to the specific school's culture?

Output valid JSON:
{
  "overall_consistency_score": 0-100,
  "overall_summary": "2-3 sentence assessment",
  "essays": [
    {
      "school": "<school slug>",
      "alignment_score": 0-100,
      "issues": ["specific issue 1", "specific issue 2"],
      "strengths": ["what this essay does well relative to the arc"],
      "suggestions": ["concrete, actionable suggestion"]
    }
  ],
  "cross_essay_issues": ["issues that span multiple essays"],
  "missing_elements": ["elements from the narrative arc that no essay addresses"]
}"""


@router.post("/narrative/check-consistency")
@rate_limit("5/minute")
def check_consistency(request: Request, req: NarrativeCheckRequest):
    """Check how well essays align with the master narrative arc."""
    from langchain_core.messages import HumanMessage, SystemMessage
    from observability import track_ai_interaction

    if not req.essays:
        raise HTTPException(400, detail="At least one essay is required")

    # Build user message
    arc_summary = json.dumps(req.narrative_arc, indent=2)

    essay_parts = []
    for i, essay in enumerate(req.essays):
        try:
            content = sanitize_for_llm(essay.content, MAX_ESSAY_CHARS, f"essay {i+1}")
        except ValueError as e:
            raise HTTPException(400, detail=f"Essay {i+1}: {str(e)}")
        school_name = SCHOOL_DB.get(essay.school, {}).get("name", essay.school)
        essay_parts.append(f"### Essay for {school_name} ({essay.school})\n{content}")

    user_message = f"""Narrative Arc:
{arc_summary}

Essays to check:
{chr(10).join(essay_parts)}"""

    with track_ai_interaction(
        user_input="narrative:consistency",
        endpoint="narrative/check-consistency",
    ) as tracker:
        try:
            llm = get_llm()
            response = llm.invoke([
                SystemMessage(content=CONSISTENCY_SYSTEM_PROMPT),
                HumanMessage(content=user_message),
            ])
            content = response.content

            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].strip()

            result = json.loads(content)
            tracker["output"] = str(result.get("overall_consistency_score", ""))
            return result

        except json.JSONDecodeError:
            logger.error("Consistency check JSON parse failed")
            raise HTTPException(502, detail="AI returned invalid format. Please try again.")
        except Exception as e:
            logger.error("Consistency check failed: %s", e)
            raise HTTPException(502, detail="Consistency check temporarily unavailable.")
