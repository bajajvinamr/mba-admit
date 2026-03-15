"""Tests for POST /api/financial/compare — financial comparison endpoint."""


def _base_payload(**overrides):
    """Build a valid request payload with sensible defaults."""
    payload = {
        "schools": [
            {"school_id": "hbs", "scholarship_amount": 0},
            {"school_id": "booth", "scholarship_amount": 0},
        ],
        "current_salary": 85000,
        "gmat": 740,
        "gpa": 3.8,
        "work_exp_years": 5,
        "loan_rate": 7.0,
        "loan_term_years": 10,
    }
    payload.update(overrides)
    return payload


# ── Basic response structure ─────────────────────────────────────────────────


def test_financial_compare_basic(client):
    """Two-school comparison returns expected top-level keys."""
    resp = client.post("/api/financial/compare", json=_base_payload())
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "comparisons" in data, "Response must contain 'comparisons'"
    assert "recommendation" in data, "Response must contain 'recommendation'"
    assert "recommendation_reason" in data, "Response must contain 'recommendation_reason'"
    assert len(data["comparisons"]) == 2


# ── Scholarship impact ───────────────────────────────────────────────────────


def test_financial_compare_with_scholarship(client):
    """School with $50K scholarship should have lower net_cost than without."""
    payload = _base_payload(schools=[
        {"school_id": "hbs", "scholarship_amount": 0},
        {"school_id": "booth", "scholarship_amount": 50000},
    ])
    resp = client.post("/api/financial/compare", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    by_id = {c["school_id"]: c for c in data["comparisons"]}

    # Booth with scholarship should cost less than same school without, but we
    # are comparing across schools. At minimum the scholarship amount should
    # reduce net_cost relative to its no-scholarship equivalent.
    booth = by_id["booth"]
    assert booth["scholarship_applied"] == 50000

    # Also run a same-school comparison to prove net_cost drops
    same_school = _base_payload(schools=[
        {"school_id": "booth", "scholarship_amount": 0},
        {"school_id": "hbs", "scholarship_amount": 0},
    ])
    resp2 = client.post("/api/financial/compare", json=same_school)
    booth_no_schol = next(c for c in resp2.json()["comparisons"] if c["school_id"] == "booth")
    assert booth["net_cost"] < booth_no_schol["net_cost"], (
        "Scholarship should reduce net_cost"
    )


# ── NPV ordering ────────────────────────────────────────────────────────────


def test_financial_compare_npv_ordering(client):
    """Comparisons should be sorted by npv_10yr descending."""
    payload = _base_payload(schools=[
        {"school_id": "hbs", "scholarship_amount": 0},
        {"school_id": "booth", "scholarship_amount": 0},
        {"school_id": "wharton", "scholarship_amount": 0},
    ])
    resp = client.post("/api/financial/compare", json=payload)
    assert resp.status_code == 200
    npvs = [c["npv_10yr"] for c in resp.json()["comparisons"]]
    assert npvs == sorted(npvs, reverse=True), "comparisons must be sorted by npv_10yr desc"


# ── Best value (recommendation) ──────────────────────────────────────────────


def test_financial_compare_best_value(client):
    """Recommendation should be the first school in the sorted list (highest NPV)."""
    payload = _base_payload(schools=[
        {"school_id": "hbs", "scholarship_amount": 0},
        {"school_id": "booth", "scholarship_amount": 0},
        {"school_id": "wharton", "scholarship_amount": 0},
    ])
    resp = client.post("/api/financial/compare", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    best_id = data["comparisons"][0]["school_id"]
    assert data["recommendation"] == best_id, (
        "recommendation should match the highest-NPV school"
    )


# ── Scholarship likelihood ───────────────────────────────────────────────────


def test_financial_compare_scholarship_likelihood(client):
    """GMAT 760 (well above average) should produce medium or high likelihood for at least one school."""
    payload = _base_payload(gmat=760)
    resp = client.post("/api/financial/compare", json=payload)
    assert resp.status_code == 200
    likelihoods = [
        c["scholarship_likelihood"]["likelihood"]
        for c in resp.json()["comparisons"]
        if c["scholarship_likelihood"] is not None
    ]
    assert any(l in ("medium", "high") for l in likelihoods), (
        f"Expected at least one medium/high likelihood, got {likelihoods}"
    )


# ── Loan calculation ────────────────────────────────────────────────────────


def test_financial_compare_loan_calculation(client):
    """Loan fields should have positive payment and interest, reasonable DTI."""
    resp = client.post("/api/financial/compare", json=_base_payload())
    assert resp.status_code == 200
    for comp in resp.json()["comparisons"]:
        loan = comp["loan"]
        assert loan["monthly_payment"] > 0, "monthly_payment must be positive"
        assert loan["total_interest"] > 0, "total_interest must be positive"
        if loan["debt_to_income_pct"] is not None:
            assert loan["debt_to_income_pct"] < 50, (
                f"DTI {loan['debt_to_income_pct']}% is unreasonably high"
            )


# ── Breakeven years ──────────────────────────────────────────────────────────


def test_financial_compare_breakeven(client):
    """Breakeven years should be positive and reasonable for typical inputs."""
    resp = client.post("/api/financial/compare", json=_base_payload())
    assert resp.status_code == 200
    for comp in resp.json()["comparisons"]:
        be = comp["breakeven_years"]
        if be is not None:
            assert 0 < be < 20, f"breakeven_years {be} is out of reasonable range"


# ── Validation: too few schools ──────────────────────────────────────────────


def test_financial_compare_min_schools(client):
    """Sending only 1 school should return 422 validation error."""
    payload = _base_payload(schools=[{"school_id": "hbs", "scholarship_amount": 0}])
    resp = client.post("/api/financial/compare", json=payload)
    assert resp.status_code == 422, f"Expected 422 for 1 school, got {resp.status_code}"


# ── Validation: too many schools ─────────────────────────────────────────────


def test_financial_compare_max_schools(client):
    """Sending 6 schools (max is 5) should return 422 validation error."""
    payload = _base_payload(schools=[
        {"school_id": "hbs", "scholarship_amount": 0},
        {"school_id": "booth", "scholarship_amount": 0},
        {"school_id": "wharton", "scholarship_amount": 0},
        {"school_id": "gsb", "scholarship_amount": 0},
        {"school_id": "kellogg", "scholarship_amount": 0},
        {"school_id": "hbs", "scholarship_amount": 10000},  # 6th entry
    ])
    resp = client.post("/api/financial/compare", json=payload)
    assert resp.status_code == 422, f"Expected 422 for 6 schools, got {resp.status_code}"


# ── Unknown school handling ──────────────────────────────────────────────────


def test_financial_compare_unknown_school(client):
    """Including an unknown school_id alongside valid ones skips it and reports error."""
    payload = _base_payload(schools=[
        {"school_id": "hbs", "scholarship_amount": 0},
        {"school_id": "totally_fake_school", "scholarship_amount": 0},
        {"school_id": "booth", "scholarship_amount": 0},
    ])
    resp = client.post("/api/financial/compare", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    # The unknown school should appear in errors, not in comparisons
    comp_ids = [c["school_id"] for c in data["comparisons"]]
    assert "totally_fake_school" not in comp_ids
    assert data["errors"] is not None
    err_ids = [e["school_id"] for e in data["errors"]]
    assert "totally_fake_school" in err_ids


def test_financial_compare_all_unknown_schools(client):
    """When all schools are unknown, endpoint should return 400 (not enough valid schools)."""
    payload = _base_payload(schools=[
        {"school_id": "fake_a", "scholarship_amount": 0},
        {"school_id": "fake_b", "scholarship_amount": 0},
    ])
    resp = client.post("/api/financial/compare", json=payload)
    assert resp.status_code == 400


# ── Edge case: zero salary ───────────────────────────────────────────────────


def test_financial_compare_zero_salary(client):
    """current_salary=0 should not cause division-by-zero errors."""
    payload = _base_payload(current_salary=0)
    resp = client.post("/api/financial/compare", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    for comp in data["comparisons"]:
        # Breakeven may be None if salary_increase <= 0 (can't break even)
        # or positive if post-MBA salary > 0
        be = comp["breakeven_years"]
        if be is not None:
            assert be > 0


# ── Edge case: zero loan rate ────────────────────────────────────────────────


def test_loan_zero_rate(client):
    """loan_rate=0 should produce monthly_payment = principal / (term * 12)."""
    payload = _base_payload(loan_rate=0)
    resp = client.post("/api/financial/compare", json=payload)
    assert resp.status_code == 200
    for comp in resp.json()["comparisons"]:
        loan = comp["loan"]
        n = 10 * 12  # loan_term_years=10
        expected_payment = loan["principal"] / n if loan["principal"] > 0 else 0
        assert abs(loan["monthly_payment"] - round(expected_payment, 2)) < 0.02, (
            f"Zero-rate payment mismatch: {loan['monthly_payment']} vs {round(expected_payment, 2)}"
        )
        assert loan["total_interest"] == 0, "Zero-rate loan should have zero interest"
