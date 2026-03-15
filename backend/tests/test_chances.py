"""Tests for POST /api/decisions/chances — admission probability calculator."""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def _chances(**overrides):
    payload = {"gmat": 720, "gpa": 3.5, "work_exp_years": 4}
    payload.update(overrides)
    return client.post("/api/decisions/chances", json=payload)


# ── Basic response structure ─────────────────────────────────────────────────

def test_basic_chances():
    r = _chances()
    assert r.status_code == 200
    data = r.json()
    assert "profile" in data
    assert "total_similar_profiles" in data
    assert "schools" in data
    assert data["total_similar_profiles"] > 0
    assert len(data["schools"]) > 0


def test_profile_echoed_back():
    r = _chances(gmat=740, gpa=3.8, work_exp_years=5)
    data = r.json()
    assert data["profile"]["gmat"] == 740
    assert data["profile"]["gpa"] == 3.8
    assert data["profile"]["work_exp_years"] == 5


def test_school_result_fields():
    r = _chances()
    school = r.json()["schools"][0]
    required_fields = [
        "school_id", "school_name", "sample_size", "admitted",
        "denied", "admit_rate", "confidence", "scholarship_rate",
    ]
    for field in required_fields:
        assert field in school, f"Missing field: {field}"


# ── Admit rate ordering ─────────────────────────────────────────────────────

def test_results_sorted_by_admit_rate():
    r = _chances()
    schools = r.json()["schools"]
    rates = [s["admit_rate"] for s in schools]
    assert rates == sorted(rates, reverse=True)


# ── Filtering ────────────────────────────────────────────────────────────────

def test_filter_by_school_ids():
    r = _chances(school_ids=["hbs", "booth"])
    schools = r.json()["schools"]
    ids = {s["school_id"] for s in schools}
    assert ids <= {"hbs", "booth"}


def test_filter_by_industry():
    r = _chances(industry="Consulting")
    data = r.json()
    # Should return fewer similar profiles than without industry filter
    r2 = _chances()
    assert data["total_similar_profiles"] <= r2.json()["total_similar_profiles"]


# ── Edge cases ───────────────────────────────────────────────────────────────

def test_no_filters_returns_all():
    """With no profile filters, all decisions match — broadest possible cohort."""
    r = client.post("/api/decisions/chances", json={})
    assert r.status_code == 200
    data = r.json()
    assert data["total_similar_profiles"] > 5000  # Most of 12K should match


def test_extreme_gmat_few_matches():
    """Very high GMAT should match fewer profiles."""
    r = _chances(gmat=800, gpa=4.0)
    data = r.json()
    assert data["total_similar_profiles"] < 500


def test_admit_rate_range():
    r = _chances()
    for school in r.json()["schools"]:
        assert 0 <= school["admit_rate"] <= 100


def test_confidence_levels():
    r = _chances()
    valid_levels = {"high", "medium", "low"}
    for school in r.json()["schools"]:
        assert school["confidence"] in valid_levels


def test_scholarship_rate_present():
    r = _chances()
    for school in r.json()["schools"]:
        assert isinstance(school["scholarship_rate"], (int, float))
        assert 0 <= school["scholarship_rate"] <= 100
