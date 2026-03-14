"""Compute outcome stats and profile fit from GMAT Club decision data."""

import json
from pathlib import Path
from statistics import median
from collections import Counter

# ── Shared data loader ────────────────────────────────────────────────────────

_GMATCLUB_DATA: list[dict] | None = None


def load_gmatclub_data() -> list[dict]:
    """Load and cache GMAT Club decisions from disk."""
    global _GMATCLUB_DATA
    if _GMATCLUB_DATA is not None:
        return _GMATCLUB_DATA
    path = Path(__file__).resolve().parent / "data" / "gmatclub_decisions.json"
    if path.exists():
        with open(path) as f:
            _GMATCLUB_DATA = json.load(f)
    else:
        _GMATCLUB_DATA = []
    return _GMATCLUB_DATA


# ── School ID mapping (school_db slug → GMAT Club school_id) ─────────────────

SCHOOL_ID_TO_GMATCLUB = {
    "hbs": "hbs",
    "gsb": "gsb",
    "wharton": "wharton",
    "kellogg": "kellogg",
    "insead": "insead",
    "isb": "isb",
    "booth": "chicago_booth",
    "sloan": "mit_sloan",
    "cbs": "columbia_business_school",
    "columbia": "columbia_business_school",
    "tuck": "dartmouth_tuck",
    "haas": "uc_berkeley_haas",
    "ross": "michigan_ross",
    "fuqua": "duke_fuqua",
    "darden": "uva_darden",
    "stern": "nyu_stern",
    "yale_som": "yale_som",
    "yale": "yale_som",
    "johnson": "cornell_johnson",
    "kenan_flagler": "unc_kenanflagler",
    "kenan-flagler": "unc_kenanflagler",
    "anderson": "ucla_anderson",
    "ucla-anderson": "ucla_anderson",
    "kelley": "indiana_kelley",
    "goizueta": "emory_goizueta",
    "lbs": "london_business_school",
}

# Build reverse mapping too
GMATCLUB_TO_SCHOOL_ID = {v: k for k, v in SCHOOL_ID_TO_GMATCLUB.items()}


def get_decisions_for_school(all_decisions: list[dict], school_id: str) -> list[dict]:
    """Filter decisions for a school, handling ID mismatches between school DB and GMAT Club."""
    gmatclub_id = SCHOOL_ID_TO_GMATCLUB.get(school_id, school_id)
    return [d for d in all_decisions if d.get("school_id") == gmatclub_id]


# ── Constants ─────────────────────────────────────────────────────────────────

ADMIT_KEYWORDS = ("admitted", "admit")
DENY_KEYWORDS = ("denied", "deny")
WAITLIST_KEYWORDS = ("waitlist",)
INTERVIEW_KEYWORDS = ("interview",)

GMAT_BUCKETS = [(600, 650), (650, 700), (700, 750), (750, 800)]
GPA_BUCKETS = [(3.0, 3.3), (3.3, 3.6), (3.6, 3.9), (3.9, 4.1)]
YOE_BUCKETS = [(1, 3), (3, 5), (5, 7), (7, None)]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _status_match(status: str, keywords: tuple) -> bool:
    s = status.lower()
    return any(k in s for k in keywords)


def _is_interview(status: str) -> bool:
    """Match interview statuses but exclude 'without Interview'."""
    s = status.lower()
    return "interview" in s and "without interview" not in s


def _get_gmat(d: dict):
    return d.get("gmat") or d.get("gmat_focus")


def _bucket_label(lo, hi) -> str:
    if hi is None:
        return f"{lo}+"
    return f"{lo}-{hi}"


# ── Core computation ─────────────────────────────────────────────────────────

