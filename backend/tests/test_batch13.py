"""Tests for batch 13 — campus life, school news."""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


# ── Campus Life ──────────────────────────────────────────────────────

def test_campus_life_default():
    r = client.get("/api/campus-life")
    assert r.status_code == 200
    data = r.json()
    assert "schools" in data
    assert len(data["schools"]) > 0


def test_campus_life_by_school():
    r = client.get("/api/campus-life?school_id=hbs")
    assert r.status_code == 200
    data = r.json()
    assert len(data["schools"]) == 1
    assert data["schools"][0]["school_id"] == "hbs"


def test_campus_life_fields():
    r = client.get("/api/campus-life?school_id=wharton")
    data = r.json()
    s = data["schools"][0]
    assert "housing" in s
    assert "walkability_score" in s
    assert "nightlife_score" in s
    assert "nearby_attractions" in s


def test_campus_life_not_found():
    r = client.get("/api/campus-life?school_id=nonexistent_xyz")
    assert r.status_code == 404


# ── School News ──────────────────────────────────────────────────────

def test_school_news_default():
    r = client.get("/api/school-news")
    assert r.status_code == 200
    data = r.json()
    assert "news" in data
    assert data["total"] > 0


def test_school_news_by_school():
    r = client.get("/api/school-news?school_id=hbs")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 1
    for item in data["news"]:
        assert item["school_id"] == "hbs"


def test_school_news_fields():
    r = client.get("/api/school-news")
    data = r.json()
    item = data["news"][0]
    assert "headline" in item
    assert "summary" in item
    assert "date" in item
    assert "category" in item


def test_school_news_not_found():
    r = client.get("/api/school-news?school_id=nonexistent_xyz")
    assert r.status_code == 404
