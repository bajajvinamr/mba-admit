"""Tests verifying type-safe numeric fields in school API responses.

The schools router now uses _safe_int/_safe_float to ensure numeric fields
never return strings like 'N/A'. This prevents frontend type errors.
"""


class TestSchoolSummaryTypeSafety:
    """Verify _school_summary returns proper types, never 'N/A' strings."""

    def test_list_schools_numeric_types(self, client):
        resp = client.get("/api/schools?limit=10")
        assert resp.status_code == 200
        schools = resp.json()
        assert isinstance(schools, list)
        for school in schools:
            gmat = school.get("gmat_avg")
            assert gmat is None or isinstance(gmat, int), f"gmat_avg: {type(gmat)}: {gmat}"

            acc = school.get("acceptance_rate")
            assert acc is None or isinstance(acc, (int, float)), f"acceptance_rate: {type(acc)}: {acc}"

            cs = school.get("class_size")
            assert cs is None or isinstance(cs, int), f"class_size: {type(cs)}: {cs}"

            tuition = school.get("tuition_usd")
            assert tuition is None or isinstance(tuition, int), f"tuition_usd: {type(tuition)}: {tuition}"

            plm = school.get("program_length_months")
            assert plm is None or isinstance(plm, int), f"program_length_months: {type(plm)}: {plm}"

            fee = school.get("application_fee_usd")
            assert fee is None or isinstance(fee, int), f"application_fee_usd: {type(fee)}: {fee}"

    def test_no_na_strings_in_response(self, client):
        resp = client.get("/api/schools?limit=50")
        assert resp.status_code == 200
        for school in resp.json():
            for key, val in school.items():
                assert val != "N/A", f"Field '{key}' on {school['id']} still has 'N/A' string"

    def test_data_quality_fields_present(self, client):
        resp = client.get("/api/schools?limit=10")
        assert resp.status_code == 200
        for school in resp.json():
            assert "data_source" in school
            assert "data_confidence" in school
            assert isinstance(school["data_confidence"], (int, float))
            assert school["data_source"] in ("scraped", "synthetic", "unknown")

    def test_specializations_is_list(self, client):
        resp = client.get("/api/schools?limit=20")
        assert resp.status_code == 200
        for school in resp.json():
            assert isinstance(school.get("specializations", []), list)


class TestSchoolROITypeSafety:
    """Verify ROI endpoint handles missing salary data gracefully."""

    def test_roi_with_known_school(self, client):
        resp = client.get("/api/schools/hbs/roi")
        assert resp.status_code == 200
        data = resp.json()
        assert "school_id" in data
        assert "total_investment" in data
        # ROI fields may be None if salary data missing
        if data.get("post_mba_salary") is None:
            assert data.get("roi_pct") is None
            assert "note" in data

    def test_roi_unknown_school_returns_404(self, client):
        resp = client.get("/api/schools/nonexistent_xyz/roi")
        assert resp.status_code == 404
