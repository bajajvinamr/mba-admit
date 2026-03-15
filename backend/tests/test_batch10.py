"""Tests for batch 10 — exchange programs, specialty rankings, fee calculator."""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


# ── Exchange Programs ──────────────────────────────────────────────────

def test_exchange_programs_default():
    r = client.get("/api/exchange-programs")
    assert r.status_code == 200
    data = r.json()
    assert "programs" in data or "exchanges" in data
    if "programs" in data:
        assert len(data["programs"]) > 0
    elif "exchanges" in data:
        assert len(data["exchanges"]) > 0


def test_exchange_programs_by_school():
    r = client.get("/api/exchange-programs?school_id=hbs")
    assert r.status_code == 200


def test_exchange_programs_by_region():
    r = client.get("/api/exchange-programs?region=europe")
    assert r.status_code == 200


# ── Specialty Rankings ─────────────────────────────────────────────────

def test_specialty_rankings_default():
    r = client.get("/api/rankings/specialty")
    assert r.status_code == 200
    data = r.json()
    assert "specialties" in data or "rankings" in data


def test_specialty_rankings_by_specialty():
    r = client.get("/api/rankings/specialty?specialty=finance")
    assert r.status_code == 200
    data = r.json()
    assert r.status_code == 200


def test_specialty_rankings_consulting():
    r = client.get("/api/rankings/specialty?specialty=consulting")
    assert r.status_code == 200


# ── Fee Calculator ─────────────────────────────────────────────────────

def test_fee_calculator_basic():
    r = client.post("/api/fee-calculator", json={"school_ids": ["hbs"]})
    assert r.status_code == 200
    data = r.json()
    assert "schools" in data or "fees" in data or "grand_total" in data


def test_fee_calculator_multi():
    r = client.post("/api/fee-calculator", json={"school_ids": ["hbs", "gsb", "wharton"]})
    assert r.status_code == 200
    data = r.json()
    if "grand_total" in data:
        assert data["grand_total"] > 0
