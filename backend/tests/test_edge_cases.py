"""Edge case and regression tests for various API endpoints."""

import pytest


class TestSchoolSearchEdgeCases:
    """Edge cases for /api/schools search functionality."""

    def test_empty_query_returns_all(self, client):
        resp = client.get("/api/schools")
        assert resp.status_code == 200
        assert len(resp.json()) > 800

    def test_search_by_abbreviation(self, client):
        """Abbreviation search should return matching school."""
        resp = client.get("/api/schools?q=HBS")
        assert resp.status_code == 200
        data = resp.json()
        ids = [s["id"] for s in data]
        assert "hbs" in ids

    def test_search_case_insensitive(self, client):
        """Search should be case-insensitive."""
        resp1 = client.get("/api/schools?q=stanford")
        resp2 = client.get("/api/schools?q=STANFORD")
        assert resp1.status_code == 200
        assert resp2.status_code == 200
        ids1 = {s["id"] for s in resp1.json()}
        ids2 = {s["id"] for s in resp2.json()}
        assert ids1 == ids2

    def test_search_partial_match(self, client):
        resp = client.get("/api/schools?q=harv")
        assert resp.status_code == 200
        names = [s["name"] for s in resp.json()]
        assert any("Harvard" in n for n in names)

    def test_search_no_results(self, client):
        resp = client.get("/api/schools?q=zzzznonexistent")
        assert resp.status_code == 200
        assert len(resp.json()) == 0

    def test_pagination_limit(self, client):
        resp = client.get("/api/schools?limit=5")
        assert resp.status_code == 200
        assert len(resp.json()) == 5

    def test_pagination_offset(self, client):
        resp1 = client.get("/api/schools?limit=5&offset=0")
        resp2 = client.get("/api/schools?limit=5&offset=5")
        ids1 = {s["id"] for s in resp1.json()}
        ids2 = {s["id"] for s in resp2.json()}
        # Different pages should have different schools
        assert ids1 != ids2

    def test_country_filter(self, client):
        resp = client.get("/api/schools?country=India")
        assert resp.status_code == 200
        for s in resp.json():
            assert s["country"] == "India"

    def test_degree_type_filter(self, client):
        resp = client.get("/api/schools?degree_type=MiM")
        assert resp.status_code == 200
        for s in resp.json():
            assert s["degree_type"] == "MiM"


class TestSchoolDetailEdgeCases:
    """Edge cases for /api/schools/{school_id}."""

    def test_nonexistent_school_404(self, client):
        resp = client.get("/api/schools/nonexistent_school_xyz")
        assert resp.status_code == 404

    def test_school_has_required_fields(self, client):
        resp = client.get("/api/schools/hbs")
        assert resp.status_code == 200
        data = resp.json()
        for field in ["id", "name", "location", "country", "gmat_avg",
                       "acceptance_rate", "tuition_usd", "essay_prompts",
                       "data_quality_summary"]:
            assert field in data, f"Missing field: {field}"

    def test_school_has_enriched_fields(self, client):
        resp = client.get("/api/schools/hbs")
        data = resp.json()
        assert "application_fee_usd" in data
        assert "program_length_months" in data
        assert "application_url" in data

    def test_school_deadlines_formatted(self, client):
        """Schools with deadlines should have formatted date strings."""
        resp = client.get("/api/schools/gsb")
        data = resp.json()
        deadlines = data.get("admission_deadlines", [])
        if deadlines:
            for dl in deadlines:
                assert "round" in dl
                assert "deadline" in dl


class TestHealthEndpoint:
    """Health check endpoint tests."""

    def test_health_returns_ok(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert data["schools_loaded"] > 800
        assert "version" in data
        assert "features" in data

    def test_root_returns_service_info(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        assert "service" in resp.json()


class TestPlatformStats:
    """Tests for /api/stats endpoint."""

    def test_stats_returns_200(self, client):
        resp = client.get("/api/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_schools"] > 800
        assert data["countries"] > 30
        assert "degree_breakdown" in data
        assert "data_coverage" in data

    def test_stats_top_countries(self, client):
        resp = client.get("/api/stats")
        data = resp.json()
        top = data["top_countries"]
        assert len(top) <= 10
        counts = [c["count"] for c in top]
        assert counts == sorted(counts, reverse=True)

    def test_stats_degree_breakdown(self, client):
        resp = client.get("/api/stats")
        data = resp.json()
        degrees = data["degree_breakdown"]
        assert "MBA" in degrees
        assert degrees["MBA"] > 100


class TestOddsCalculatorEdgeCases:
    """Edge cases for the odds calculator."""

    def test_minimum_gmat(self, client):
        resp = client.post("/api/calculate_odds", json={"gmat": 200, "gpa": 2.0})
        assert resp.status_code == 200

    def test_maximum_gmat(self, client):
        resp = client.post("/api/calculate_odds", json={"gmat": 800, "gpa": 4.0})
        assert resp.status_code == 200
        results = resp.json()
        assert len(results) > 0
        # Perfect scores should have high probabilities
        high_prob = [r for r in results if r.get("prob", 0) >= 50]
        assert len(high_prob) > 0

    def test_invalid_gmat_rejected(self, client):
        resp = client.post("/api/calculate_odds", json={"gmat": 900, "gpa": 3.5})
        assert resp.status_code == 422

    def test_gpa_scale_10(self, client):
        """Indian 10-point GPA scale should work."""
        resp = client.post("/api/calculate_odds", json={
            "gmat": 720, "gpa": 8.5, "gpa_scale": "10"
        })
        assert resp.status_code == 200
        assert len(resp.json()) > 0
