"""Cross-Essay Theme Tracker — Claude-powered deep theme analysis across multiple essays."""

import json
import os
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from middleware import rate_limit
from agents import CLAUDE_MODEL
from logging_config import setup_logging

logger = setup_logging()

router = APIRouter(prefix="/api", tags=["essay-themes"])


# ── Models ────────────────────────────────────────────────────────────────────

class EssayInput(BaseModel):
    school: str = Field(min_length=1, max_length=200)
    prompt: str = Field(default="", max_length=2000)
    content: str = Field(min_length=1, max_length=15000)


class ThemeTrackRequest(BaseModel):
    user_id: Optional[str] = None
    essays: List[EssayInput] = Field(min_length=1, max_length=10)


class ThemeEvidence(BaseModel):
    evidence: str


class ThemeOverlap(BaseModel):
    theme: str
    schools: List[str]
    suggestion: str


class ThemeGap(BaseModel):
    theme: str
    description: str


class ThemeTrackResponse(BaseModel):
    matrix: dict  # { theme: { school: { evidence: str } } }
    overlaps: List[ThemeOverlap]
    gaps: List[ThemeGap]


# ── Core Theme Categories ─────────────────────────────────────────────────────

CORE_THEMES = [
    "Leadership",
    "Innovation & Entrepreneurship",
    "Social Impact",
    "Global Perspective",
    "Analytical Rigor",
    "Personal Growth & Resilience",
    "Collaboration & Teamwork",
    "Vision & Ambition",
    "Diversity & Inclusion",
    "Ethical Decision-Making",
]


# ── Claude API theme extraction ───────────────────────────────────────────────

def _extract_themes_from_essay(essay_content: str, school: str, prompt: str) -> list[dict]:
    """Use Claude API to identify the top 3 themes in an essay."""
    from anthropic import Anthropic

    client = Anthropic()

    system = (
        "You are an expert MBA admissions consultant analyzing essay themes. "
        "Identify the top 3 themes present in this essay. For each theme, provide "
        "a short evidence quote or description (1-2 sentences) from the essay. "
        "Choose themes from this list when applicable: "
        + ", ".join(CORE_THEMES)
        + ". You may also identify other themes if they are strongly present."
    )

    user_msg = f"School: {school}\nPrompt: {prompt}\n\nEssay:\n{essay_content}"

    try:
        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=512,
            system=system,
            messages=[{"role": "user", "content": (
                f"{user_msg}\n\n"
                "Return JSON only, no other text:\n"
                '{ "themes": [{ "name": "<theme>", "evidence": "<evidence from essay>" }] }'
            )}],
        )

        content = response.content[0].text.strip()
        # Strip markdown code fences if present
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        parsed = json.loads(content)
        return parsed.get("themes", [])

    except Exception as e:
        logger.error("Theme extraction failed for %s: %s", school, e)
        return []


