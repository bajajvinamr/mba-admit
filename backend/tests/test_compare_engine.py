"""Tests for compare_engine — outcome stats + profile fit computation."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from compare_engine import compute_school_outcomes, compute_profile_fit


SAMPLE_DECISIONS = [
    {"school_id": "hbs", "status": "Admitted", "gmat": 740, "gpa": 3.8, "yoe": 5, "industry": "Consulting"},
    {"school_id": "hbs", "status": "Admitted", "gmat": 720, "gpa": 3.6, "yoe": 4, "industry": "Finance"},
    {"school_id": "hbs", "status": "Admitted", "gmat": 760, "gpa": 3.9, "yoe": 6, "industry": "Consulting"},
    {"school_id": "hbs", "status": "Denied without Interview", "gmat": 680, "gpa": 3.2, "yoe": 3, "industry": "Tech"},
    {"school_id": "hbs", "status": "Denied without Interview", "gmat": 650, "gpa": 3.0, "yoe": 2, "industry": "Tech"},
    {"school_id": "hbs", "status": "Waitlisted with Interview", "gmat": 710, "gpa": 3.5, "yoe": 4, "industry": "Finance"},
    {"school_id": "hbs", "status": "Interviewed", "gmat": 730, "gpa": 3.7, "yoe": 5, "industry": "Consulting"},
]


def test_compute_outcomes_counts():
    result = compute_school_outcomes(SAMPLE_DECISIONS)
    assert result["total_decisions"] == 7
    assert result["admit_count"] == 3
    assert result["deny_count"] == 2
    assert result["waitlist_count"] == 1
    assert result["interview_count"] == 2  # "Interviewed" + "Waitlisted with Interview"


def test_compute_outcomes_medians():
    result = compute_school_outcomes(SAMPLE_DECISIONS)
    # Admitted GMATs: 720, 740, 760 → median 740
    assert result["median_gmat_admitted"] == 740
    # Admitted GPAs: 3.6, 3.8, 3.9 → median 3.8
    assert result["median_gpa_admitted"] == 3.8
    # Admitted YOEs: 4, 5, 6 → median 5
    assert result["median_yoe_admitted"] == 5


def test_compute_outcomes_gmat_distribution():
    result = compute_school_outcomes(SAMPLE_DECISIONS)
    dist = result["gmat_distribution"]
    assert isinstance(dist, list)
    assert len(dist) == 4  # 4 buckets
    assert all("range" in b and "admitted" in b and "denied" in b for b in dist)
    # 700-750 bucket should have 2 admits (720, 740) and 0 denies
    bucket_700 = next(b for b in dist if b["range"] == "700-750")
    assert bucket_700["admitted"] == 2
    assert bucket_700["denied"] == 0


def test_compute_outcomes_top_industries():
    result = compute_school_outcomes(SAMPLE_DECISIONS)
    industries = result["top_industries"]
    assert len(industries) >= 1
    # Consulting appears 2 times among admits (720 is Finance)
    assert industries[0]["industry"] == "Consulting"
    assert industries[0]["count"] == 2


def test_compute_outcomes_yoe_distribution():
    result = compute_school_outcomes(SAMPLE_DECISIONS)
    yoe_dist = result["yoe_distribution"]
    assert isinstance(yoe_dist, list)
    assert len(yoe_dist) == 4  # 4 buckets
    assert all("range" in b and "count" in b for b in yoe_dist)


def test_compute_outcomes_gpa_distribution():
    result = compute_school_outcomes(SAMPLE_DECISIONS)
    gpa_dist = result["gpa_distribution"]
    assert isinstance(gpa_dist, list)
    assert len(gpa_dist) == 4
    # 3.6-3.9 bucket should have 1 admit (3.8) — 3.6 rounds into it, 3.9 goes to next
    bucket_36 = next(b for b in gpa_dist if b["range"] == "3.6-3.9")
    assert bucket_36["admitted"] >= 1


def test_profile_fit_percentile():
    result = compute_profile_fit(
        decisions=SAMPLE_DECISIONS,
        profile={"gmat": 740, "gpa": 3.7, "yoe": 5},
    )
    assert result is not None
    assert "gmat_percentile" in result
    assert "gpa_percentile" in result
    assert "yoe_percentile" in result
    assert "verdict" in result
    assert 0 <= result["gmat_percentile"] <= 100
    assert 0 <= result["gpa_percentile"] <= 100
    assert 0 <= result["yoe_percentile"] <= 100


def test_profile_fit_no_profile():
    result = compute_profile_fit(decisions=SAMPLE_DECISIONS, profile=None)
    assert result is None


def test_profile_fit_empty_decisions():
    result = compute_profile_fit(decisions=[], profile={"gmat": 740, "gpa": 3.7, "yoe": 5})
    assert result is None


def test_profile_fit_verdict_above_median():
    result = compute_profile_fit(
        decisions=SAMPLE_DECISIONS,
        profile={"gmat": 770, "gpa": 3.95, "yoe": 3},
    )
    assert "above" in result["verdict"].lower() or "strong" in result["verdict"].lower()


def test_compute_outcomes_empty_decisions():
    result = compute_school_outcomes([])
    assert result["total_decisions"] == 0
    assert result["admit_count"] == 0
    assert result["median_gmat_admitted"] is None


def test_compute_outcomes_gmat_focus_field():
    """Entries with gmat_focus instead of gmat should still be counted."""
    decisions = [
        {"status": "Admitted", "gmat_focus": 725, "gpa": 3.7, "yoe": 4, "industry": "Tech"},
        {"status": "Denied without Interview", "gmat_focus": 680, "gpa": 3.1, "yoe": 2, "industry": "Finance"},
    ]
    result = compute_school_outcomes(decisions)
    assert result["median_gmat_admitted"] == 725
