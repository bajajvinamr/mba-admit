"""Interview-related endpoints — simulator, question bank, alumni prep, AI evaluation."""

import json as _json
import logging
import os as _os
import random

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel as _BaseModel
from middleware import rate_limit
from agents import (
    SCHOOL_DB,
    get_llm,
    simulate_interview_pass,
    stream_interview_pass,
)
from models import (
    InterviewStartRequest,
    InterviewResponseRequest,
    InterviewEvaluateRequest,
    InterviewEvaluateResponse,
)
from guardrails import sanitize_for_llm, MAX_CHAT_CHARS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["interview"])


# ── Interview Simulator ──────────────────────────────────────────────────────

@router.post("/interview/start")
@rate_limit("10/minute")
def start_mock_interview(request: Request, req: InterviewStartRequest):
    """Starts a fresh mock interview for a school."""
    return simulate_interview_pass(req.school_id, [], difficulty=req.difficulty, question_count=req.question_count)


@router.post("/interview/respond")
@rate_limit("20/minute")
def respond_mock_interview(request: Request, req: InterviewResponseRequest):
    """Next prompt or final feedback based on session history."""
    from observability import track_ai_interaction

    # Sanitize the latest user message in history
    sanitized_history = []
    latest_user_msg = ""
    for msg in req.history:
        entry = dict(msg) if isinstance(msg, dict) else msg
        if isinstance(entry, dict) and entry.get("role") == "user":
            try:
                entry["content"] = sanitize_for_llm(
                    entry.get("content", ""), MAX_CHAT_CHARS, "interview response"
                )
                latest_user_msg = entry["content"]
            except ValueError as e:
                from fastapi import HTTPException
                raise HTTPException(400, detail=str(e))
        sanitized_history.append(entry)

    with track_ai_interaction(
        user_input=latest_user_msg or f"interview:{req.school_id}",
        endpoint="interview/respond",
    ) as tracker:
        result = simulate_interview_pass(req.school_id, sanitized_history, difficulty=req.difficulty, question_count=req.question_count)
        tracker["output"] = result.get("question", result.get("feedback", ""))
        return result


# ── Streaming Interview Response (SSE) ────────────────────────────────────

def _sse_event(event_type: str, data: dict) -> str:
    """Format a Server-Sent Event line."""
    return f"data: {_json.dumps({'type': event_type, **data})}\n\n"


def _stream_interview_generator(school_id: str, history: list[dict], difficulty: str, question_count: int):
    """Generator that yields SSE events from the streaming interview."""
    for event_type, data in stream_interview_pass(school_id, history, difficulty=difficulty, question_count=question_count):
        if event_type == "text":
            yield _sse_event("text", {"content": data})
        elif event_type == "done":
            # Send the parsed result with scores and metadata
            yield _sse_event("done", {"result": data})


