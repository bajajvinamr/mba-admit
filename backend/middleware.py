"""Middleware — rate limiting, caching headers, request timeouts, and global error handling.

Rate limits protect LLM-heavy endpoints from abuse.
Cache headers reduce latency for read-heavy school data.
Request timeouts prevent LLM calls from holding connections open indefinitely.
Global error handler prevents 500s from leaking stack traces.
"""

import asyncio
import traceback
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse
from logging_config import setup_logging

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


def setup_rate_limiter(app):
    """Attach rate limiter to the FastAPI app."""
    if not RATE_LIMIT_AVAILABLE or limiter is None:
        logger.info("Rate limiting skipped (slowapi not available)")
        return

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
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
