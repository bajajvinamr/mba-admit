"""Tests for applicant-data endpoints."""
import pytest


class TestApplicantDataStats:
    def test_stats_returns_counts(self, client):
        resp = client.get("/api/applicant-data/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_decisions" in data
        assert "total_profiles" in data
        assert "total_interview_questions" in data
        assert "total_reviews" in data
        assert "schools_with_decisions" in data
        assert isinstance(data["sources"], list)

    def test_stats_counts_are_ints(self, client):
        resp = client.get("/api/applicant-data/stats")
        data = resp.json()
        for key in ["total_decisions", "total_profiles", "total_interview_questions", "total_reviews"]:
            assert isinstance(data[key], int)


class TestApplicantDataSchool:
    def test_school_not_found_returns_404(self, client):
        resp = client.get("/api/applicant-data/school/nonexistent_school_xyz")
        assert resp.status_code == 404

    def test_school_data_structure(self, client):
        # Get stats first to find a school with data
        stats = client.get("/api/applicant-data/stats").json()
        if stats["schools_with_decisions"] == 0 and stats["schools_with_profiles"] == 0:
            pytest.skip("No applicant data loaded")

        # Try common school IDs
        for sid in ["hbs", "gsb", "wharton"]:
            resp = client.get(f"/api/applicant-data/school/{sid}")
            if resp.status_code == 200:
                data = resp.json()
                assert data["school_id"] == sid
                assert "decisions" in data
                assert "applicant_profiles" in data
                assert "interview_questions" in data
                assert "student_reviews" in data
                assert "data_counts" in data
                return
        pytest.skip("No applicant data for test schools")


class TestDecisionsEndpoint:
    def test_all_decisions(self, client):
        resp = client.get("/api/applicant-data/decisions")
        assert resp.status_code == 200
        data = resp.json()
        assert "total" in data
        assert "decisions" in data
        assert isinstance(data["decisions"], list)
        assert "offset" in data
        assert "limit" in data

    def test_decisions_pagination(self, client):
        resp = client.get("/api/applicant-data/decisions?limit=5&offset=0")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["decisions"]) <= 5

    def test_decisions_filter_by_result(self, client):
        resp = client.get("/api/applicant-data/decisions?result=Accepted&limit=10")
        assert resp.status_code == 200
        data = resp.json()
        for dec in data["decisions"]:
            assert dec.get("result", "").lower() == "accepted"

    def test_decisions_filter_by_school(self, client):
        resp = client.get("/api/applicant-data/decisions?school_id=hbs&limit=10")
        assert resp.status_code == 200
        assert resp.json()["total"] >= 0  # may be 0 if no data


class TestInterviewsEndpoint:
    def test_interviews_not_found(self, client):
        resp = client.get("/api/applicant-data/interviews/nonexistent_xyz")
        assert resp.status_code == 404


class TestReviewsEndpoint:
    def test_reviews_not_found(self, client):
        resp = client.get("/api/applicant-data/reviews/nonexistent_xyz")
        assert resp.status_code == 404


class TestProfilesEndpoint:
    def test_profiles_not_found(self, client):
        resp = client.get("/api/applicant-data/profiles/nonexistent_xyz")
        assert resp.status_code == 404
