"""Chief of Staff — MBA Admissions API v2

Slim entrypoint: app setup + router registration.
All endpoints live in routers/*.py.
"""

import os

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from logging_config import setup_logging

from middleware import setup_rate_limiter, setup_cache_headers, setup_request_timeout, setup_usage_tracking, global_exception_handler

logger = setup_logging()

app = FastAPI(title="Chief of Staff — MBA Admissions API v2")

# ── Middleware ─────────────────────────────────────────────────────────────────

setup_rate_limiter(app)
setup_cache_headers(app)
setup_request_timeout(app)
setup_usage_tracking(app)
app.add_middleware(GZipMiddleware, minimum_size=1000)  # Compress responses > 1KB
app.add_exception_handler(Exception, global_exception_handler)

# ── CORS ───────────────────────────────────────────────────────────────────────

ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001,https://mba-admit.vercel.app").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# ── Routers ────────────────────────────────────────────────────────────────────

from routers.auth_routes import router as auth_router
from routers.schools import router as schools_router
from routers.sessions import router as sessions_router
from routers.user import router as user_router
from routers.features import router as features_router
from routers.scraper import router as scraper_router
from routers.recommendations import router as recommendations_router
from routers.essays import router as essays_router
from routers.interview import router as interview_router
from routers.strategy import router as strategy_router
from routers.community import router as community_router
from routers.financial import router as financial_router
from routers.school_data import router as school_data_router
from routers.profile import router as profile_router
from routers.applicant_data import router as applicant_data_router
from routers.simulator import router as simulator_router
from routers.search import router as search_router
from routers.outcomes import router as outcomes_router
from routers.essay_themes import router as essay_themes_router
from routers.recommenders import router as recommenders_router
from routers.financial_aid import router as financial_aid_router
from routers.career import router as career_router
from routers.countries import router as countries_router
from routers.interview_guides import router as interview_guides_router
from routers.peer_comparison import router as peer_comparison_router
from routers.mentors import router as mentors_router

app.include_router(auth_router)
app.include_router(schools_router)
app.include_router(sessions_router)
app.include_router(user_router)
app.include_router(features_router)
app.include_router(scraper_router)
app.include_router(recommendations_router)
app.include_router(essays_router)
app.include_router(interview_router)
app.include_router(strategy_router)
app.include_router(community_router)
app.include_router(financial_router)
app.include_router(school_data_router)
app.include_router(profile_router)
app.include_router(applicant_data_router)
app.include_router(simulator_router)
app.include_router(search_router)
app.include_router(outcomes_router)
app.include_router(essay_themes_router)
app.include_router(recommenders_router)
app.include_router(financial_aid_router)
app.include_router(career_router)
app.include_router(countries_router)
app.include_router(interview_guides_router)
app.include_router(peer_comparison_router)
app.include_router(mentors_router)


@app.get("/")
def root():
    return {"service": "Chief of Staff — MBA Admissions API v2", "status": "ok"}


@app.get("/api/stats")
def platform_stats():
    """Public platform stats — school counts, country coverage, degree breakdown."""
    from agents import SCHOOL_DB
    from collections import Counter

    countries = Counter(s.get("country", "Unknown") for s in SCHOOL_DB.values())
    degrees = Counter(s.get("degree_type", "MBA") for s in SCHOOL_DB.values())
    with_fees = sum(1 for s in SCHOOL_DB.values() if s.get("application_fee_usd"))
    with_deadlines = sum(1 for s in SCHOOL_DB.values() if s.get("deadlines"))

    return {
        "total_schools": len(SCHOOL_DB),
        "countries": len(countries),
        "top_countries": [{"country": c, "count": n} for c, n in countries.most_common(10)],
        "degree_breakdown": dict(degrees),
        "data_coverage": {
            "application_fees": with_fees,
            "deadlines": with_deadlines,
            "essay_prompts": sum(1 for s in SCHOOL_DB.values() if s.get("essay_prompts")),
        },
    }


# ── Analytics Event Ingestion ─────────────────────────────────────────────────

from pydantic import BaseModel
from typing import Optional


class AnalyticsEvent(BaseModel):
    event: str
    properties: dict = {}
    timestamp: Optional[str] = None


class AnalyticsBatch(BaseModel):
    events: list[AnalyticsEvent]


@app.post("/api/analytics/event")
def ingest_analytics(batch: AnalyticsBatch):
    """
    Receive frontend analytics events.
    In production, forward to a proper analytics store (Clickhouse, BigQuery, etc).
    For now, log them for observability.
    """
    for event in batch.events[:50]:  # Cap at 50 events per batch
        logger.info(
            "analytics: %s %s",
            event.event,
            {k: v for k, v in event.properties.items() if k != "stack"},
        )
    return {"accepted": len(batch.events[:50])}


# ── Usage Tracking ───────────────────────────────────────────────────────────

from auth import get_optional_user
from usage import get_usage_summary, get_user_tier, set_user_tier


@app.get("/api/usage")
def get_my_usage(request: Request, user: dict = Depends(get_optional_user)):
    """Get current user's AI feature usage for this billing period."""
    from middleware import _get_user_id
    user_id = user.get("sub") if user else _get_user_id(request)
    return get_usage_summary(user_id)


@app.get("/api/usage/tiers")
def get_tiers():
    """Public endpoint: list all tiers and their limits."""
    from usage import TIERS
    return {
        "tiers": {
            name: {
                "limits": limits if limits else "unlimited",
                "price_usd": {"free": 0, "pro": 29, "premium": 79}.get(name, 0),
            }
            for name, limits in TIERS.items()
        }
    }


@app.get("/health")
def health_check():
    """Health check for load balancers and monitoring."""
    from agents import SCHOOL_DB
    import time
    return {
        "status": "healthy",
        "schools_loaded": len(SCHOOL_DB),
        "version": "2.5.0",
        "timestamp": time.time(),
        "features": {
            "rate_limiting": bool(os.environ.get("RATE_LIMIT_ENABLED", "true").lower() == "true"),
            "request_timeout": True,
            "structured_logging": True,
            "cors_restricted": len(ALLOWED_ORIGINS) < 10,
        },
    }


@app.get("/health/ready")
def readiness_check():
    """Deep readiness check — verifies all dependencies are available."""
    import time
    checks: dict = {}
    overall = True

    # School database loaded
    try:
        from agents import SCHOOL_DB
        checks["school_db"] = {"ok": len(SCHOOL_DB) > 0, "count": len(SCHOOL_DB)}
        if not checks["school_db"]["ok"]:
            overall = False
    except Exception as e:
        checks["school_db"] = {"ok": False, "error": str(e)}
        overall = False

    # LLM API key configured
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    checks["llm_api_key"] = {"ok": bool(api_key), "provider": "anthropic"}
    if not api_key:
        overall = False

    # Community data available
    try:
        from agents import load_community_decisions
        decisions = load_community_decisions()
        checks["community_data"] = {"ok": True, "count": len(decisions)}
    except Exception as e:
        checks["community_data"] = {"ok": False, "error": str(e)}

    return {
        "status": "ready" if overall else "degraded",
        "timestamp": time.time(),
        "version": "2.5.0",
        "checks": checks,
    }
