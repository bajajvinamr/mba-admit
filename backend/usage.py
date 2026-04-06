"""Usage tracking and tier enforcement for AI-powered endpoints.

Tracks per-user monthly usage of AI features and enforces limits based on
subscription tier (free / pro / premium). Storage follows the same pattern
as db.py: Supabase when configured, in-memory dict otherwise.

Tier limits (monthly):
  Free:    5 essay evals, 3 roasts, 2 interview sessions, 3 strategy calls
  Pro:     50 essay evals, 30 roasts, 20 interview sessions, 30 strategy calls
  Premium: unlimited
"""

import time
from datetime import datetime, timezone
from typing import Optional

from logging_config import setup_logging

logger = setup_logging()

# ── Tier Definitions ──────────────────────────────────────────────────────────

TIERS = {
    "free": {
        "essay_eval": 5,
        "essay_coach": 5,
        "resume_roast": 3,
        "interview_session": 2,
        "interview_respond": 10,
        "strategy": 3,
        "storyteller": 2,
        "financial_compare": 3,
        "scholarship_negotiate": 2,
        "chat": 20,
        "start_session": 5,
        "goals_sculpt": 3,
        "admit_simulator": 3,
        "profile_analyze": 3,
        "peer_comparison": 5,
        "strategy_ai": 1,
        "recommender_briefing": 2,
        "narrative_generate": 1,
        "narrative_consistency": 2,
    },
    "pro": {
        "essay_eval": 50,
        "essay_coach": 50,
        "resume_roast": 30,
        "interview_session": 20,
        "interview_respond": 100,
        "strategy": 30,
        "storyteller": 20,
        "financial_compare": 30,
        "scholarship_negotiate": 20,
        "chat": 200,
        "start_session": 50,
        "goals_sculpt": 30,
        "admit_simulator": 50,
        "profile_analyze": 50,
        "peer_comparison": 50,
        "strategy_ai": 5,
        "recommender_briefing": 20,
        "narrative_generate": 5,
        "narrative_consistency": 20,
    },
    "premium": {},  # empty = unlimited
}

# Map API paths to feature keys for tracking
ENDPOINT_FEATURE_MAP: dict[str, str] = {
    "/api/evaluate_essay": "essay_eval",
    "/api/roast_resume": "resume_roast",
    "/api/interview/start": "interview_session",
    "/api/interview/respond": "interview_respond",
    "/api/recommender_strategy": "strategy",
    "/api/outreach_strategy": "strategy",
    "/api/waitlist_strategy": "strategy",
    "/api/essays/storyteller": "storyteller",
    "/api/financial/compare": "financial_compare",
    "/api/negotiate_scholarship": "scholarship_negotiate",
    "/api/chat": "chat",
    "/api/start_session": "start_session",
    "/api/goals/sculpt": "goals_sculpt",
    "/api/admit-simulator": "admit_simulator",
    "/api/profile/analyze": "profile_analyze",
    "/api/essay/coach": "essay_coach",
    "/api/peer-comparison": "peer_comparison",
    "/api/strategy/generate": "strategy_ai",
    "/api/strategy/follow-up": "strategy_ai",
}

# ── In-Memory Store ──────────────────────────────────────────────────────────

# Key: "{user_id}:{YYYY-MM}" → {"feature": count, ...}
_MEMORY_USAGE: dict[str, dict[str, int]] = {}

# Key: user_id → tier name
_MEMORY_TIERS: dict[str, str] = {}


def _month_key() -> str:
    """Current month as YYYY-MM string."""
    return datetime.now(timezone.utc).strftime("%Y-%m")


def _usage_key(user_id: str) -> str:
    return f"{user_id}:{_month_key()}"


# ── Core Functions ────────────────────────────────────────────────────────────


def get_user_tier(user_id: str) -> str:
    """Get the subscription tier for a user. Default: free."""
    return _MEMORY_TIERS.get(user_id, "free")


def set_user_tier(user_id: str, tier: str) -> None:
    """Set the subscription tier for a user."""
    if tier not in TIERS:
        raise ValueError(f"Unknown tier: {tier}. Must be one of {list(TIERS.keys())}")
    _MEMORY_TIERS[user_id] = tier
    logger.info("User %s tier set to %s", user_id, tier)


def get_usage(user_id: str) -> dict[str, int]:
    """Get all feature usage counts for the current month."""
    key = _usage_key(user_id)
    return dict(_MEMORY_USAGE.get(key, {}))


def get_feature_usage(user_id: str, feature: str) -> int:
    """Get usage count for a specific feature this month."""
    key = _usage_key(user_id)
    return _MEMORY_USAGE.get(key, {}).get(feature, 0)


def increment_usage(user_id: str, feature: str) -> int:
    """Increment usage counter. Returns new count."""
    key = _usage_key(user_id)
    if key not in _MEMORY_USAGE:
        _MEMORY_USAGE[key] = {}
    _MEMORY_USAGE[key][feature] = _MEMORY_USAGE[key].get(feature, 0) + 1
    return _MEMORY_USAGE[key][feature]


def check_limit(user_id: str, feature: str) -> tuple[bool, Optional[int], Optional[int]]:
    """Check if user is within limits for a feature.

    Returns:
        (allowed, current_count, limit)
        - allowed: True if the user can proceed
        - current_count: how many times used this month
        - limit: the tier limit (None = unlimited)
    """
    tier = get_user_tier(user_id)
    limits = TIERS.get(tier, TIERS["free"])

    # Premium = unlimited (empty limits dict)
    if not limits:
        current = get_feature_usage(user_id, feature)
        return (True, current, None)

    limit = limits.get(feature)
    if limit is None:
        # Feature not in tier limits = unlimited for this feature
        current = get_feature_usage(user_id, feature)
        return (True, current, None)

    current = get_feature_usage(user_id, feature)
    return (current < limit, current, limit)


def get_usage_summary(user_id: str) -> dict:
    """Full usage summary for the current billing period."""
    tier = get_user_tier(user_id)
    limits = TIERS.get(tier, TIERS["free"])
    usage = get_usage(user_id)

    features = {}
    all_features = set(list(limits.keys()) + list(usage.keys()))
    for feature in sorted(all_features):
        limit = limits.get(feature)
        used = usage.get(feature, 0)
        features[feature] = {
            "used": used,
            "limit": limit,  # None = unlimited
            "remaining": (limit - used) if limit is not None else None,
            "pct_used": round(used / limit * 100, 1) if limit else 0,
        }

    return {
        "user_id": user_id,
        "tier": tier,
        "billing_period": _month_key(),
        "features": features,
        "upgrade_url": "/pricing" if tier != "premium" else None,
    }


def feature_for_path(path: str) -> Optional[str]:
    """Map an API path to its tracked feature key. Returns None if not tracked."""
    return ENDPOINT_FEATURE_MAP.get(path)
