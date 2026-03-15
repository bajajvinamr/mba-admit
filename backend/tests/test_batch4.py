"""Tests for batch 4 endpoints — class profile comparison, GMAT targets."""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


# ── Class Profile Comparison ────────────────────────────────────────

def test_class_profile_single():
    r = client.get("/api/schools/class-profile?school_ids=hbs")
    assert r.status_code == 200
    data = r.json()
    assert data["school_count"] >= 1
    assert len(data["profiles"]) >= 1
    p = data["profiles"][0]
    assert p["school_id"] == "hbs"
    assert "school_name" in p
    assert "class_size" in p
    assert "avg_gmat" in p


def test_class_profile_multiple():
    r = client.get("/api/schools/class-profile?school_ids=hbs,gsb,wharton")
    assert r.status_code == 200
    data = r.json()
    assert data["school_count"] >= 2
    ids = {p["school_id"] for p in data["profiles"]}
    assert "hbs" in ids


def test_class_profile_empty():
    r = client.get("/api/schools/class-profile?school_ids=")
    assert r.status_code == 400


def test_class_profile_unknown_school():
    r = client.get("/api/schools/class-profile?school_ids=fake_school_xyz")
    assert r.status_code == 200
    assert r.json()["school_count"] == 0


def test_class_profile_fields():
    r = client.get("/api/schools/class-profile?school_ids=hbs")
    if r.json()["profiles"]:
        p = r.json()["profiles"][0]
        expected_fields = [
            "school_id", "school_name", "class_size", "avg_age",
            "female_pct", "international_pct", "avg_gmat", "avg_gpa",
            "acceptance_rate", "median_salary", "stem_designated",
        ]
        for f in expected_fields:
            assert f in p, f"Missing field: {f}"


# ── GMAT Score Targets ──────────────────────────────────────────────

def test_gmat_targets_structure():
    r = client.get("/api/schools/gmat-targets")
    assert r.status_code == 200
    data = r.json()
    assert "tiers" in data
    assert "summary" in data
    for tier in ["M7", "T15", "T25", "Other"]:
        assert tier in data["tiers"]


def test_gmat_targets_summary():
    r = client.get("/api/schools/gmat-targets")
    data = r.json()
    s = data["summary"]
    assert "M7_avg" in s
    assert "T15_avg" in s
    assert "T25_avg" in s


def test_gmat_targets_sorted():
    r = client.get("/api/schools/gmat-targets")
    data = r.json()
    for tier_name, schools in data["tiers"].items():
        if len(schools) >= 2:
            scores = [s["gmat_avg"] for s in schools]
            assert scores == sorted(scores, reverse=True), f"{tier_name} not sorted descending"


def test_gmat_targets_school_fields():
    r = client.get("/api/schools/gmat-targets")
    data = r.json()
    all_schools = []
    for schools in data["tiers"].values():
        all_schools.extend(schools)
    if all_schools:
        s = all_schools[0]
        assert "school_id" in s
        assert "school_name" in s
        assert "gmat_avg" in s
        assert isinstance(s["gmat_avg"], (int, float))
