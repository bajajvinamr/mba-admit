"""Tests for batch 11 — salary database, admission trends."""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


# ── Salary Database ────────────────────────────────────────────────────

def test_salary_database_default():
    r = client.get("/api/salary-database")
    assert r.status_code == 200
    data = r.json()
    assert "schools" in data
    assert len(data["schools"]) > 0


def test_salary_database_by_school():
    r = client.get("/api/salary-database?school_id=hbs")
    assert r.status_code == 200
    data = r.json()
    assert len(data["schools"]) >= 1


def test_salary_database_by_industry():
    r = client.get("/api/salary-database?industry=consulting")
    assert r.status_code == 200


def test_salary_database_fields():
    r = client.get("/api/salary-database?school_id=wharton")
    data = r.json()
    if data["schools"]:
        s = data["schools"][0]
        assert "median_base_salary" in s or "median_salary" in s


# ── Admission Trends ──────────────────────────────────────────────────

def test_admission_trends_default():
    r = client.get("/api/admission-trends")
    assert r.status_code == 200
    data = r.json()
    assert "schools" in data
    assert data["total"] > 0


def test_admission_trends_by_school():
    r = client.get("/api/admission-trends?school_id=hbs,gsb")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 1


def test_admission_trends_has_years():
    r = client.get("/api/admission-trends?school_id=hbs")
    data = r.json()
    if data["schools"]:
        s = data["schools"][0]
        assert "years" in s
        assert len(s["years"]) >= 3


def test_admission_trends_has_trends():
    r = client.get("/api/admission-trends?school_id=booth")
    data = r.json()
    if data["schools"]:
        s = data["schools"][0]
        assert "trends" in s
