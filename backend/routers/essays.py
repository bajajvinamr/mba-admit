"""Essay-related endpoints — roast, evaluate, word count, prompts, theme analysis."""

import re as _re

from fastapi import APIRouter, HTTPException, Request
from middleware import rate_limit
from agents import (
    SCHOOL_DB,
    evaluate_essay_draft,
    roast_resume_bullet,
)
from models import (
    ResumeRoastRequest,
    EssayEvaluationRequest,
    EssayWordCountRequest,
    ThemeAnalysisRequest,
)
from guardrails import sanitize_for_llm, MAX_BULLET_CHARS, MAX_ESSAY_CHARS, MAX_FIELD_CHARS

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
    try:
        essay_text = sanitize_for_llm(req.essay_text, MAX_ESSAY_CHARS, "essay")
        prompt = sanitize_for_llm(req.prompt, MAX_FIELD_CHARS, "prompt")
    except ValueError as e:
        raise HTTPException(400, detail=str(e))
    return evaluate_essay_draft(req.school_id, prompt, essay_text)


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
