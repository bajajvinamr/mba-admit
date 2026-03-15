"""Tests for GET /api/schools/{school_id}/similar endpoint."""

import re


def test_similar_returns_five_schools(client):
    """Endpoint returns exactly 5 similar schools for a known school."""
    resp = client.get("/api/schools/hbs/similar")
    assert resp.status_code == 200
    data = resp.json()
    assert data["school_id"] == "hbs"
    assert data["school_name"] == "Harvard Business School"
    assert len(data["similar_schools"]) == 5


def test_similar_school_not_found(client):
    """Returns 404 for a nonexistent school."""
    resp = client.get("/api/schools/nonexistent_xyz/similar")
    assert resp.status_code == 404


def test_similar_sorted_by_similarity_descending(client):
    """Results are sorted by similarity_score in descending order."""
    resp = client.get("/api/schools/hbs/similar")
    data = resp.json()
    scores = [s["similarity_score"] for s in data["similar_schools"]]
    assert scores == sorted(scores, reverse=True), f"Not sorted descending: {scores}"


def test_similar_result_has_required_fields(client):
    """Each similar school entry has all required fields."""
    resp = client.get("/api/schools/hbs/similar")
    data = resp.json()
    for entry in data["similar_schools"]:
        assert "school_id" in entry
        assert "school_name" in entry
        assert "similarity_score" in entry
        assert isinstance(entry["similarity_score"], (int, float))
        assert 0.0 <= entry["similarity_score"] <= 1.0
        assert "match_reasons" in entry
        assert isinstance(entry["match_reasons"], list)
        assert len(entry["match_reasons"]) >= 2


def test_similar_does_not_include_self(client):
    """The query school itself must not appear in the results."""
    resp = client.get("/api/schools/hbs/similar")
    data = resp.json()
    result_ids = [s["school_id"] for s in data["similar_schools"]]
    assert "hbs" not in result_ids


def test_similar_top_result_for_m7_is_elite(client):
    """For an M7 school, the most similar school should be another top-tier school."""
    # M7 + T15 peers — any of these is a reasonable "most similar" to HBS
    elite_ids = {
        "hbs", "gsb", "wharton", "booth", "kellogg", "cbs", "sloan",
        "tuck", "haas", "ross", "fuqua", "darden", "stern", "yale_som",
        "johnson", "anderson",
    }
    resp = client.get("/api/schools/hbs/similar")
    data = resp.json()
    top = data["similar_schools"][0]
    assert top["school_id"] in elite_ids, (
        f"Top similar school for HBS is {top['school_id']} ({top['school_name']}), expected a T15 school"
    )


def test_similar_no_synthetic_schools(client):
    """No hex-hash synthetic school IDs should appear in results."""
    hex_pattern = re.compile(r'^[0-9a-f]{6,}$')
    resp = client.get("/api/schools/hbs/similar")
    data = resp.json()
    for entry in data["similar_schools"]:
        assert not hex_pattern.match(entry["school_id"]), (
            f"Synthetic school leaked: {entry['school_id']}"
        )


def test_similar_match_reasons_are_strings(client):
    """Match reasons should be non-empty strings."""
    resp = client.get("/api/schools/gsb/similar")
    data = resp.json()
    for entry in data["similar_schools"]:
        for reason in entry["match_reasons"]:
            assert isinstance(reason, str)
            assert len(reason) > 0
