"""Tests for application checklist and essay word count endpoints."""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


# ── Application Checklist ────────────────────────────────────────────────

def test_checklist_basic():
    r = client.get("/api/schools/hbs/checklist")
    assert r.status_code == 200
    data = r.json()
    assert data["school_id"] == "hbs"
    assert data["total_items"] > 0
    assert "checklist" in data
    assert "deadlines" in data
    assert "categories" in data


def test_checklist_has_essays():
    r = client.get("/api/schools/hbs/checklist")
    data = r.json()
    assert data["categories"]["essays"] > 0


def test_checklist_has_requirements():
    r = client.get("/api/schools/booth/checklist")
    data = r.json()
    assert data["categories"]["requirements"] > 0


def test_checklist_item_fields():
    r = client.get("/api/schools/hbs/checklist")
    item = r.json()["checklist"][0]
    assert "id" in item
    assert "label" in item
    assert "detail" in item
    assert "category" in item
    assert "required" in item


def test_checklist_unknown_school():
    r = client.get("/api/schools/fake_school/checklist")
    assert r.status_code == 404


def test_checklist_deadlines():
    r = client.get("/api/schools/hbs/checklist")
    deadlines = r.json()["deadlines"]
    assert len(deadlines) > 0
    assert "round" in deadlines[0]


# ── Essay Word Count ─────────────────────────────────────────────────────

def test_word_count_basic():
    r = client.post("/api/essay/word-count", json={
        "text": "Hello world this is a test."
    })
    assert r.status_code == 200
    data = r.json()
    assert data["word_count"] == 6
    assert data["sentence_count"] == 1


def test_word_count_with_limit():
    r = client.post("/api/essay/word-count", json={
        "text": "One two three four five.",
        "word_limit": 10
    })
    data = r.json()
    assert data["words_remaining"] == 5
    assert data["over_limit"] is False
    assert data["utilization_pct"] == 50.0


def test_word_count_over_limit():
    r = client.post("/api/essay/word-count", json={
        "text": "One two three four five six seven eight nine ten.",
        "word_limit": 5
    })
    data = r.json()
    assert data["over_limit"] is True
    assert data["words_remaining"] < 0


def test_word_count_empty():
    r = client.post("/api/essay/word-count", json={"text": ""})
    assert r.status_code == 200
    assert r.json()["word_count"] == 0


def test_word_count_char_limit():
    r = client.post("/api/essay/word-count", json={
        "text": "Hello",
        "char_limit": 10
    })
    data = r.json()
    assert data["chars_remaining"] == 5
    assert data["char_over_limit"] is False


def test_word_count_paragraphs():
    r = client.post("/api/essay/word-count", json={
        "text": "First paragraph.\n\nSecond paragraph.\n\nThird paragraph."
    })
    data = r.json()
    assert data["paragraph_count"] == 3
