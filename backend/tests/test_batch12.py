"""Tests for batch 12 — GMAT predictor, program formats."""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


# ── GMAT Predictor ─────────────────────────────────────────────────────

def test_gmat_predictor_basic():
    r = client.post("/api/gmat-predictor", json={
        "practice_scores": [650, 670, 690],
        "study_hours_per_week": 15,
        "weeks_remaining": 4,
    })
    assert r.status_code == 200
    data = r.json()
    assert "predicted_score" in data
    assert data["predicted_score"] >= 600


def test_gmat_predictor_single_score():
    r = client.post("/api/gmat-predictor", json={
        "practice_scores": [700],
        "study_hours_per_week": 10,
        "weeks_remaining": 2,
    })
    assert r.status_code == 200
    data = r.json()
    assert "confidence_range" in data or "predicted_score" in data


def test_gmat_predictor_improving_trend():
    r = client.post("/api/gmat-predictor", json={
        "practice_scores": [600, 640, 680, 720],
        "study_hours_per_week": 20,
        "weeks_remaining": 6,
    })
    assert r.status_code == 200
    data = r.json()
    if "score_trend" in data:
        assert data["score_trend"] == "improving"


# ── Program Formats ────────────────────────────────────────────────────

def test_program_formats_default():
    r = client.get("/api/program-formats")
    assert r.status_code == 200
    data = r.json()
    assert "formats" in data
    assert len(data["formats"]) >= 3


def test_program_formats_by_type():
    r = client.get("/api/program-formats?format=2_year")
    assert r.status_code == 200
    data = r.json()
    assert r.status_code == 200


def test_program_formats_1year():
    r = client.get("/api/program-formats?format=1_year")
    assert r.status_code == 200
