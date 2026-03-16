"""Tests for POST /api/schools/application-fees endpoint."""

from unittest.mock import patch

import pytest


# ── Helper: build a minimal mock SCHOOL_DB ────────────────────────────────────

MOCK_DB = {
    "hbs": {
        "name": "Harvard Business School",
        "country": "USA",
        "application_fee_usd": 250,
        "admission_requirements": {"application_fee": "$275"},
    },
    "insead": {
        "name": "INSEAD",
        "country": "France",
        "application_fee_usd": 265,
        "admission_requirements": {"application_fee": "150"},
    },
    "wharton": {
        "name": "Wharton School",
        "country": "USA",
        "application_fee_usd": 275,
        "admission_requirements": {"application_fee": 250},
    },
    "legacy_fee": {
        "name": "Legacy Fee School",
        "country": "USA",
        "admission_requirements": {"application_fee": "$200"},
    },
    "no_fee_us": {
        "name": "No Fee US School",
        "country": "USA",
        "admission_requirements": {},
    },
    "no_fee_intl": {
        "name": "No Fee Intl School",
        "country": "India",
        "admission_requirements": {},
    },
}


@pytest.fixture(autouse=True)
def _mock_school_db():
    """Patch SCHOOL_DB in the router module for all tests in this file."""
    with patch("routers.schools.SCHOOL_DB", MOCK_DB):
        yield


# ── Tests ─────────────────────────────────────────────────────────────────────


def test_basic_response_known_schools(client):
    """Known schools with application_fee_usd return correct fees."""
    resp = client.post("/api/schools/application-fees", json={"school_ids": ["hbs", "insead"]})
    assert resp.status_code == 200
    data = resp.json()
    assert "schools" in data
    assert "total_fees" in data
    assert "school_count" in data
    assert "estimated_count" in data
    assert data["school_count"] == 2
    schools = {s["school_id"]: s for s in data["schools"]}
    assert schools["hbs"]["fee"] == 250
    assert schools["hbs"]["fee_source"] == "database"
    assert schools["insead"]["fee"] == 265
    assert schools["insead"]["fee_source"] == "database"


def test_total_is_sum_of_individual_fees(client):
    """total_fees equals the sum of all per-school fees."""
    resp = client.post("/api/schools/application-fees", json={
        "school_ids": ["hbs", "insead", "wharton"],
    })
    data = resp.json()
    individual_sum = sum(s["fee"] for s in data["schools"])
    assert data["total_fees"] == individual_sum
    assert data["total_fees"] == 250 + 265 + 275


def test_unknown_school_returns_not_found(client):
    """A school_id not in the DB gets fee_source='not_found' with fee 0."""
    resp = client.post("/api/schools/application-fees", json={"school_ids": ["zzz_fake"]})
    assert resp.status_code == 200
    data = resp.json()
    assert data["schools"][0]["fee_source"] == "not_found"
    assert data["schools"][0]["fee"] == 0


def test_single_school_works(client):
    """Endpoint works with a single school."""
    resp = client.post("/api/schools/application-fees", json={"school_ids": ["wharton"]})
    assert resp.status_code == 200
    data = resp.json()
    assert data["school_count"] == 1
    assert data["total_fees"] == 275


def test_enriched_fee_preferred_over_parsed(client):
    """application_fee_usd is preferred over admission_requirements.application_fee."""
    resp = client.post("/api/schools/application-fees", json={"school_ids": ["hbs"]})
    data = resp.json()
    # hbs has application_fee_usd=250 (enriched) and admission_requirements=$275 (legacy)
    assert data["schools"][0]["fee"] == 250
    assert data["schools"][0]["fee_source"] == "database"


def test_fallback_to_parsed_fee(client):
    """School without application_fee_usd falls back to parsing admission_requirements."""
    resp = client.post("/api/schools/application-fees", json={"school_ids": ["legacy_fee"]})
    data = resp.json()
    assert data["schools"][0]["fee"] == 200
    assert data["schools"][0]["fee_source"] == "parsed"


def test_missing_fee_defaults_us(client):
    """US school without any fee data defaults to $250."""
    resp = client.post("/api/schools/application-fees", json={"school_ids": ["no_fee_us"]})
    data = resp.json()
    assert data["schools"][0]["fee"] == 250
    assert data["schools"][0]["fee_source"] == "estimated"
    assert data["estimated_count"] == 1


def test_missing_fee_defaults_international(client):
    """Non-US school without any fee data defaults to $200."""
    resp = client.post("/api/schools/application-fees", json={"school_ids": ["no_fee_intl"]})
    data = resp.json()
    assert data["schools"][0]["fee"] == 200
    assert data["schools"][0]["fee_source"] == "estimated"


def test_response_includes_currency(client):
    """Each school entry includes a currency field."""
    resp = client.post("/api/schools/application-fees", json={"school_ids": ["hbs"]})
    data = resp.json()
    entry = data["schools"][0]
    assert "currency" in entry
    assert entry["currency"] == "USD"


def test_response_field_names(client):
    """Each school entry has exactly the expected fields."""
    resp = client.post("/api/schools/application-fees", json={"school_ids": ["hbs"]})
    data = resp.json()
    entry = data["schools"][0]
    assert set(entry.keys()) == {"school_id", "school_name", "fee", "fee_source", "currency"}


def test_empty_school_ids_rejected(client):
    """An empty school_ids list is rejected with 422."""
    resp = client.post("/api/schools/application-fees", json={"school_ids": []})
    assert resp.status_code == 422
