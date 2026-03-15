"""Tests for batch 9 — networking events, interview questions, career paths, app checklist."""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


# ── Networking Events ──────────────────────────────────────────────────

def test_networking_events_default():
    r = client.get("/api/networking-events")
    assert r.status_code == 200
    data = r.json()
    assert "events" in data
    assert data["total"] > 0
    assert "event_types" in data
    assert "formats" in data


def test_networking_events_by_school():
    r = client.get("/api/networking-events?school_id=hbs")
    assert r.status_code == 200
    data = r.json()
    school_events = [e for e in data["events"] if e["school_id"] == "hbs"]
    assert len(school_events) >= 1


def test_networking_events_filter_type():
    r = client.get("/api/networking-events?event_type=webinar")
    assert r.status_code == 200
    data = r.json()
    for ev in data["events"]:
        assert ev["type"] == "webinar"


def test_networking_events_filter_format():
    r = client.get("/api/networking-events?format=online")
    assert r.status_code == 200
    data = r.json()
    for ev in data["events"]:
        assert ev["format"] == "online"


# ── Interview Questions ────────────────────────────────────────────────

def test_interview_questions_default():
    r = client.get("/api/interview-questions")
    assert r.status_code == 200
    data = r.json()
    assert "questions" in data or "categories" in data
    # Should return some questions
    if "questions" in data:
        assert len(data["questions"]) > 0


def test_interview_questions_by_category():
    r = client.get("/api/interview-questions?category=behavioral")
    assert r.status_code == 200
    data = r.json()
    if "questions" in data:
        for q in data["questions"]:
            assert q.get("category") == "behavioral"


def test_interview_questions_by_school():
    r = client.get("/api/interview-questions?school_id=hbs")
    assert r.status_code == 200
    data = r.json()
    assert r.status_code == 200


# ── Career Paths ───────────────────────────────────────────────────────

def test_career_paths_default():
    r = client.get("/api/career-paths")
    assert r.status_code == 200
    data = r.json()
    assert "industries" in data or "paths" in data or isinstance(data, list)


def test_career_paths_by_industry():
    r = client.get("/api/career-paths?industry=consulting")
    assert r.status_code == 200
    data = r.json()
    assert r.status_code == 200


# ── Application Checklist ──────────────────────────────────────────────

def test_app_checklist_basic():
    r = client.post("/api/application-checklist", json={"school_ids": ["hbs"], "round": "R1"})
    assert r.status_code == 200
    data = r.json()
    assert "checklists" in data or "schools" in data or isinstance(data, list)


def test_app_checklist_multi_school():
    r = client.post("/api/application-checklist", json={"school_ids": ["hbs", "gsb", "wharton"], "round": "R1"})
    assert r.status_code == 200
    data = r.json()
    assert r.status_code == 200
