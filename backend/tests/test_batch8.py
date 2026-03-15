"""Tests for batch 8 — peer comparison, diversity stats."""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


# ── Peer Compare ────────────────────────────────────────────────────

def test_peer_compare_basic():
    r = client.post("/api/peer-compare", json={"gmat": 730, "gpa": 3.8, "work_years": 4})
    assert r.status_code == 200
    data = r.json()
    assert "gmat_percentile" in data
    assert "gpa_percentile" in data
    assert "work_exp_percentile" in data
    assert "strengths" in data
    assert "peer_summary" in data
    assert 0 <= data["gmat_percentile"] <= 100


def test_peer_compare_low_profile():
    r = client.post("/api/peer-compare", json={"gmat": 550, "gpa": 2.8, "work_years": 1})
    assert r.status_code == 200
    data = r.json()
    assert data["gmat_percentile"] < 50
    assert len(data["areas_to_improve"]) > 0


def test_peer_compare_high_profile():
    r = client.post("/api/peer-compare", json={"gmat": 780, "gpa": 3.95, "work_years": 5})
    assert r.status_code == 200
    data = r.json()
    assert data["gmat_percentile"] > 50


# ── Diversity Stats ─────────────────────────────────────────────────

def test_diversity_default():
    r = client.get("/api/diversity-stats")
    assert r.status_code == 200
    data = r.json()
    assert "schools" in data
    assert "averages" in data
    assert data["total_schools"] > 0


def test_diversity_filtered():
    r = client.get("/api/diversity-stats?school_ids=hbs,gsb")
    assert r.status_code == 200
    data = r.json()
    assert data["total_schools"] >= 1
    ids = {s["school_id"] for s in data["schools"]}
    assert ids.issubset({"hbs", "gsb"})


def test_diversity_fields():
    r = client.get("/api/diversity-stats")
    data = r.json()
    if data["schools"]:
        s = data["schools"][0]
        assert "female_pct" in s
        assert "international_pct" in s
        assert "stem_designated" in s
