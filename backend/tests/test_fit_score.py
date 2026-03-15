"""Tests for POST /api/schools/fit-score — profile-school match scoring."""


def _base_payload(**overrides):
    """Build a valid request payload with sensible defaults."""
    payload = {
        "school_ids": ["hbs"],
        "gmat": 730,
        "gpa": 3.7,
        "work_exp_years": 4,
        "target_industry": "Consulting",
        "budget_max": 80000,
    }
    payload.update(overrides)
    return payload


# ── Basic response structure ─────────────────────────────────────────────────


def test_fit_score_basic_structure(client):
    """Response contains results list with expected keys per school."""
    resp = client.post("/api/schools/fit-score", json=_base_payload())
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "results" in data
    assert len(data["results"]) == 1

    result = data["results"][0]
    assert result["school_id"] == "hbs"
    assert "school_name" in result
    assert "fit_score" in result
    assert "breakdown" in result
    assert "highlights" in result
    assert "concerns" in result

    breakdown = result["breakdown"]
    for key in ("academic", "experience", "career", "financial", "selectivity"):
        assert key in breakdown, f"Missing breakdown key: {key}"


# ── Score range 0-100 ──────────────────────────────────────────────────────


def test_fit_score_range(client):
    """Fit score must be between 0 and 100 inclusive."""
    resp = client.post("/api/schools/fit-score", json=_base_payload())
    assert resp.status_code == 200
    for result in resp.json()["results"]:
        assert 0 <= result["fit_score"] <= 100, (
            f"fit_score {result['fit_score']} out of range"
        )


# ── High GMAT → high academic score ─────────────────────────────────────────


def test_fit_score_high_gmat(client):
    """GMAT 780 (well above HBS avg ~730) should yield high academic subscore."""
    resp = client.post("/api/schools/fit-score", json=_base_payload(gmat=780))
    assert resp.status_code == 200
    result = resp.json()["results"][0]
    assert result["breakdown"]["academic"] >= 22, (
        f"Expected academic >= 22 for GMAT 780, got {result['breakdown']['academic']}"
    )


# ── Low GMAT → low academic score ───────────────────────────────────────────


def test_fit_score_low_gmat(client):
    """GMAT 600 (well below HBS avg ~730) should yield low academic subscore."""
    resp = client.post("/api/schools/fit-score", json=_base_payload(gmat=600))
    assert resp.status_code == 200
    result = resp.json()["results"][0]
    assert result["breakdown"]["academic"] <= 15, (
        f"Expected academic <= 15 for GMAT 600, got {result['breakdown']['academic']}"
    )


# ── Budget match ────────────────────────────────────────────────────────────


def test_fit_score_budget_match(client):
    """Budget exceeding tuition should yield max financial score (15)."""
    resp = client.post("/api/schools/fit-score", json=_base_payload(budget_max=200000))
    assert resp.status_code == 200
    result = resp.json()["results"][0]
    assert result["breakdown"]["financial"] == 15, (
        f"Expected financial=15 when budget >> tuition, got {result['breakdown']['financial']}"
    )


# ── Budget exceed ──────────────────────────────────────────────────────────


def test_fit_score_budget_exceed(client):
    """Budget well below tuition should yield low financial score."""
    resp = client.post("/api/schools/fit-score", json=_base_payload(budget_max=30000))
    assert resp.status_code == 200
    result = resp.json()["results"][0]
    assert result["breakdown"]["financial"] <= 10, (
        f"Expected financial <= 10 when budget << tuition, got {result['breakdown']['financial']}"
    )
    # Should have a concern about exceeding budget
    assert any("exceeds budget" in c.lower() for c in result["concerns"]), (
        f"Expected budget concern, got {result['concerns']}"
    )


# ── Multiple schools sorted by fit ──────────────────────────────────────────


def test_fit_score_multiple_schools_sorted(client):
    """Multiple schools should be returned sorted by fit_score descending."""
    payload = _base_payload(school_ids=["hbs", "gsb"])
    resp = client.post("/api/schools/fit-score", json=payload)
    assert resp.status_code == 200
    results = resp.json()["results"]
    assert len(results) == 2
    scores = [r["fit_score"] for r in results]
    assert scores == sorted(scores, reverse=True), (
        f"Results not sorted by fit_score desc: {scores}"
    )


# ── Missing optional fields still works ──────────────────────────────────────


def test_fit_score_minimal_payload(client):
    """Only school_ids required — all other fields optional."""
    resp = client.post("/api/schools/fit-score", json={"school_ids": ["hbs"]})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert len(data["results"]) == 1
    result = data["results"][0]
    assert 0 <= result["fit_score"] <= 100


# ── Unknown school returns error ─────────────────────────────────────────────


def test_fit_score_unknown_school(client):
    """Unknown school_id should appear in errors, not results."""
    payload = _base_payload(school_ids=["hbs", "totally_fake_school"])
    resp = client.post("/api/schools/fit-score", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    result_ids = [r["school_id"] for r in data["results"]]
    assert "totally_fake_school" not in result_ids
    assert data["errors"] is not None
    err_ids = [e["school_id"] for e in data["errors"]]
    assert "totally_fake_school" in err_ids


# ── Experience sweet spot ────────────────────────────────────────────────────


def test_fit_score_experience_sweet_spot(client):
    """4 years work experience (sweet spot) should yield max experience score."""
    resp = client.post("/api/schools/fit-score", json=_base_payload(work_exp_years=4))
    assert resp.status_code == 200
    result = resp.json()["results"][0]
    assert result["breakdown"]["experience"] == 20, (
        f"Expected experience=20 for 4 years, got {result['breakdown']['experience']}"
    )


# ── Validation: empty school list ────────────────────────────────────────────


def test_fit_score_empty_school_list(client):
    """Empty school_ids list should return 422 validation error."""
    resp = client.post("/api/schools/fit-score", json={"school_ids": []})
    assert resp.status_code == 422
