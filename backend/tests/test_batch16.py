"""Tests for batch 16 — alumni interview prep, acceptance rate history."""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


# ── Alumni Interview Prep ────────────────────────────────────────────

def test_alumni_interview_default():
    r = client.get("/api/alumni-interview-prep")
    assert r.status_code == 200
    data = r.json()
    assert "schools" in data
    assert len(data["schools"]) > 0


def test_alumni_interview_by_school():
    r = client.get("/api/alumni-interview-prep?school_id=hbs")
    assert r.status_code == 200
    data = r.json()
    assert len(data["schools"]) == 1
    assert data["schools"][0]["school_id"] == "hbs"


def test_alumni_interview_fields():
    r = client.get("/api/alumni-interview-prep?school_id=wharton")
    data = r.json()
    s = data["schools"][0]
    assert "interview_format" in s
    assert "common_questions" in s
    assert "tips" in s


def test_alumni_interview_not_found():
    r = client.get("/api/alumni-interview-prep?school_id=nonexistent_xyz")
    assert r.status_code == 404


# ── Acceptance Rate History ──────────────────────────────────────────

def test_acceptance_rate_history_default():
    r = client.get("/api/acceptance-rate-history")
    assert r.status_code == 200
    data = r.json()
    assert "schools" in data
    assert data["total"] > 0


def test_acceptance_rate_history_by_school():
    r = client.get("/api/acceptance-rate-history?school_id=hbs,gsb")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 2


def test_acceptance_rate_history_has_years():
    r = client.get("/api/acceptance-rate-history?school_id=hbs")
    data = r.json()
    s = data["schools"][0]
    assert "years" in s
    assert len(s["years"]) >= 5


def test_acceptance_rate_history_not_found():
    r = client.get("/api/acceptance-rate-history?school_id=nonexistent_xyz")
    assert r.status_code == 404
