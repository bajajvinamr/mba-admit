"""Tests for /api/user/* endpoints — school list, dashboard."""

import db


def test_get_user_schools_empty(client):
    resp = client.get("/api/user/schools")
    assert resp.status_code == 200
    assert resp.json() == []


def test_add_and_list_schools(client):
    client.post("/api/user/schools", json={"school_id": "hbs", "round": "R1", "priority": 1})
    client.post("/api/user/schools", json={"school_id": "gsb"})

    resp = client.get("/api/user/schools")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2


def test_update_school_status(client):
    resp = client.post("/api/user/schools", json={"school_id": "hbs"})
    entry_id = resp.json()["id"]

    resp = client.put(f"/api/user/schools/{entry_id}", json={"status": "submitted"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "submitted"


def test_update_school_no_fields(client):
    resp = client.post("/api/user/schools", json={"school_id": "hbs"})
    entry_id = resp.json()["id"]

    resp = client.put(f"/api/user/schools/{entry_id}", json={})
    assert resp.status_code == 400


def test_delete_school(client):
    resp = client.post("/api/user/schools", json={"school_id": "hbs"})
    entry_id = resp.json()["id"]

    resp = client.delete(f"/api/user/schools/{entry_id}")
    assert resp.status_code == 200

    assert len(client.get("/api/user/schools").json()) == 0


def test_dashboard(client):
    client.post("/api/user/schools", json={"school_id": "hbs"})
    client.post("/api/user/schools", json={"school_id": "gsb"})

    resp = client.get("/api/user/dashboard")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_schools"] == 2
    assert "status_breakdown" in data
    assert data["status_breakdown"]["researching"] == 2
