"""Chief of Staff — MBA Admissions API v2

Slim entrypoint: app setup + router registration.
All endpoints live in routers/*.py.
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from logging_config import setup_logging

from middleware import setup_rate_limiter, setup_cache_headers, global_exception_handler

logger = setup_logging()

app = FastAPI(title="Chief of Staff — MBA Admissions API v2")

# ── Middleware ─────────────────────────────────────────────────────────────────

setup_rate_limiter(app)
setup_cache_headers(app)
app.add_exception_handler(Exception, global_exception_handler)

# ── CORS ───────────────────────────────────────────────────────────────────────

ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001").split(",")

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
from routers.tools import router as tools_router
from routers.user import router as user_router
from routers.features import router as features_router
from routers.scraper import router as scraper_router
from routers.recommendations import router as recommendations_router
from routers.financial import router as financial_router

app.include_router(auth_router)
app.include_router(schools_router)
app.include_router(sessions_router)
app.include_router(tools_router)
app.include_router(user_router)
app.include_router(features_router)
app.include_router(scraper_router)
app.include_router(recommendations_router)
app.include_router(financial_router)


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


@app.get("/health")
def health_check():
    """Health check for load balancers and monitoring."""
    from agents import SCHOOL_DB
    import time
    return {
        "status": "healthy",
        "schools_loaded": len(SCHOOL_DB),
        "version": "2.2.0",
        "timestamp": time.time(),
        "features": {
            "rate_limiting": bool(os.environ.get("RATE_LIMIT_ENABLED", "true").lower() == "true"),
            "structured_logging": True,
            "cors_restricted": len(ALLOWED_ORIGINS) < 10,
        },
    }
