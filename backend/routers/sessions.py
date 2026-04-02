"""Application session endpoints — start, chat, unlock, state."""

from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Dict, Any
from agents import run_agent_graph, ApplicationState, AgentType
from models import StartSessionRequest, ChatMessageRequest, PaymentRequest
from auth import get_optional_user
from middleware import rate_limit
from guardrails import sanitize_for_llm, MAX_CHAT_CHARS, MAX_FIELD_CHARS
import db

router = APIRouter(prefix="/api", tags=["sessions"])


def _session_to_state(session: Dict[str, Any]) -> ApplicationState:
    """Convert a DB session dict to the ApplicationState TypedDict."""
    return {
        "profile": session.get("profile", {}),
        "target_school_id": session.get("school_id", ""),
        "match_scores": session.get("match_scores", []),
        "interview_history": session.get("interview_history", []),
        "drafts": session.get("drafts", {}),
        "current_agent": AgentType(session.get("current_agent", "idle")),
        "status_message": session.get("status_message", ""),
        "is_paid": session.get("is_paid", False),
    }


def _state_to_updates(state: ApplicationState) -> Dict[str, Any]:
    """Convert ApplicationState back to DB update dict."""
    return {
        "profile": state["profile"],
        "match_scores": state["match_scores"],
        "interview_history": state["interview_history"],
        "drafts": state["drafts"],
        "current_agent": state["current_agent"].value if hasattr(state["current_agent"], "value") else state["current_agent"],
        "status_message": state["status_message"],
        "is_paid": state["is_paid"],
    }


@router.post("/start_session")
@rate_limit("10/minute")
def start_session(request: Request, req: StartSessionRequest, user: Dict = Depends(get_optional_user)):
    """Initialize a new application session for a specific school."""
    try:
        name = sanitize_for_llm(req.name, MAX_FIELD_CHARS, "name")
        industry = sanitize_for_llm(req.industry_background, MAX_FIELD_CHARS, "industry background")
        leadership = sanitize_for_llm(req.leadership_roles, MAX_FIELD_CHARS, "leadership roles")
    except ValueError as e:
        raise HTTPException(400, detail=str(e))

    profile = {
        "name": name,
        "gmat": req.gmat,
        "gpa": req.gpa,
        "industry_background": industry,
        "undergrad_tier": req.undergrad_tier,
        "leadership_roles": leadership,
        "target_intake": req.target_intake,
        "intl_experience": req.intl_experience,
        "community_service": req.community_service,
        "publications": req.publications,
    }

    user_id = user.get("sub") if user else None
    session = db.create_session(req.session_id, user_id, req.school_id, profile)

    state: ApplicationState = _session_to_state(session)
    new_state = run_agent_graph(state)

    db.update_session(req.session_id, _state_to_updates(new_state))
    return new_state


@router.get("/state/{session_id}")
def get_state(session_id: str):
    session = db.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return _session_to_state(session)


@router.post("/chat")
@rate_limit("20/minute")
def chat(request: Request, req: ChatMessageRequest):
    """Send a message in the Deep Interview."""
    session = db.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        message = sanitize_for_llm(req.message, MAX_CHAT_CHARS, "chat message")
    except ValueError as e:
        raise HTTPException(400, detail=str(e))

    state = _session_to_state(session)
    state["interview_history"].append({"role": "user", "content": message})
    new_state = run_agent_graph(state)

    db.update_session(req.session_id, _state_to_updates(new_state))
    return new_state


@router.post("/unlock")
def unlock_essays(req: PaymentRequest):
    """Unlock essay generation after Stripe payment verification."""
    import os
    import stripe

    session = db.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if not req.stripe_payment_intent_id:
        raise HTTPException(status_code=400, detail="Payment intent ID required")

    # Verify payment server-side with Stripe API
    stripe_key = os.environ.get("STRIPE_SECRET_KEY")
    if not stripe_key:
        raise HTTPException(status_code=503, detail="Payment processing unavailable")

    stripe.api_key = stripe_key
    try:
        intent = stripe.PaymentIntent.retrieve(req.stripe_payment_intent_id)
    except stripe.error.InvalidRequestError:
        raise HTTPException(status_code=400, detail="Invalid payment intent")
    except stripe.error.AuthenticationError:
        raise HTTPException(status_code=503, detail="Payment processing misconfigured")

    if intent.status != "succeeded":
        raise HTTPException(status_code=402, detail=f"Payment not completed (status: {intent.status})")

    db.create_payment(
        user_id=session.get("user_id", ""),
        session_id=req.session_id,
        stripe_checkout_session_id=req.stripe_payment_intent_id,
        amount_cents=intent.amount,
        product_type="consult_call",
    )
    db.update_payment_status(req.stripe_payment_intent_id, "succeeded")

    state = _session_to_state(session)
    state["is_paid"] = True
    new_state = run_agent_graph(state)

    db.update_session(req.session_id, _state_to_updates(new_state))
    return new_state
