"""Middleware — rate limiting + global error handling.

Rate limits protect LLM-heavy endpoints from abuse.
Global error handler prevents 500s from leaking stack traces.
"""

import traceback
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
