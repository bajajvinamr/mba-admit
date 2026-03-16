"""Tests for /health and /health/ready endpoints."""


class TestHealthEndpoint:
    def test_health_returns_200(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"

    def test_health_includes_version(self, client):
        resp = client.get("/health")
        data = resp.json()
        assert "version" in data
        assert data["version"].startswith("2.")

    def test_health_includes_school_count(self, client):
        resp = client.get("/health")
        data = resp.json()
        assert data["schools_loaded"] > 0

    def test_health_includes_features(self, client):
        resp = client.get("/health")
        data = resp.json()
        assert "features" in data
        assert "structured_logging" in data["features"]


class TestReadinessEndpoint:
    def test_readiness_returns_200(self, client):
        resp = client.get("/health/ready")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] in ("ready", "degraded")

    def test_readiness_has_checks(self, client):
        resp = client.get("/health/ready")
        data = resp.json()
        assert "checks" in data
        assert "school_db" in data["checks"]
        assert "llm_api_key" in data["checks"]

    def test_readiness_school_db_loaded(self, client):
        resp = client.get("/health/ready")
        data = resp.json()
        assert data["checks"]["school_db"]["ok"] is True
        assert data["checks"]["school_db"]["count"] > 0

    def test_readiness_has_timestamp(self, client):
        resp = client.get("/health/ready")
        data = resp.json()
        assert "timestamp" in data
        assert isinstance(data["timestamp"], float)

    def test_readiness_has_version(self, client):
        resp = client.get("/health/ready")
        data = resp.json()
        assert data["version"] == data.get("version")
        assert "version" in data
