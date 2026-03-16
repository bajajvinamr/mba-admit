"""Database layer — Supabase (production) or in-memory fallback (dev).

Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env to enable persistence.
Without them, falls back to an in-memory dict (sessions lost on restart).
"""

import os
import uuid
from typing import Dict, Any, Optional, List
from logging_config import setup_logging

logger = setup_logging()

# ── Supabase client (lazy-init) ───────────────────────────────────────────────

_supabase = None


def _get_supabase():
    global _supabase
    if _supabase is not None:
        return _supabase

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")

    if not url or not key:
        logger.info("Supabase not configured — using in-memory fallback")
        return None

    try:
        from supabase import create_client
        _supabase = create_client(url, key)
        logger.info("Connected to Supabase at %s", url)
        return _supabase
    except Exception as e:
        logger.error("Failed to connect to Supabase: %s — falling back to in-memory", e)
        return None


def is_persistent() -> bool:
    return _get_supabase() is not None


# ── In-memory fallback store ──────────────────────────────────────────────────

_MEMORY_SESSIONS: Dict[str, Dict[str, Any]] = {}
_MEMORY_USERS: Dict[str, Dict[str, Any]] = {}
_MEMORY_SCHOOL_LIST: Dict[str, List[Dict[str, Any]]] = {}
_MEMORY_DECISIONS: List[Dict[str, Any]] = []


# ── User CRUD ─────────────────────────────────────────────────────────────────

