"""Shared helpers used across multiple router modules."""

from agents import SCHOOL_DB
from routers.schools import SCHOOL_ALIASES

# ── Admission status helpers (used by community.py) ──────────────────────────

_ADMIT_STATUSES = {"Admitted", "Matriculating", "Admitted from WL"}
_DENY_STATUSES = {"Denied without Interview", "Denied with Interview"}


def is_admitted(status: str) -> bool:
    """Check if a decision status counts as admitted (including scholarship tiers)."""
    for s in _ADMIT_STATUSES:
        if status.startswith(s):
            return True
    return False


def is_denied(status: str) -> bool:
    return any(status.startswith(s) for s in _DENY_STATUSES)


# ── GMAT percentile helpers (used by profile.py) ────────────────────────────

def gmat_percentile(score: int) -> int:
    """Rough GMAT percentile estimate."""
    if score >= 760: return 99
    if score >= 740: return 97
    if score >= 720: return 94
    if score >= 700: return 89
    if score >= 680: return 82
    if score >= 660: return 76
    if score >= 640: return 68
    if score >= 620: return 60
    if score >= 600: return 51
    if score >= 580: return 43
    if score >= 560: return 36
    if score >= 540: return 28
    if score >= 520: return 22
    if score >= 500: return 16
    return max(1, (score - 200) * 15 // 300)
