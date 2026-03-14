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
    # Check new response structure
    hbs = data["schools"][0]
    assert "static" in hbs
    assert "outcomes" in hbs
    assert hbs["profile_fit"] is None  # no profile provided


def test_compare_schools_with_profile(client):
    resp = client.post("/api/schools/compare", json={
        "school_ids": ["hbs", "gsb"],
        "profile": {"gmat": 740, "gpa": 3.7, "yoe": 4}
    })
    assert resp.status_code == 200
    data = resp.json()
    hbs = data["schools"][0]
    if hbs["outcomes"]:  # only if GMAT Club data exists for test env
        assert hbs["profile_fit"] is not None
        assert "gmat_percentile" in hbs["profile_fit"]
        assert "verdict" in hbs["profile_fit"]


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


# ── Email Capture / Waitlist ─────────────────────────────────────────────────

def test_insights_returns_similar_applicants(client):
    """School insights endpoint returns similar applicants when profile is provided."""
    resp = client.get("/api/schools/booth/insights?gmat=730&gpa=3.6&yoe=5")
    assert resp.status_code == 200
    data = resp.json()
    assert "similar_applicants" in data
    # May be empty if no GMAT Club data matches, but key must exist
    assert isinstance(data["similar_applicants"], list)
    if data["similar_applicants"]:
        a = data["similar_applicants"][0]
        assert "outcome" in a
        assert a["outcome"] in ["Admitted", "Denied", "Waitlisted", "Interview"]


def test_insights_no_similar_without_profile(client):
    """School insights without profile returns empty similar_applicants."""
    resp = client.get("/api/schools/booth/insights")
    assert resp.status_code == 200
    data = resp.json()
    assert data["similar_applicants"] == []


def test_subscribe_email(client, tmp_path, monkeypatch):
    """Email capture endpoint stores email and returns success."""
    import routers.features as feat_mod
    monkeypatch.setattr(feat_mod, "WAITLIST_FILE", tmp_path / "waitlist.json")
    resp = client.post("/api/subscribe", json={"email": "test@example.com", "source": "test"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "subscribed"


def test_subscribe_email_dedupe(client, tmp_path, monkeypatch):
    """Subscribing the same email twice returns already_subscribed."""
    import routers.features as feat_mod
    monkeypatch.setattr(feat_mod, "WAITLIST_FILE", tmp_path / "waitlist.json")
    client.post("/api/subscribe", json={"email": "dupe@test.com", "source": "test"})
    resp = client.post("/api/subscribe", json={"email": "dupe@test.com", "source": "test"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "already_subscribed"


def test_subscribe_email_invalid(client):
    """Invalid email format returns 422."""
    resp = client.post("/api/subscribe", json={"email": "not-an-email", "source": "test"})
    assert resp.status_code == 422
