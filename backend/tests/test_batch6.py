"""Tests for batch 6 — admit simulator, culture match, salary negotiation, visa info, fee waivers."""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


# ── Admit Simulator (Monte Carlo v2) ─────────────────────────────────

def test_simulator_basic():
    r = client.post("/api/admit-simulator", json={"gmat": 730, "gpa": 3.8, "work_exp_years": 4})
    assert r.status_code == 200
    data = r.json()
    assert "results" in data
    assert "summary" in data
    assert len(data["results"]) > 0
    first = data["results"][0]
    assert "admit_probability" in first
    assert "outcome" in first
    assert first["outcome"] in ("likely", "competitive", "possible", "unlikely")


def test_simulator_with_schools():
    r = client.post("/api/admit-simulator", json={
        "gmat": 700, "gpa": 3.5, "work_exp_years": 3, "school_ids": ["hbs", "booth"]
    })
    assert r.status_code == 200
    assert len(r.json()["results"]) >= 1


def test_simulator_profile_boost():
    r1 = client.post("/api/admit-simulator", json={"gmat": 700, "gpa": 3.5, "school_ids": ["hbs"]})
    r2 = client.post("/api/admit-simulator", json={
        "gmat": 700, "gpa": 3.5, "school_ids": ["hbs"],
        "undergrad_tier": "top_10", "industry": "military", "leadership_roles": "cxo",
    })
    assert r1.status_code == 200
    assert r2.status_code == 200


# ── Culture Match ───────────────────────────────────────────────────

def test_culture_match_basic():
    r = client.post("/api/schools/culture-match", json={
        "priorities": {"collaboration": 5, "entrepreneurship": 4, "global": 3}
    })
    assert r.status_code == 200
    data = r.json()
    assert "matches" in data
    assert len(data["matches"]) > 0
    first = data["matches"][0]
    assert "match_pct" in first
    assert "school_id" in first


def test_culture_match_with_filter():
    r = client.post("/api/schools/culture-match", json={
        "priorities": {"innovation": 5, "networking": 3},
        "school_ids": ["hbs", "gsb", "sloan"]
    })
    assert r.status_code == 200
    data = r.json()
    ids = {m["school_id"] for m in data["matches"]}
    assert ids.issubset({"hbs", "gsb", "sloan"})


# ── Salary Negotiation ──────────────────────────────────────────────

def test_salary_basic():
    r = client.post("/api/salary-negotiation", json={
        "current_salary": 80000, "target_role": "consulting"
    })
    assert r.status_code == 200
    data = r.json()
    assert "market_range" in data
    assert "salary_increase_pct" in data
    assert "negotiation_tips" in data
    assert data["salary_increase_pct"] > 0


def test_salary_with_school():
    r = client.post("/api/salary-negotiation", json={
        "current_salary": 100000, "target_role": "tech", "school_id": "gsb"
    })
    assert r.status_code == 200
    data = r.json()
    assert data.get("school_premium") is not None


def test_salary_all_roles():
    for role in ["consulting", "finance", "tech", "general"]:
        r = client.post("/api/salary-negotiation", json={"current_salary": 90000, "target_role": role})
        assert r.status_code == 200


# ── Visa Info ───────────────────────────────────────────────────────

def test_visa_us():
    r = client.get("/api/visa-info?country=united states")
    assert r.status_code == 200
    data = r.json()
    assert data["available"] is True
    assert "student_visa" in data
    assert data["student_visa"] == "F-1"


def test_visa_uk():
    r = client.get("/api/visa-info?country=united kingdom")
    assert r.status_code == 200
    assert r.json()["available"] is True


def test_visa_unknown():
    r = client.get("/api/visa-info?country=narnia")
    assert r.status_code == 200
    assert r.json()["available"] is False


def test_visa_countries_list():
    r = client.get("/api/visa-info/countries")
    assert r.status_code == 200
    countries = r.json()["countries"]
    assert len(countries) >= 5
    assert "United States" in countries


# ── Fee Waivers ─────────────────────────────────────────────────────

def test_fee_waivers_all():
    r = client.get("/api/fee-waivers")
    assert r.status_code == 200
    data = r.json()
    assert data["total_schools"] > 0
    assert len(data["waivers"]) > 0


def test_fee_waivers_filtered():
    r = client.get("/api/fee-waivers?school_ids=hbs,wharton")
    assert r.status_code == 200
    data = r.json()
    assert data["total_schools"] == 2


def test_fee_waivers_military():
    r = client.get("/api/fee-waivers?is_military=true")
    assert r.status_code == 200
    data = r.json()
    assert data["military_eligible"] > 0


def test_fee_waivers_consortium():
    r = client.get("/api/fee-waivers?is_consortium=true")
    assert r.status_code == 200
    data = r.json()
    assert data["consortium_eligible"] > 0
