"""Tests for deadline calendar and decision analytics endpoints."""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


# ── Deadline Calendar ───────────────────────────────────────────────────

def test_calendar_basic():
    r = client.get("/api/schools/deadlines/calendar")
    assert r.status_code == 200
    data = r.json()
    assert "events" in data
    assert "total_events" in data
    assert "months" in data
    assert "school_count" in data


def test_calendar_has_events():
    r = client.get("/api/schools/deadlines/calendar")
    data = r.json()
    assert data["total_events"] > 0
    assert len(data["events"]) == data["total_events"]


def test_calendar_event_fields():
    r = client.get("/api/schools/deadlines/calendar")
    event = r.json()["events"][0]
    assert "school_id" in event
    assert "school_name" in event
    assert "round" in event
    assert "deadline_date" in event
    assert "type" in event


def test_calendar_event_types():
    r = client.get("/api/schools/deadlines/calendar")
    types = {e["type"] for e in r.json()["events"]}
    assert "deadline" in types


def test_calendar_months_grouping():
    r = client.get("/api/schools/deadlines/calendar")
    data = r.json()
    months = data["months"]
    assert len(months) > 0
    for key, events in months.items():
        # Month keys should be YYYY-MM format
        assert len(key) == 7
        assert key[4] == "-"
        assert len(events) > 0


def test_calendar_chronological_order():
    r = client.get("/api/schools/deadlines/calendar")
    events = r.json()["events"]
    dates = [e["deadline_date"] for e in events]
    assert dates == sorted(dates)


def test_calendar_filtered_by_school_ids():
    r = client.get("/api/schools/deadlines/calendar?school_ids=hbs,gsb")
    assert r.status_code == 200
    data = r.json()
    school_ids = {e["school_id"] for e in data["events"]}
    assert school_ids <= {"hbs", "gsb"}
    assert data["school_count"] <= 2


def test_calendar_single_school_filter():
    r = client.get("/api/schools/deadlines/calendar?school_ids=hbs")
    assert r.status_code == 200
    data = r.json()
    for event in data["events"]:
        assert event["school_id"] == "hbs"


def test_calendar_unknown_school_filter():
    r = client.get("/api/schools/deadlines/calendar?school_ids=nonexistent_xyz")
    assert r.status_code == 200
    data = r.json()
    assert data["total_events"] == 0
    assert data["events"] == []


# ── Decision Analytics ──────────────────────────────────────────────────

def test_analytics_basic():
    r = client.get("/api/decisions/analytics")
    assert r.status_code == 200
    data = r.json()
    assert "total" in data
    assert "gmat_distribution" in data
    assert "gpa_distribution" in data
    assert "by_round" in data
    assert "by_industry" in data


def test_analytics_has_data():
    r = client.get("/api/decisions/analytics")
    data = r.json()
    assert data["total"] > 0


def test_analytics_round_fields():
    r = client.get("/api/decisions/analytics")
    data = r.json()
    if data["by_round"]:
        entry = data["by_round"][0]
        assert "round" in entry
        assert "admit_rate" in entry
        assert "admitted" in entry
        assert "denied" in entry
        assert "total" in entry


def test_analytics_industry_fields():
    r = client.get("/api/decisions/analytics")
    data = r.json()
    if data["by_industry"]:
        entry = data["by_industry"][0]
        assert "industry" in entry
        assert "admit_rate" in entry
        assert "total" in entry


def test_analytics_school_specific():
    r = client.get("/api/decisions/analytics?school_id=hbs")
    assert r.status_code == 200
    data = r.json()
    assert "total" in data
    assert "gmat_distribution" in data


def test_analytics_unknown_school():
    r = client.get("/api/decisions/analytics?school_id=nonexistent_xyz")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 0


def test_analytics_yoe_distribution():
    r = client.get("/api/decisions/analytics")
    data = r.json()
    assert "yoe_distribution" in data
