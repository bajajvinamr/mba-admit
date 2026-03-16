"""Tests for /api/schools/program-stats and enriched school detail endpoints."""

import pytest
from fastapi.testclient import TestClient

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from main import app

client = TestClient(app)


class TestProgramStats:
    """Tests for GET /api/schools/program-stats."""

    def test_returns_all_program_types(self):
        r = client.get("/api/schools/program-stats")
        assert r.status_code == 200
        data = r.json()
        assert "program_types" in data
        assert "total_schools" in data
        types = [pt["degree_type"] for pt in data["program_types"]]
        assert "MBA" in types
        assert "Executive MBA" in types
        assert "MiM" in types

    def test_each_type_has_stats(self):
        r = client.get("/api/schools/program-stats")
        for pt in r.json()["program_types"]:
            assert "count" in pt
            assert "avg_gmat" in pt
            assert "avg_tuition_usd" in pt
            assert "countries" in pt
            assert "top_countries" in pt
            assert pt["count"] > 0

    def test_filter_by_degree_type(self):
        r = client.get("/api/schools/program-stats?degree_type=MBA")
        assert r.status_code == 200
        data = r.json()
        assert data["degree_type"] == "MBA"
        assert data["count"] > 200  # we have 279+ MBAs

    def test_filter_emba(self):
        r = client.get("/api/schools/program-stats?degree_type=Executive+MBA")
        assert r.status_code == 200
        assert r.json()["count"] > 400

    def test_filter_mim(self):
        r = client.get("/api/schools/program-stats?degree_type=MiM")
        assert r.status_code == 200
        assert r.json()["count"] > 200

    def test_filter_unknown_type_404(self):
        r = client.get("/api/schools/program-stats?degree_type=PhD")
        assert r.status_code == 404

    def test_total_schools_matches(self):
        r = client.get("/api/schools/program-stats")
        data = r.json()
        total_from_types = sum(pt["count"] for pt in data["program_types"])
        assert total_from_types == data["total_schools"]

    def test_top_countries_are_sorted(self):
        r = client.get("/api/schools/program-stats?degree_type=MBA")
        countries = r.json()["top_countries"]
        counts = [c["count"] for c in countries]
        assert counts == sorted(counts, reverse=True)


class TestEnrichedSchoolDetail:
    """Tests for enriched fields on school detail endpoint."""

    def test_hbs_has_application_url(self):
        r = client.get("/api/schools/hbs")
        assert r.status_code == 200
        data = r.json()
        assert data.get("application_url")
        assert "hbs.edu" in data["application_url"] or "harvard" in data["application_url"].lower()

    def test_gsb_has_scholarships(self):
        r = client.get("/api/schools/gsb")
        assert r.status_code == 200
        scholarships = r.json().get("scholarships", [])
        assert len(scholarships) > 0
        assert "name" in scholarships[0]

    def test_wharton_has_enriched_deadlines(self):
        r = client.get("/api/schools/wharton")
        assert r.status_code == 200
        deadlines = r.json().get("admission_deadlines", [])
        assert len(deadlines) >= 2
        # Enriched deadlines should have readable dates (not just "September 2025")
        for d in deadlines:
            assert "round" in d
            assert "deadline" in d

    def test_degree_type_present_in_school_detail(self):
        for sid in ["hbs", "gsb", "insead"]:
            r = client.get(f"/api/schools/{sid}")
            assert r.status_code == 200
            assert "degree_type" in r.json()


class TestDegreeTypeInRecommendations:
    """Tests that degree_type is included in recommendations."""

    def test_recommendations_include_degree_type(self):
        r = client.get("/api/recommendations?gmat=720&gpa=3.8&limit=5")
        assert r.status_code == 200
        recs = r.json().get("recommendations", [])
        if recs:
            assert "degree_type" in recs[0]
