"""Tests for usage tracking and tier enforcement."""

from unittest.mock import patch
import usage


class TestUsageTracking:
    """Core usage module unit tests."""

    def setup_method(self):
        """Reset usage state between tests."""
        usage._MEMORY_USAGE.clear()
        usage._MEMORY_TIERS.clear()

    def test_default_tier_is_free(self):
        assert usage.get_user_tier("user-1") == "free"

    def test_set_and_get_tier(self):
        usage.set_user_tier("user-1", "pro")
        assert usage.get_user_tier("user-1") == "pro"

    def test_set_invalid_tier_raises(self):
        import pytest
        with pytest.raises(ValueError, match="Unknown tier"):
            usage.set_user_tier("user-1", "enterprise")

    def test_increment_usage(self):
        assert usage.get_feature_usage("user-1", "essay_eval") == 0
        usage.increment_usage("user-1", "essay_eval")
        assert usage.get_feature_usage("user-1", "essay_eval") == 1
        usage.increment_usage("user-1", "essay_eval")
        assert usage.get_feature_usage("user-1", "essay_eval") == 2

    def test_check_limit_free_tier(self):
        # Free tier: 5 essay evals
        for _ in range(5):
            allowed, _, _ = usage.check_limit("user-1", "essay_eval")
            assert allowed
            usage.increment_usage("user-1", "essay_eval")

        # 6th should be blocked
        allowed, current, limit = usage.check_limit("user-1", "essay_eval")
        assert not allowed
        assert current == 5
        assert limit == 5

    def test_check_limit_pro_tier(self):
        usage.set_user_tier("user-1", "pro")
        # Pro tier: 50 essay evals — 5 uses should be fine
        for _ in range(5):
            usage.increment_usage("user-1", "essay_eval")
        allowed, current, limit = usage.check_limit("user-1", "essay_eval")
        assert allowed
        assert current == 5
        assert limit == 50

    def test_check_limit_premium_unlimited(self):
        usage.set_user_tier("user-1", "premium")
        for _ in range(100):
            usage.increment_usage("user-1", "essay_eval")
        allowed, current, limit = usage.check_limit("user-1", "essay_eval")
        assert allowed
        assert current == 100
        assert limit is None

    def test_usage_summary(self):
        usage.increment_usage("user-1", "essay_eval")
        usage.increment_usage("user-1", "essay_eval")
        usage.increment_usage("user-1", "resume_roast")

        summary = usage.get_usage_summary("user-1")
        assert summary["tier"] == "free"
        assert summary["features"]["essay_eval"]["used"] == 2
        assert summary["features"]["essay_eval"]["limit"] == 5
        assert summary["features"]["essay_eval"]["remaining"] == 3
        assert summary["features"]["resume_roast"]["used"] == 1
        assert summary["upgrade_url"] == "/pricing"

    def test_premium_summary_no_upgrade_url(self):
        usage.set_user_tier("user-1", "premium")
        summary = usage.get_usage_summary("user-1")
        assert summary["upgrade_url"] is None

    def test_feature_for_path(self):
        assert usage.feature_for_path("/api/evaluate_essay") == "essay_eval"
        assert usage.feature_for_path("/api/roast_resume") == "resume_roast"
        assert usage.feature_for_path("/api/schools") is None  # not tracked


class TestUsageMiddleware:
    """Integration tests for usage tracking middleware."""

    def setup_method(self):
        usage._MEMORY_USAGE.clear()
        usage._MEMORY_TIERS.clear()
        # Don't set premium here — tests that need free tier will set it themselves

    def test_usage_endpoint(self, client):
        resp = client.get("/api/usage")
        assert resp.status_code == 200
        data = resp.json()
        # conftest sets dev-user to premium, but setup_method clears tiers
        assert data["tier"] == "free"
        assert "features" in data
        assert "billing_period" in data

    def test_tiers_endpoint(self, client):
        resp = client.get("/api/usage/tiers")
        assert resp.status_code == 200
        data = resp.json()
        assert "free" in data["tiers"]
        assert "pro" in data["tiers"]
        assert "premium" in data["tiers"]
        assert data["tiers"]["pro"]["price_usd"] == 29
        assert data["tiers"]["premium"]["limits"] == "unlimited"

    def test_llm_endpoint_increments_usage(self, client):
        """Calling an LLM endpoint should increment usage counter."""
        mock_result = {
            "overall_score": 7, "authenticity": 8, "specificity": 6,
            "structure": 7, "feedback": "Good.", "rewrite_suggestions": [],
        }
        with patch("routers.essays.evaluate_essay_draft", return_value=mock_result):
            resp = client.post("/api/evaluate_essay", json={
                "school_id": "hbs",
                "prompt": "Why MBA?",
                "essay_text": "I want to transform healthcare by building an AI platform. " * 5,
            })
        assert resp.status_code == 200

        # Check usage was incremented
        resp = client.get("/api/usage")
        features = resp.json()["features"]
        assert features["essay_eval"]["used"] == 1

    def test_free_tier_limit_enforced(self, client):
        """After exhausting free tier limit, should get 429."""
        mock_result = {"roast": "burned", "rewrite": "better"}

        # Use up all 3 free roasts
        with patch("routers.essays.roast_resume_bullet", return_value=mock_result):
            for _ in range(3):
                resp = client.post("/api/roast_resume", json={"bullet": "Led a team of 5 engineers"})
                assert resp.status_code == 200

        # 4th should be blocked
        with patch("routers.essays.roast_resume_bullet", return_value=mock_result):
            resp = client.post("/api/roast_resume", json={"bullet": "Led a team of 5 engineers"})
        assert resp.status_code == 429
        data = resp.json()
        assert data["feature"] == "resume_roast"
        assert data["tier"] == "free"
        assert data["used"] == 3
        assert data["limit"] == 3
        assert "upgrade_url" in data

    def test_non_llm_endpoint_not_tracked(self, client):
        """Non-LLM endpoints should not be affected by usage tracking."""
        resp = client.get("/api/schools?limit=5")
        assert resp.status_code == 200

        # Usage should be empty
        resp = client.get("/api/usage")
        features = resp.json()["features"]
        # All counts should be 0
        for feature_data in features.values():
            assert feature_data["used"] == 0

    def test_failed_request_not_counted(self, client):
        """Validation errors (422) should not increment usage."""
        # Essay too short → 422
        resp = client.post("/api/evaluate_essay", json={
            "school_id": "hbs",
            "prompt": "Why?",
            "essay_text": "Short.",
        })
        assert resp.status_code == 422

        resp = client.get("/api/usage")
        features = resp.json()["features"]
        assert features["essay_eval"]["used"] == 0
