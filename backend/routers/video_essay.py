"""Video Essay Prep — school-specific video essay formats, tips, and practice questions."""

import random
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/video-essay", tags=["video-essay"])


# ── Data ─────────────────────────────────────────────────────────────────────

SCHOOLS: dict[str, dict] = {
    "hbs": {
        "id": "hbs",
        "name": "Harvard Business School",
        "format": "Reflect & Record",
        "questions": 1,
        "prep_time_sec": None,
        "response_time_sec": 120,
        "platform": "HBS Custom Platform",
        "description": "One open-ended question. You see the prompt, reflect, then record a 2-minute response. No retakes.",
        "behavioral_focus": False,
        "tips": [
            "The question is intentionally broad — don't try to cover everything. Pick one clear angle.",
            "HBS values authenticity over polish. Be genuine, not rehearsed.",
            "Structure: hook → context → insight → forward-looking statement.",
            "2 minutes goes fast. Practice with a timer to calibrate pacing.",
            "They're assessing communication clarity and self-awareness, not production quality.",
            "Make eye contact with the camera, not the screen.",
            "Avoid cliches about wanting to 'make an impact' — be specific.",
        ],
        "scoring_criteria": [
            "Communication clarity and conciseness",
            "Self-awareness and reflective depth",
            "Authenticity and genuineness",
            "Ability to articulate ideas under time pressure",
            "Cultural fit with HBS case method environment",
        ],
        "practice_questions": [
            "What experiences have shaped who you are today?",
            "Tell us something about yourself that your resume doesn't capture.",
            "What would your closest colleagues say is your greatest strength?",
            "Describe a time you had to lead through ambiguity.",
            "What matters most to you and why?",
            "How do you handle disagreement in a team setting?",
            "What's a belief you held strongly that you later changed your mind on?",
            "Describe a moment when you felt most alive in your career.",
            "What would you want your section mates to know about you?",
            "If you could solve one problem in your industry, what would it be?",
        ],
    },
    "kellogg": {
        "id": "kellogg",
        "name": "Kellogg School of Management",
        "format": "Video Essay + Written Thought",
        "questions": 2,
        "prep_time_sec": 20,
        "response_time_sec": 60,
        "platform": "Kellogg Custom Platform",
        "description": "One video essay question (20s prep, 60s response) and one written thought exercise. Questions are randomized.",
        "behavioral_focus": True,
        "tips": [
            "20 seconds of prep is enough for a quick framework — not a script. Think: one key point + one example.",
            "60 seconds = ~150 words. Lead with your answer, then support it.",
            "Kellogg values teamwork and low-ego leadership. Let that come through naturally.",
            "The written thought is typed — clear, concise prose matters. No bullet points.",
            "Practice transitioning from thinking to speaking in under 20 seconds.",
            "Smile and show energy — Kellogg culture is collaborative and warm.",
            "Don't restart or freeze. If you stumble, keep going. Recovery is impressive.",
        ],
        "scoring_criteria": [
            "Quick thinking and composure under time pressure",
            "Teamwork orientation and collaborative mindset",
            "Communication skills and articulation",
            "Cultural fit with Kellogg's collaborative environment",
            "Written communication clarity (thought exercise)",
        ],
        "practice_questions": [
            "Tell us about a time you worked on a team that didn't function well. What did you do?",
            "What's your leadership philosophy in three words? Explain.",
            "Describe a time you had to persuade someone who initially disagreed with you.",
            "How would your teammates describe your role in a group?",
            "Tell us about a time you put the team's needs above your own.",
            "What would you contribute to a Kellogg study group?",
            "Describe a situation where you had to adapt quickly to a change.",
            "What's the most meaningful piece of feedback you've received?",
            "How do you handle conflict in a professional setting?",
            "Tell us about a risk you took that didn't go as planned.",
        ],
    },
    "yale-som": {
        "id": "yale-som",
        "name": "Yale School of Management",
        "format": "3 Short Videos",
        "questions": 3,
        "prep_time_sec": 30,
        "response_time_sec": 90,
        "platform": "Yale SOM Custom Platform",
        "description": "Three behavioral video questions. 30 seconds to prepare, 90 seconds to respond per question.",
        "behavioral_focus": True,
        "tips": [
            "Use the STAR method (Situation, Task, Action, Result) for behavioral questions.",
            "30 seconds of prep: identify your example, the key action, and the outcome.",
            "Yale SOM's mission is 'educating leaders for business and society' — connect your answers to broader impact.",
            "90 seconds is generous. Don't rush — use the time to give depth.",
            "Three questions means consistency matters. Show range across your examples.",
            "Be specific about YOUR role, not the team's collective action.",
            "End each answer with reflection or a lesson learned.",
        ],
        "scoring_criteria": [
            "Behavioral depth and specificity",
            "STAR method structure and clarity",
            "Alignment with Yale SOM's mission and values",
            "Self-awareness and reflective capacity",
            "Consistency across all three responses",
            "Communication poise and confidence",
        ],
        "practice_questions": [
            "Tell us about a time you led a team through a difficult challenge.",
            "Describe a situation where you had to make a decision with incomplete information.",
            "Give an example of when you advocated for a perspective that was unpopular.",
            "Tell us about a time you failed and what you learned from it.",
            "Describe how you've contributed to your community outside of work.",
            "Tell us about a time you had to balance competing priorities.",
            "Describe a moment when you demonstrated ethical leadership.",
            "Give an example of when you bridged differences between people or groups.",
            "Tell us about a time you drove meaningful change in your organization.",
            "Describe a situation where you had to deliver difficult feedback.",
        ],
    },
    "mit-sloan": {
        "id": "mit-sloan",
        "name": "MIT Sloan School of Management",
        "format": "Video Statement",
        "questions": 1,
        "prep_time_sec": None,
        "response_time_sec": 60,
        "platform": "MIT Sloan Admissions Portal",
        "description": "One 60-second video introducing yourself to your future classmates. Straightforward but high-signal.",
        "behavioral_focus": False,
        "tips": [
            "This is NOT an elevator pitch. It's a personal introduction — be human.",
            "60 seconds is short. Focus on 2-3 things: who you are, what drives you, what you'd bring.",
            "MIT Sloan values 'principled, innovative leaders' — show, don't tell.",
            "Be conversational, as if you're introducing yourself at an orientation mixer.",
            "Avoid reciting your resume. They already have it.",
            "Show genuine enthusiasm for MIT Sloan specifically if possible.",
            "Practice until you can do it naturally without a script.",
        ],
        "scoring_criteria": [
            "Authenticity and personality",
            "Concise self-presentation ability",
            "Cultural fit with MIT's innovative, action-oriented culture",
            "Communication warmth and approachability",
            "What you'd bring to the cohort",
        ],
        "practice_questions": [
            "Introduce yourself to your future MBA classmates.",
            "What are you most passionate about outside of work?",
            "What would you want to be known for at MIT Sloan?",
            "In one minute, tell us what makes you unique.",
            "What problem are you most excited to solve?",
            "How would your friends describe you?",
            "What's the most interesting thing you've worked on recently?",
            "Describe yourself in a way that goes beyond your resume.",
            "What's one thing you'd want your classmates to know about you on day one?",
            "Why are you ready for business school right now?",
        ],
    },
    "rotman": {
        "id": "rotman",
        "name": "Rotman School of Management",
        "format": "2 Videos + 1 Written",
        "questions": 3,
        "prep_time_sec": None,
        "response_time_sec": 90,
        "platform": "Kira Talent",
        "description": "Two timed video responses and one written response. Mix of behavioral and situational questions.",
        "behavioral_focus": True,
        "tips": [
            "Kira Talent records after a countdown — be ready immediately when recording starts.",
            "Rotman values integrative thinking. Show you can hold multiple perspectives.",
            "For situational questions, walk through your reasoning process explicitly.",
            "The written question lets you be more structured — use clear paragraphs.",
            "Practice with Kira's free demo to get comfortable with the platform.",
            "Keep your background clean and professional. Good lighting is essential.",
            "Rotman appreciates candidates who show intellectual curiosity.",
        ],
        "scoring_criteria": [
            "Integrative thinking and multi-perspective analysis",
            "Behavioral depth with specific examples",
            "Situational reasoning and problem-solving approach",
            "Written communication quality",
            "Professional presentation and poise",
        ],
        "practice_questions": [
            "Tell us about a time you had to consider multiple stakeholders' needs.",
            "Describe a situation where you had to think creatively to solve a problem.",
            "What's the most important lesson you've learned from a professional setback?",
            "How would you approach a situation where two team members have conflicting ideas?",
            "Tell us about a decision you made that required balancing short-term and long-term outcomes.",
            "Describe a time when you challenged conventional wisdom.",
            "What's the biggest risk you've taken in your career?",
            "How do you stay current with developments in your industry?",
            "Tell us about a time you had to deliver results under tight constraints.",
            "Describe a complex problem you broke down into manageable parts.",
        ],
    },
    "insead": {
        "id": "insead",
        "name": "INSEAD",
        "format": "4 Short Videos",
        "questions": 4,
        "prep_time_sec": 30,
        "response_time_sec": 60,
        "platform": "Kira Talent",
        "description": "Four behavioral video questions via Kira Talent. 30 seconds prep, 60 seconds response each.",
        "behavioral_focus": True,
        "tips": [
            "Four questions is a lot — prepare diverse examples that don't overlap.",
            "INSEAD values international mindset. Weave in cross-cultural experiences naturally.",
            "60 seconds per answer means tight structure: answer → example → insight.",
            "Kira records after the prep timer — the transition is automatic, so be ready.",
            "INSEAD is looking for 'diversity of experience and thought' — show range.",
            "Energy and warmth matter. INSEAD's culture is dynamic and social.",
            "Practice all four back-to-back to build endurance.",
        ],
        "scoring_criteria": [
            "Cross-cultural awareness and international mindset",
            "Behavioral specificity and depth",
            "Communication energy and warmth",
            "Consistency and range across four responses",
            "Alignment with INSEAD's values of diversity and entrepreneurial spirit",
        ],
        "practice_questions": [
            "Tell us about a time you worked effectively with someone from a different cultural background.",
            "Describe a professional achievement you're most proud of.",
            "How have you demonstrated leadership outside of your job title?",
            "Tell us about a time you had to adapt to a completely new environment.",
            "Describe a situation where you turned a setback into an opportunity.",
            "What's the most valuable thing you've learned from working internationally?",
            "Tell us about a time you had to make a quick decision with limited data.",
            "How would your colleagues from different cultures describe working with you?",
            "Describe a time when you brought together people with different viewpoints.",
            "What's one experience that fundamentally changed your worldview?",
        ],
    },
    "lbs": {
        "id": "lbs",
        "name": "London Business School",
        "format": "Video Assessment",
        "questions": 2,
        "prep_time_sec": 30,
        "response_time_sec": 60,
        "platform": "Kira Talent",
        "description": "Video assessment through Kira Talent. Behavioral questions with 30 seconds prep and 60 seconds response.",
        "behavioral_focus": True,
        "tips": [
            "LBS values global perspective and entrepreneurial drive — bring both.",
            "Questions tend to focus on leadership, teamwork, and adaptability.",
            "Keep answers structured but conversational. Avoid sounding scripted.",
            "LBS culture is highly social and network-driven. Show you'd be a connector.",
            "Practice with Kira's interface — the recording starts automatically after prep.",
            "Good audio quality matters as much as video. Use a quiet room.",
            "LBS is in London — showing awareness of operating in a global hub helps.",
        ],
        "scoring_criteria": [
            "Leadership potential and examples",
            "Global mindset and cultural awareness",
            "Communication clarity and confidence",
            "Entrepreneurial thinking",
            "Fit with LBS's collaborative, internationally diverse community",
        ],
        "practice_questions": [
            "Tell us about a time you led a project with global stakeholders.",
            "Describe a situation where you demonstrated entrepreneurial thinking.",
            "How have you contributed to building a team culture?",
            "Tell us about a time you navigated ambiguity successfully.",
            "What's the most impactful feedback you've received and how did you act on it?",
            "Describe a professional challenge that required you to step outside your comfort zone.",
            "How do you build relationships in a new environment?",
            "Tell us about a time you had to influence without formal authority.",
            "Describe a moment when you demonstrated resilience.",
            "What would you bring to the LBS community?",
        ],
    },
}

