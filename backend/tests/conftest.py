"""Shared fixtures — mock DB, mock LLM, test client."""

import sys
import os
from unittest.mock import patch, MagicMock

import pytest

# Backend root on sys.path so imports resolve
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# ── Patch heavy imports BEFORE any backend module is loaded ───────────────────

# Prevent agents.py from importing LangChain / LlamaIndex / Qdrant
_HEAVY_MODULES = [
    "langchain_anthropic",
    "langchain_core",
    "langchain_core.messages",
    "langchain_core.language_models",
    "llama_index",
    "llama_index.core",
    "llama_index.core.settings",
    "llama_index.vector_stores.qdrant",
    "llama_index.embeddings.huggingface",
    "qdrant_client",
]
for mod in _HEAVY_MODULES:
    sys.modules[mod] = MagicMock()

# Now we can safely import
from fastapi.testclient import TestClient
import db


@pytest.fixture(autouse=True)
def _clean_db():
    """Reset in-memory stores, rate limiter, and usage tracking between tests."""
    db._MEMORY_SESSIONS.clear()
    db._MEMORY_USERS.clear()
    db._MEMORY_SCHOOL_LIST.clear()
    db._MEMORY_DECISIONS.clear()
    db._supabase = None  # force in-memory mode

    # Reset rate limiter state to prevent cross-test rate limit failures
    try:
        from middleware import limiter
        if limiter and hasattr(limiter, "_storage"):
            limiter._storage.reset()
        elif limiter:
            limiter.reset()
    except Exception:
        pass

    # Reset usage tracking state and set test user to premium (no limits)
    try:
        import usage
        usage._MEMORY_USAGE.clear()
        usage._MEMORY_TIERS.clear()
        usage.set_user_tier("dev-user", "premium")
    except Exception:
        pass

    yield
    db._MEMORY_SESSIONS.clear()
    db._MEMORY_USERS.clear()
    db._MEMORY_SCHOOL_LIST.clear()
    db._MEMORY_DECISIONS.clear()


@pytest.fixture()
def client():
    """Provide a TestClient with agents mocked out."""
    from main import app
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture()
def mock_run_agent_graph():
    """Patch run_agent_graph to avoid LLM calls."""
    def passthrough(state):
        state["status_message"] = "mock agent graph ran"
        return state

    with patch("routers.sessions.run_agent_graph", side_effect=passthrough) as m:
        yield m


@pytest.fixture()
def seeded_user():
    """Create a test user in the in-memory store."""
    return db.create_user(
        email="test@example.com",
        name="Test User",
        password_hash="dev",
    )


@pytest.fixture()
def seeded_session(seeded_user):
    """Create a test session tied to the seeded user."""
    return db.create_session(
        session_id="test-session-1",
        user_id=seeded_user["id"],
        school_id="hbs",
        profile={"name": "Test", "gmat": 740, "gpa": 3.8, "industry_background": "Consulting"},
    )
