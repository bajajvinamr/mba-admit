"""Tests for Phase 6 feature endpoints — compare, profile, essays, decisions."""

from unittest.mock import patch
import db


def test_compare_schools(client):
    resp = client.post("/api/schools/compare", json={"school_ids": ["hbs", "gsb"]})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["schools"]) == 2
    names = [s["name"] for s in data["schools"]]
    assert "Harvard Business School" in names
    assert any("Stanford" in n for n in names)
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


# ── Analytics ────────────────────────────────────────────────────────────────


def test_analytics_event_batch(client, tmp_path, monkeypatch):
    """Analytics endpoint accepts event batches and writes JSONL."""
    import routers.features as feat_mod
    analytics_file = tmp_path / "analytics.jsonl"
    monkeypatch.setattr(feat_mod, "ANALYTICS_FILE", analytics_file)

    resp = client.post("/api/analytics/event", json={
        "events": [
            {"event": "page_view", "properties": {"path": "/"}, "timestamp": "2026-03-15T00:00:00Z"},
            {"event": "odds_calculated", "properties": {"gmat": 720}, "timestamp": "2026-03-15T00:01:00Z"},
        ]
    })
    assert resp.status_code == 200
    assert resp.json()["ok"] is True

    # Verify JSONL file was written
    lines = analytics_file.read_text().strip().split("\n")
    assert len(lines) == 2
    import json
    assert json.loads(lines[0])["event"] == "page_view"
    assert json.loads(lines[1])["event"] == "odds_calculated"


def test_analytics_event_empty_batch(client):
    """Empty batch is accepted without error."""
    resp = client.post("/api/analytics/event", json={"events": []})
    assert resp.status_code == 200
    assert resp.json()["ok"] is True


# ── Essay Versioning Edge Cases ──────────────────────────────────────────────


def test_essay_version_auto_increments(client, seeded_session):
    """Version numbers auto-increment from 1."""
    base = "/api/essays/test-session-1/hbs/0/versions"
    for i in range(1, 4):
        resp = client.post(base, json={"content": f"Draft {i}.", "source": "user_edit"})
        assert resp.json()["version"] == i

    versions = client.get(base).json()["versions"]
    assert [v["version"] for v in versions] == [1, 2, 3]


def test_essay_version_preserves_source(client, seeded_session):
    """Source field distinguishes AI-generated from user edits."""
    base = "/api/essays/test-session-1/hbs/0/versions"
    client.post(base, json={"content": "AI wrote this.", "source": "ai_generated"})
    client.post(base, json={"content": "I edited this.", "source": "user_edit"})

    versions = client.get(base).json()["versions"]
    assert versions[0]["source"] == "ai_generated"
    assert versions[1]["source"] == "user_edit"


def test_essay_versions_isolated_per_prompt(client, seeded_session):
    """Versions for different prompt indices are independent."""
    client.post("/api/essays/test-session-1/hbs/0/versions", json={"content": "Prompt 0 essay."})
    client.post("/api/essays/test-session-1/hbs/1/versions", json={"content": "Prompt 1 essay."})

    v0 = client.get("/api/essays/test-session-1/hbs/0/versions").json()["versions"]
    v1 = client.get("/api/essays/test-session-1/hbs/1/versions").json()["versions"]
    assert len(v0) == 1
    assert len(v1) == 1
    assert v0[0]["content"] == "Prompt 0 essay."
    assert v1[0]["content"] == "Prompt 1 essay."


# ── Profile Analysis Edge Cases ──────────────────────────────────────────────


def test_profile_analysis_5_scale_gpa(client):
    """German 5.0 scale GPA (1.0 = best) inverts correctly."""
    resp = client.post("/api/profile/analyze", json={
        "gmat": 720,
        "gpa": 1.5,
        "gpa_scale": "5.0",
        "industry": "consulting",
        "years_experience": 4,
    })
    assert resp.status_code == 200
    dims = resp.json()["dimensions"]
    assert dims["academics"] > 70  # 1.5/5.0 is excellent on German scale


def test_profile_analysis_high_exp_caps_at_100(client):
    """Work experience score caps at 100 regardless of years."""
    resp = client.post("/api/profile/analyze", json={
        "gmat": 700,
        "gpa": 3.5,
        "industry": "consulting",
        "years_experience": 15,
    })
    assert resp.status_code == 200
    dims = resp.json()["dimensions"]
    assert dims["work_experience"] == 100


def test_profile_analysis_dimension_range(client):
    """All dimension scores are between 0 and 100."""
    resp = client.post("/api/profile/analyze", json={
        "gmat": 780,
        "gpa": 4.0,
        "industry": "tech",
        "years_experience": 6,
        "undergrad_tier": "top_10",
        "leadership_roles": "cxo",
        "intl_experience": True,
        "community_service": True,
    })
    assert resp.status_code == 200
    dims = resp.json()["dimensions"]
    for dim, score in dims.items():
        assert 0 <= score <= 100, f"{dim} = {score} out of range"


# ── Insights Edge Cases ──────────────────────────────────────────────────────


def test_insights_nonexistent_school(client):
    """Insights for unknown school returns 404."""
    resp = client.get("/api/schools/totally_fake_school/insights")
    assert resp.status_code == 404


# ── Evaluate Essay (mocked LLM) ──────────────────────────────────────────────


def test_evaluate_essay_mocked(client):
    """Evaluate essay returns structured response with mocked LLM."""
    mock_result = {
        "overall_score": 7,
        "authenticity": 8,
        "specificity": 6,
        "structure": 7,
        "feedback": "Good narrative arc.",
        "rewrite_suggestions": ["Add a concrete example."],
    }
    with patch("routers.essays.evaluate_essay_draft", return_value=mock_result):
        resp = client.post("/api/evaluate_essay", json={
            "school_id": "hbs",
            "prompt": "What is your post-MBA goal?",
            "essay_text": "I want to transform healthcare in India by building an AI diagnostics platform. " * 5,
        })
    assert resp.status_code == 200
    data = resp.json()
    assert data["overall_score"] == 7
    assert "feedback" in data


def test_evaluate_essay_too_short(client):
    """Essay under 50 chars should be rejected by validation."""
    resp = client.post("/api/evaluate_essay", json={
        "school_id": "hbs",
        "prompt": "Why MBA?",
        "essay_text": "Short.",
    })
    assert resp.status_code == 422
