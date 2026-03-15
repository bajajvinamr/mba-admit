"""Financial comparison endpoint — pure computation, no LLM calls."""

import logging
import re
from typing import Optional

from fastapi import APIRouter, HTTPException

from agents import SCHOOL_DB
from models import FinancialCompareRequest

router = APIRouter(prefix="/api", tags=["financial"])
logger = logging.getLogger(__name__)

LIVING_COST_DEFAULTS = {
    "USA": 25000,
    "US": 25000,
    "UK": 22000,
    "United Kingdom": 22000,
    "France": 22000,
    "India": 12000,
}
DEFAULT_LIVING_COST = 20000

SCHOLARSHIP_TIERS = ["unlikely", "low", "medium", "high"]


def _parse_salary(val) -> Optional[float]:
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        cleaned = re.sub(r"[^\d.]", "", val)
        try:
            return float(cleaned)
        except ValueError:
            return None
    return None


def _get_living_cost(country: Optional[str], override: Optional[float]) -> float:
    if override is not None:
        return override
    if not country:
        return DEFAULT_LIVING_COST
    return LIVING_COST_DEFAULTS.get(country, DEFAULT_LIVING_COST)


def _scholarship_likelihood(
    gmat: Optional[int],
    gmat_avg: Optional[int],
    acceptance_rate: Optional[float],
    work_exp_years: Optional[int],
    tuition: float,
) -> Optional[dict]:
    if gmat is None or gmat_avg is None:
        return None

    gmat_delta = gmat - gmat_avg
    acc = acceptance_rate or 0

    if gmat_delta >= 40 and acc >= 20:
        tier_idx = 3
        est_range = (0.50, 1.00)
    elif gmat_delta >= 20 and acc >= 15:
        tier_idx = 2
        est_range = (0.25, 0.50)
    elif gmat_delta >= 0:
        tier_idx = 1
        est_range = (0.10, 0.25)
    else:
        tier_idx = 0
        est_range = (0.0, 0.0)

    if work_exp_years is not None and work_exp_years >= 6 and tier_idx < 3:
        tier_idx += 1
        tier_ranges = {1: (0.10, 0.25), 2: (0.25, 0.50), 3: (0.50, 1.00)}
        est_range = tier_ranges.get(tier_idx, est_range)

    return {
        "likelihood": SCHOLARSHIP_TIERS[tier_idx],
        "estimated_min": round(tuition * est_range[0]),
        "estimated_max": round(tuition * est_range[1]),
    }


def _loan_calculation(principal: float, rate_pct: float, term_years: int) -> dict:
    principal = max(principal, 0)
    n = term_years * 12
    r = rate_pct / 100 / 12

    if r > 0:
        monthly_payment = principal * (r * (1 + r) ** n) / ((1 + r) ** n - 1)
    else:
        monthly_payment = principal / n if n > 0 else 0

    total_paid = monthly_payment * n
    total_interest = total_paid - principal

    return {
        "principal": round(principal),
        "monthly_payment": round(monthly_payment, 2),
        "total_interest": round(total_interest),
        "total_paid": round(total_paid),
    }


@router.post("/financial/compare")
def compare_financials(req: FinancialCompareRequest):
    """Compare financial outcomes across 2-5 MBA programs. Pure math, no LLM."""
    comparisons = []
    errors = []

    for school_input in req.schools:
        sid = school_input.school_id
        school = SCHOOL_DB.get(sid)
        if not school:
            errors.append({"school_id": sid, "error": "School not found"})
            continue

        tuition = school.get("tuition_usd") or 0
        post_mba_salary = _parse_salary(school.get("median_salary")) or 0
        program_length_months = school.get("program_length_months")
        country = school.get("country")
        gmat_avg = school.get("gmat_avg")
        acceptance_rate = school.get("acceptance_rate")

        program_years = (program_length_months / 12) if program_length_months else 2
        living_cost_yr = _get_living_cost(country, req.living_cost_override)

        net_cost = (tuition * program_years) + (living_cost_yr * program_years) - school_input.scholarship_amount
        opportunity_cost = req.current_salary * program_years
        total_investment = net_cost + opportunity_cost
        salary_increase = post_mba_salary - req.current_salary

        breakeven_years = None
        if salary_increase > 0:
            breakeven_years = round(total_investment / salary_increase, 1)

        npv_5yr = sum(salary_increase / (1.05 ** t) for t in range(1, 6)) - total_investment
        npv_10yr = sum(salary_increase / (1.05 ** t) for t in range(1, 11)) - total_investment

        scholarship_info = _scholarship_likelihood(
            gmat=req.gmat,
            gmat_avg=gmat_avg,
            acceptance_rate=acceptance_rate,
            work_exp_years=req.work_exp_years,
            tuition=tuition * program_years,
        )

        loan = _loan_calculation(net_cost, req.loan_rate, req.loan_term_years)
        debt_to_income_pct = None
        if post_mba_salary > 0:
            debt_to_income_pct = round((loan["monthly_payment"] * 12 / post_mba_salary) * 100, 1)

        comparisons.append({
            "school_id": sid,
            "school_name": school.get("name", sid),
            "tuition": tuition,
            "program_years": round(program_years, 1),
            "living_cost_yearly": living_cost_yr,
            "scholarship_applied": school_input.scholarship_amount,
            "net_cost": round(net_cost),
            "opportunity_cost": round(opportunity_cost),
            "total_investment": round(total_investment),
            "post_mba_salary": post_mba_salary,
            "salary_increase": round(salary_increase),
            "breakeven_years": breakeven_years,
            "npv_5yr": round(npv_5yr),
            "npv_10yr": round(npv_10yr),
            "scholarship_likelihood": scholarship_info,
            "loan": {**loan, "debt_to_income_pct": debt_to_income_pct},
        })

    if len(comparisons) < 2:
        raise HTTPException(
            status_code=400,
            detail=f"Need at least 2 valid schools for comparison. Errors: {errors}",
        )

    comparisons.sort(key=lambda x: x["npv_10yr"], reverse=True)

    best = comparisons[0]
    reason_parts = [f"Highest 10-year NPV of ${best['npv_10yr']:,}"]
    if best["breakeven_years"]:
        reason_parts.append(f"breaks even in {best['breakeven_years']} years")

    return {
        "comparisons": comparisons,
        "errors": errors if errors else None,
        "recommendation": best["school_id"],
        "recommendation_reason": ". ".join(reason_parts) + ".",
    }
