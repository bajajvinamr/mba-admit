"""Tests for degree_type filter on /api/schools endpoint."""


def test_schools_returns_degree_type_field(client):
    """School list includes degree_type in each entry."""
    resp = client.get("/api/schools?q=hbs")
    data = resp.json()
    assert len(data) > 0
    assert "degree_type" in data[0]


def test_filter_by_mba_degree(client):
    """Filtering by MBA returns only MBA schools."""
    resp = client.get("/api/schools?degree_type=MBA")
    data = resp.json()
    assert len(data) > 0
    for school in data:
        assert school["degree_type"] == "MBA"


def test_filter_by_mim_degree(client):
    """Filtering by MiM returns only MiM schools."""
    resp = client.get("/api/schools?degree_type=MiM")
    data = resp.json()
    assert len(data) > 0
    for school in data:
        assert school["degree_type"] == "MiM"


def test_filter_by_emba_degree(client):
    """Filtering by Executive MBA returns only EMBA schools."""
    resp = client.get("/api/schools?degree_type=Executive+MBA")
    data = resp.json()
    assert len(data) > 0
    for school in data:
        assert school["degree_type"] == "Executive MBA"


def test_filter_by_cat_degree(client):
    """Filtering by MBA (CAT) returns only CAT-based programs."""
    resp = client.get("/api/schools?degree_type=MBA+(CAT)")
    data = resp.json()
    assert len(data) > 0
    for school in data:
        assert school["degree_type"] == "MBA (CAT)"


def test_degree_type_filter_case_insensitive(client):
    """Degree type filter is case-insensitive."""
    resp_lower = client.get("/api/schools?degree_type=mba")
    resp_upper = client.get("/api/schools?degree_type=MBA")
    assert len(resp_lower.json()) == len(resp_upper.json())


def test_geo_meta_includes_degree_types(client):
    """geo-meta endpoint includes degree_types breakdown."""
    resp = client.get("/api/schools/geo-meta")
    data = resp.json()
    assert "degree_types" in data
    assert "total_schools" in data
    assert len(data["degree_types"]) >= 3
    # Each degree type has name and count
    for dt in data["degree_types"]:
        assert "name" in dt
        assert "count" in dt
        assert dt["count"] > 0


def test_combined_degree_and_country_filter(client):
    """Combining degree_type and country filters works."""
    resp = client.get("/api/schools?degree_type=MBA&country=India")
    data = resp.json()
    for school in data:
        assert school["degree_type"] == "MBA"
        assert school["country"] == "India"


def test_similar_schools_same_degree_type(client):
    """Similar schools should all be the same degree type as the source."""
    resp = client.get("/api/schools/hbs/similar")
    data = resp.json()
    for s in data["similar_schools"]:
        # All similar to HBS (MBA) should be MBA programs
        sid = s["school_id"]
        school_resp = client.get(f"/api/schools/{sid}")
        if school_resp.status_code == 200:
            school_data = school_resp.json()
            assert school_data.get("degree_type", "MBA") == "MBA", (
                f"Similar school {sid} has degree_type {school_data.get('degree_type')}, expected MBA"
            )