def compute_school_outcomes(decisions: list[dict]) -> dict:
    """Compute aggregate outcome stats from GMAT Club decisions for ONE school."""
    total = len(decisions)
    admits = [d for d in decisions if _status_match(d.get("status", ""), ADMIT_KEYWORDS)]
    denies = [d for d in decisions if _status_match(d.get("status", ""), DENY_KEYWORDS)]
    waitlists = [d for d in decisions if _status_match(d.get("status", ""), WAITLIST_KEYWORDS)]
    interviews = [d for d in decisions if _is_interview(d.get("status", ""))]

    # Medians for admitted applicants
    admit_gmats = [_get_gmat(d) for d in admits if _get_gmat(d)]
    admit_gpas = [d["gpa"] for d in admits if d.get("gpa")]
    admit_yoes = [d["yoe"] for d in admits if d.get("yoe")]

    # GMAT distribution — admits vs denies per bucket
    gmat_dist = []
    for lo, hi in GMAT_BUCKETS:
        admitted = sum(1 for d in admits if _get_gmat(d) and lo <= _get_gmat(d) < hi)
        denied = sum(1 for d in denies if _get_gmat(d) and lo <= _get_gmat(d) < hi)
        gmat_dist.append({"range": _bucket_label(lo, hi), "admitted": admitted, "denied": denied})

    # GPA distribution
    gpa_dist = []
    for lo, hi in GPA_BUCKETS:
        admitted = sum(1 for d in admits if d.get("gpa") and lo <= d["gpa"] < hi)
        denied = sum(1 for d in denies if d.get("gpa") and lo <= d["gpa"] < hi)
        gpa_dist.append({"range": _bucket_label(lo, hi), "admitted": admitted, "denied": denied})

    # Top industries among admits
    industry_counts = Counter(d.get("industry") for d in admits if d.get("industry"))
    top_industries = [
        {"industry": ind, "count": cnt, "pct": round(cnt / len(admits) * 100, 1) if admits else 0}
        for ind, cnt in industry_counts.most_common(8)
    ]

    # YOE distribution among admits
    yoe_dist = []
    for lo, hi in YOE_BUCKETS:
        if hi is None:
            count = sum(1 for d in admits if d.get("yoe") and d["yoe"] >= lo)
        else:
            count = sum(1 for d in admits if d.get("yoe") and lo <= d["yoe"] < hi)
        yoe_dist.append({"range": _bucket_label(lo, hi), "count": count})

    return {
        "total_decisions": total,
        "admit_count": len(admits),
        "deny_count": len(denies),
        "waitlist_count": len(waitlists),
        "interview_count": len(interviews),
        "median_gmat_admitted": int(median(admit_gmats)) if admit_gmats else None,
        "median_gpa_admitted": round(median(admit_gpas), 2) if admit_gpas else None,
        "median_yoe_admitted": int(median(admit_yoes)) if admit_yoes else None,
        "gmat_distribution": gmat_dist,
        "gpa_distribution": gpa_dist,
        "top_industries": top_industries,
        "yoe_distribution": yoe_dist,
    }


def compute_profile_fit(decisions: list[dict], profile: dict | None) -> dict | None:
    """Compute where a user's profile sits among admitted applicants."""
    if not profile:
        return None

    admits = [d for d in decisions if _status_match(d.get("status", ""), ADMIT_KEYWORDS)]
    if not admits:
        return None

    user_gmat = profile.get("gmat")
    user_gpa = profile.get("gpa")
    user_yoe = profile.get("yoe")

    def percentile(values: list, user_val) -> int:
        if not values or user_val is None:
            return 50  # default when no data
        below = sum(1 for v in values if v < user_val)
        return int(below / len(values) * 100)

    admit_gmats = sorted([_get_gmat(d) for d in admits if _get_gmat(d)])
    admit_gpas = sorted([d["gpa"] for d in admits if d.get("gpa")])
    admit_yoes = sorted([d["yoe"] for d in admits if d.get("yoe")])

    gmat_pct = percentile(admit_gmats, user_gmat)
    gpa_pct = percentile(admit_gpas, user_gpa)
    yoe_pct = percentile(admit_yoes, user_yoe)

    # Build one-line verdict
    parts = []
    median_gmat = int(median(admit_gmats)) if admit_gmats else None
    if user_gmat and median_gmat:
        diff = user_gmat - median_gmat
        if diff > 10:
            parts.append(f"Your {user_gmat} GMAT is above the median ({median_gmat}) for admits.")
        elif diff < -10:
            parts.append(f"Your {user_gmat} GMAT is below the median ({median_gmat}) for admits.")
        else:
            parts.append(f"Your {user_gmat} GMAT is around the median ({median_gmat}) for admits.")

    median_gpa_val = round(median(admit_gpas), 2) if admit_gpas else None
    if user_gpa and median_gpa_val:
        diff = user_gpa - median_gpa_val
        if diff > 0.1:
            parts.append("GPA is strong.")
        elif diff < -0.1:
            parts.append(f"GPA is below the median ({median_gpa_val}).")
        else:
            parts.append("GPA is around the median.")

    median_yoe_val = int(median(admit_yoes)) if admit_yoes else None
    if user_yoe and median_yoe_val:
        if user_yoe < median_yoe_val - 1:
            parts.append(f"Consider gaining more experience (median: {median_yoe_val} years).")

    verdict = " ".join(parts) if parts else "Profile data limited — check individual metrics."

    return {
        "gmat_percentile": gmat_pct,
        "gpa_percentile": gpa_pct,
        "yoe_percentile": yoe_pct,
        "verdict": verdict,
    }


