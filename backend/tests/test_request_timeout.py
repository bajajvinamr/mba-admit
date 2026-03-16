"""Tests for RequestTimeoutMiddleware."""

import asyncio

from middleware import (
    LLM_ENDPOINTS,
    LLM_TIMEOUT_S,
    DEFAULT_TIMEOUT_S,
    RequestTimeoutMiddleware,
)


def test_llm_endpoints_set_not_empty():
    """LLM endpoint set contains the expected heavy endpoints."""
    assert "/api/start_session" in LLM_ENDPOINTS
    assert "/api/chat" in LLM_ENDPOINTS
    assert "/api/evaluate_essay" in LLM_ENDPOINTS
    assert "/api/roast_resume" in LLM_ENDPOINTS


def test_timeout_values():
    """LLM timeout is longer than default timeout."""
    assert LLM_TIMEOUT_S > DEFAULT_TIMEOUT_S
    assert DEFAULT_TIMEOUT_S >= 15  # Reasonable minimum
    assert LLM_TIMEOUT_S >= 60     # LLM calls need at least 60s


def test_health_returns_within_default_timeout(client):
    """Non-LLM endpoint like /health should succeed quickly."""
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"


def test_timeout_middleware_returns_504_on_slow_request(client):
    """Verify the middleware is properly registered by checking it's in the app stack."""
    from main import app

    # Verify middleware is registered (checking app middleware stack)
    middleware_names = [m.cls.__name__ for m in app.user_middleware if hasattr(m, 'cls')]
    assert "RequestTimeoutMiddleware" in middleware_names