@router.post("/interview/respond-stream")
@rate_limit("20/minute")
def respond_mock_interview_stream(request: Request, req: InterviewResponseRequest):
    """Streaming version of /interview/respond. Returns Server-Sent Events.

    Events:
        data: {"type": "text", "content": "..."}\n\n    — incremental text chunks
        data: {"type": "done", "result": {...}}\n\n     — final parsed result with scores
    """
    from observability import track_ai_interaction

    # Sanitize the latest user message in history
    sanitized_history = []
    for msg in req.history:
        entry = dict(msg) if isinstance(msg, dict) else msg
        if isinstance(entry, dict) and entry.get("role") == "user":
            try:
                entry["content"] = sanitize_for_llm(
                    entry.get("content", ""), MAX_CHAT_CHARS, "interview response"
                )
            except ValueError as e:
                raise HTTPException(400, detail=str(e))
        sanitized_history.append(entry)

    return StreamingResponse(
        _stream_interview_generator(req.school_id, sanitized_history, req.difficulty, req.question_count),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Interview Answer Evaluation (Claude API) ─────────────────────────────

def _get_school_interview_context(school_id: str) -> str:
    """Load school-specific interview context from interview_questions.json."""
    data = _load_questions()
    school_info = data.get("school_specific", {}).get(school_id)
    if not school_info:
        return ""

    parts = [f"School: {school_info.get('school_name', school_id)}"]
    if school_info.get("interview_format"):
        parts.append(f"Interview format: {school_info['interview_format']}")
    if school_info.get("unique_elements"):
        parts.append(f"Unique elements: {', '.join(school_info['unique_elements'])}")
    if school_info.get("prep_tip"):
        parts.append(f"Key context: {school_info['prep_tip']}")
    return "\n".join(parts)


_INTERVIEW_EVAL_PROMPT = """You are an expert MBA interview evaluator with deep knowledge of top business school admissions. Score this interview answer on two dimensions:

1. CONTENT (0-100): Relevance to the question, specificity of examples, depth of insight, authenticity, and self-awareness. Higher scores require concrete details, quantified impact, and genuine reflection.
2. STRUCTURE (0-100): STAR format adherence (Situation, Task, Action, Result), clarity of narrative arc, conciseness, and logical flow. Higher scores require a clear beginning-middle-end with smooth transitions.

{school_context}

Question type: {question_type}
Question: {question}
Answer: {answer}

Evaluate rigorously but fairly. Top-tier answers (80+) have specific examples with quantified outcomes and clear school fit. Average answers (50-70) are generic or lack specifics. Weak answers (below 50) are vague, off-topic, or formulaic.

Respond in this exact JSON format with no other text:
{{"content_score": <number 0-100>, "structure_score": <number 0-100>, "overall_score": <number 0-100>, "feedback": "<2-3 sentences of specific, actionable feedback>", "strengths": ["<strength 1>", "<strength 2>"], "improvements": ["<improvement 1>", "<improvement 2>"]}}"""


@router.post("/interview/evaluate", response_model=InterviewEvaluateResponse)
@rate_limit("10/minute")
def evaluate_interview_answer(request: Request, req: InterviewEvaluateRequest):
    """Evaluate a single interview answer using Claude API for real scoring."""
    from langchain_core.messages import HumanMessage
    from observability import track_ai_interaction

    # Sanitize inputs
    try:
        sanitized_answer = sanitize_for_llm(req.answer, MAX_CHAT_CHARS * 2, "interview answer")
        sanitized_question = sanitize_for_llm(req.question, MAX_CHAT_CHARS, "interview question")
    except ValueError as e:
        raise HTTPException(400, detail=str(e))

    # Build school-specific context
    school_context = _get_school_interview_context(req.school_id)
    if not school_context:
        school_name = SCHOOL_DB.get(req.school_id, {}).get("name", req.school_id)
        school_context = f"School: {school_name}"

    prompt = _INTERVIEW_EVAL_PROMPT.format(
        school_context=school_context,
        question_type=req.question_type,
        question=sanitized_question,
        answer=sanitized_answer,
    )

    with track_ai_interaction(
        user_input=f"evaluate:{req.school_id}:{req.question_type}",
        endpoint="interview/evaluate",
    ) as tracker:
        try:
            llm = get_llm()
            response = llm.invoke([HumanMessage(content=prompt)])
            content = response.content

            # Strip markdown code fences if present
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].strip()

            result = _json.loads(content)

            # Clamp scores to 0-100 range
            for key in ("content_score", "structure_score", "overall_score"):
                result[key] = max(0, min(100, int(result.get(key, 50))))

            # Ensure lists
            result.setdefault("strengths", ["Answer provided"])
            result.setdefault("improvements", ["Add more specific details"])
            result.setdefault("feedback", "Review your answer for specificity and structure.")

            tracker["output"] = result.get("feedback", "")
            return result

        except _json.JSONDecodeError as e:
            logger.error("Interview evaluate JSON parse failed: %s | raw: %s", e, content[:500] if content else "empty")
            raise HTTPException(502, detail="AI evaluation returned invalid format. Please try again.")
        except Exception as e:
            logger.error("Interview evaluate failed: %s", e)
            raise HTTPException(502, detail="AI evaluation temporarily unavailable. Please try again.")


# ── Interview Question Bank (JSON file) ──────────────────────────────────

_QUESTIONS_PATH = _os.path.join(_os.path.dirname(__file__), "..", "data", "interview_questions.json")
_questions_cache: dict | None = None


def _load_questions() -> dict:
    global _questions_cache
    if _questions_cache is None:
        with open(_QUESTIONS_PATH) as f:
            _questions_cache = _json.load(f)
    return _questions_cache


@router.get("/interview/questions")
def get_interview_questions_json(
    school_id: str = None,
    category: str = None,
    difficulty: str = None,
):
    """Browseable interview question bank with optional filters."""
    data = _load_questions()
    categories = data["categories"]
    result_categories = []

    for cat in categories:
        if category and cat["id"] != category:
            continue

        filtered_qs = cat["questions"]
        if school_id:
            filtered_qs = [q for q in filtered_qs if school_id in q.get("schools", [])]
        if difficulty:
            filtered_qs = [q for q in filtered_qs if q["difficulty"] == difficulty]

        if filtered_qs:
            result_categories.append({
                "id": cat["id"],
                "name": cat["name"],
                "questions": filtered_qs,
                "count": len(filtered_qs),
            })

    total = sum(c["count"] for c in result_categories)

    # School-specific tips
    school_info = None
    if school_id:
        school_info = data.get("school_specific", {}).get(school_id)

    return {
        "categories": result_categories,
        "total_questions": total,
        "school_info": school_info,
    }


