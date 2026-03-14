"""Tests for geo filter params on /api/schools."""


def test_filter_by_country(client):
    resp = client.get("/api/schools?country=USA")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) > 0
    assert all(s["country"] == "USA" for s in data)


def test_filter_by_country_case_insensitive(client):
    resp = client.get("/api/schools?country=usa")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) > 0
    assert all(s["country"] == "USA" for s in data)


def test_filter_by_city(client):
    resp = client.get("/api/schools?city=Boston")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) > 0
    assert all("Boston" in s["location"] for s in data)


def test_filter_by_country_empty(client):
    resp = client.get("/api/schools?country=Atlantis")
    assert resp.status_code == 200
    assert resp.json() == []


def test_filter_combined_country_and_query(client):
    resp = client.get("/api/schools?country=USA&q=harvard")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert all(s["country"] == "USA" for s in data)


def test_geo_meta_endpoint(client):
    resp = client.get("/api/schools/geo-meta")
    assert resp.status_code == 200
    data = resp.json()
    assert "countries" in data
    assert "cities" in data
    assert any(c["slug"] == "usa" for c in data["countries"])
    assert any(c["count"] > 0 for c in data["countries"])
