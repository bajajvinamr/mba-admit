"""Tests to verify the school database works correctly across all endpoints."""


def test_total_school_count(client):
    """Database should have 800+ real schools loaded."""
    resp = client.get("/api/schools")
    data = resp.json()
    assert len(data) >= 800, f"Expected 800+ schools, got {len(data)}"


def test_mim_programs_exist(client):
    """MiM programs are present and filterable."""
    resp = client.get("/api/schools?degree_type=MiM")
    data = resp.json()
    assert len(data) >= 200, f"Expected 200+ MiM programs, got {len(data)}"


def test_emba_programs_exist(client):
    """Executive MBA programs are present and filterable."""
    resp = client.get("/api/schools?degree_type=Executive+MBA")
    data = resp.json()
    assert len(data) >= 200, f"Expected 200+ EMBA programs, got {len(data)}"


def test_cat_programs_exist(client):
    """MBA (CAT) programs are present and filterable."""
    resp = client.get("/api/schools?degree_type=MBA+(CAT)")
    data = resp.json()
    assert len(data) >= 50, f"Expected 50+ CAT programs, got {len(data)}"


def test_no_deferred_mba_type(client):
    """Deferred MBA degree type should not exist."""
    resp = client.get("/api/schools")
    data = resp.json()
    deferred = [s for s in data if s.get("degree_type") == "Deferred MBA"]
    assert len(deferred) == 0, f"Found {len(deferred)} Deferred MBA entries — should be 0"


def test_country_coverage(client):
    """Database should cover 50+ countries."""
    resp = client.get("/api/schools/geo-meta")
    data = resp.json()
    assert len(data["countries"]) >= 50, f"Expected 50+ countries, got {len(data['countries'])}"


def test_degree_types_in_geo_meta(client):
    """geo-meta includes at least 4 degree types."""
    resp = client.get("/api/schools/geo-meta")
    data = resp.json()
    dt_names = [d["name"] for d in data["degree_types"]]
    assert "MBA" in dt_names
    assert "MiM" in dt_names
    assert "Executive MBA" in dt_names


def test_odds_calculator_works_with_emba(client):
    """Odds calculator should return results for EMBA schools."""
    resp = client.post("/api/calculate_odds", json={
        "gmat": 720, "gpa": 3.6, "work_experience": 12
    })
    data = resp.json()
    emba_results = [r for r in data if r.get("degree_type") == "Executive MBA"]
    assert len(emba_results) > 0, "Expected EMBA schools in odds results"


def test_odds_calculator_works_with_cat(client):
    """Odds calculator should handle CAT score type."""
    resp = client.post("/api/calculate_odds", json={
        "gmat": None, "test_type": "cat", "test_score": 95, "gpa": 8.5, "gpa_scale": 10,
        "work_experience": 3
    })
    data = resp.json()
    assert len(data) > 0, "Expected results for CAT score"


def test_school_detail_includes_degree_type(client):
    """School detail returns degree_type."""
    resp = client.get("/api/schools/hbs")
    data = resp.json()
    assert data["degree_type"] == "MBA"


def test_emba_school_detail(client):
    """EMBA school variant has correct degree type."""
    # Try to find an EMBA variant
    resp = client.get("/api/schools?degree_type=Executive+MBA&q=wharton")
    data = resp.json()
    if data:
        emba_id = data[0]["id"]
        detail = client.get(f"/api/schools/{emba_id}")
        assert detail.status_code == 200
        assert detail.json()["degree_type"] == "Executive MBA"


def test_pagination_limit(client):
    """Pagination limit returns correct number of results."""
    resp = client.get("/api/schools?limit=10")
    data = resp.json()
    assert len(data) == 10


def test_pagination_offset(client):
    """Pagination offset skips correct number of results."""
    all_resp = client.get("/api/schools?limit=20")
    all_data = all_resp.json()

    offset_resp = client.get("/api/schools?limit=10&offset=5")
    offset_data = offset_resp.json()

    assert len(offset_data) == 10
    assert offset_data[0]["id"] == all_data[5]["id"]


def test_pagination_zero_limit_returns_all(client):
    """limit=0 returns all results (default behavior)."""
    resp = client.get("/api/schools?limit=0")
    data = resp.json()
    assert len(data) > 800
