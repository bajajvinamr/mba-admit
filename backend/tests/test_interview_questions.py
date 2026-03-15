"""Tests for interview question bank endpoints."""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_all_questions():
    r = client.get("/api/interview/questions")
    assert r.status_code == 200
    data = r.json()
    assert data["total_questions"] >= 30
    assert len(data["categories"]) >= 5


def test_filter_by_school():
    r = client.get("/api/interview/questions?school_id=hbs")
    assert r.status_code == 200
    data = r.json()
    assert data["total_questions"] > 0
    assert data["school_info"] is not None
    assert "format" in data["school_info"]
    # All questions should include hbs
    for cat in data["categories"]:
        for q in cat["questions"]:
            assert "hbs" in q["schools"]


def test_filter_by_category():
    r = client.get("/api/interview/questions?category=leadership")
    assert r.status_code == 200
    data = r.json()
    assert len(data["categories"]) == 1
    assert data["categories"][0]["id"] == "leadership"


def test_filter_by_difficulty():
    r = client.get("/api/interview/questions?difficulty=hard")
    assert r.status_code == 200
    for cat in r.json()["categories"]:
        for q in cat["questions"]:
            assert q["difficulty"] == "hard"


def test_random_questions():
    r = client.get("/api/interview/questions/random?count=5")
    assert r.status_code == 200
    data = r.json()
    assert data["count"] == 5
    assert len(data["questions"]) == 5
    for q in data["questions"]:
        assert "q" in q
        assert "category" in q
        assert "tips" in q


def test_random_with_school_filter():
    r = client.get("/api/interview/questions/random?school_id=gsb&count=3")
    assert r.status_code == 200
    data = r.json()
    assert data["count"] <= 3
    for q in data["questions"]:
        assert "gsb" in q["schools"]


def test_nonexistent_school_returns_empty():
    r = client.get("/api/interview/questions?school_id=fake_school")
    assert r.status_code == 200
    data = r.json()
    assert data["total_questions"] == 0
    assert data["school_info"] is None


def test_question_has_required_fields():
    r = client.get("/api/interview/questions")
    data = r.json()
    for cat in data["categories"]:
        assert "id" in cat
        assert "name" in cat
        for q in cat["questions"]:
            assert "q" in q
            assert "difficulty" in q
            assert "schools" in q
            assert "tips" in q
