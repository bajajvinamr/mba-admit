"""Tests for Phase 6 feature endpoints — compare, profile, essays, decisions."""

import db


def test_compare_schools(client):
    resp = client.post("/api/schools/compare", json={"school_ids": ["hbs", "gsb"]})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["schools"]) == 2
    names = [s["name"] for s in data["schools"]]
    assert "Harvard Business School" in names
    assert "Stanford GSB" in names


def test_compare_schools_too_few(client):
    resp = client.post("/api/schools/compare", json={"school_ids": ["hbs"]})
    assert resp.status_code == 422  # min_length=2 validation


def test_compare_schools_invalid_ids(client):
    resp = client.post("/api/schools/compare", json={"school_ids": ["fake1", "fake2"]})
    assert resp.status_code == 400


def test_profile_analysis(client):
    resp = client.post("/api/profile/analyze", json={
        "gmat": 740,
        "gpa": 3.8,
        "industry": "consulting",
        "years_experience": 4,
        "undergrad_tier": "top_10",
        "leadership_roles": "manager",
        "intl_experience": True,
        "community_service": True,
        "target_school_ids": ["hbs", "gsb"],
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "dimensions" in data
    assert "overall" in data
    assert "school_fits" in data
    assert data["dimensions"]["academics"] > 50
    assert len(data["school_fits"]) == 2


def test_profile_analysis_no_targets(client):
    resp = client.post("/api/profile/analyze", json={
        "gmat": 700,
        "gpa": 3.5,
        "industry": "tech",
        "years_experience": 3,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["school_fits"]) > 0  # auto-fills from SCHOOL_DB


def test_essay_versioning_roundtrip(client, seeded_session):
    base = "/api/essays/test-session-1/hbs/0/versions"

    # Initially empty
    resp = client.get(base)
    assert resp.status_code == 200
    assert resp.json()["versions"] == []

    # Save v1
    resp = client.post(base, json={"content": "First draft of my essay.", "source": "user_edit"})
    assert resp.status_code == 200
    assert resp.json()["version"] == 1

    # Save v2
    resp = client.post(base, json={"content": "Revised draft with more detail."})
    assert resp.status_code == 200
    assert resp.json()["version"] == 2

    # List all
    resp = client.get(base)
    assert len(resp.json()["versions"]) == 2


def test_submit_community_decision(client):
    resp = client.post("/api/community/decisions", json={
        "school_id": "hbs",
        "round": "R1",
        "status": "Admitted",
        "gmat": 750,
        "industry": "Consulting",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["school_id"] == "hbs"
    assert data["status"] == "Admitted"


def test_list_community_decisions(client):
    # Submit a few
    for status in ["Admitted", "Waitlisted", "Dinged"]:
        client.post("/api/community/decisions", json={
            "school_id": "hbs",
            "round": "R1",
            "status": status,
        })

    resp = client.get("/api/community/decisions")
    assert resp.status_code == 200
    assert len(resp.json()["decisions"]) == 3


def test_filter_decisions_by_status(client):
    client.post("/api/community/decisions", json={"school_id": "hbs", "round": "R1", "status": "Admitted"})
    client.post("/api/community/decisions", json={"school_id": "hbs", "round": "R1", "status": "Dinged"})

    resp = client.get("/api/community/decisions?status=Admitted")
    assert resp.status_code == 200
    assert len(resp.json()["decisions"]) == 1
    assert resp.json()["decisions"][0]["status"] == "Admitted"
