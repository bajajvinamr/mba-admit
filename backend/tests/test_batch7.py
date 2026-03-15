"""Tests for batch 7 — alumni network, scholarship estimator, resume keywords."""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


# ── Alumni Network ──────────────────────────────────────────────────

def test_alumni_single():
    r = client.get("/api/schools/alumni-network?school_ids=hbs")
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 1
    first = data[0] if isinstance(data, list) else list(data.values())[0] if isinstance(data, dict) else data
    # Check structure (could be list or dict)
    assert r.status_code == 200


def test_alumni_multiple():
    r = client.get("/api/schools/alumni-network?school_ids=hbs,gsb,booth")
    assert r.status_code == 200


# ── Scholarship Estimator ───────────────────────────────────────────

def test_scholarship_basic():
    r = client.post("/api/scholarship-estimate", json={"gmat": 730, "gpa": 3.8, "work_years": 4})
    assert r.status_code == 200
    data = r.json()
    assert "estimates" in data
    assert "total_potential_savings" in data
    assert len(data["estimates"]) > 0


def test_scholarship_with_schools():
    r = client.post("/api/scholarship-estimate", json={
        "gmat": 750, "gpa": 3.9, "school_ids": ["hbs", "gsb"], "is_urm": True
    })
    assert r.status_code == 200
    data = r.json()
    assert data["total_schools"] >= 1


def test_scholarship_financial_need():
    r = client.post("/api/scholarship-estimate", json={
        "gmat": 700, "gpa": 3.5, "financial_need": True
    })
    assert r.status_code == 200
    data = r.json()
    assert data["total_potential_savings"] > 0


def test_scholarship_best_opportunity():
    r = client.post("/api/scholarship-estimate", json={"gmat": 760, "gpa": 3.9})
    data = r.json()
    assert data["best_opportunity"] is not None
    assert "estimated_award" in data["best_opportunity"]


# ── Resume Keywords ─────────────────────────────────────────────────

def test_resume_keywords_basic():
    r = client.post("/api/resume/keywords", json={
        "resume_text": "Led a team of 10 engineers and managed $5M budget. Increased revenue by 30% through strategic initiatives. Collaborated with cross-functional stakeholders."
    })
    assert r.status_code == 200
    data = r.json()
    assert "overall_score" in data
    assert "categories" in data
    assert "tips" in data
    assert data["overall_score"] > 0


def test_resume_keywords_weak_verbs():
    r = client.post("/api/resume/keywords", json={
        "resume_text": "Helped the team with various tasks. Was responsible for handling customer issues. Assisted in project delivery."
    })
    assert r.status_code == 200
    data = r.json()
    assert len(data["weak_verbs_found"]) > 0


def test_resume_keywords_metrics():
    r = client.post("/api/resume/keywords", json={
        "resume_text": "Generated $2M in revenue. Grew team by 50%. Reduced costs by 25%."
    })
    assert r.status_code == 200
    assert r.json()["metrics_count"] >= 2


def test_resume_keywords_empty():
    r = client.post("/api/resume/keywords", json={"resume_text": ""})
    assert r.status_code == 200
    assert r.json()["word_count"] == 0
