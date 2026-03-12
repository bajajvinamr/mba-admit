"""Tests for standalone tool endpoints — roast, decisions, control center."""


def test_roast_resume_returns_valid_response(client):
    """Resume roaster returns a valid JSON shape with score, roast, improvement."""
    resp = client.post("/api/roast_resume", json={"bullet": "Synergized cross-functional pipeline alignment"})
    assert resp.status_code == 200
    data = resp.json()
    assert "score" in data
    assert "roast" in data
    assert "improvement" in data
    assert isinstance(data["score"], int)
    assert 1 <= data["score"] <= 10
    assert len(data["roast"]) > 0
    assert len(data["improvement"]) > 0


def test_roast_resume_different_bullets(client):
    """Roaster handles various bullet styles without 500 errors."""
    bullets = [
        "Helped the team with various tasks",
        "Managed a team of 5 engineers",
        "Did some work on the project",
        "Led a $4M digital transformation initiative across 3 business units",
    ]
    for bullet in bullets:
        resp = client.post("/api/roast_resume", json={"bullet": bullet})
        assert resp.status_code == 200
        data = resp.json()
        assert "score" in data and "roast" in data and "improvement" in data


def test_roast_resume_empty_rejects(client):
    resp = client.post("/api/roast_resume", json={"bullet": ""})
    assert resp.status_code == 422


def test_decisions_returns_list(client):
    resp = client.get("/api/decisions")
    assert resp.status_code == 200
    data = resp.json()
    assert "decisions" in data
    assert len(data["decisions"]) >= 10  # seed data has 12
    d = data["decisions"][0]
    assert "school" in d
    assert d["status"] in ("Admitted", "Waitlisted", "Dinged")


def test_decisions_have_required_fields(client):
    """Each decision has the expected schema fields."""
    resp = client.get("/api/decisions")
    data = resp.json()
    for d in data["decisions"]:
        assert "id" in d
        assert "school" in d
        assert "round" in d
        assert "status" in d
        assert "gmat" in d
        assert "gpa" in d
        assert "work_years" in d
        assert "industry" in d


def test_control_center_init(client):
    resp = client.post("/api/control_center/init", json={"school_ids": ["hbs", "gsb"]})
    assert resp.status_code == 200
    data = resp.json()
    assert "logistics" in data
    assert len(data["logistics"]) >= 1  # at least hbs should exist
    # Verify real data fields are present (not mock)
    hbs = data["logistics"][0]
    assert hbs["id"] == "hbs"
    assert "essay_count" in hbs
    assert hbs["essay_count"] >= 1
    assert "essay_prompts" in hbs
    assert "recommendation_count" in hbs
    assert isinstance(hbs["recommendation_count"], int)
    assert "deadline_r1" in hbs  # real deadline from school DB


def test_control_center_init_empty(client):
    resp = client.post("/api/control_center/init", json={"school_ids": []})
    assert resp.status_code == 200
    assert resp.json()["logistics"] == []
