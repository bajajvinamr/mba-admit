"""Usage tracking and tier enforcement for AI-powered endpoints.

Tracks per-user monthly usage of AI features and enforces limits based on
subscription tier (free / pro / premium). Storage: Redis when available,
in-memory dict as fallback.

Redis keys:
  usage:{user_id}:{YYYY-MM}  — hash with feature names as fields, counts as values
  tier:{user_id}              — string with tier name

Tier limits (monthly):
  Free:    5 essay evals, 3 roasts, 2 interview sessions, 3 strategy calls
  Pro:     50 essay evals, 30 roasts, 20 interview sessions, 30 strategy calls
  Premium: unlimited
"""

import asyncio
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
}

# ── In-Memory Fallback Store ────────────────────────────────────────────────

# Key: "{user_id}:{YYYY-MM}" -> {"feature": count, ...}
_MEMORY_USAGE: dict[str, dict[str, int]] = {}

# Key: user_id -> tier name
_MEMORY_TIERS: dict[str, str] = {}


def _month_key() -> str:
    """Current month as YYYY-MM string."""
    return datetime.now(timezone.utc).strftime("%Y-%m")


def _usage_key(user_id: str) -> str:
    return f"{user_id}:{_month_key()}"


def _redis_usage_key(user_id: str) -> str:
    """Redis hash key for usage counters."""
    return f"usage:{user_id}:{_month_key()}"


def _redis_tier_key(user_id: str) -> str:
    """Redis string key for tier storage."""
    return f"tier:{user_id}"


# ── Redis Helpers ────────────────────────────────────────────────────────────

def _get_redis_sync():
    """Get Redis client, returning None if unavailable.

    Uses the async client from cache.py. All callers must handle None.
    """
    try:
        from cache import get_redis, _redis_available
        if _redis_available is False:
            return None
        return get_redis()
    except (ImportError, ConnectionError, OSError) as e:
        logger.warning("Redis sync client unavailable: %s", e)
        return None


def _run_async(coro):
    """Run an async coroutine from sync context. Returns None on failure.

    When called from inside a running event loop (e.g., middleware dispatch),
    falls back to None so callers use the in-memory store instead.
    Sync callers outside an event loop use asyncio.run().
    """
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        # Can't await from sync code inside a running loop.
        # Fall back to memory in this case and let async callers use the async variants.
        logger.debug("_run_async called inside running event loop — falling back to memory")
        return None
    else:
        try:
            return asyncio.run(coro)
        except (ConnectionError, OSError, asyncio.TimeoutError) as e:
            logger.warning("Async Redis operation failed: %s", e)
            return None
        except RuntimeError as e:
            logger.warning("Async runtime error in _run_async: %s", e)
            return None


# ── Core Functions (sync interface, Redis-backed with memory fallback) ──────


def get_user_tier(user_id: str) -> str:
    """Get the subscription tier for a user. Default: free."""
    # Try Redis first
    client = _get_redis_sync()
    if client is not None:
        try:
            result = _run_async(client.get(_redis_tier_key(user_id)))
            if result is not None:
                return result
        except (ConnectionError, OSError) as e:
            logger.warning("Redis get_user_tier failed for %s: %s", user_id, e)

    # Memory fallback
    return _MEMORY_TIERS.get(user_id, "free")


def set_user_tier(user_id: str, tier: str) -> None:
    """Set the subscription tier for a user."""
    if tier not in TIERS:
        raise ValueError(f"Unknown tier: {tier}. Must be one of {list(TIERS.keys())}")

    # Always set in memory (authoritative fallback)
    _MEMORY_TIERS[user_id] = tier

    # Try Redis
    client = _get_redis_sync()
    if client is not None:
        try:
            _run_async(client.set(_redis_tier_key(user_id), tier))
        except (ConnectionError, OSError) as e:
            logger.warning("Redis set_user_tier failed for %s: %s", user_id, e)

    logger.info("User %s tier set to %s", user_id, tier)


def get_usage(user_id: str) -> dict[str, int]:
    """Get all feature usage counts for the current month."""
    # Try Redis
    client = _get_redis_sync()
    if client is not None:
        try:
            result = _run_async(client.hgetall(_redis_usage_key(user_id)))
            if result is not None:
                return {k: int(v) for k, v in result.items()}
        except (ConnectionError, OSError, ValueError) as e:
            logger.warning("Redis get_usage failed for %s: %s", user_id, e)

    # Memory fallback
    key = _usage_key(user_id)
    return dict(_MEMORY_USAGE.get(key, {}))


