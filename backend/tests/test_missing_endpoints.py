"""Tests for endpoints bridged to match frontend expectations."""


def test_decisions_submit_success(client):
    """POST /api/decisions/submit should accept a decision and store it."""
    resp = client.post(
        "/api/decisions/submit",
        json={
            "school_id": "hbs",
            "round": "R1",
            "status": "Admitted",
            "gmat": 740,
            "gpa": 3.8,
            "work_years": 5,
            "industry": "consulting",
            "is_anonymous": True,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["school_id"] == "hbs"
    assert data["status"] == "Admitted"


def test_decisions_submit_minimal(client):
    """Submit a decision with only required fields."""
    resp = client.post(
        "/api/decisions/submit",
        json={
            "school_id": "gsb",
            "round": "R2",
            "status": "Dinged",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["school_id"] == "gsb"


def test_decisions_submit_invalid_round(client):
    """Invalid round value should fail validation."""
    resp = client.post(
        "/api/decisions/submit",
        json={
            "school_id": "hbs",
            "round": "InvalidRound",
            "status": "Admitted",
        },
    )
    assert resp.status_code == 422
