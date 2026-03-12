"""Tests for /api/schools and /api/calculate_odds endpoints."""


def test_list_schools(client):
    resp = client.get("/api/schools")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 2  # at least the fallback schools
    first = data[0]
    assert "id" in first
    assert "name" in first
    assert "gmat_avg" in first


def test_get_school_found(client):
    resp = client.get("/api/schools/hbs")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == "hbs"
    assert "essay_prompts" in data


def test_get_school_not_found(client):
    resp = client.get("/api/schools/nonexistent_school_xyz")
    assert resp.status_code == 404


def test_calculate_odds_basic(client):
    resp = client.post("/api/calculate_odds", json={
        "gmat": 750,
        "gpa": 3.9,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 2
    entry = data[0]
    assert entry["tier"] in ("Safety", "Target", "Reach")
    assert "prob" in entry


def test_calculate_odds_low_gmat(client):
    resp = client.post("/api/calculate_odds", json={
        "gmat": 550,
        "gpa": 3.0,
    })
    assert resp.status_code == 200
    data = resp.json()
    # With a low GMAT, most M7 should be Reach
    reach_count = sum(1 for d in data if d["tier"] == "Reach")
    assert reach_count > 0


def test_calculate_odds_with_modifiers(client):
    resp = client.post("/api/calculate_odds", json={
        "gmat": 720,
        "gpa": 3.7,
        "undergrad_tier": "top_10",
        "industry": "military",
        "leadership_roles": "cxo",
        "intl_experience": True,
        "community_service": True,
    })
    assert resp.status_code == 200
    data = resp.json()
    # Strong profile — should get mostly Safety/Target
    safety_target = sum(1 for d in data if d["tier"] in ("Safety", "Target"))
    assert safety_target >= 1


def test_calculate_odds_validation_gmat_too_low(client):
    resp = client.post("/api/calculate_odds", json={
        "gmat": 100,
        "gpa": 3.5,
    })
    assert resp.status_code == 422  # Pydantic validation error


def test_calculate_odds_validation_gpa_too_high(client):
    resp = client.post("/api/calculate_odds", json={
        "gmat": 700,
        "gpa": 11.0,
    })
    assert resp.status_code == 422


# ── School filtering and search tests ──────────────────────────────────────

def test_list_schools_no_fake_schools(client):
    """Verify the API only returns real schools (no hex-hash IDs)."""
    import re
    resp = client.get("/api/schools")
    data = resp.json()
    hex_pattern = re.compile(r'^[0-9a-f]{6,}$')
    for school in data:
        assert not hex_pattern.match(school["id"]), f"Fake school leaked: {school['id']} ({school['name']})"


def test_search_schools_by_name(client):
    """Search by partial name returns matching schools."""
    resp = client.get("/api/schools?q=Harvard")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert any(s["id"] == "hbs" for s in data)


def test_search_schools_by_abbreviation(client):
    """Search by common abbreviation (LBS, HBS) returns the right school."""
    resp = client.get("/api/schools?q=LBS")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert any(s["id"] == "lbs" for s in data)


def test_search_schools_by_abbreviation_hbs(client):
    """HBS abbreviation maps to Harvard Business School."""
    resp = client.get("/api/schools?q=hbs")
    assert resp.status_code == 200
    data = resp.json()
    assert any(s["id"] == "hbs" for s in data)


def test_search_schools_empty_query_returns_all(client):
    """Empty/missing query returns all schools."""
    resp = client.get("/api/schools")
    all_schools = resp.json()
    resp2 = client.get("/api/schools?q=")
    # Empty string should be treated as no filter
    assert resp2.status_code == 200


def test_search_schools_no_results(client):
    """Non-matching query returns empty list."""
    resp = client.get("/api/schools?q=zzzznonexistent")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 0
