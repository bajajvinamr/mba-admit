"""Essay-related endpoints — roast, evaluate, word count, prompts, theme analysis, AI coach."""

import json
import re as _re

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from middleware import rate_limit
from agents import (
    SCHOOL_DB,
    CLAUDE_MODEL,
    evaluate_essay_draft,
    roast_resume_bullet,
)
from models import (
    ResumeRoastRequest,
    EssayEvaluationRequest,
    EssayWordCountRequest,
    ThemeAnalysisRequest,
    EssayCoachRequest,
)
from guardrails import sanitize_for_llm, MAX_BULLET_CHARS, MAX_ESSAY_CHARS, MAX_FIELD_CHARS
from logging_config import setup_logging

logger = setup_logging()

router = APIRouter(prefix="/api", tags=["essays"])


# ── Resume Roaster ─────────────────────────────────────────────────────────────

@router.post("/roast_resume")
@rate_limit("10/minute")
def roast_resume(request: Request, req: ResumeRoastRequest):
    """Brutal AI roast of a resume bullet + MBA-level rewrite — powered by Claude."""
    try:
        bullet = sanitize_for_llm(req.bullet, MAX_BULLET_CHARS, "resume bullet")
    except ValueError as e:
        raise HTTPException(400, detail=str(e))
    return roast_resume_bullet(bullet)


# ── Essay Evaluator ────────────────────────────────────────────────────────────

@router.post("/evaluate_essay")
@rate_limit("10/minute")
def evaluate_essay(request: Request, req: EssayEvaluationRequest):
    """Rigorous AI Essay B.S. Detector."""
    from observability import track_ai_interaction

    try:
        essay_text = sanitize_for_llm(req.essay_text, MAX_ESSAY_CHARS, "essay")
        prompt = sanitize_for_llm(req.prompt, MAX_FIELD_CHARS, "prompt")
    except ValueError as e:
        raise HTTPException(400, detail=str(e))

    with track_ai_interaction(
        user_input=f"essay:{req.school_id}:{prompt[:100]}",
        endpoint="evaluate_essay",
    ) as tracker:
        result = evaluate_essay_draft(req.school_id, prompt, essay_text)
        tracker["output"] = str(result.get("overall_score", ""))
        return result


# ── Essay Word Counter ──────────────────────────────────────────────────

@router.post("/essay/word-count", deprecated=True)
def essay_word_count(req: EssayWordCountRequest):
    """Analyze essay text: word count, character count, sentence count, reading time.

    DEPRECATED: Word counting is built into every essay editor. This standalone
    endpoint will be removed in a future release. The essay evaluator already
    returns word count in its response.
    """
    text = req.text.strip()
    words = text.split() if text else []
    word_count = len(words)
    char_count = len(text)
    char_no_spaces = len(text.replace(" ", ""))
    sentences = len(_re.findall(r"[.!?]+", text)) or (1 if text else 0)
    paragraphs = len([p for p in text.split("\n\n") if p.strip()]) if text else 0
    reading_time_sec = round(word_count / 3.5)  # ~210 words/min speaking pace for interviews

    result: dict = {
        "word_count": word_count,
        "char_count": char_count,
        "char_no_spaces": char_no_spaces,
        "sentence_count": sentences,
        "paragraph_count": paragraphs,
        "reading_time_seconds": reading_time_sec,
    }

    if req.word_limit:
        remaining = req.word_limit - word_count
        result["word_limit"] = req.word_limit
        result["words_remaining"] = remaining
        result["over_limit"] = remaining < 0
        result["utilization_pct"] = round(word_count / req.word_limit * 100, 1)

    if req.char_limit:
        remaining = req.char_limit - char_count
        result["char_limit"] = req.char_limit
        result["chars_remaining"] = remaining
        result["char_over_limit"] = remaining < 0

    return result


# ── Essay Prompt Library ────────────────────────────────────────────────

