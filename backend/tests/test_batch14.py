"""Tests for batch 14 — dual degrees, class size, post-MBA locations, concentrations."""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


# ── Dual Degrees ─────────────────────────────────────────────────────

def test_dual_degrees_default():
    r = client.get("/api/dual-degrees")
    assert r.status_code == 200
    data = r.json()
    assert "programs" in data
    assert len(data["programs"]) > 0


def test_dual_degrees_by_school():
    r = client.get("/api/dual-degrees?school_id=hbs")
    assert r.status_code == 200
    data = r.json()
    assert len(data["programs"]) >= 1


def test_dual_degrees_by_type():
    r = client.get("/api/dual-degrees?degree_type=JD")
    assert r.status_code == 200
    data = r.json()
    for p in data["programs"]:
        assert "JD" in p.get("degree_combo", "") or "jd" in p.get("degree_combo", "").lower()


# ── Class Size ───────────────────────────────────────────────────────

def test_class_size_default():
    r = client.get("/api/class-size")
    assert r.status_code == 200
    data = r.json()
    assert "schools" in data
    assert len(data["schools"]) > 0


def test_class_size_fields():
    r = client.get("/api/class-size")
    data = r.json()
    s = data["schools"][0]
    assert "class_size" in s
    assert "school_name" in s or "school_id" in s


def test_class_size_sorted():
    r = client.get("/api/class-size?sort_by=class_size")
    assert r.status_code == 200


# ── Post-MBA Locations ───────────────────────────────────────────────

def test_post_mba_locations_default():
    r = client.get("/api/post-mba-locations")
    assert r.status_code == 200
    data = r.json()
    assert "locations" in data
    assert len(data["locations"]) > 0


def test_post_mba_locations_fields():
    r = client.get("/api/post-mba-locations")
    data = r.json()
    loc = data["locations"][0]
    assert "city" in loc
    assert "avg_mba_salary" in loc
    assert "top_industries" in loc


# ── Concentrations ───────────────────────────────────────────────────

def test_concentrations_default():
    r = client.get("/api/concentrations")
    assert r.status_code == 200
    data = r.json()
    assert "concentrations" in data
    assert len(data["concentrations"]) > 0


def test_concentrations_by_field():
    r = client.get("/api/concentrations?field=finance")
    assert r.status_code == 200
    data = r.json()
    assert len(data["concentrations"]) >= 1


def test_concentrations_by_school():
    r = client.get("/api/concentrations?school_id=hbs")
    assert r.status_code == 200
