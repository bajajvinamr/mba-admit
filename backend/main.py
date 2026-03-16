"""Chief of Staff — MBA Admissions API v2

Slim entrypoint: app setup + router registration.
All endpoints live in routers/*.py.
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from logging_config import setup_logging

from middleware import setup_rate_limiter, global_exception_handler

logger = setup_logging()

app = FastAPI(title="Chief of Staff — MBA Admissions API v2")

# ── Middleware ─────────────────────────────────────────────────────────────────

setup_rate_limiter(app)
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


@app.get("/health")
def health_check():
    """Health check for load balancers and monitoring. Returns school count + uptime."""
    from agents import SCHOOL_DB
    import time
    return {
        "status": "healthy",
        "schools_loaded": len(SCHOOL_DB),
        "version": "2.1.0",
        "timestamp": time.time(),
    }