def get_feature_usage(user_id: str, feature: str) -> int:
    """Get usage count for a specific feature this month."""
    # Try Redis
    client = _get_redis_sync()
    if client is not None:
        try:
            result = _run_async(client.hget(_redis_usage_key(user_id), feature))
            if result is not None:
                return int(result)
        except (ConnectionError, OSError, ValueError) as e:
            logger.warning("Redis get_feature_usage failed for %s/%s: %s", user_id, feature, e)

    # Memory fallback
    key = _usage_key(user_id)
    return _MEMORY_USAGE.get(key, {}).get(feature, 0)


def increment_usage(user_id: str, feature: str) -> int:
    """Increment usage counter. Returns new count."""
    # Always increment in memory (authoritative fallback)
    mem_key = _usage_key(user_id)
    if mem_key not in _MEMORY_USAGE:
        _MEMORY_USAGE[mem_key] = {}
    _MEMORY_USAGE[mem_key][feature] = _MEMORY_USAGE[mem_key].get(feature, 0) + 1
    mem_count = _MEMORY_USAGE[mem_key][feature]

    # Try Redis atomic increment
    client = _get_redis_sync()
    if client is not None:
        try:
            redis_key = _redis_usage_key(user_id)
            result = _run_async(client.hincrby(redis_key, feature, 1))
            if result is not None:
                # Set TTL on the hash (45 days to cover billing period + buffer)
                _run_async(client.expire(redis_key, 45 * 86400))
                return int(result)
        except (ConnectionError, OSError, ValueError) as e:
            logger.warning("Redis increment_usage failed for %s/%s: %s", user_id, feature, e)

    return mem_count


# ── Async Variants (for use from async middleware/handlers) ──────────────────


async def async_get_user_tier(user_id: str) -> str:
    """Async version of get_user_tier."""
    try:
        from cache import get_redis, _redis_available
        if _redis_available is not False:
            client = get_redis()
            if client is not None:
                result = await client.get(_redis_tier_key(user_id))
                if result is not None:
                    return result
    except (ImportError, ConnectionError, OSError) as e:
        logger.warning("Redis async_get_user_tier failed for %s: %s", user_id, e)
    return _MEMORY_TIERS.get(user_id, "free")


async def async_get_feature_usage(user_id: str, feature: str) -> int:
    """Async version of get_feature_usage."""
    try:
        from cache import get_redis, _redis_available
        if _redis_available is not False:
            client = get_redis()
            if client is not None:
                result = await client.hget(_redis_usage_key(user_id), feature)
                if result is not None:
                    return int(result)
    except (ImportError, ConnectionError, OSError, ValueError) as e:
        logger.warning("Redis async_get_feature_usage failed for %s/%s: %s", user_id, feature, e)
    key = _usage_key(user_id)
    return _MEMORY_USAGE.get(key, {}).get(feature, 0)


async def async_increment_usage(user_id: str, feature: str) -> int:
    """Async version of increment_usage. Uses HINCRBY for atomic increment."""
    # Always increment in memory
    mem_key = _usage_key(user_id)
    if mem_key not in _MEMORY_USAGE:
        _MEMORY_USAGE[mem_key] = {}
    _MEMORY_USAGE[mem_key][feature] = _MEMORY_USAGE[mem_key].get(feature, 0) + 1
    mem_count = _MEMORY_USAGE[mem_key][feature]

    try:
        from cache import get_redis, _redis_available
        if _redis_available is not False:
            client = get_redis()
            if client is not None:
                redis_key = _redis_usage_key(user_id)
                result = await client.hincrby(redis_key, feature, 1)
                await client.expire(redis_key, 45 * 86400)
                return int(result)
    except (ImportError, ConnectionError, OSError) as e:
        logger.warning("Redis async_increment_usage failed for %s/%s: %s", user_id, feature, e)

    return mem_count


async def async_check_limit(user_id: str, feature: str) -> tuple[bool, Optional[int], Optional[int]]:
    """Async version of check_limit."""
    tier = await async_get_user_tier(user_id)
    limits = TIERS.get(tier, TIERS["free"])

    if not limits:
        current = await async_get_feature_usage(user_id, feature)
        return (True, current, None)

    limit = limits.get(feature)
    if limit is None:
        current = await async_get_feature_usage(user_id, feature)
        return (True, current, None)

    current = await async_get_feature_usage(user_id, feature)
    return (current < limit, current, limit)


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
