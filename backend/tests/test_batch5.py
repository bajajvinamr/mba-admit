"""Tests for batch 5 endpoints — application strength, cost of living, essay themes."""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


# ── Application Strength Meter ──────────────────────────────────────

def test_strength_basic():
    r = client.post("/api/application-strength", json={"gmat": 730, "gpa": 3.8, "work_years": 4})
    assert r.status_code == 200
    data = r.json()
    assert "overall_score" in data
    assert "dimensions" in data
    assert len(data["dimensions"]) >= 4
    assert data["overall_score"] >= 0


def test_strength_with_school():
    r = client.post("/api/application-strength", json={
        "gmat": 700, "gpa": 3.5, "work_years": 3, "target_school_id": "hbs"
    })
    assert r.status_code == 200
    data = r.json()
    assert "overall_score" in data


def test_strength_empty():
    r = client.post("/api/application-strength", json={})
    assert r.status_code == 200
    data = r.json()
    assert "overall_score" in data


def test_strength_all_fields():
    r = client.post("/api/application-strength", json={
        "gmat": 760, "gpa": 3.9, "work_years": 5,
        "leadership_examples": 3, "extracurriculars": 4,
        "international_exp": True
    })
    assert r.status_code == 200
    data = r.json()
    assert data["overall_score"] > 50


# ── Cost of Living ──────────────────────────────────────────────────

def test_cost_of_living_single():
    r = client.get("/api/cost-of-living?school_ids=hbs")
    assert r.status_code == 200
    data = r.json()
    assert "comparisons" in data
    assert len(data["comparisons"]) >= 1


def test_cost_of_living_multiple():
    r = client.get("/api/cost-of-living?school_ids=hbs,gsb,booth")
    assert r.status_code == 200
    data = r.json()
    assert len(data["comparisons"]) >= 2
    comp = data["comparisons"][0]
    assert "monthly" in comp
    assert "rent" in comp["monthly"]


def test_cost_of_living_empty():
    r = client.get("/api/cost-of-living?school_ids=")
    assert r.status_code in (200, 400)


def test_cost_of_living_unknown():
    r = client.get("/api/cost-of-living?school_ids=fake_xyz")
    assert r.status_code in (200, 404)


# ── Essay Theme Analyzer ────────────────────────────────────────────

def test_essay_themes_basic():
    r = client.post("/api/essay/analyze-themes", json={
        "essays": [
            {"title": "Leadership Essay", "content": "I led a team of five engineers and managed the project from start to finish. As team leader, I organized weekly meetings."},
            {"title": "Impact Essay", "content": "I volunteered at a nonprofit to help the community. The social impact transformed the neighborhood."},
        ]
    })
    assert r.status_code == 200
    data = r.json()
    assert "overall" in data
    assert "per_essay" in data
    assert "dominant_themes" in data
    assert "gaps" in data
    assert len(data["per_essay"]) == 2


def test_essay_themes_single():
    r = client.post("/api/essay/analyze-themes", json={
        "essays": [
            {"title": "Test", "content": "I created a startup and built an innovative product that launched globally across multiple countries."},
        ]
    })
    assert r.status_code == 200
    data = r.json()
    assert len(data["per_essay"]) == 1
    assert data["per_essay"][0]["word_count"] > 0


def test_essay_themes_empty():
    r = client.post("/api/essay/analyze-themes", json={"essays": []})
    assert r.status_code in (200, 400)
