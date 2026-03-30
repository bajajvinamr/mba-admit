"""Middleware — rate limiting, caching headers, Redis cache, request timeouts, usage tracking, and global error handling.

Rate limits protect LLM-heavy endpoints from abuse.
Cache headers reduce latency for read-heavy school data.
Redis cache middleware serves responses from cache for read-heavy GET endpoints.
Request timeouts prevent LLM calls from holding connections open indefinitely.
Usage tracking enforces per-tier monthly limits on AI features.
Global error handler prevents 500s from leaking stack traces.
"""

import asyncio
import json
import os
import traceback
import hashlib
from urllib.parse import urlencode
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from fastapi import Request
from fastapi.responses import JSONResponse
from logging_config import setup_logging
from usage import feature_for_path, check_limit, increment_usage, async_check_limit, async_increment_usage, async_get_user_tier

logger = setup_logging()


# ── Rate Limiter ──────────────────────────────────────────────────────────────

try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded

    limiter = Limiter(key_func=get_remote_address)
    RATE_LIMIT_AVAILABLE = True
except ImportError:
    limiter = None
    RATE_LIMIT_AVAILABLE = False
    logger.warning("slowapi not installed — rate limiting disabled")


def rate_limit(limit_string: str):
    """Decorator: apply rate limit if slowapi is installed, no-op otherwise."""
    if RATE_LIMIT_AVAILABLE and limiter is not None:
        return limiter.limit(limit_string)
    return lambda f: f


if RATE_LIMIT_AVAILABLE:
    def _custom_rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
        """Custom handler for rate limit exceeded that includes Retry-After header."""
        retry_after = getattr(exc, "retry_after", 60)
        detail = str(exc.detail) if hasattr(exc, "detail") else "Rate limit exceeded"
        response = JSONResponse(
            status_code=429,
            content={"detail": detail},
        )
        response.headers["Retry-After"] = str(retry_after)
        return response


def setup_rate_limiter(app):
    """Attach rate limiter to the FastAPI app."""
    if not RATE_LIMIT_AVAILABLE or limiter is None:
        logger.info("Rate limiting skipped (slowapi not available)")
        return

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _custom_rate_limit_exceeded_handler)
    logger.info("Rate limiting enabled")


# ── Request Timeout Middleware ────────────────────────────────────────────────

# LLM-calling POST endpoints get a longer timeout than quick data fetches.
# Pattern → timeout in seconds. Matched by prefix.
LLM_ENDPOINTS: set[str] = {
    "/api/start_session",
    "/api/chat",
    "/api/unlock",
    "/api/roast_resume",
    "/api/evaluate_essay",
    "/api/recommender_strategy",
    "/api/interview/start",
    "/api/interview/respond",
    "/api/goals/sculpt",
    "/api/outreach_strategy",
    "/api/waitlist_strategy",
    "/api/financial/compare",
    "/api/negotiate_scholarship",
    "/api/essays/storyteller",
    "/api/essay/coach",
}

DEFAULT_TIMEOUT_S = 30    # Quick data endpoints
LLM_TIMEOUT_S = 90       # LLM endpoints — generous to allow Claude to finish


class RequestTimeoutMiddleware(BaseHTTPMiddleware):
    """Abort requests that exceed a time budget.

    LLM endpoints get 90s; everything else gets 30s.
    Returns 504 Gateway Timeout on expiry.
    """

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        timeout = LLM_TIMEOUT_S if path in LLM_ENDPOINTS else DEFAULT_TIMEOUT_S

        try:
            return await asyncio.wait_for(call_next(request), timeout=timeout)
        except asyncio.TimeoutError:
            logger.warning("Request timeout (%ds) on %s %s", timeout, request.method, path)
            return JSONResponse(
                status_code=504,
                content={"detail": f"Request timed out after {timeout}s. Please try again."},
            )


def setup_request_timeout(app):
    """Attach request timeout middleware to the FastAPI app."""
    app.add_middleware(RequestTimeoutMiddleware)
    logger.info("Request timeout middleware enabled (default=%ds, LLM=%ds)", DEFAULT_TIMEOUT_S, LLM_TIMEOUT_S)


# ── Cache Headers Middleware ─────────────────────────────────────────────────