@router.get("/interview/questions/random")
def get_random_questions(
    school_id: str = None,
    count: int = Query(default=5, ge=1, le=20),
):
    """Get random interview questions for practice mode."""
    data = _load_questions()
    all_qs = []
    for cat in data["categories"]:
        for q in cat["questions"]:
            if school_id and school_id not in q.get("schools", []):
                continue
            all_qs.append({**q, "category": cat["name"]})

    if not all_qs:
        return {"questions": [], "count": 0}

    selected = random.sample(all_qs, min(count, len(all_qs)))
    return {"questions": selected, "count": len(selected)}


# ── Interview Question Bank (inline data) ─────────────────────────────────────

class InterviewQuestion(_BaseModel):
    question: str
    category: str
    difficulty: int
    tips: list[str]
    school_specific: bool


class InterviewQuestionBankResponse(_BaseModel):
    questions: list[InterviewQuestion]
    count: int
    categories: list[str]


_IQ_CATEGORIES = [
    "behavioral",
    "why_mba",
    "why_school",
    "leadership",
    "career_goals",
    "strengths_weaknesses",
    "teamwork",
    "ethical_dilemma",
]

_QUESTION_BANK: dict[str, list[dict]] = {
    "behavioral": [
        {"question": "Tell me about a time you failed and what you learned from it.", "difficulty": 1, "tips": ["Use the STAR method", "Focus on the lesson, not just the failure", "Show self-awareness"]},
        {"question": "Describe a situation where you had to influence someone without direct authority.", "difficulty": 2, "tips": ["Highlight interpersonal skills", "Show strategic thinking", "Quantify the outcome"]},
        {"question": "Walk me through a time you received critical feedback. How did you respond?", "difficulty": 1, "tips": ["Show humility and growth mindset", "Describe concrete changes you made", "Avoid being defensive in your retelling"]},
        {"question": "Tell me about a time you had to make a decision with incomplete information.", "difficulty": 2, "tips": ["Explain your reasoning framework", "Show comfort with ambiguity", "Describe the outcome and what you'd do differently"]},
        {"question": "Describe a conflict with a colleague and how you resolved it.", "difficulty": 2, "tips": ["Show emotional intelligence", "Focus on the resolution process", "Avoid placing blame"]},
        {"question": "Give an example of when you went above and beyond what was expected.", "difficulty": 1, "tips": ["Quantify the impact", "Explain your motivation", "Connect to your values"]},
        {"question": "Tell me about a time you had to adapt to a major change at work.", "difficulty": 2, "tips": ["Show flexibility and resilience", "Describe your mindset shift", "Highlight how you helped others adapt"]},
        {"question": "Describe a situation where you had to manage competing priorities.", "difficulty": 2, "tips": ["Show your prioritization framework", "Demonstrate time management skills", "Explain trade-offs you made"]},
        {"question": "Tell me about a time you took a calculated risk.", "difficulty": 3, "tips": ["Explain your risk assessment process", "Show that you weighed pros and cons", "Describe the outcome honestly"]},
        {"question": "Describe a moment when you demonstrated resilience.", "difficulty": 1, "tips": ["Choose a genuinely challenging situation", "Show the emotional journey", "Connect to personal growth"]},
    ],
    "why_mba": [
        {"question": "Why do you want to pursue an MBA at this point in your career?", "difficulty": 1, "tips": ["Be specific about timing", "Connect to career trajectory", "Show you've explored alternatives"]},
        {"question": "What skills do you hope to develop during your MBA?", "difficulty": 1, "tips": ["Be specific — avoid generic answers", "Connect skills to career goals", "Show self-awareness about current gaps"]},
        {"question": "How will an MBA help you achieve your long-term goals?", "difficulty": 2, "tips": ["Have a clear 5-10 year vision", "Explain why an MBA is necessary, not just nice-to-have", "Be realistic and specific"]},
        {"question": "What would you do if you don't get into any MBA program this year?", "difficulty": 3, "tips": ["Show resilience and alternative planning", "Demonstrate genuine passion beyond the credential", "Be honest but optimistic"]},
        {"question": "How do you plan to contribute to the MBA community?", "difficulty": 2, "tips": ["Reference specific clubs or initiatives", "Draw from past community involvement", "Be genuine, not transactional"]},
        {"question": "What is the biggest misconception people have about MBAs?", "difficulty": 2, "tips": ["Show critical thinking", "Demonstrate your research", "Be thoughtful, not cynical"]},
        {"question": "How have you prepared for the MBA experience?", "difficulty": 1, "tips": ["Mention conversations with alumni", "Reference relevant pre-MBA activities", "Show intentionality"]},
        {"question": "What alternatives to an MBA have you considered?", "difficulty": 2, "tips": ["Be honest about other paths", "Explain why MBA won out", "Show thorough self-reflection"]},
    ],
    "why_school": [
        {"question": "Why is this school your top choice?", "difficulty": 2, "tips": ["Name specific courses, professors, or programs", "Reference campus visits or alumni conversations", "Show genuine fit, not flattery"]},
        {"question": "What specific programs or courses attract you to this school?", "difficulty": 2, "tips": ["Research the curriculum deeply", "Connect courses to your goals", "Mention unique offerings"]},
        {"question": "How does this school's culture align with your values?", "difficulty": 2, "tips": ["Reference specific cultural elements", "Share examples of your values in action", "Show you've talked to current students"]},
        {"question": "What will you bring to the incoming class?", "difficulty": 2, "tips": ["Highlight unique perspectives", "Be specific about contributions", "Connect to the school's community needs"]},
        {"question": "Which clubs or organizations do you plan to join?", "difficulty": 1, "tips": ["Name specific clubs", "Explain why they matter to you", "Show leadership aspirations within them"]},
        {"question": "How does this school's alumni network align with your career goals?", "difficulty": 2, "tips": ["Reference specific alumni outcomes", "Show you've done informational interviews", "Connect to your target industry"]},
        {"question": "What do you know about our learning methodology?", "difficulty": 2, "tips": ["Research the school's pedagogy", "Explain how the method suits your learning style", "Give examples from past learning experiences"]},
        {"question": "If admitted to multiple schools, how would you make your decision?", "difficulty": 3, "tips": ["Be diplomatic but honest", "Show your decision framework", "Emphasize unique school strengths"]},
    ],
    "leadership": [
        {"question": "Describe your leadership style.", "difficulty": 1, "tips": ["Give concrete examples, not just adjectives", "Show situational adaptability", "Reference feedback from others"]},
        {"question": "Tell me about a time you led a team through a difficult challenge.", "difficulty": 2, "tips": ["Focus on your specific actions", "Show how you motivated the team", "Quantify the outcome"]},
        {"question": "How do you develop talent in others?", "difficulty": 2, "tips": ["Give specific mentoring examples", "Show investment in others' growth", "Describe your coaching approach"]},
        {"question": "Describe a time you had to lead a team with diverse perspectives.", "difficulty": 2, "tips": ["Show inclusive leadership", "Highlight how you leveraged different viewpoints", "Demonstrate cultural awareness"]},
        {"question": "Tell me about a leadership failure and what it taught you.", "difficulty": 3, "tips": ["Choose a genuine failure, not a humble brag", "Focus on the learning", "Show how you've changed"]},
        {"question": "How do you build trust with a new team?", "difficulty": 1, "tips": ["Describe specific actions, not platitudes", "Show authenticity", "Reference real examples"]},
        {"question": "Describe a time you had to lead without a formal title.", "difficulty": 2, "tips": ["Show influence skills", "Demonstrate initiative", "Highlight the outcome"]},
        {"question": "How do you handle underperforming team members?", "difficulty": 3, "tips": ["Show empathy balanced with accountability", "Describe your process step by step", "Give a real example"]},
        {"question": "Tell me about a decision you made that was unpopular.", "difficulty": 3, "tips": ["Show conviction and courage", "Explain your reasoning clearly", "Describe how you managed pushback"]},
        {"question": "What leader do you admire and why?", "difficulty": 1, "tips": ["Choose someone relevant to your field", "Be specific about qualities you admire", "Connect to your own leadership development"]},
    ],
    "career_goals": [
        {"question": "Where do you see yourself five years after your MBA?", "difficulty": 1, "tips": ["Be specific about role, industry, and impact", "Show a logical progression from your background", "Connect to the MBA program"]},
        {"question": "What is your long-term career vision?", "difficulty": 2, "tips": ["Think 15-20 years out", "Be ambitious but credible", "Show purpose beyond personal success"]},
        {"question": "Why are you switching industries/functions?", "difficulty": 2, "tips": ["Explain the pull, not just the push", "Show transferable skills", "Demonstrate industry knowledge"]},
        {"question": "How does your pre-MBA experience prepare you for your post-MBA goals?", "difficulty": 2, "tips": ["Draw clear connections", "Identify skill gaps the MBA fills", "Show intentional career planning"]},
        {"question": "What is your backup plan if your primary career goal doesn't work out?", "difficulty": 2, "tips": ["Show flexibility without seeming unfocused", "Demonstrate realistic thinking", "Connect backup to your core interests"]},
        {"question": "What impact do you want to have in your career?", "difficulty": 2, "tips": ["Go beyond financial success", "Be genuine about your motivations", "Connect to personal experiences"]},
        {"question": "How do you define professional success?", "difficulty": 1, "tips": ["Be authentic", "Show maturity in your definition", "Connect to values and purpose"]},
        {"question": "What industry trends excite you most?", "difficulty": 2, "tips": ["Show you're well-read on your target industry", "Explain how you want to contribute", "Be specific and current"]},
        {"question": "Who is your professional role model and why?", "difficulty": 1, "tips": ["Choose someone in your target field", "Be specific about what you admire", "Show how they inspire your goals"]},
        {"question": "What would you do if you couldn't work in your target industry?", "difficulty": 3, "tips": ["Show breadth of interests", "Demonstrate core transferable passions", "Be creative but credible"]},
    ],
    "strengths_weaknesses": [
        {"question": "What is your greatest strength?", "difficulty": 1, "tips": ["Back it up with a specific example", "Choose something relevant to MBA success", "Avoid cliches"]},
        {"question": "What is your biggest weakness?", "difficulty": 2, "tips": ["Be genuine — avoid disguised strengths", "Show what you're doing to improve", "Pick something real but manageable"]},
        {"question": "What would your colleagues say is your biggest area for growth?", "difficulty": 2, "tips": ["Reference actual feedback you've received", "Show self-awareness", "Describe your improvement plan"]},
        {"question": "How do you handle stress and pressure?", "difficulty": 1, "tips": ["Give a specific high-pressure example", "Describe your coping strategies", "Show that you thrive, not just survive"]},
        {"question": "What skill are you most eager to develop in business school?", "difficulty": 1, "tips": ["Be specific about the skill and why", "Connect to your career goals", "Show how the school can help"]},
        {"question": "Describe a time your biggest strength became a liability.", "difficulty": 3, "tips": ["Show nuanced self-understanding", "Demonstrate adaptability", "Explain what you learned"]},
        {"question": "How do you solicit and process feedback?", "difficulty": 2, "tips": ["Describe your feedback-seeking habits", "Give examples of acting on feedback", "Show growth mindset"]},
        {"question": "What do people misunderstand about you?", "difficulty": 2, "tips": ["Be honest and reflective", "Show how you bridge the gap", "Use this to reveal a hidden strength"]},
        {"question": "Rate yourself on a scale of 1-10 and explain why.", "difficulty": 3, "tips": ["Avoid extremes (not 10, not below 6)", "Be thoughtful about your reasoning", "Show ambition to improve"]},
    ],
    "teamwork": [
        {"question": "Describe your role in a successful team project.", "difficulty": 1, "tips": ["Clarify your specific contribution", "Show how you enabled others", "Quantify the team's achievement"]},
        {"question": "How do you handle disagreements within a team?", "difficulty": 2, "tips": ["Show your conflict resolution approach", "Give a specific example", "Emphasize productive outcomes"]},
        {"question": "Tell me about a time a team project didn't go as planned.", "difficulty": 2, "tips": ["Take appropriate ownership", "Focus on the team's recovery process", "Share the lesson learned"]},
        {"question": "How do you ensure all team members contribute?", "difficulty": 2, "tips": ["Show inclusive facilitation skills", "Describe specific techniques", "Give an example"]},
        {"question": "Describe a time you had to work with someone you didn't get along with.", "difficulty": 2, "tips": ["Show professionalism and maturity", "Focus on the working relationship, not personality", "Describe the outcome"]},
        {"question": "What role do you typically play on a team?", "difficulty": 1, "tips": ["Show self-awareness", "Demonstrate flexibility across roles", "Give examples of different roles you've played"]},
        {"question": "How do you build consensus when opinions differ?", "difficulty": 2, "tips": ["Describe your process step by step", "Show respect for diverse viewpoints", "Give a concrete example"]},
        {"question": "Tell me about a time you helped a struggling teammate.", "difficulty": 1, "tips": ["Show empathy and initiative", "Describe your specific actions", "Focus on the teammate's growth"]},
        {"question": "How do you handle a team member who isn't pulling their weight?", "difficulty": 3, "tips": ["Show direct but empathetic communication", "Describe escalation if needed", "Focus on the team's success"]},
        {"question": "Describe a cross-functional team experience.", "difficulty": 2, "tips": ["Show ability to bridge different perspectives", "Highlight communication skills", "Quantify the impact"]},
    ],
    "ethical_dilemma": [
        {"question": "Describe a time you faced an ethical dilemma at work.", "difficulty": 3, "tips": ["Choose a genuine dilemma, not an obvious right/wrong", "Walk through your decision-making process", "Show your values in action"]},
        {"question": "What would you do if you discovered a colleague was being dishonest?", "difficulty": 2, "tips": ["Show moral courage", "Describe a measured approach", "Balance loyalty with integrity"]},
        {"question": "How do you handle situations where business goals conflict with ethics?", "difficulty": 3, "tips": ["Show that you don't see it as binary", "Demonstrate creative problem-solving", "Reference your personal framework"]},
        {"question": "Tell me about a time you had to speak truth to power.", "difficulty": 3, "tips": ["Show courage balanced with tact", "Describe the preparation involved", "Share the outcome honestly"]},
        {"question": "Describe a situation where you had to choose between two right answers.", "difficulty": 3, "tips": ["Show sophisticated moral reasoning", "Explain your decision framework", "Be honest about the trade-offs"]},
        {"question": "How do you ensure ethical behavior in your team?", "difficulty": 2, "tips": ["Describe specific practices", "Show proactive culture-building", "Give a concrete example"]},
        {"question": "What is your personal code of ethics?", "difficulty": 2, "tips": ["Be specific, not vague", "Root it in experiences", "Show how it guides decisions"]},
        {"question": "Describe a time you sacrificed personal gain for the right thing.", "difficulty": 3, "tips": ["Choose a meaningful example", "Show that you'd do it again", "Connect to your core values"]},
    ],
}