@router.get("/essay-prompts")
def get_essay_prompts(school_id: str = None):
    """Get essay prompts for all schools or a specific school."""
    results = []
    schools = SCHOOL_DB

    if school_id:
        if school_id not in schools:
            raise HTTPException(404, detail=f"School not found: {school_id}")
        schools = {school_id: SCHOOL_DB[school_id]}

    for sid, school in schools.items():
        prompts = school.get("essay_prompts") or []
        if not prompts:
            continue
        for i, prompt in enumerate(prompts):
            word_limit = None
            text = prompt if isinstance(prompt, str) else str(prompt)
            # Try to extract word limit from prompt text
            import re
            wl_match = re.search(r"(\d+)\s*word", text.lower())
            if wl_match:
                word_limit = int(wl_match.group(1))
            results.append({
                "school_id": sid,
                "school_name": school.get("name", sid),
                "prompt_index": i,
                "prompt_text": text,
                "word_limit": word_limit,
            })

    # Sort by school name
    results.sort(key=lambda x: x["school_name"])

    return {
        "prompts": results,
        "total_prompts": len(results),
        "school_count": len(set(r["school_id"] for r in results)),
    }


# ── Essay Theme Analyzer ─────────────────────────────────────────────

THEME_KEYWORDS = {
    "Leadership": ["led", "managed", "team", "leader", "initiative", "directed", "spearheaded", "organized", "mentor"],
    "Innovation": ["created", "built", "designed", "developed", "launched", "startup", "entrepreneur", "innovation", "new"],
    "Impact": ["impact", "helped", "community", "volunteer", "social", "nonprofit", "improved", "transformed", "changed"],
    "Global": ["international", "global", "abroad", "diverse", "culture", "countries", "cross-cultural", "overseas"],
    "Analytical": ["analysis", "data", "strategy", "research", "quantitative", "financial", "problem-solving", "solve"],
    "Growth": ["learned", "growth", "challenge", "overcome", "failure", "resilience", "adapted", "evolved", "reflection"],
    "Collaboration": ["collaborated", "partnership", "cross-functional", "stakeholder", "consensus", "together", "teamwork"],
    "Vision": ["vision", "goal", "future", "aspire", "dream", "mission", "purpose", "long-term", "ambition"],
}


@router.post("/essay/analyze-themes")
def analyze_essay_themes(req: ThemeAnalysisRequest):
    """Keyword-based theme analysis across multiple essays — no LLM needed."""
    if not req.essays:
        raise HTTPException(400, "At least one essay is required")

    per_essay = []
    overall_raw: dict[str, int] = {t: 0 for t in THEME_KEYWORDS}

    for essay in req.essays:
        text_lower = essay.content.lower()
        words = essay.content.split() if essay.content.strip() else []
        word_count = len(words)

        # Count keyword matches per theme
        theme_counts: dict[str, int] = {}
        for theme, keywords in THEME_KEYWORDS.items():
            count = sum(text_lower.count(kw) for kw in keywords)
            theme_counts[theme] = count
            overall_raw[theme] += count

        # Normalize to percentages
        total_hits = sum(theme_counts.values()) or 1
        theme_pcts = {t: round(c / total_hits * 100) for t, c in theme_counts.items()}

        # Find dominant theme for this essay
        dominant = max(theme_pcts, key=lambda t: theme_pcts[t]) if any(theme_pcts.values()) else "None"

        per_essay.append({
            "title": essay.title,
            "themes": theme_pcts,
            "dominant": dominant,
            "word_count": word_count,
        })

    # Overall percentages
    overall_total = sum(overall_raw.values()) or 1
    overall_pcts = {t: round(c / overall_total * 100) for t, c in overall_raw.items()}

    # Top 3 dominant themes
    sorted_themes = sorted(overall_pcts.items(), key=lambda x: -x[1])
    dominant_themes = [t for t, _ in sorted_themes[:3]]

    # Gaps: themes with < 5% representation
    gaps = [t for t, pct in sorted_themes if pct < 5]

    # Generate tips
    tips: list[str] = []
    if sorted_themes and sorted_themes[0][1] > 40:
        tips.append(
            f"Your essays focus heavily on {sorted_themes[0][0]} — consider diversifying to show breadth."
        )
    if gaps:
        gap_str = ", ".join(gaps[:3])
        tips.append(
            f"Themes like {gap_str} are underrepresented — weaving in these elements can strengthen your narrative."
        )
    if len(req.essays) == 1:
        tips.append(
            "Add more essays to get a more comprehensive theme balance analysis."
        )
    if not tips:
        tips.append("Your essays show a well-balanced theme distribution across key MBA dimensions.")

    return {
        "per_essay": per_essay,
        "overall": overall_pcts,
        "dominant_themes": dominant_themes,
        "gaps": gaps,
        "tips": tips,
    }


# ── Essay Coach (Real Claude API — Streaming) ────────────────────────────────

