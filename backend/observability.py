"""Agnost observability — tracks all AI agent interactions.

Wraps Claude API calls with begin/end to capture input, output,
latency, errors, and user identity.
"""

from __future__ import annotations

import logging
import os
import uuid
from contextlib import contextmanager
from typing import Any, Optional

logger = logging.getLogger(__name__)

AGNOST_ORG_ID = "bb5d546a-5d7d-415b-a540-29902e699f9a"

_initialized = False


def _ensure_init() -> bool:
    """Lazy init agnost SDK. Returns True if available."""
    global _initialized
    if _initialized:
        return True
    try:
        import agnost
        agnost.init(AGNOST_ORG_ID)
        _initialized = True
        logger.info("Agnost initialized (org: %s)", AGNOST_ORG_ID)
        return True
    except ImportError:
        logger.debug("agnost package not installed — observability disabled")
        return False
    except Exception as exc:
        logger.warning("Agnost init failed: %s", exc)
        return False


@contextmanager
def track_ai_interaction(
    user_input: str,
    user_id: Optional[str] = None,
    conversation_id: Optional[str] = None,
    endpoint: Optional[str] = None,
):
    """Context manager to track an AI interaction with Agnost.

    Usage:
        with track_ai_interaction(user_msg, user_id="u123") as tracker:
            result = call_claude_api(user_msg)
            tracker["output"] = result
    """
    tracker: dict[str, Any] = {"output": None, "success": True}

    if not _ensure_init():
        yield tracker
        return

    try:
        import agnost

        interaction = agnost.begin(
            user_id=user_id or "anonymous",
            input=user_input,
            conversation_id=conversation_id or str(uuid.uuid4()),
        )

        try:
            yield tracker
            interaction.end(output=str(tracker.get("output", "")))
        except Exception as exc:
            interaction.end(output=str(exc), success=False)
            raise

    except ImportError:
        yield tracker
    except Exception as exc:
        logger.debug("Agnost tracking error (non-fatal): %s", exc)
        yield tracker


def identify_user(user_id: str, traits: Optional[dict] = None) -> None:
    """Identify a user with Agnost for session tracking."""
    if not _ensure_init():
        return
    try:
        import agnost
        agnost.identify(user_id, traits or {})
    except Exception as exc:
        logger.debug("Agnost identify error: %s", exc)
