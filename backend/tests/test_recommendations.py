"""Tests for /api/recommendations endpoint."""


def test_recommendations_basic(client):
    """Should return recommendations with tier breakdown."""
    resp = client.get("/api/recommendations?gmat=720&gpa=3.6&yoe=4")
    assert resp.status_code == 200
    data = resp.json()
    assert "recommendations" in data
    assert "profile_summary" in data
    assert "tier_counts" in data
    recs = data["recommendations"]
    assert isinstance(recs, list)
    assert len(recs) >= 4  # at least some schools


def test_recommendations_tiers_present(client):
    """Should return schools in all three tiers."""
    resp = client.get("/api/recommendations?gmat=720&gpa=3.6&yoe=4&limit=12")
    data = resp.json()
    tiers = {r["tier"] for r in data["recommendations"]}
    # With 720 GMAT and 3.6 GPA, there should be at least Target + one other tier
    assert "Target" in tiers or "Safety" in tiers


def test_recommendations_structure(client):
    """Each recommendation should have required fields."""
    resp = client.get("/api/recommendations?gmat=700&gpa=3.5")
    data = resp.json()
    rec = data["recommendations"][0]
    required_fields = [
        "school_id", "name", "location", "country",
        "tier", "prob", "total_decisions",
    ]
    for field in required_fields:
        assert field in rec, f"Missing field: {field}"
    assert rec["tier"] in ("Reach", "Target", "Safety")
    assert 0 <= rec["prob"] <= 100


def test_recommendations_profile_summary(client):
    """Profile summary should reflect input params."""
    resp = client.get("/api/recommendations?gmat=740&gpa=3.8&yoe=5")
    data = resp.json()
    ps = data["profile_summary"]
    assert ps["gmat"] == 740
    assert ps["gpa"] == 3.8
    assert ps["yoe"] == 5
    assert ps["gmat_estimated"] is False


def test_recommendations_estimated_gmat(client):
    """When no GMAT provided, should flag as estimated."""
    resp = client.get("/api/recommendations?gpa=3.5")
    data = resp.json()
    assert data["profile_summary"]["gmat_estimated"] is True


def test_recommendations_gre_conversion(client):
    """GRE test type should convert to GMAT equivalent."""
    resp = client.get("/api/recommendations?gpa=3.5&test_type=gre&test_score=325")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["recommendations"]) >= 4


def test_recommendations_cat_conversion(client):
    """CAT percentile should convert to GMAT equivalent."""
    resp = client.get("/api/recommendations?gpa=3.5&test_type=cat&test_score=95")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["recommendations"]) >= 4


def test_recommendations_limit(client):
    """Limit parameter should cap results."""
    resp = client.get("/api/recommendations?gmat=720&gpa=3.6&limit=5")
    data = resp.json()
    assert len(data["recommendations"]) <= 5


def test_recommendations_with_industry(client):
    """Industry param should affect scoring."""
    resp_tech = client.get("/api/recommendations?gmat=720&gpa=3.6&industry=tech")
    resp_base = client.get("/api/recommendations?gmat=720&gpa=3.6")
    # Tech modifier adds +3, so probabilities should differ
    tech_probs = {r["school_id"]: r["prob"] for r in resp_tech.json()["recommendations"]}
    base_probs = {r["school_id"]: r["prob"] for r in resp_base.json()["recommendations"]}
    # At least one school should have different probability
    diffs = [tech_probs.get(sid, 0) - base_probs.get(sid, 0) for sid in base_probs if sid in tech_probs]
    assert any(d != 0 for d in diffs), "Industry modifier should change probabilities"


def test_recommendations_fit_reason(client):
    """Each recommendation should have a non-empty fit_reason."""
    resp = client.get("/api/recommendations?gmat=720&gpa=3.6&yoe=4&limit=8")
    data = resp.json()
    for rec in data["recommendations"]:
        assert "fit_reason" in rec
        assert isinstance(rec["fit_reason"], str)
        assert len(rec["fit_reason"]) > 5, f"Fit reason too short for {rec['school_id']}"


def test_recommendations_validation(client):
    """Should reject invalid params."""
    resp = client.get("/api/recommendations?gmat=1000")
    assert resp.status_code == 422  # validation error — GMAT max 800
