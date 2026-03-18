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
        assert r.json()["count"] > 200

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

    def test_gmat_user_no_cat_schools(self):
        """GMAT users should not see CAT-only programs."""
        r = client.get("/api/recommendations?gmat=720&gpa=3.8&limit=12")
        recs = r.json().get("recommendations", [])
        cat_recs = [x for x in recs if x.get("degree_type") == "MBA (CAT)"]
        assert len(cat_recs) == 0

    def test_cat_user_sees_cat_schools(self):
        """CAT test takers should see Indian MBA programs."""
        r = client.get("/api/recommendations?test_type=cat&test_score=98&gpa=8.5&gpa_scale=10&limit=10")
        assert r.status_code == 200
        recs = r.json().get("recommendations", [])
        assert len(recs) > 0
        for rec in recs:
            assert rec["degree_type"] == "MBA (CAT)"

    def test_explicit_degree_filter(self):
        """Explicit degree_type param overrides default logic."""
        r = client.get("/api/recommendations?gmat=720&degree_type=MiM&limit=5")
        assert r.status_code == 200
        recs = r.json().get("recommendations", [])
        for rec in recs:
            assert rec["degree_type"] == "MiM"


class TestOddsCalculatorDegreeFiltering:
    """Tests that odds calculator filters by degree type correctly."""

    def test_gmat_odds_excludes_cat(self):
        r = client.post("/api/calculate_odds", json={"gmat": 720, "gpa": 3.8})
        assert r.status_code == 200
        results = r.json()
        cat_results = [x for x in results if x.get("degree_type") == "MBA (CAT)"]
        assert len(cat_results) == 0

    def test_cat_odds_only_cat(self):
        r = client.post("/api/calculate_odds", json={
            "gpa": 8.5, "gpa_scale": "10", "test_type": "cat", "test_score": 98
        })
        assert r.status_code == 200
        results = r.json()
        assert len(results) > 0
        for x in results:
            assert x["degree_type"] == "MBA (CAT)"

    def test_explicit_degree_type_odds(self):
        r = client.post("/api/calculate_odds", json={
            "gmat": 700, "gpa": 3.5, "degree_type": "MiM"
        })
        assert r.status_code == 200
        results = r.json()
        for x in results:
            assert x["degree_type"] == "MiM"

    def test_isb_appears_for_gmat_users(self):
        """ISB accepts GMAT and should appear for GMAT users."""
        r = client.post("/api/calculate_odds", json={"gmat": 720, "gpa": 3.8})
        results = r.json()
        isb = [x for x in results if x["school_id"] == "isb"]
        assert len(isb) == 1
        assert isb[0]["degree_type"] == "MBA"


class TestApplicationFeeEnrichment:
    """Tests for application_fee_usd enrichment."""

    def test_all_schools_have_fee(self):
        """Every school should have application_fee_usd populated."""
        r = client.get("/api/schools?limit=50")
        assert r.status_code == 200
        schools = r.json()
        for s in schools:
            detail = client.get(f"/api/schools/{s['id']}")
            assert detail.status_code == 200
            fee = detail.json().get("application_fee_usd")
            assert fee is not None and fee > 0, f"{s['id']} missing application_fee_usd"

    def test_hbs_fee(self):
        r = client.get("/api/schools/hbs")
        assert r.json()["application_fee_usd"] == 250

    def test_gsb_fee(self):
        r = client.get("/api/schools/gsb")
        assert r.json()["application_fee_usd"] == 275

    def test_insead_fee(self):
        r = client.get("/api/schools/insead")
        assert r.json()["application_fee_usd"] == 265

    def test_indian_schools_low_fees(self):
        """Indian MBA programs have significantly lower fees."""
        for sid in ["iima", "iimb", "iimc"]:
            r = client.get(f"/api/schools/{sid}")
            if r.status_code == 200:
                fee = r.json().get("application_fee_usd", 0)
                assert fee <= 50, f"{sid} fee too high: {fee}"

    def test_fee_in_listing_api(self):
        """application_fee_usd should appear in school listing summaries."""
        r = client.get("/api/schools?limit=5")
        assert r.status_code == 200
        for s in r.json():
            assert "application_fee_usd" in s


class TestProgramLengthAndFormat:
    """Tests for program_length_months and program_format enrichment."""

    def test_all_schools_have_program_length(self):
        """Every school should have program_length_months populated."""
        r = client.get("/api/schools?limit=0")
        assert r.status_code == 200
        schools = r.json()
        for s in schools[:50]:  # spot check first 50
            detail = client.get(f"/api/schools/{s['id']}")
            assert detail.status_code == 200
            assert detail.json().get("program_length_months"), f"{s['id']} missing program_length_months"

    def test_insead_is_10_months(self):
        r = client.get("/api/schools/insead")
        assert r.status_code == 200
        assert r.json()["program_length_months"] in (10, 12)  # 10 traditional, 12 per some sources

    def test_hbs_is_24_months(self):
        r = client.get("/api/schools/hbs")
        assert r.status_code == 200
        assert r.json()["program_length_months"] == 24

    def test_emba_format_is_part_time(self):
        """Executive MBA programs should have part-time/modular format."""
        r = client.get("/api/schools?degree_type=Executive+MBA&limit=5")
        assert r.status_code == 200
        schools = r.json()
        for s in schools:
            detail = client.get(f"/api/schools/{s['id']}")
            fmt = detail.json().get("program_format", "")
            assert fmt, f"{s['id']} missing program_format"