def _fallback_keyword_themes(content: str) -> list[dict]:
    """Keyword-based fallback when Claude API is unavailable."""
    KEYWORD_MAP = {
        "Leadership": ["led", "managed", "team", "leader", "initiative", "directed", "spearheaded"],
        "Innovation & Entrepreneurship": ["created", "built", "startup", "entrepreneur", "innovation", "launched"],
        "Social Impact": ["impact", "community", "volunteer", "nonprofit", "social", "helped"],
        "Global Perspective": ["international", "global", "abroad", "diverse", "culture", "countries"],
        "Analytical Rigor": ["analysis", "data", "strategy", "research", "quantitative", "solve"],
        "Personal Growth & Resilience": ["learned", "growth", "challenge", "overcome", "failure", "resilience"],
        "Collaboration & Teamwork": ["collaborated", "partnership", "cross-functional", "together", "teamwork"],
        "Vision & Ambition": ["vision", "goal", "future", "aspire", "mission", "purpose", "ambition"],
    }

    text_lower = content.lower()
    scores = {}
    for theme, keywords in KEYWORD_MAP.items():
        scores[theme] = sum(text_lower.count(kw) for kw in keywords)

    sorted_themes = sorted(scores.items(), key=lambda x: -x[1])
    top = [t for t, s in sorted_themes[:3] if s > 0]

    return [{"name": t, "evidence": "Detected via keyword analysis"} for t in top]


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/essays/analyze-themes", response_model=ThemeTrackResponse)
@rate_limit("5/minute")
def analyze_cross_essay_themes(request: Request, req: ThemeTrackRequest):
    """Analyze themes across multiple essays, build a theme x school matrix,
    identify overlaps (same theme in 3+ essays) and suggest diversification."""

    if not req.essays:
        raise HTTPException(400, "At least one essay is required")

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    use_claude = bool(api_key)

    # ── Step 1: Extract themes per essay ──────────────────────────────────
    essay_themes: list[tuple[str, list[dict]]] = []  # (school, themes)

    for essay in req.essays:
        word_count = len(essay.content.split())
        if word_count < 100:
            # Too short for meaningful analysis
            essay_themes.append((essay.school, []))
            continue

        if use_claude:
            themes = _extract_themes_from_essay(essay.content, essay.school, essay.prompt)
            if not themes:
                themes = _fallback_keyword_themes(essay.content)
        else:
            themes = _fallback_keyword_themes(essay.content)

        essay_themes.append((essay.school, themes))

    # ── Step 2: Build theme x school matrix ───────────────────────────────
    matrix: dict[str, dict[str, dict]] = {}

    for school, themes in essay_themes:
        for t in themes:
            theme_name = t.get("name", "Unknown")
            evidence = t.get("evidence", "")
            if theme_name not in matrix:
                matrix[theme_name] = {}
            matrix[theme_name][school] = {"evidence": evidence}

    # ── Step 3: Identify overlaps (same theme in 3+ schools) ─────────────
    overlaps: list[dict] = []
    for theme, schools_map in matrix.items():
        school_list = list(schools_map.keys())
        if len(school_list) >= 3:
            overlaps.append({
                "theme": theme,
                "schools": school_list,
                "suggestion": (
                    f"'{theme}' appears in {len(school_list)} essays. "
                    f"Consider replacing it in one essay with a different theme "
                    f"to show breadth and avoid repetition."
                ),
            })
        elif len(school_list) >= 2 and len(req.essays) <= 3:
            overlaps.append({
                "theme": theme,
                "schools": school_list,
                "suggestion": (
                    f"'{theme}' appears in {len(school_list)} of {len(req.essays)} essays. "
                    f"With a small portfolio, diversifying themes adds dimension to your narrative."
                ),
            })

    # ── Step 4: Identify gaps ─────────────────────────────────────────────
    present_themes = set(matrix.keys())
    # Normalize for comparison
    present_lower = {t.lower() for t in present_themes}

    gaps: list[dict] = []
    gap_suggestions = {
        "Leadership": "Admissions committees highly value leadership examples. Consider weaving in a leadership moment.",
        "Innovation & Entrepreneurship": "Showing innovative thinking differentiates you. Consider describing a time you created something new.",
        "Social Impact": "Schools value candidates who give back. Consider highlighting community or social contributions.",
        "Global Perspective": "International exposure signals adaptability. Consider mentioning cross-cultural experiences.",
        "Personal Growth & Resilience": "Vulnerability and growth resonate with readers. Consider sharing a transformative challenge.",
        "Collaboration & Teamwork": "MBA programs are team-intensive. Consider showcasing collaborative achievements.",
        "Ethical Decision-Making": "Ethical reasoning demonstrates maturity. Consider describing a principled decision.",
    }

    for theme, desc in gap_suggestions.items():
        if theme.lower() not in present_lower:
            gaps.append({"theme": theme, "description": desc})

    logger.info(
        "Theme analysis complete: %d essays, %d themes, %d overlaps, %d gaps",
        len(req.essays), len(matrix), len(overlaps), len(gaps),
    )

    return {
        "matrix": matrix,
        "overlaps": overlaps,
        "gaps": gaps,
    }
