import json
from langchain_core.messages import SystemMessage, HumanMessage

from agents import get_llm, SCHOOL_DB, HUMANIZER_RULES
from logging_config import setup_logging

logger = setup_logging()

def evaluate_consultant(profile: dict, consultant_output: list[dict]) -> dict:
    """Evaluates the Consultant agent's school tiering and probabilities."""
    llm = get_llm()
    
    system_prompt = """You are an LLM Judge evaluating an AI Admissions Consultant.
Your job is to review the Consultant's school tiering ('Safety', 'Target', 'Reach') and admission probabilities.
Are the tiers realistic given the applicant's profile (GMAT, GPA, Years of Exp)?
Are the probabilities overly optimistic or overly pessimistic?

PROFILE:
{profile}

CONSULTANT OUTPUT:
{output}

Return a JSON object with:
- "score": int (1-5), where 5 is highly realistic and logical, and 1 is completely misleading.
- "reasoning": A 2-sentence explanation of the score.
DO NOT return Markdown outside JSON."""

    try:
        response = llm.invoke([
            SystemMessage(content=system_prompt.format(
                profile=json.dumps(profile, indent=2),
                output=json.dumps(consultant_output, indent=2)
            ))
        ])
        
        content = response.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].strip()
            
        return json.loads(content)
    except Exception as e:
        logger.error("Judge failed on Consultant: %s", e)
        return {"score": 3, "reasoning": "Evaluation failed to parse."}


def evaluate_interviewer(school_name: str, history: list[dict]) -> dict:
    """Evaluates the Interviewer agent's tone, pacing, and questions."""
    llm = get_llm()
    
    system_prompt = f"""You are an LLM Judge evaluating an AI Admissions Interviewer for {school_name}.
Your job is to read the interview transcript and evaluate the AI's performance.

CRITERIA:
1. Tone: Is it professional, rigorous, and school-appropriate (e.g., HBS is aggressive, GSB is introspective)?
2. Follow-ups: Did the AI actually listen to the user and ask a logical, probing follow-up, or did it just ask a generic list of MBA questions?
3. Conciseness: Did the AI ask one question at a time without rambling?

TRANSCRIPT:
{{history}}

Return a JSON object with:
- "score": int (1-5), where 5 is an elite human-level interview and 1 is a generic chatbot.
- "reasoning": A 2-sentence explanation of the score.
DO NOT return Markdown outside JSON."""

    try:
        formatted_history = "\n".join([f"{msg['role'].upper()}: {msg['content']}" for msg in history])
        response = llm.invoke([
            SystemMessage(content=system_prompt.format(history=formatted_history))
        ])
        
        content = response.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].strip()
            
        return json.loads(content)
    except Exception as e:
        logger.error("Judge failed on Interviewer: %s", e)
        return {"score": 3, "reasoning": "Evaluation failed to parse."}


def evaluate_writer(school_name: str, prompt: str, essay: str, transcript: list[dict]) -> dict:
    """Evaluates the Writer agent against the 24 anti-AI Humanizer rules."""
    llm = get_llm()
    
    system_prompt = f"""You are an LLM Judge evaluating an AI MBA Admissions Writer.
Your sole purpose is to evaluate if the essay sounds like a human wrote it, or if it sounds like an AI.
Did the AI follow the 24 Humanizer Rules? (No 'delve', 'testament', 'showcase'. Simple copulas. Varied sentence length).
Did the AI successfully incorporate specific stories from the interview transcript into the essay, or did it make things up/stay abstract?

SCHOOL: {school_name}
PROMPT: {prompt}

HUMANIZER RULES TO CHECK AGAINST:
{HUMANIZER_RULES}

INTERVIEW TRANSCRIPT USED AS CONTEXT:
{{transcript}}

GENERATED ESSAY:
{{essay}}

Return a JSON object with:
- "score": int (1-5), where 5 is completely human and 1 is blatantly AI-generated fluff.
- "reasoning": A 2-sentence explanation. Point out any specific banned words if found.
DO NOT return Markdown outside JSON."""

    try:
        formatted_history = "\n".join([f"{msg['role'].upper()}: {msg['content']}" for msg in transcript])
        response = llm.invoke([
            SystemMessage(content=system_prompt.format(
                transcript=formatted_history,
                essay=essay
            ))
        ])
        
        content = response.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].strip()
            
        return json.loads(content)
    except Exception as e:
        logger.error("Judge failed on Writer: %s", e)
        return {"score": 3, "reasoning": "Evaluation failed to parse."}
