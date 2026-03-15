"""Batch 17 — employment reports endpoint tests."""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


class TestEmploymentReports:
    """GET /api/employment-reports"""

    def test_returns_all_schools(self):
        r = client.get("/api/employment-reports")
        assert r.status_code == 200
        data = r.json()
        assert "schools" in data
        assert "total" in data
        assert "industries" in data
        assert "functions" in data
        assert data["total"] == len(data["schools"])
        assert data["total"] >= 6

    def test_school_structure(self):
        r = client.get("/api/employment-reports")
        school = r.json()["schools"][0]
        assert "school_id" in school
        assert "school_name" in school
        assert "year" in school
        assert "employment_rate_at_3_months" in school
        assert "median_base_salary" in school
        assert "median_signing_bonus" in school
        assert "top_industries" in school
        assert "top_employers" in school
        assert "top_functions" in school

    def test_filter_by_industry(self):
        r = client.get("/api/employment-reports?industry=consulting")
        assert r.status_code == 200
        data = r.json()
        for school in data["schools"]:
            industries = [i["industry"] for i in school["top_industries"]]
            assert "consulting" in industries

    def test_filter_by_school_id(self):
        r = client.get("/api/employment-reports?school_id=hbs")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 1
        assert data["schools"][0]["school_id"] == "hbs"

    def test_filter_by_multiple_schools(self):
        r = client.get("/api/employment-reports?school_id=hbs,gsb")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 2
        ids = {s["school_id"] for s in data["schools"]}
        assert ids == {"hbs", "gsb"}

    def test_invalid_school_id_404(self):
        r = client.get("/api/employment-reports?school_id=nonexistent_xyz")
        assert r.status_code == 404

    def test_salary_values_reasonable(self):
        r = client.get("/api/employment-reports")
        for school in r.json()["schools"]:
            assert 80000 <= school["median_base_salary"] <= 250000
            assert 10000 <= school["median_signing_bonus"] <= 80000
            assert 80 <= school["employment_rate_at_3_months"] <= 100

    def test_industries_list_populated(self):
        r = client.get("/api/employment-reports")
        data = r.json()
        assert len(data["industries"]) >= 3
        assert "consulting" in data["industries"]

    def test_functions_list_populated(self):
        r = client.get("/api/employment-reports")
        data = r.json()
        assert len(data["functions"]) >= 3
