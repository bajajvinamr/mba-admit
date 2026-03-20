"""Tests for the Admit Simulator (Monte Carlo) and GMAT Study Planner endpoints."""

import pytest


# ── Admit Simulator ──────────────────────────────────────────────────────────


def test_admit_simulator_basic(client):
    """Basic Monte Carlo simulation with default schools."""
    resp = client.post("/api/admit-simulator", json={
        "gmat": 730,
        "gpa": 3.7,
        "work_exp_years": 4,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "results" in data
    assert "summary" in data
    assert "profile_used" in data
    assert "methodology" in data
    assert len(data["results"]) > 0
    assert data["summary"]["total_schools"] > 0


def test_admit_simulator_specific_schools(client):
    """Simulation for specific school list."""
    resp = client.post("/api/admit-simulator", json={
        "gmat": 750,
        "gpa": 3.8,
        "work_exp_years": 5,
        "school_ids": ["hbs", "gsb", "wharton"],
    })
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["results"]) == 3
    school_ids = {r["school_id"] for r in data["results"]}
    assert school_ids == {"hbs", "gsb", "wharton"}


def test_admit_simulator_result_structure(client):
    """Verify the structure of each simulation result."""
    resp = client.post("/api/admit-simulator", json={
        "gmat": 700,
        "gpa": 3.5,
        "school_ids": ["booth"],
    })
    assert resp.status_code == 200
    result = resp.json()["results"][0]

    assert "school_id" in result
    assert "school_name" in result
    assert "admit_probability" in result
    assert "outcome" in result
    assert "outcome_label" in result
    assert "simulations_run" in result
    assert "percentiles" in result
    assert "factors" in result
    assert "school_stats" in result

    # Percentiles must be ordered
    p = result["percentiles"]
    assert p["p10"] <= p["p25"] <= p["p50"] <= p["p75"] <= p["p90"]

    # Probability in valid range
    assert 0 <= result["admit_probability"] <= 100

    # Outcome must be one of the valid values
    assert result["outcome"] in ("likely", "competitive", "possible", "unlikely")


def test_admit_simulator_outcome_classification(client):
    """High-stats applicant should get better outcomes than low-stats."""
    high = client.post("/api/admit-simulator", json={
        "gmat": 780,
        "gpa": 3.95,
        "work_exp_years": 4,
        "school_ids": ["ross"],
        "undergrad_tier": "top_10",
        "industry": "consulting",
        "leadership_roles": "manager",
    }).json()

    low = client.post("/api/admit-simulator", json={
        "gmat": 550,
        "gpa": 2.8,
        "school_ids": ["ross"],
    }).json()

    high_prob = high["results"][0]["admit_probability"]
    low_prob = low["results"][0]["admit_probability"]
    assert high_prob > low_prob


def test_admit_simulator_summary_counts(client):
    """Summary tier counts should add up to total schools."""
    resp = client.post("/api/admit-simulator", json={
        "gmat": 720,
        "gpa": 3.6,
        "school_ids": ["hbs", "gsb", "booth", "kellogg", "ross"],
    })
    data = resp.json()
    summary = data["summary"]
    total = summary["likely"] + summary["competitive"] + summary["possible"] + summary["unlikely"]
    assert total == summary["total_schools"]


def test_admit_simulator_too_many_schools(client):
    """Should reject more than 10 schools."""
    resp = client.post("/api/admit-simulator", json={
        "gmat": 700,
        "gpa": 3.5,
        "school_ids": [f"school_{i}" for i in range(11)],
    })
    assert resp.status_code == 400


def test_admit_simulator_no_gmat(client):
    """Should default GMAT to 700 if not provided."""
    resp = client.post("/api/admit-simulator", json={
        "gpa": 3.5,
        "school_ids": ["booth"],
    })
    assert resp.status_code == 200
    assert resp.json()["profile_used"]["gmat"] == 700


def test_admit_simulator_reproducible(client):
    """Same inputs should produce same results (deterministic RNG)."""
    payload = {
        "gmat": 720,
        "gpa": 3.6,
        "work_exp_years": 4,
        "school_ids": ["hbs", "booth"],
    }
    r1 = client.post("/api/admit-simulator", json=payload).json()
    r2 = client.post("/api/admit-simulator", json=payload).json()

    for i in range(len(r1["results"])):
        assert r1["results"][i]["admit_probability"] == r2["results"][i]["admit_probability"]


def test_admit_simulator_profile_modifier(client):
    """Profile modifiers (undergrad tier, industry, etc.) should affect results."""
    base = client.post("/api/admit-simulator", json={
        "gmat": 710,
        "gpa": 3.5,
        "school_ids": ["kellogg"],
    }).json()

    boosted = client.post("/api/admit-simulator", json={
        "gmat": 710,
        "gpa": 3.5,
        "school_ids": ["kellogg"],
        "undergrad_tier": "top_10",
        "industry": "military",
        "leadership_roles": "cxo",
        "intl_experience": True,
        "community_service": True,
    }).json()

    assert boosted["profile_used"]["profile_modifier"] > base["profile_used"]["profile_modifier"]


# ── GMAT Study Planner ──────────────────────────────────────────────────────


def test_study_plan_basic(client):
    """Basic study plan generation."""
    resp = client.post("/api/gmat-study-plan", json={
        "current_score": 650,
        "target_score": 720,
        "weeks_available": 12,
        "hours_per_week": 15,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "gap_analysis" in data
    assert "weekly_plan" in data
    assert "feasibility" in data
    assert "resources" in data
    assert "milestones" in data
    assert "target_schools" in data


def test_study_plan_weekly_count(client):
    """Weekly plan should have exactly the requested number of weeks."""
    weeks = 8
    resp = client.post("/api/gmat-study-plan", json={
        "current_score": 600,
        "target_score": 700,
        "weeks_available": weeks,
        "hours_per_week": 10,
    })
    data = resp.json()
    assert len(data["weekly_plan"]) == weeks


def test_study_plan_gap_analysis(client):
    """Gap analysis should correctly compute the score gap."""
    resp = client.post("/api/gmat-study-plan", json={
        "current_score": 600,
        "target_score": 720,
        "weeks_available": 12,
        "hours_per_week": 10,
    })
    gap = resp.json()["gap_analysis"]
    assert gap["gap"] == 120
    assert gap["difficulty"] == "ambitious"
    assert gap["estimated_hours"] > 0


def test_study_plan_already_at_target(client):
    """If current score >= target, gap should be 0."""
    resp = client.post("/api/gmat-study-plan", json={
        "current_score": 750,
        "target_score": 720,
        "weeks_available": 4,
        "hours_per_week": 10,
    })
    gap = resp.json()["gap_analysis"]
    assert gap["gap"] == 0
    assert gap["difficulty"] == "at_target"


def test_study_plan_feasibility_aggressive(client):
    """Large gap with few hours should flag as aggressive."""
    resp = client.post("/api/gmat-study-plan", json={
        "current_score": 500,
        "target_score": 750,
        "weeks_available": 4,
        "hours_per_week": 5,
    })
    data = resp.json()
    assert data["feasibility"] in ("aggressive", "tight")


def test_study_plan_weak_areas(client):
    """Specifying weak areas should shift topic allocation."""
    resp = client.post("/api/gmat-study-plan", json={
        "current_score": 650,
        "target_score": 720,
        "weeks_available": 8,
        "hours_per_week": 15,
        "weak_areas": ["quant"],
    })
    data = resp.json()
    # Quant should have more hours in week 1 than it would without weak_areas
    week1 = data["weekly_plan"][0]
    assert "quant" in week1["topics"]
    assert week1["topics"]["quant"]["hours"] > 0


def test_study_plan_phases(client):
    """Plan should progress through Foundation → Practice → Review → Test Day."""
    resp = client.post("/api/gmat-study-plan", json={
        "current_score": 600,
        "target_score": 700,
        "weeks_available": 12,
        "hours_per_week": 10,
    })
    phases = [w["phase"] for w in resp.json()["weekly_plan"]]
    # First week should be Foundation
    assert phases[0] == "Foundation"
    # Last week should be Test Day Prep
    assert phases[-1] == "Test Day Prep"


def test_study_plan_milestones(client):
    """Milestones should be between current and target score."""
    resp = client.post("/api/gmat-study-plan", json={
        "current_score": 600,
        "target_score": 760,
        "weeks_available": 20,
        "hours_per_week": 15,
    })
    milestones = resp.json()["milestones"]
    assert len(milestones) > 0
    for m in milestones:
        assert 600 <= m["score"] <= 760


def test_study_plan_target_schools(client):
    """Should include M7 school comparison against target score."""
    resp = client.post("/api/gmat-study-plan", json={
        "current_score": 650,
        "target_score": 730,
        "weeks_available": 12,
        "hours_per_week": 15,
    })
    schools = resp.json()["target_schools"]
    assert len(schools) > 0
    for s in schools:
        assert "school_id" in s
        assert "gmat_avg" in s
        assert "target_delta" in s
        assert "assessment" in s


def test_study_plan_resources(client):
    """Should return recommended study resources."""
    resp = client.post("/api/gmat-study-plan", json={
        "current_score": 600,
        "target_score": 700,
        "weeks_available": 8,
        "hours_per_week": 10,
    })
    resources = resp.json()["resources"]
    assert len(resources) >= 3
    essentials = [r for r in resources if r["priority"] == "essential"]
    assert len(essentials) >= 2


def test_study_plan_validation(client):
    """Should reject invalid scores."""
    resp = client.post("/api/gmat-study-plan", json={
        "current_score": 100,  # below minimum
        "target_score": 700,
        "weeks_available": 8,
        "hours_per_week": 10,
    })
    assert resp.status_code == 422