# ── Shared Tips ──────────────────────────────────────────────────────────────

GENERAL_TIPS: dict[str, list[str]] = {
    "body_language": [
        "Sit up straight with shoulders back — confident posture reads well on camera.",
        "Use natural hand gestures within the frame to emphasize points.",
        "Lean slightly forward to show engagement.",
        "Avoid crossing your arms or fidgeting with objects.",
    ],
    "eye_contact": [
        "Look directly at the camera lens, not at your own image on screen.",
        "Place a small sticker or note near the camera to remind yourself where to look.",
        "It's okay to briefly look away when thinking — just return to the camera.",
    ],
    "lighting": [
        "Face a window or place a ring light directly behind your screen.",
        "Avoid overhead-only lighting — it creates unflattering shadows.",
        "Test your setup by recording a 10-second clip and reviewing it.",
    ],
    "audio": [
        "Use a quiet room — turn off fans, notifications, and close windows.",
        "A headset or external mic beats a laptop mic every time.",
        "Speak at a natural pace. Nervousness speeds you up — consciously slow down.",
    ],
    "background": [
        "Choose a clean, uncluttered background. A plain wall or bookshelf works well.",
        "Avoid virtual backgrounds — they can glitch and look unprofessional.",
        "Remove anything distracting or personal from the frame.",
    ],
    "pacing": [
        "Front-load your answer. State your main point first, then elaborate.",
        "Use the prep time to outline 2-3 bullet points, not a full script.",
        "If you finish early, that's fine. Don't ramble to fill time.",
        "Practice with a real timer — your internal clock is unreliable under pressure.",
    ],
}


