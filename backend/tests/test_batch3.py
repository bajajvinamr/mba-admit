"""Tests for batch 3 endpoints — essay prompts, score converter, employment, ROI."""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


# ── Essay Prompt Library ─────────────────────────────────────────────

def test_essay_prompts_all():
    r = client.get("/api/essay-prompts")
    assert r.status_code == 200
    data = r.json()
    assert data["total_prompts"] > 0
    assert data["school_count"] > 0
    assert len(data["prompts"]) > 0


def test_essay_prompts_by_school():
    r = client.get("/api/essay-prompts?school_id=hbs")
    assert r.status_code == 200
    data = r.json()
    assert all(p["school_id"] == "hbs" for p in data["prompts"])


def test_essay_prompts_unknown_school():
    r = client.get("/api/essay-prompts?school_id=fake_school")
    assert r.status_code == 404


def test_essay_prompt_fields():
    r = client.get("/api/essay-prompts?school_id=hbs")
    p = r.json()["prompts"][0]
    assert "school_id" in p
    assert "school_name" in p
    assert "prompt_text" in p
    assert "prompt_index" in p


# ── Score Converter ──────────────────────────────────────────────────

def test_gmat_to_gre():
    r = client.get("/api/score-convert?score=740&from_test=gmat")
    assert r.status_code == 200
    data = r.json()
    assert data["input_test"] == "gmat"
    assert data["converted_test"] == "gre"
    assert 330 <= data["converted_score"] <= 340


def test_gre_to_gmat():
    r = client.get("/api/score-convert?score=330&from_test=gre")
    assert r.status_code == 200
    data = r.json()
    assert data["input_test"] == "gre"
    assert data["converted_test"] == "gmat"
    assert 600 <= data["converted_score"] <= 800


def test_score_convert_invalid_gmat():
    r = client.get("/api/score-convert?score=900&from_test=gmat")
    assert r.status_code == 400


def test_score_convert_invalid_test():
    r = client.get("/api/score-convert?score=700&from_test=sat")
    assert r.status_code == 400


def test_score_convert_percentile():
    r = client.get("/api/score-convert?score=700&from_test=gmat")
    data = r.json()
    assert "percentile_estimate" in data
    assert data["percentile_estimate"] > 0


# ── Employment Stats ─────────────────────────────────────────────────

def test_employment_hbs():
    r = client.get("/api/schools/hbs/employment")
    assert r.status_code == 200
    data = r.json()
    assert data["school_id"] == "hbs"
    assert "has_data" in data


def test_employment_unknown_school():
    r = client.get("/api/schools/fake_school/employment")
    assert r.status_code == 404


# ── ROI Calculator ───────────────────────────────────────────────────

def test_roi_basic():
    r = client.get("/api/schools/hbs/roi?current_salary=80000&years=10")
    assert r.status_code == 200
    data = r.json()
    assert data["school_id"] == "hbs"
    assert "roi_pct" in data
    assert "net_gain_10yr" in data
    assert "breakeven_year" in data
    assert "total_investment" in data


def test_roi_unknown_school():
    r = client.get("/api/schools/fake_school/roi")
    assert r.status_code == 404


def test_roi_default_params():
    r = client.get("/api/schools/hbs/roi")
    assert r.status_code == 200
    data = r.json()
    assert data["total_investment"] > 0