def get_or_create_user(email: str, name: Optional[str] = None) -> Dict[str, Any]:
    sb = _get_supabase()
    if sb:
        result = sb.table("users").select("*").eq("email", email).execute()
        if result.data:
            return result.data[0]
        new_user = {"email": email, "name": name or email.split("@")[0]}
        result = sb.table("users").insert(new_user).execute()
        return result.data[0]

    # In-memory fallback
    if email in _MEMORY_USERS:
        return _MEMORY_USERS[email]
    user = {"id": str(uuid.uuid4()), "email": email, "name": name or email.split("@")[0]}
    _MEMORY_USERS[email] = user
    return user


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Look up a user by email (for credential auth)."""
    sb = _get_supabase()
    if sb:
        result = sb.table("users").select("*").eq("email", email).execute()
        return result.data[0] if result.data else None

    return _MEMORY_USERS.get(email)


def create_user(email: str, name: str, password_hash: str) -> Dict[str, Any]:
    """Create a new user with a hashed password."""
    user = {"email": email, "name": name, "password_hash": password_hash}

    sb = _get_supabase()
    if sb:
        result = sb.table("users").insert(user).execute()
        return result.data[0]

    user["id"] = str(uuid.uuid4())
    _MEMORY_USERS[email] = user
    return user


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    sb = _get_supabase()
    if sb:
        result = sb.table("users").select("*").eq("id", user_id).execute()
        return result.data[0] if result.data else None

    for user in _MEMORY_USERS.values():
        if user["id"] == user_id:
            return user
    return None


# ── Session CRUD ──────────────────────────────────────────────────────────────

def create_session(session_id: str, user_id: Optional[str], school_id: str, profile: Dict) -> Dict[str, Any]:
    session = {
        "id": session_id,
        "user_id": user_id,
        "school_id": school_id,
        "profile": profile,
        "match_scores": [],
        "interview_history": [],
        "drafts": {},
        "current_agent": "idle",
        "status_message": "Session initialized.",
        "is_paid": False,
    }

    sb = _get_supabase()
    if sb:
        result = sb.table("application_sessions").insert(session).execute()
        return result.data[0]

    _MEMORY_SESSIONS[session_id] = session
    return session


def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    sb = _get_supabase()
    if sb:
        result = sb.table("application_sessions").select("*").eq("id", session_id).execute()
        return result.data[0] if result.data else None

    return _MEMORY_SESSIONS.get(session_id)


def update_session(session_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    sb = _get_supabase()
    if sb:
        result = sb.table("application_sessions").update(updates).eq("id", session_id).execute()
        return result.data[0] if result.data else None

    if session_id in _MEMORY_SESSIONS:
        _MEMORY_SESSIONS[session_id].update(updates)
        return _MEMORY_SESSIONS[session_id]
    return None


# ── Essay Version CRUD ────────────────────────────────────────────────────────

def save_essay_version(
    session_id: str,
    school_id: str,
    prompt_index: int,
    content: str,
    source: str = "ai_generated",
    evaluation: Optional[Dict] = None,
) -> Dict[str, Any]:
    sb = _get_supabase()

    # Determine next version number
    existing = get_essay_versions(session_id, school_id, prompt_index)
    next_version = max((e.get("version", 0) for e in existing), default=0) + 1

    essay = {
        "session_id": session_id,
        "school_id": school_id,
        "prompt_index": prompt_index,
        "version": next_version,
        "content": content,
        "source": source,
        "evaluation": evaluation,
    }

    if sb:
        result = sb.table("essay_versions").insert(essay).execute()
        return result.data[0]

    essay["id"] = str(uuid.uuid4())
    key = f"{session_id}:{school_id}:{prompt_index}"
    _MEMORY_SESSIONS.setdefault(f"_essays_{key}", []).append(essay)
    return essay


def get_essay_versions(
    session_id: str, school_id: str, prompt_index: int
) -> List[Dict[str, Any]]:
    sb = _get_supabase()
    if sb:
        result = (
            sb.table("essay_versions")
            .select("*")
            .eq("session_id", session_id)
            .eq("school_id", school_id)
            .eq("prompt_index", prompt_index)
            .order("version")
            .execute()
        )
        return result.data

    key = f"{session_id}:{school_id}:{prompt_index}"
    return _MEMORY_SESSIONS.get(f"_essays_{key}", [])


# ── Payment CRUD ──────────────────────────────────────────────────────────────

def create_payment(
    user_id: str,
    session_id: Optional[str],
    stripe_checkout_session_id: str,
    amount_cents: int,
    product_type: str,
    currency: str = "inr",
) -> Dict[str, Any]:
    payment = {
        "user_id": user_id,
        "session_id": session_id,
        "stripe_checkout_session_id": stripe_checkout_session_id,
        "amount_cents": amount_cents,
        "currency": currency,
        "status": "pending",
        "product_type": product_type,
    }

    sb = _get_supabase()
    if sb:
        result = sb.table("payments").insert(payment).execute()
        return result.data[0]

    payment["id"] = str(uuid.uuid4())
    _MEMORY_SESSIONS.setdefault("_payments", []).append(payment)
    return payment


def update_payment_status(stripe_checkout_session_id: str, status: str) -> Optional[Dict[str, Any]]:
    sb = _get_supabase()
    if sb:
        result = (
            sb.table("payments")
            .update({"status": status})
            .eq("stripe_checkout_session_id", stripe_checkout_session_id)
            .execute()
        )
        return result.data[0] if result.data else None

    for p in _MEMORY_SESSIONS.get("_payments", []):
        if p["stripe_checkout_session_id"] == stripe_checkout_session_id:
            p["status"] = status
            return p
    return None


# ── User School List CRUD ─────────────────────────────────────────────────────

def get_user_schools(user_id: str) -> List[Dict[str, Any]]:
    sb = _get_supabase()
    if sb:
        result = sb.table("user_school_list").select("*").eq("user_id", user_id).order("priority", desc=True).execute()
        return result.data

    return _MEMORY_SCHOOL_LIST.get(user_id, [])


def add_user_school(user_id: str, school_id: str, status: Optional[str] = None, round: Optional[str] = None, notes: Optional[str] = None, priority: int = 0) -> Dict[str, Any]:
    entry = {
        "user_id": user_id,
        "school_id": school_id,
        "round": round,
        "status": status or "researching",
        "notes": notes,
        "priority": priority,
    }

    sb = _get_supabase()
    if sb:
        result = sb.table("user_school_list").insert(entry).execute()
        return result.data[0]

    entry["id"] = str(uuid.uuid4())
    _MEMORY_SCHOOL_LIST.setdefault(user_id, []).append(entry)
    return entry


def update_user_school(entry_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    sb = _get_supabase()
    if sb:
        result = sb.table("user_school_list").update(updates).eq("id", entry_id).execute()
        return result.data[0] if result.data else None

    for schools in _MEMORY_SCHOOL_LIST.values():
        for s in schools:
            if s["id"] == entry_id:
                s.update(updates)
                return s
    return None


def delete_user_school(entry_id: str) -> bool:
    sb = _get_supabase()
    if sb:
        sb.table("user_school_list").delete().eq("id", entry_id).execute()
        return True

    for user_id, schools in _MEMORY_SCHOOL_LIST.items():
        _MEMORY_SCHOOL_LIST[user_id] = [s for s in schools if s["id"] != entry_id]
        return True
    return False


# ── Community Decisions CRUD ─────────────────────────────────────────────────

def submit_decision(decision: Dict[str, Any]) -> Dict[str, Any]:
    sb = _get_supabase()
    if sb:
        result = sb.table("community_decisions").insert(decision).execute()
        return result.data[0]

    decision["id"] = str(uuid.uuid4())
    _MEMORY_DECISIONS.append(decision)
    return decision


def get_community_decisions(
    school_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    sb = _get_supabase()
    if sb:
        q = sb.table("community_decisions").select("*")
        if school_id:
            q = q.eq("school_id", school_id)
        if status:
            q = q.eq("status", status)
        result = q.order("created_at", desc=True).limit(limit).execute()
        return result.data

    results = _MEMORY_DECISIONS
    if school_id:
        results = [d for d in results if d.get("school_id") == school_id]
    if status:
        results = [d for d in results if d.get("status") == status]
    return results[:limit]