# ── Request Models ───────────────────────────────────────────────────────────

class PracticeQuestionsRequest(BaseModel):
    school_id: str
    count: int = 3


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/schools")
def list_video_essay_schools() -> dict:
    """Returns all schools that require video essays with format details."""
    schools = []
    for school in SCHOOLS.values():
        schools.append({
            "id": school["id"],
            "name": school["name"],
            "format": school["format"],
            "questions": school["questions"],
            "prep_time_sec": school["prep_time_sec"],
            "response_time_sec": school["response_time_sec"],
            "platform": school["platform"],
            "description": school["description"],
            "behavioral_focus": school["behavioral_focus"],
        })
    return {"schools": schools, "total": len(schools)}


@router.get("/tips/{school_id}")
def get_school_tips(school_id: str) -> dict:
    """Returns school-specific tips, common questions, and scoring criteria."""
    school = SCHOOLS.get(school_id.strip().lower())
    if not school:
        available = list(SCHOOLS.keys())
        raise HTTPException(
            404,
            detail=f"School '{school_id}' not found. Available: {', '.join(available)}",
        )
    return {
        "school_id": school["id"],
        "school_name": school["name"],
        "tips": school["tips"],
        "scoring_criteria": school["scoring_criteria"],
        "practice_questions": school["practice_questions"],
        "general_tips": GENERAL_TIPS,
        "format": {
            "questions": school["questions"],
            "prep_time_sec": school["prep_time_sec"],
            "response_time_sec": school["response_time_sec"],
            "platform": school["platform"],
        },
    }


@router.post("/practice-questions")
def get_practice_questions(req: PracticeQuestionsRequest) -> dict:
    """Returns random practice questions for a given school."""
    school = SCHOOLS.get(req.school_id.strip().lower())
    if not school:
        available = list(SCHOOLS.keys())
        raise HTTPException(
            404,
            detail=f"School '{req.school_id}' not found. Available: {', '.join(available)}",
        )
    count = max(1, min(req.count, len(school["practice_questions"])))
    questions = random.sample(school["practice_questions"], count)
    return {
        "school_id": school["id"],
        "school_name": school["name"],
        "questions": questions,
        "prep_time_sec": school["prep_time_sec"],
        "response_time_sec": school["response_time_sec"],
    }