# Read-heavy GET endpoints that change infrequently.
# Pattern → (max-age, stale-while-revalidate) in seconds.
CACHE_RULES: dict[str, tuple[int, int]] = {
    "/api/schools": (60, 300),           # school list — fresh for 1 min, stale OK for 5 min
    "/api/stats": (300, 600),            # platform stats — 5 min fresh
    "/health": (10, 30),                 # health check — 10s fresh
    "/api/schools/geo-meta": (3600, 7200),  # geo meta — 1 hour fresh
    "/api/upcoming-deadlines": (300, 600),  # deadlines — 5 min fresh
    "/api/schools/application-fees": (300, 600),
    "/api/recommendations": (120, 600),       # recommendations — personalized but cacheable
    "/api/community/decisions": (300, 600),   # community decisions — 5 min fresh
    "/api/schools/names": (300, 600),        # lightweight names endpoint — 5 min fresh
}

# Prefix match for dynamic school detail pages: /api/schools/{id}
SCHOOL_DETAIL_CACHE = (120, 600)  # 2 min fresh, 10 min stale


class CacheHeaderMiddleware(BaseHTTPMiddleware):
    """Adds Cache-Control headers to GET responses for cacheable endpoints."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if request.method != "GET" or response.status_code >= 400:
            return response

        path = request.url.path

        # Exact match first
        if path in CACHE_RULES:
            max_age, stale = CACHE_RULES[path]
            response.headers["Cache-Control"] = (
                f"public, max-age={max_age}, stale-while-revalidate={stale}"
            )
            return response

        # School detail pages: /api/schools/{slug} (not /api/schools itself)
        if path.startswith("/api/schools/") and path.count("/") == 3:
            max_age, stale = SCHOOL_DETAIL_CACHE
            response.headers["Cache-Control"] = (
                f"public, max-age={max_age}, stale-while-revalidate={stale}"
            )
            return response

        # Default: no-store for uncached endpoints
        if "Cache-Control" not in response.headers:
            response.headers["Cache-Control"] = "no-store"

        return response


def setup_cache_headers(app):
    """Attach cache header middleware to the FastAPI app."""
    app.add_middleware(CacheHeaderMiddleware)
    logger.info("Cache-Control headers middleware enabled")


# ── Redis Cache Middleware ─────────────────────────────────────────────────

# TTL for Redis-cached responses (seconds). Uses the same CACHE_RULES map above.
# Only GET endpoints in CACHE_RULES or school detail pages are Redis-cached.

_API_VERSION = os.environ.get("API_VERSION", "1")


def _build_cache_key(request: Request) -> str:
    """Build a deterministic cache key from API version + path + sorted query params."""
    path = request.url.path
    params = sorted(request.query_params.items())
    param_str = urlencode(params) if params else ""
    return f"http_cache:v{_API_VERSION}:{path}:{param_str}"


def _get_redis_ttl(path: str) -> int | None:
    """Return the Redis TTL for a path, or None if it should not be cached."""
    if path in CACHE_RULES:
        max_age, _ = CACHE_RULES[path]
        return max_age
    # School detail pages
    if path.startswith("/api/schools/") and path.count("/") == 3:
        max_age, _ = SCHOOL_DETAIL_CACHE
        return max_age
    return None


class RedisCacheMiddleware(BaseHTTPMiddleware):
    """Serve GET responses from Redis cache when available.

    Sits in front of the CacheHeaderMiddleware and route handlers.
    On cache hit: returns the cached JSON response immediately.
    On cache miss: calls the next handler, then caches 2xx responses.
    """

    async def dispatch(self, request: Request, call_next):
        # Only cache GET requests
        if request.method != "GET":
            return await call_next(request)

        ttl = _get_redis_ttl(request.url.path)
        if ttl is None:
            return await call_next(request)

        from cache import cache_get, cache_set

        cache_key = _build_cache_key(request)

        # ── Try cache hit ──
        try:
            cached = await cache_get(cache_key)
            if cached is not None:
                data = json.loads(cached)
                return JSONResponse(
                    content=data["body"],
                    status_code=data["status"],
                    headers={**data.get("headers", {}), "X-Cache": "HIT"},
                )
        except (ConnectionError, OSError) as e:
            logger.warning("Redis cache read failed for %s: %s", cache_key, e)
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logger.warning("Cache data corrupted for %s: %s", cache_key, e)

        # ── Cache miss — call handler ──
        response = await call_next(request)

        # Only cache successful responses
        if 200 <= response.status_code < 300:
            try:
                # Read the streaming response body
                body_bytes = b""
                async for chunk in response.body_iterator:
                    if isinstance(chunk, str):
                        body_bytes += chunk.encode("utf-8")
                    else:
                        body_bytes += chunk

                body_json = json.loads(body_bytes)

                # Cache the response
                cache_data = json.dumps({
                    "body": body_json,
                    "status": response.status_code,
                    "headers": {
                        k: v for k, v in response.headers.items()
                        if k.lower() in ("content-type", "cache-control")
                    },
                })
                # Fire-and-forget cache set (don't await in critical path if it's slow)
                await cache_set(cache_key, cache_data, ttl=ttl)

                # Return a new response since we consumed the body iterator
                return Response(
                    content=body_bytes,
                    status_code=response.status_code,
                    headers={**dict(response.headers), "X-Cache": "MISS"},
                    media_type=response.media_type,
                )
            except Exception as e:
                logger.debug("Redis cache store failed: %s", e)
                # If we consumed the body but failed to cache, we need to return what we have
                try:
                    return Response(
                        content=body_bytes,
                        status_code=response.status_code,
                        headers=dict(response.headers),
                        media_type=response.media_type,
                    )
                except (ConnectionError, OSError, ValueError) as e:
                    logger.warning("Failed to return cached response body: %s", e)

        return response


def setup_redis_cache(app):
    """Attach Redis cache middleware to the FastAPI app."""
    app.add_middleware(RedisCacheMiddleware)
    logger.info("Redis cache middleware enabled")


# ── Usage Tracking Middleware ────────────────────────────────────────────────


def _get_user_id(request: Request) -> str:
    """Extract user ID from JWT or fall back to IP address.

    Mirrors the logic in auth.get_optional_user so that the same user ID
    is used for both tracking and reporting.
    """
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            from auth import _decode_token
            claims = _decode_token(auth_header[7:])
            if claims and claims.get("sub"):
                return claims["sub"]
        except (ImportError, RuntimeError, ValueError) as e:
            logger.warning("Failed to decode JWT for usage tracking: %s", e)
    # Dev mode: no JWT secret = always "dev-user" (matches auth.get_optional_user)
    import os
    if not os.environ.get("NEXTAUTH_SECRET"):
        return "dev-user"
    # Production fallback: IP-based tracking for anonymous users
    return f"anon:{request.client.host}" if request.client else "anon:unknown"


class UsageTrackingMiddleware(BaseHTTPMiddleware):
    """Enforce per-tier usage limits on AI-powered endpoints.

    Only applies to POST requests to endpoints listed in ENDPOINT_FEATURE_MAP.
    Returns 429 with upgrade info when a limit is exceeded.
    Increments the counter after a successful response.
    """

    async def dispatch(self, request: Request, call_next):
        # Only check POST requests to tracked endpoints
        if request.method != "POST":
            return await call_next(request)

        feature = feature_for_path(request.url.path)
        if not feature:
            return await call_next(request)

        user_id = _get_user_id(request)
        allowed, current, limit = await async_check_limit(user_id, feature)

        if not allowed:
            tier = await async_get_user_tier(user_id)
            logger.info(
                "Usage limit hit: user=%s tier=%s feature=%s (%d/%d)",
                user_id, tier, feature, current, limit,
            )
            response = JSONResponse(
                status_code=429,
                content={
                    "detail": f"Monthly limit reached for this feature ({current}/{limit}).",
                    "feature": feature,
                    "tier": tier,
                    "used": current,
                    "limit": limit,
                    "upgrade_url": "/pricing",
                },
            )
            response.headers["Retry-After"] = "86400"  # Suggest retry after 1 day (monthly limit)
            return response

        response = await call_next(request)

        # Only count successful requests (not validation errors, etc.)
        if response.status_code < 400:
            new_count = await async_increment_usage(user_id, feature)
            logger.debug("Usage: user=%s feature=%s count=%d", user_id, feature, new_count)

        return response


def setup_usage_tracking(app):
    """Attach usage tracking middleware to the FastAPI app."""
    app.add_middleware(UsageTrackingMiddleware)
    logger.info("Usage tracking middleware enabled")


# ── Global Exception Handler ─────────────────────────────────────────────────

async def global_exception_handler(request: Request, exc: Exception):
    """Catch unhandled exceptions, log them, return clean 500."""
    logger.error(
        "Unhandled exception on %s %s: %s\n%s",
        request.method,
        request.url.path,
        str(exc),
        traceback.format_exc(),
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again."},
    )
