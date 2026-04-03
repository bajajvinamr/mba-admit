"""Redis caching layer.

Falls back to in-memory LRU cache when Redis is unavailable.
All cache operations are non-blocking — failures never crash the app.
"""

import os
import time
import asyncio
from typing import Optional

from logging_config import setup_logging

logger = setup_logging()

# ── Redis Singleton ──────────────────────────────────────────────────────────

_redis_client = None
_redis_available: Optional[bool] = None  # None = not yet tested


def get_redis():
    """Return the async Redis client singleton. Creates on first call."""
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    try:
        import redis.asyncio as aioredis

        url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
        _redis_client = aioredis.from_url(
            url,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
            retry_on_timeout=True,
        )
        logger.info("Redis client created for %s", url)
        return _redis_client
    except Exception as e:
        logger.warning("Redis client creation failed: %s — using in-memory fallback", e)
        return None


# ── In-Memory Fallback ───────────────────────────────────────────────────────

# Simple dict with TTL: key -> (value, expires_at)
_MEMORY_CACHE: dict[str, tuple[str, float]] = {}
_MEMORY_CACHE_MAX = 2000  # Max entries to prevent unbounded growth


def _memory_get(key: str) -> Optional[str]:
    """Get from in-memory cache, respecting TTL."""
    entry = _MEMORY_CACHE.get(key)
    if entry is None:
        return None
    value, expires_at = entry
    if time.time() > expires_at:
        _MEMORY_CACHE.pop(key, None)
        return None
    return value


def _memory_set(key: str, value: str, ttl: int = 300) -> None:
    """Set in-memory cache entry with TTL."""
    # Evict expired entries if cache is getting large
    if len(_MEMORY_CACHE) >= _MEMORY_CACHE_MAX:
        now = time.time()
        expired = [k for k, (_, exp) in _MEMORY_CACHE.items() if now > exp]
        for k in expired:
            _MEMORY_CACHE.pop(k, None)
        # If still too large, drop oldest 25%
        if len(_MEMORY_CACHE) >= _MEMORY_CACHE_MAX:
            to_drop = sorted(_MEMORY_CACHE, key=lambda k: _MEMORY_CACHE[k][1])[: _MEMORY_CACHE_MAX // 4]
            for k in to_drop:
                _MEMORY_CACHE.pop(k, None)

    _MEMORY_CACHE[key] = (value, time.time() + ttl)


def _memory_delete(key: str) -> None:
    """Delete from in-memory cache."""
    _MEMORY_CACHE.pop(key, None)


def _memory_delete_pattern(pattern: str) -> int:
    """Delete in-memory keys matching a glob-style pattern (supports * only)."""
    import fnmatch

    keys = [k for k in _MEMORY_CACHE if fnmatch.fnmatch(k, pattern)]
    for k in keys:
        _MEMORY_CACHE.pop(k, None)
    return len(keys)


# ── Async Cache Operations ───────────────────────────────────────────────────


async def _is_redis_available() -> bool:
    """Test Redis connectivity. Caches result for fast subsequent checks."""
    global _redis_available
    client = get_redis()
    if client is None:
        _redis_available = False
        return False
    try:
        await client.ping()
        _redis_available = True
        return True
    except Exception:
        _redis_available = False
        return False


async def cache_get(key: str) -> Optional[str]:
    """Get a cached value by key. Returns None on miss or error."""
    global _redis_available
    try:
        client = get_redis()
        if client is not None and _redis_available is not False:
            result = await client.get(key)
            if result is not None:
                return result
            # Redis is up but key not found — don't fall through to memory
            if _redis_available is True:
                return None
    except Exception as e:
        _redis_available = False
        logger.debug("Redis GET failed for %s: %s — falling back to memory", key, e)

    # Fallback to in-memory
    return _memory_get(key)


async def cache_set(key: str, value: str, ttl: int = 300) -> None:
    """Set a cached value with TTL. Fire-and-forget, never raises."""
    global _redis_available
    try:
        client = get_redis()
        if client is not None and _redis_available is not False:
            await client.set(key, value, ex=ttl)
            return
    except Exception as e:
        _redis_available = False
        logger.debug("Redis SET failed for %s: %s — falling back to memory", key, e)

    # Fallback to in-memory
    _memory_set(key, value, ttl)


async def cache_delete(key: str) -> None:
    """Delete a cached key. Never raises."""
    try:
        client = get_redis()
        if client is not None and _redis_available is not False:
            await client.delete(key)
    except Exception as e:
        logger.debug("Redis DELETE failed for %s: %s", key, e)

    # Always clean in-memory too (may have stale fallback data)
    _memory_delete(key)


async def cache_delete_pattern(pattern: str) -> None:
    """Delete all keys matching a glob pattern. Never raises."""
    try:
        client = get_redis()
        if client is not None and _redis_available is not False:
            cursor = 0
            while True:
                cursor, keys = await client.scan(cursor=cursor, match=pattern, count=100)
                if keys:
                    await client.delete(*keys)
                if cursor == 0:
                    break
    except Exception as e:
        logger.debug("Redis DELETE pattern failed for %s: %s", pattern, e)

    # Always clean in-memory too
    _memory_delete_pattern(pattern)


# ── Health Check ─────────────────────────────────────────────────────────────


async def health_check() -> dict:
    """Return cache health status including Redis connectivity and latency."""
    result = {
        "backend": "memory",
        "status": "connected",
        "memory_entries": len(_MEMORY_CACHE),
    }

    client = get_redis()
    if client is None:
        result["redis"] = "unavailable (client not created)"
        return result

    try:
        start = time.time()
        await client.ping()
        latency_ms = round((time.time() - start) * 1000, 2)

        info = await client.info(section="memory")
        db_size = await client.dbsize()

        result.update({
            "backend": "redis",
            "status": "connected",
            "latency_ms": latency_ms,
            "redis_keys": db_size,
            "redis_memory_used": info.get("used_memory_human", "unknown"),
        })
    except Exception as e:
        result.update({
            "backend": "memory (redis down)",
            "status": "disconnected",
            "redis_error": str(e),
        })

    return result