_SCHOOL_SPECIFIC_TEMPLATES = [
    "Why {school_name} specifically? What makes it the right fit for you?",
    "Which {school_name} professor's research resonates with your interests and why?",
    "How will you contribute to the {school_name} community outside the classroom?",
    "What {school_name} tradition or program are you most excited about?",
    "How does {school_name}'s approach to {approach} align with your learning style?",
]

_SCHOOL_APPROACHES = {
    "hbs": "the case method",
    "gsb": "personal leadership development",
    "wharton": "analytical rigor and teamwork",
    "booth": "flexible curriculum and data-driven decision making",
    "kellogg": "collaborative culture and team-based learning",
    "sloan": "innovation and action learning",
    "cbs": "value investing and New York immersion",
    "tuck": "tight-knit community and general management",
    "haas": "questioning the status quo and confidence without attitude",
    "ross": "action-based learning and positive business impact",
    "fuqua": "Team Fuqua and consequential leadership",
    "darden": "the case method and ethical leadership",
    "stern": "IQ + EQ and urban immersion",
    "johnson": "experiential learning and tech entrepreneurship",
    "anderson": "entrepreneurship and social impact",
    "iima": "analytical rigor and case-based pedagogy",
    "isb": "accelerated learning and global exposure",
    "lbs": "global perspective and experiential learning",
    "insead": "diversity and the one-year intensive format",
}


