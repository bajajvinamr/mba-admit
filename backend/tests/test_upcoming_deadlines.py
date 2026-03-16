"""Tests for GET /api/upcoming-deadlines endpoint."""

import pytest


def test_upcoming_deadlines_returns_200(client):
    resp = client.get("/api/upcoming-deadlines")
    assert resp.status_code == 200
    data = resp.json()
    assert "deadlines" in data
    assert "total" in data
    assert "window_days" in data
    assert data["window_days"] == 90


def test_custom_days_window(client):
    resp = client.get("/api/upcoming-deadlines?days=365")
    assert resp.status_code == 200
    data = resp.json()
    assert data["window_days"] == 365


def test_deadline_fields(client):
    """Each deadline entry has expected fields."""
    resp = client.get("/api/upcoming-deadlines?days=365&limit=100")
    data = resp.json()
    if data["deadlines"]:
        dl = data["deadlines"][0]
        assert "school_id" in dl
        assert "school_name" in dl
        assert "round" in dl
        assert "deadline" in dl
        assert "deadline_date" in dl
        assert "days_away" in dl
        assert "urgency" in dl
        assert "degree_type" in dl
        assert dl["urgency"] in ("critical", "soon", "upcoming")


def test_deadlines_sorted_by_date(client):
    resp = client.get("/api/upcoming-deadlines?days=365&limit=100")
    data = resp.json()
    dates = [dl["deadline_date"] for dl in data["deadlines"]]
    assert dates == sorted(dates)


def test_degree_type_filter(client):
    resp = client.get("/api/upcoming-deadlines?days=365&degree_type=MBA")
    data = resp.json()
    for dl in data["deadlines"]:
        assert dl["degree_type"] == "MBA"


def test_limit_respected(client):
    resp = client.get("/api/upcoming-deadlines?days=365&limit=3")
    data = resp.json()
    assert len(data["deadlines"]) <= 3


def test_days_validation(client):
    resp = client.get("/api/upcoming-deadlines?days=0")
    assert resp.status_code == 422
    resp = client.get("/api/upcoming-deadlines?days=500")
    assert resp.status_code == 422