def find_similar_applicants(
    decisions: list[dict],
    gmat: int | None = None,
    gpa: float | None = None,
    yoe: int | None = None,
    limit: int = 8,
) -> list[dict]:
    """Find applicants with similar profiles and return anonymized summaries.

    Similarity: |GMAT diff| ≤ 30, |GPA diff| ≤ 0.3, |YOE diff| ≤ 2.
    Results sorted by similarity (closest first), then by status (admits first).
    """
    if not decisions or not (gmat or gpa or yoe):
        return []

    scored: list[tuple[float, dict]] = []
    for d in decisions:
        d_gmat = _get_gmat(d)
        d_gpa = d.get("gpa")
        d_yoe = d.get("yoe")

        # Must have at least one matching stat dimension
        if not (d_gmat or d_gpa or d_yoe):
            continue

        distance = 0.0
        dims = 0

        if gmat and d_gmat:
            gmat_diff = abs(gmat - d_gmat)
            if gmat_diff > 30:
                continue  # too different
            distance += gmat_diff / 30  # normalize to 0-1
            dims += 1

        if gpa and d_gpa:
            gpa_diff = abs(gpa - d_gpa)
            if gpa_diff > 0.3:
                continue
            distance += gpa_diff / 0.3
            dims += 1

        if yoe and d_yoe:
            yoe_diff = abs(yoe - d_yoe)
            if yoe_diff > 2:
                continue
            distance += yoe_diff / 2
            dims += 1

        if dims == 0:
            continue

        distance /= dims  # average normalized distance
        scored.append((distance, d))

    # Sort by distance (closest first), then admits first for ties
    status_order = {"admitted": 0, "interview": 1, "waitlist": 2, "denied": 3}

    def sort_key(item: tuple[float, dict]) -> tuple[float, int]:
        dist, d = item
        st = d.get("status", "").lower()
        order = 3
        for keyword, rank in status_order.items():
            if keyword in st:
                order = rank
                break
        return (dist, order)

    scored.sort(key=sort_key)

    # Anonymize and return
    results = []
    for _, d in scored[:limit]:
        status = d.get("status", "Unknown")
        # Classify status
        if _status_match(status, ADMIT_KEYWORDS):
            outcome = "Admitted"
        elif _status_match(status, DENY_KEYWORDS):
            outcome = "Denied"
        elif _status_match(status, WAITLIST_KEYWORDS):
            outcome = "Waitlisted"
        elif _is_interview(status):
            outcome = "Interview"
        else:
            outcome = status

        results.append({
            "gmat": _get_gmat(d),
            "gpa": d.get("gpa"),
            "yoe": d.get("yoe"),
            "industry": d.get("industry"),
            "outcome": outcome,
            "round": d.get("round"),
        })

    return results