@router.get("/interview-questions", deprecated=True)
def get_interview_questions_legacy(
    school_id: str = Query(default=None, description="Filter for school-specific questions"),
    category: str = Query(default=None, description="Filter by question category"),
):
    """DEPRECATED — use /api/interview/questions instead.

    Redirects to the JSON-based question bank which has richer data.
    Kept for backwards compatibility with existing frontend routes.
    """
    return get_interview_questions_json(school_id=school_id, category=category)


# ── Alumni Interview Prep ──────────────────────────────────────────────────

_ALUMNI_INTERVIEW_DATA: list[dict] = [
    {
        "school_id": "hbs",
        "school_name": "Harvard Business School",
        "interview_format": "blind",
        "typical_duration": "30 minutes",
        "common_questions": [
            "Walk me through your resume.",
            "Why do you want an MBA now?",
            "Tell me about a time you led a team through a challenge.",
            "What will you contribute to the HBS community?",
            "Describe a situation where you had to influence without authority.",
            "What are your post-MBA goals?",
        ],
        "tips": [
            "Interviewer has NOT read your application — introduce yourself clearly.",
            "Prepare a concise 2-minute personal pitch.",
            "HBS values leadership and community impact — weave those in.",
            "Be ready for rapid follow-up questions; interviewers probe deeply.",
            "Practice with a timer — 30 minutes goes fast.",
        ],
        "interviewer_type": "adcom",
        "dress_code": "Business professional",
    },
    {
        "school_id": "gsb",
        "school_name": "Stanford GSB",
        "interview_format": "blind",
        "typical_duration": "45 minutes",
        "common_questions": [
            "Tell me about yourself.",
            "What matters most to you and why?",
            "Describe a time you created change in an organization.",
            "Why Stanford GSB?",
            "What would your colleagues say about working with you?",
            "Tell me about a failure and what you learned.",
            "How do you plan to use your MBA?",
        ],
        "tips": [
            "The 'what matters most' question mirrors the essay — ensure consistency.",
            "Interviewers are alumni; show genuine knowledge of GSB culture.",
            "Be authentic — Stanford values self-reflection over polish.",
            "Have specific examples of impact, not just responsibilities.",
            "Ask thoughtful questions about their GSB experience.",
        ],
        "interviewer_type": "alumni",
        "dress_code": "Business casual",
    },
    {
        "school_id": "wharton",
        "school_name": "Wharton",
        "interview_format": "team",
        "typical_duration": "35 minutes (team-based assessment)",
        "common_questions": [
            "Introduce yourself to the group.",
            "Discuss this case scenario as a team and present a recommendation.",
            "What role did you play in the team discussion?",
            "How would you handle a disagreement with a teammate?",
            "Why Wharton?",
            "What unique perspective do you bring?",
        ],
        "tips": [
            "Wharton uses a Team-Based Discussion (TBD) — practice group dynamics.",
            "Balance contributing ideas with listening to others.",
            "Don't dominate or stay silent — find the collaborative middle ground.",
            "The 1-on-1 portion is short; be concise with personal stories.",
            "Research Wharton's learning teams and reference them.",
        ],
        "interviewer_type": "adcom",
        "dress_code": "Business professional",
    },
    {
        "school_id": "booth",
        "school_name": "Chicago Booth",
        "interview_format": "informed",
        "typical_duration": "30-45 minutes",
        "common_questions": [
            "Walk me through your resume.",
            "Why Booth specifically?",
            "Describe a time you used data to make a decision.",
            "Tell me about a professional accomplishment you're proud of.",
            "How do you handle ambiguity?",
            "What clubs or activities interest you at Booth?",
        ],
        "tips": [
            "Interviewer has read your application — avoid repeating essays verbatim.",
            "Booth values analytical thinking — have quant-heavy examples ready.",
            "Reference the flexible curriculum and LEAD program.",
            "Be prepared to discuss why Chicago as a city appeals to you.",
            "Alumni interviews tend to be conversational; be personable.",
        ],
        "interviewer_type": "alumni",
        "dress_code": "Business casual",
    },
    {
        "school_id": "kellogg",
        "school_name": "Kellogg",
        "interview_format": "blind",
        "typical_duration": "30 minutes",
        "common_questions": [
            "Tell me about yourself.",
            "Why Kellogg?",
            "Give an example of a time you worked on a diverse team.",
            "Describe a leadership moment you're proud of.",
            "How do you build relationships in professional settings?",
            "What will you contribute to the Kellogg community?",
            "Tell me about a time you had to persuade a group.",
        ],
        "tips": [
            "Kellogg prizes collaboration and empathy — emphasize teamwork.",
            "Alumni interviewers are enthusiastic; match their energy.",
            "Know Kellogg's clubs, GIM trips, and social impact initiatives.",
            "Practice telling concise stories — the format is tight.",
            "Send a thoughtful thank-you note within 24 hours.",
        ],
        "interviewer_type": "alumni",
        "dress_code": "Business casual",
    },
    {
        "school_id": "cbs",
        "school_name": "Columbia Business School",
        "interview_format": "informed",
        "typical_duration": "30 minutes",
        "common_questions": [
            "Walk me through your resume.",
            "Why Columbia?",
            "Tell me about a time you overcame an obstacle.",
            "What industry do you want to work in post-MBA?",
            "How would you take advantage of being in New York City?",
            "Describe your management style.",
        ],
        "tips": [
            "Interviewer has reviewed your application — add new details.",
            "Leverage the NYC location in your 'Why CBS' answer.",
            "CBS values entrepreneurship — mention relevant experiences.",
            "If interviewing with an alumnus, research their background.",
            "Be specific about CBS resources: Chazen Institute, Lang Center, etc.",
        ],
        "interviewer_type": "alumni",
        "dress_code": "Business professional",
    },
    {
        "school_id": "sloan",
        "school_name": "MIT Sloan",
        "interview_format": "informed",
        "typical_duration": "30 minutes",
        "common_questions": [
            "Tell me about a time you worked on a complex problem.",
            "Why MIT Sloan?",
            "How do you approach innovation?",
            "Describe a project where you combined technical and business skills.",
            "What would you do if your startup idea failed?",
            "How do you plan to contribute to the Sloan community?",
        ],
        "tips": [
            "Sloan values 'principled, innovative leaders' — frame stories accordingly.",
            "Have examples that show technical depth and business acumen.",
            "Reference MIT's cross-registration, the Martin Trust Center, or Action Learning.",
            "Interviews can be conducted by adcom or alumni — tone varies.",
            "Prepare for behavioral and situational questions equally.",
        ],
        "interviewer_type": "adcom",
        "dress_code": "Business casual",
    },
    {
        "school_id": "tuck",
        "school_name": "Dartmouth Tuck",
        "interview_format": "informed",
        "typical_duration": "30-45 minutes",
        "common_questions": [
            "Why an MBA? Why now?",
            "Why Tuck?",
            "Tell me about a time you made an impact in your community.",
            "Describe a challenge you faced in a team setting.",
            "How do you handle feedback?",
            "What will you do if you don't get into business school?",
            "How does Tuck fit into your long-term plan?",
        ],
        "tips": [
            "Tuck has the strongest alumni network per capita — mention that.",
            "The tight-knit Hanover community is central; show you'd thrive there.",
            "Interviewers are often alumni who are passionate about Tuck — be genuine.",
            "Prepare specific examples of community building.",
            "Tuck interviews tend to be warm and conversational.",
        ],
        "interviewer_type": "alumni",
        "dress_code": "Business casual",
    },
    {
        "school_id": "haas",
        "school_name": "UC Berkeley Haas",
        "interview_format": "blind",
        "typical_duration": "30 minutes",
        "common_questions": [
            "Tell me about yourself.",
            "Why Haas?",
            "How do you embody 'Question the Status Quo'?",
            "Tell me about a time you demonstrated 'Confidence Without Attitude'.",
            "Describe a leadership experience.",
            "What are your short-term and long-term goals?",
            "How would you contribute to the Haas community?",
        ],
        "tips": [
            "Know Haas's four Defining Leadership Principles by heart.",
            "Frame at least one story around each principle.",
            "Haas values social impact and innovation — highlight relevant work.",
            "The interview is blind — give a strong self-introduction.",
            "Berkeley's culture is collaborative; avoid overly competitive framing.",
        ],
        "interviewer_type": "student",
        "dress_code": "Business casual",
    },
    {
        "school_id": "som",
        "school_name": "Yale SOM",
        "interview_format": "informed",
        "typical_duration": "30 minutes",
        "common_questions": [
            "Why Yale SOM?",
            "Tell me about a time you made a positive impact on an organization.",
            "How do you approach ethical dilemmas?",
            "Describe your leadership philosophy.",
            "What sector do you want to work in and why?",
            "How would you contribute to the Yale SOM community?",
        ],
        "tips": [
            "Yale SOM's mission is 'educating leaders for business and society' — align to it.",
            "Mention integrated curriculum and cross-Yale opportunities.",
            "Social impact and purpose-driven careers resonate strongly.",
            "Be ready to discuss ethics — SOM takes this seriously.",
            "Interviewers are often alumni; ask about their SOM experience.",
        ],
        "interviewer_type": "alumni",
        "dress_code": "Business casual",
    },
]


@router.get("/alumni-interview-prep")
def get_alumni_interview_prep(
    school_id: str | None = Query(default=None, description="Filter by school ID"),
):
    """Return alumni interview prep data for top MBA programs."""
    if school_id:
        sid = school_id.strip().lower()
        results = [s for s in _ALUMNI_INTERVIEW_DATA if s["school_id"] == sid]
        if not results:
            raise HTTPException(404, detail=f"School not found: {school_id}")
    else:
        results = list(_ALUMNI_INTERVIEW_DATA)

    return {"schools": results, "total": len(results)}