COACH_SYSTEM_PROMPTS = {
    "brainstorm": (
        "You are an expert MBA admissions essay coach. The applicant needs help "
        "brainstorming ideas for their essay. Ask probing questions to help them "
        "find their authentic story. Never write the essay for them — guide them "
        "to discover their own narrative. Be specific, not generic. Reference the "
        "school's culture and values when relevant."
    ),
    "review": (
        "You are an expert MBA admissions essay coach reviewing a draft. Provide "
        "specific, actionable feedback on:\n"
        "1) Story strength and authenticity\n"
        "2) Structure and flow\n"
        "3) Whether it answers the prompt directly\n"
        "4) Specific sentences to improve with concrete suggestions\n"
        "Be honest but encouraging. Never rewrite their essay — point to exact "
        "phrases and explain why they need work."
    ),
    "tone_check": (
        "You are an MBA admissions essay authenticity checker. Analyze the essay for:\n"
        "1) Signs of AI-generated writing (generic phrasing, inflated language, "
        "rule-of-three patterns, lack of specific detail)\n"
        "2) Cliches common in MBA essays ('passionate about', 'leveraging my "
        "experience', 'synergy', 'holistic approach')\n"
        "3) Vague claims without specific evidence\n"
        "4) Inconsistent voice or register shifts\n\n"
        "Score authenticity 0-100 and explain your reasoning with specific examples "
        "from the text. Format the score clearly at the top of your response."
    ),
}

COACH_MODEL = CLAUDE_MODEL


def _build_coach_user_message(req: EssayCoachRequest) -> str:
    """Build the user message sent to Claude for the essay coach."""
    school = SCHOOL_DB.get(req.school_id, {})
    school_name = school.get("name", req.school_id)

    parts = [
        f"School: {school_name}",
        f"Essay prompt: {req.prompt_text}",
    ]
    if req.word_limit:
        parts.append(f"Word limit: {req.word_limit}")
    if req.essay_text.strip():
        parts.append(f"\nEssay draft:\n{req.essay_text}")
    else:
        parts.append("\n(No essay text provided yet — the applicant is looking for brainstorming help.)")

    return "\n".join(parts)


async def _stream_coach_response(req: EssayCoachRequest):
    """Generator that yields SSE events from Claude's streaming response."""
    from anthropic import Anthropic

    client = Anthropic()
    system_prompt = COACH_SYSTEM_PROMPTS[req.mode]
    user_message = _build_coach_user_message(req)

    try:
        with client.messages.stream(
            model=COACH_MODEL,
            max_tokens=1024,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        ) as stream:
            for text in stream.text_stream:
                yield f"data: {json.dumps({'text': text})}\n\n"
        yield "data: [DONE]\n\n"
    except Exception as exc:
        logger.error("Essay coach streaming error: %s", exc)
        yield f"data: {json.dumps({'error': str(exc)})}\n\n"
        yield "data: [DONE]\n\n"


@router.post("/essay/coach")
@rate_limit("10/minute")
async def essay_coach(request: Request, req: EssayCoachRequest):
    """AI essay coach — real Claude-powered brainstorming, review, and tone checking.

    Returns a Server-Sent Events stream of text chunks. Each event is:
      data: {"text": "..."}
    Final event:
      data: [DONE]

    Usage tracked per tier (free: 5/day, pro: 50/day, premium: unlimited).
    """
    from observability import track_ai_interaction

    # Sanitize inputs
    try:
        prompt_text = sanitize_for_llm(req.prompt_text, MAX_FIELD_CHARS, "essay prompt")
        essay_text = sanitize_for_llm(req.essay_text, MAX_ESSAY_CHARS, "essay") if req.essay_text else ""
    except ValueError as e:
        raise HTTPException(400, detail=str(e))

    # Validate mode
    if req.mode not in COACH_SYSTEM_PROMPTS:
        raise HTTPException(400, detail=f"Invalid mode: {req.mode}. Must be one of: {list(COACH_SYSTEM_PROMPTS.keys())}")

    # Build sanitized request for streaming
    sanitized_req = EssayCoachRequest(
        school_id=req.school_id,
        prompt_text=prompt_text,
        essay_text=essay_text,
        mode=req.mode,
        word_limit=req.word_limit,
    )

    logger.info(
        "Essay coach request: school=%s mode=%s essay_len=%d",
        req.school_id, req.mode, len(essay_text),
    )

    return StreamingResponse(
        _stream_coach_response(sanitized_req),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
