"""Tests for Cache-Control headers middleware."""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from main import app
    return TestClient(app)


class TestCacheHeaders:
    """Verify correct Cache-Control headers on GET responses."""

    def test_schools_list_has_cache_header(self, client):
        res = client.get("/api/schools")
        assert res.status_code == 200
        cc = res.headers.get("cache-control", "")
        assert "public" in cc
        assert "max-age=60" in cc
        assert "stale-while-revalidate=300" in cc

    def test_health_has_short_cache(self, client):
        res = client.get("/health")
        assert res.status_code == 200
        cc = res.headers.get("cache-control", "")
        assert "max-age=10" in cc

    def test_stats_has_cache_header(self, client):
        res = client.get("/api/stats")
        assert res.status_code == 200
        cc = res.headers.get("cache-control", "")
        assert "max-age=300" in cc

    def test_school_detail_has_cache(self, client):
        res = client.get("/api/schools/hbs")
        if res.status_code == 200:
            cc = res.headers.get("cache-control", "")
            assert "public" in cc
            assert "max-age=120" in cc

    def test_post_endpoints_no_cache(self, client):
        """POST endpoints should not get cache headers."""
        res = client.post(
            "/api/calculate_odds",
            json={"gmat": 720, "gpa": 3.8},
        )
        cc = res.headers.get("cache-control", "")
        # POST should not have public cache
        assert "public" not in cc

    def test_error_responses_no_cache(self, client):
        """4xx responses should not get cache headers."""
        res = client.get("/api/schools/nonexistent-school-xyz-12345")
        if res.status_code >= 400:
            cc = res.headers.get("cache-control", "")
            assert "public" not in cc
