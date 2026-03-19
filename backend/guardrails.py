"""Input sanitization and safety guardrails for LLM-facing endpoints.

Prevents prompt injection, excessive input, and PII leakage in AI tool outputs.
Applied at the boundary between user input and Claude API calls.
"""

import re
from typing import Optional

from logging_config import setup_logging

logger = setup_logging()

# ── Input Length Limits ──────────────────────────────────────────────────────

MAX_ESSAY_CHARS = 15_000       # ~3000 words — more than any MBA essay
MAX_BULLET_CHARS = 1_000       # Resume bullet
MAX_CHAT_CHARS = 5_000         # Single chat message
MAX_STRATEGY_CHARS = 5_000     # Strategy field inputs
MAX_FIELD_CHARS = 500          # Short fields (names, titles, etc.)

# ── Prompt Injection Patterns ────────────────────────────────────────────────

# Patterns that indicate attempted prompt injection or jailbreak.
# These are checked case-insensitively against user inputs before sending to LLM.
_INJECTION_PATTERNS = [
    # System/instruction override attempts
    r"ignore\s+(all\s+)?previous\s+instructions",
    r"ignore\s+(all\s+)?above\s+instructions",
    r"disregard\s+(all\s+)?previous",
    r"forget\s+(all\s+)?previous",
    r"override\s+(system|your)\s+(prompt|instructions|rules)",
    r"new\s+system\s+prompt",
    r"you\s+are\s+now\s+(a|an)\s+(?!mba|applicant|student)",  # "you are now a hacker" but allow "you are now an MBA student"
    # Role/persona hijacking
    r"act\s+as\s+(a|an)\s+(?!mba|applicant|student|consultant|manager|leader)",
    r"pretend\s+(you\s+are|to\s+be)\s+(?!an?\s+(mba|applicant))",
    r"switch\s+to\s+\w+\s+mode",
    r"enter\s+\w+\s+mode",
    # Delimiter injection
    r"```system",
    r"\[SYSTEM\]",
    r"\[INST\]",
    r"<\|system\|>",
    r"<\|im_start\|>",
    # Data exfiltration
    r"(reveal|show|display|print|output)\s+(your|the|all)\s+(system|instructions|prompt|rules|config)",
    r"what\s+(is|are)\s+your\s+(system|instructions|prompt|rules)",
]

_COMPILED_PATTERNS = [re.compile(p, re.IGNORECASE) for p in _INJECTION_PATTERNS]


def check_injection(text: str) -> Optional[str]:
    """Check text for prompt injection patterns.

    Returns the matched pattern description if injection detected, None if clean.
    """
    for pattern in _COMPILED_PATTERNS:
        match = pattern.search(text)
        if match:
            # Log but don't include the full text (could be large)
            logger.warning(
                "Prompt injection attempt detected: pattern=%s snippet=%s",
                pattern.pattern[:60],
                text[max(0, match.start() - 20):match.end() + 20][:100],
            )
            return pattern.pattern
    return None


# ── Input Sanitization ───────────────────────────────────────────────────────

def sanitize_for_llm(text: str, max_chars: int, field_name: str = "input") -> str:
    """Sanitize user text before sending to LLM.

    - Truncates to max length
    - Checks for injection patterns
    - Strips control characters
    - Returns cleaned text

    Raises ValueError if injection is detected.
    """
    if not text:
        return text

    # Strip control characters (keep newlines, tabs)
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)

    # Enforce length limit
    if len(cleaned) > max_chars:
        logger.info(
            "Input truncated: field=%s original=%d max=%d",
            field_name, len(cleaned), max_chars,
        )
        cleaned = cleaned[:max_chars]

    # Check for injection
    injection = check_injection(cleaned)
    if injection:
        raise ValueError(
            f"Your {field_name} contains text that looks like an instruction "
            f"to the AI system rather than genuine content. Please remove it and try again."
        )

    return cleaned


# ── PII Scrubbing for Output ────────────────────────────────────────────────

# Patterns for common PII that might leak from community data into LLM responses
_EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
_PHONE_PATTERN = re.compile(r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")
_SSN_PATTERN = re.compile(r"\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b")


def scrub_pii(text: str) -> str:
    """Remove common PII patterns from text (for LLM output post-processing)."""
    result = _EMAIL_PATTERN.sub("[email redacted]", text)
    result = _PHONE_PATTERN.sub("[phone redacted]", result)
    result = _SSN_PATTERN.sub("[id redacted]", result)
    return result


# ── Applicant Data Anonymization ─────────────────────────────────────────────

_NAME_FIELDS = {"username", "user", "name", "poster", "author", "applicant_name"}


def anonymize_applicant_record(record: dict) -> dict:
    """Strip identifying fields from applicant data records.

    Used when serving community data through the API to prevent
    exposing real GMAT Club / Clear Admit usernames.
    """
    cleaned = dict(record)
    for field in _NAME_FIELDS:
        if field in cleaned:
            cleaned[field] = "Anonymous"
    # Also redact any email/phone in string values
    for key, val in cleaned.items():
        if isinstance(val, str):
            cleaned[key] = scrub_pii(val)
    return cleaned
