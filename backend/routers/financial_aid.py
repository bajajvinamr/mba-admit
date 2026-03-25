"""Financial aid comparison — scholarship negotiation + ROI calculator."""

import logging
import re
from typing import Optional, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from agents import SCHOOL_DB

router = APIRouter(prefix="/api", tags=["financial-aid"])
logger = logging.getLogger(__name__)


# ── Living cost defaults by country ──────────────────────────────────────────

LIVING_COST_DEFAULTS = {
    "USA": 25000,
    "US": 25000,
    "UK": 22000,
    "United Kingdom": 22000,
    "France": 22000,
    "Germany": 18000,
    "Spain": 18000,
    "Singapore": 28000,
    "India": 12000,
    "Canada": 22000,
    "Australia": 24000,
    "China": 15000,
    "Hong Kong": 30000,
    "Switzerland": 35000,
}
DEFAULT_LIVING_COST = 20000

# ── Median salary defaults (post-MBA, by region) ────────────────────────────

MEDIAN_SALARY_DEFAULTS = {
    "USA": 165000,
    "US": 165000,
    "UK": 90000,
    "United Kingdom": 90000,
    "India": 35000,
    "Singapore": 95000,
    "France": 80000,
    "Germany": 85000,
    "Canada": 100000,
    "Hong Kong": 100000,
    "Switzerland": 120000,
}
DEFAULT_MEDIAN_SALARY = 120000


# ── Models ───────────────────────────────────────────────────────────────────

class SchoolScholarshipInput(BaseModel):
    school_id: str
    scholarship_amount: float = 0


class FinancialAidCompareRequest(BaseModel):
    schools: List[SchoolScholarshipInput] = Field(min_length=2, max_length=4)
    current_salary: Optional[float] = Field(default=0, ge=0)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _parse_salary(val) -> Optional[float]:
    """Parse salary from various formats."""
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


def _get_living_cost(country: Optional[str]) -> float:
    """Get estimated annual living cost by country."""
    if not country:
        return DEFAULT_LIVING_COST
    return LIVING_COST_DEFAULTS.get(country, DEFAULT_LIVING_COST)


def _get_median_salary(school: dict) -> float:
    """Get post-MBA median salary from school data or country default."""
    salary = _parse_salary(school.get("median_salary"))
    if salary and salary > 0:
        return salary
    country = school.get("country", "")
    return MEDIAN_SALARY_DEFAULTS.get(country, DEFAULT_MEDIAN_SALARY)


def _calculate_roi(
    total_cost: float,
    opportunity_cost: float,
    median_salary: float,
    current_salary: float,
    years: int = 10,
) -> dict:
    """Calculate 10-year ROI of MBA investment."""
    total_investment = total_cost + opportunity_cost
    annual_salary_gain = max(0, median_salary - current_salary)
    cumulative_gain = annual_salary_gain * years
    net_roi = cumulative_gain - total_investment
    roi_percentage = (net_roi / total_investment * 100) if total_investment > 0 else 0
    payback_years = (
        round(total_investment / annual_salary_gain, 1)
        if annual_salary_gain > 0
        else None
    )

    return {
        "total_investment": round(total_investment),
        "annual_salary_gain": round(annual_salary_gain),
        "cumulative_10yr_gain": round(cumulative_gain),
        "net_roi": round(net_roi),
        "roi_percentage": round(roi_percentage, 1),
        "payback_years": payback_years,
    }


# ── Endpoint ─────────────────────────────────────────────────────────────────

@router.post("/financial-aid/compare")
def compare_financial_aid(req: FinancialAidCompareRequest):
    """Compare financial aid packages across 2-4 admitted schools.

    Returns tuition, scholarship, net cost, living estimate, total cost,
    median salary, and 10-year ROI for each school.
    """
    comparisons = []
    errors = []

    for school_input in req.schools:
        sid = school_input.school_id
        school = SCHOOL_DB.get(sid)

        if not school:
            errors.append({"school_id": sid, "error": "School not found"})
            continue

        tuition = school.get("tuition_usd") or 0
        scholarship = school_input.scholarship_amount
        net_tuition = max(0, tuition - scholarship)
        living_cost = _get_living_cost(school.get("country"))

        # Program length: default 2 years
        program_years = 2
        program_months = school.get("program_length_months")
        if program_months:
            program_years = max(1, round(program_months / 12))

        total_living = living_cost * program_years
        total_cost = net_tuition + total_living

        # Opportunity cost (foregone salary during MBA)
        current_salary = req.current_salary or 0
        opportunity_cost = current_salary * program_years

        # Post-MBA salary
        median_salary = _get_median_salary(school)

        # ROI calculation
        roi = _calculate_roi(
            total_cost=total_cost,
            opportunity_cost=opportunity_cost,
            median_salary=median_salary,
            current_salary=current_salary,
            years=10,
        )

        comparisons.append({
            "school_id": sid,
            "name": school.get("name", sid),
            "country": school.get("country", "Unknown"),
            "tuition": round(tuition),
            "scholarship": round(scholarship),
            "net_tuition": round(net_tuition),
            "living_estimate": round(total_living),
            "total_cost": round(total_cost),
            "program_years": program_years,
            "median_salary": round(median_salary),
            "roi": roi,
        })

    # Sort by net cost ascending (best deal first)
    comparisons.sort(key=lambda c: c["total_cost"])

    return {
        "comparisons": comparisons,
        "errors": errors if errors else None,
        "negotiation_guide": {
            "can_negotiate": True,
            "best_timing": "Within 2 weeks of receiving the offer, before committing",
            "steps": [
                "Gather competing offers with higher scholarship amounts",
                "Draft a polite, professional email to the financial aid office",
                "Highlight your specific interest in the program and why it's your top choice",
                "Mention competing offers without being aggressive — frame as 'helping make this decision easier'",
                "Be specific about the gap you'd like bridged",
                "Follow up once if no response within 7-10 business days",
            ],
            "email_template": (
                "Subject: Financial Aid Reconsideration — [Your Name], [Program] Admit\n\n"
                "Dear [Financial Aid Office / Specific Contact],\n\n"
                "Thank you for the generous offer of admission to [School Name]'s [Program]. "
                "I am truly excited about the program and it remains my top choice.\n\n"
                "I wanted to respectfully share that I have received a scholarship offer of "
                "$[Amount] from [Competing School], which has created a meaningful financial "
                "gap as I make my final decision.\n\n"
                "Given my strong commitment to [School Name] and the unique value of the program, "
                "I would be grateful if the committee could reconsider my financial aid package. "
                "Any additional support would help me commit wholeheartedly.\n\n"
                "I'm happy to provide any additional information that would be helpful.\n\n"
                "Warm regards,\n[Your Name]\n[Application ID / Admit ID]"
            ),
            "timing_advice": [
                "Negotiate BEFORE the deposit deadline — leverage decreases after you commit",
                "Best window: 1-2 weeks after receiving all offers",
                "Round 1 admits often have more scholarship budget available",
                "Some schools have formal appeals processes — check the admit portal",
            ],
        },
    }
