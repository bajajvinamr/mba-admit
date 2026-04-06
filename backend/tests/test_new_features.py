"""Tests for new features: scholarship intelligence, smart planner, smart search, geo endpoints."""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


# ── Scholarship Intelligence ─────────────────────────────────────────────────


class TestScholarshipIntel:
    def test_scholarship_rankings(self):
        r = client.get("/api/scholarship-intel/schools?min_data_points=5&limit=10")
        assert r.status_code == 200
        data = r.json()
        assert "schools" in data
        assert "total_schools" in data
        assert "tier_legend" in data
        assert len(data["schools"]) <= 10
        for school in data["schools"]:
            assert "school_id" in school
            assert "scholarship_rate" in school
            assert 0 <= school["scholarship_rate"] <= 100

    def test_scholarship_school_detail(self):
        r = client.get("/api/scholarship-intel/school/duke_fuqua")
        assert r.status_code == 200
        data = r.json()
        assert "school" in data
        assert "insights" in data
        assert isinstance(data["insights"], list)

    def test_scholarship_school_not_found(self):
        r = client.get("/api/scholarship-intel/school/nonexistent_school_xyz")
        assert r.status_code == 404

    def test_profile_match(self):
        r = client.post("/api/scholarship-intel/profile-match", json={
            "profile": {"gmat": 730, "gpa": 3.6, "years_experience": 4},
            "school_ids": [],
        })
        assert r.status_code == 200
        data = r.json()
        assert "results" in data
        assert "recommendation" in data
        assert len(data["results"]) > 0
        for result in data["results"]:
            assert "scholarship_probability_pct" in result
            assert 0 <= result["scholarship_probability_pct"] <= 100

    def test_optimize(self):
        r = client.post("/api/scholarship-intel/optimize", json={
            "profile": {"gmat": 720},
            "target_schools": [],
            "max_results": 5,
        })
        assert r.status_code == 200
        data = r.json()
        assert "optimized_list" in data
        assert "summary" in data


# ── Smart Planner ────────────────────────────────────────────────────────────


class TestSmartPlanner:
    def test_sprint_plan(self):
        r = client.post("/api/planner/sprint", json={
            "schools": [
                {"school_id": "hbs", "deadline": "2026-09-04"},
                {"school_id": "chicago_booth", "deadline": "2027-01-06", "essays_done": 1, "essays_total": 3},
            ],
            "today": "2026-04-06",
        })
        assert r.status_code == 200
        data = r.json()
        assert "plans" in data
        assert "nudges" in data
        assert "summary" in data
        assert len(data["plans"]) == 2
        for plan in data["plans"]:
            assert "school_id" in plan
            assert "status" in plan
            assert "milestones" in plan

    def test_sprint_plan_tight_deadline(self):
        r = client.post("/api/planner/sprint", json={
            "schools": [
                {"school_id": "hbs", "deadline": "2026-04-20", "essays_done": 0, "essays_total": 1},
            ],
            "today": "2026-04-06",
        })
        data = r.json()
        plan = data["plans"][0]
        assert plan["status"] in ("behind", "critical", "tight")

    def test_quick_status(self):
        r = client.get("/api/planner/quick-status?school_ids=hbs,chicago_booth")
        assert r.status_code == 200
        data = r.json()
        assert "statuses" in data
        assert len(data["statuses"]) == 2


# ── Smart Search ─────────────────────────────────────────────────────────────


class TestSmartSearch:
    def test_basic_nl_search(self):
        r = client.get("/api/search/smart?q=GMAT under 700")
        assert r.status_code == 200
        data = r.json()
        assert "schools" in data
        assert data["total"] > 0
        # All results should have GMAT <= 700
        for school in data["schools"]:
            if school.get("gmat_avg"):
                assert school["gmat_avg"] <= 700

    def test_europe_search(self):
        r = client.get("/api/search/smart?q=MBA in Europe")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] > 0

    def test_compound_search(self):
        r = client.get("/api/search/smart?q=acceptance rate above 30%25 in USA")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] >= 0


# ── Geo Endpoints ────────────────────────────────────────────────────────────


class TestGeoEndpoints:
    def test_by_region(self):
        r = client.get("/api/schools/by-region/europe?limit=5")
        assert r.status_code == 200
        data = r.json()
        assert "schools" in data
        assert data["total"] > 0

    def test_by_region_invalid(self):
        r = client.get("/api/schools/by-region/antartica")
        assert r.status_code == 404

    def test_by_country(self):
        r = client.get("/api/schools/by-country/india?limit=10")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] > 0
        assert data["country"] == "India"

    def test_popular_by_origin(self):
        r = client.get("/api/geo/popular-by-applicant-origin?nationality=India&limit=5")
        assert r.status_code == 200
        data = r.json()
        assert data["total_applicants"] > 0
        assert len(data["popular_schools"]) <= 5
        for school in data["popular_schools"]:
            assert "admit_rate_for_nationality" in school


# ── ML Predictions ───────────────────────────────────────────────────────────


class TestMLPredictions:
    def test_predict_batch(self):
        r = client.post("/api/ml/predict", json={
            "school_ids": ["hbs", "chicago_booth", "insead"],
            "gmat": 730,
            "gpa": 3.6,
            "yoe": 4,
            "app_round": "R1",
        })
        assert r.status_code == 200
        data = r.json()
        assert "predictions" in data
        assert len(data["predictions"]) == 3
        for pred in data["predictions"]:
            if pred.get("probability_pct") is not None:
                assert 0 <= pred["probability_pct"] <= 100

    def test_predict_single(self):
        r = client.get("/api/ml/predict/hbs?gmat=740&gpa=3.7&yoe=5")
        assert r.status_code == 200
        data = r.json()
        assert "probability_pct" in data
        assert 0 <= data["probability_pct"] <= 100

    def test_predict_nonexistent_school(self):
        r = client.get("/api/ml/predict/fake_school_xyz?gmat=700")
        assert r.status_code == 404

    def test_model_stats(self):
        r = client.get("/api/ml/models")
        assert r.status_code == 200
        data = r.json()
        assert data["total_models"] >= 40  # Should have 40+ models
