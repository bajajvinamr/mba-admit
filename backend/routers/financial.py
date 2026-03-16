"""Financial comparison endpoint — pure computation, no LLM calls."""

import logging
import re
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

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


# ── Cost of Living Comparison ─────────────────────────────────────────

import re as _re

from routers.schools import SCHOOL_ALIASES

CITY_COSTS = {
    "boston": {"rent": 2400, "food": 600, "transport": 100, "misc": 400},
    "stanford": {"rent": 2800, "food": 650, "transport": 150, "misc": 450},
    "palo alto": {"rent": 2800, "food": 650, "transport": 150, "misc": 450},
    "new york": {"rent": 2600, "food": 700, "transport": 130, "misc": 500},
    "chicago": {"rent": 1800, "food": 500, "transport": 100, "misc": 350},
    "philadelphia": {"rent": 1600, "food": 500, "transport": 100, "misc": 350},
    "new haven": {"rent": 1400, "food": 450, "transport": 80, "misc": 300},
    "hanover": {"rent": 1500, "food": 450, "transport": 80, "misc": 300},
    "ann arbor": {"rent": 1400, "food": 450, "transport": 80, "misc": 300},
    "durham": {"rent": 1300, "food": 400, "transport": 90, "misc": 280},
    "charlottesville": {"rent": 1300, "food": 400, "transport": 80, "misc": 280},
    "ithaca": {"rent": 1200, "food": 400, "transport": 70, "misc": 270},
    "los angeles": {"rent": 2200, "food": 600, "transport": 150, "misc": 400},
    "san francisco": {"rent": 2800, "food": 650, "transport": 120, "misc": 450},
    "london": {"rent": 2500, "food": 600, "transport": 200, "misc": 400},
    "singapore": {"rent": 2000, "food": 500, "transport": 100, "misc": 350},
    "mumbai": {"rent": 800, "food": 300, "transport": 50, "misc": 200},
    "ahmedabad": {"rent": 500, "food": 250, "transport": 40, "misc": 150},
    "paris": {"rent": 1800, "food": 500, "transport": 80, "misc": 350},
    "barcelona": {"rent": 1200, "food": 400, "transport": 60, "misc": 280},
    "fontainebleau": {"rent": 1200, "food": 400, "transport": 100, "misc": 300},
    "toronto": {"rent": 1800, "food": 500, "transport": 100, "misc": 350},
    "seattle": {"rent": 2000, "food": 550, "transport": 100, "misc": 380},
    "washington": {"rent": 2200, "food": 550, "transport": 120, "misc": 400},
    "austin": {"rent": 1600, "food": 450, "transport": 100, "misc": 320},
    "atlanta": {"rent": 1500, "food": 450, "transport": 90, "misc": 300},
}

_DEFAULT_COSTS = {"rent": 1500, "food": 450, "transport": 100, "misc": 300}


def _match_city_costs(location: str) -> dict:
    """Fuzzy-match a school location string to CITY_COSTS."""
    if not location:
        return dict(_DEFAULT_COSTS)
    loc_lower = location.lower()
    # Try each city key as a substring of the location
    for city_key, costs in CITY_COSTS.items():
        if city_key in loc_lower:
            return dict(costs)
    # Also try the first part of location (before comma)
    city_part = loc_lower.split(",")[0].strip()
    for city_key, costs in CITY_COSTS.items():
        if city_key in city_part or city_part in city_key:
            return dict(costs)
    return dict(_DEFAULT_COSTS)


@router.get("/cost-of-living")
def get_cost_of_living(school_ids: str = Query(description="Comma-separated school IDs")):
    """Compare monthly cost of living across MBA program cities."""
    ids = [s.strip().lower() for s in school_ids.split(",") if s.strip()]
    if not ids:
        raise HTTPException(400, "Provide at least one school_id")
    if len(ids) > 10:
        raise HTTPException(400, "Maximum 10 schools per comparison")

    comparisons = []
    for sid in ids:
        school = SCHOOL_DB.get(sid)
        if not school:
            resolved = SCHOOL_ALIASES.get(sid, "")
            school = SCHOOL_DB.get(resolved) if resolved else None
        if not school:
            continue

        location = school.get("location", "")
        costs = _match_city_costs(location)
        monthly_total = sum(costs.values())

        # Determine program length in years
        duration_str = school.get("program_details", {}).get("duration", "")
        program_years = 2  # default
        if duration_str:
            dur_match = _re.search(r"(\d+)", str(duration_str))
            if dur_match:
                val = int(dur_match.group(1))
                if val >= 10:  # months
                    program_years = max(1, round(val / 12))
                else:
                    program_years = val

        comparisons.append({
            "school_id": sid,
            "school_name": school.get("name", sid),
            "location": location or "Unknown",
            "monthly": {**costs, "total": monthly_total},
            "annual_total": monthly_total * 12,
            "program_years": program_years,
        })

    if not comparisons:
        raise HTTPException(404, "No matching schools found")

    cheapest = min(comparisons, key=lambda c: c["monthly"]["total"])
    most_expensive = max(comparisons, key=lambda c: c["monthly"]["total"])

    return {
        "comparisons": comparisons,
        "cheapest": cheapest["school_id"],
        "most_expensive": most_expensive["school_id"],
    }


# ── Salary Negotiation Calculator ─────────────────────────────────────

from pydantic import BaseModel as _BaseModel


class SalaryNegRequest(_BaseModel):
    current_salary: int
    target_role: str = "consulting"  # consulting, finance, tech, general
    school_id: str | None = None
    years_exp: int = 5
    location: str = "new york"


SALARY_RANGES = {
    "consulting": {"p25": 165000, "p50": 175000, "p75": 190000, "signing_bonus": 30000},
    "finance": {"p25": 150000, "p50": 175000, "p75": 200000, "signing_bonus": 50000},
    "tech": {"p25": 140000, "p50": 165000, "p75": 195000, "signing_bonus": 25000},
    "general": {"p25": 120000, "p50": 145000, "p75": 170000, "signing_bonus": 15000},
}

_LOCATION_ADJUSTERS: dict[str, float] = {
    "new york": 1.0,
    "nyc": 1.0,
    "san francisco": 1.05,
    "sf": 1.05,
    "chicago": 0.85,
    "boston": 0.90,
    "los angeles": 0.95,
    "la": 0.95,
}
_DEFAULT_LOC_ADJUSTER = 0.80

_M7_SET = {"hbs", "gsb", "wharton", "booth", "kellogg", "cbs", "sloan"}
_T15_SET = {"tuck", "haas", "ross", "fuqua", "darden", "stern", "yale-som", "johnson"}


def _loc_adjuster(location: str) -> float:
    loc = location.strip().lower()
    for key, val in _LOCATION_ADJUSTERS.items():
        if key in loc or loc in key:
            return val
    return _DEFAULT_LOC_ADJUSTER


def _school_premium(school_id: str | None) -> float | None:
    if not school_id:
        return None
    sid = school_id.strip().lower()
    if sid in _M7_SET:
        return 0.05
    if sid in _T15_SET:
        return 0.03
    return 0.0


@router.post("/salary-negotiation")
def salary_negotiation(req: SalaryNegRequest):
    """Post-MBA salary negotiation calculator with market ranges, tips, and school premium."""
    role = req.target_role.lower()
    if role not in SALARY_RANGES:
        raise HTTPException(400, f"Invalid target_role. Choose from: {', '.join(SALARY_RANGES.keys())}")

    base = SALARY_RANGES[role]
    adjuster = _loc_adjuster(req.location)

    market_range = {k: base[k] for k in ("p25", "p50", "p75")}
    adjusted_range = {k: round(base[k] * adjuster) for k in ("p25", "p50", "p75")}

    # Apply school premium
    premium = _school_premium(req.school_id)
    if premium:
        adjusted_range = {k: round(v * (1 + premium)) for k, v in adjusted_range.items()}

    signing_bonus = base["signing_bonus"]
    salary_increase_pct = round(((adjusted_range["p50"] - req.current_salary) / max(req.current_salary, 1)) * 100, 1)
    total_comp_first_year = adjusted_range["p50"] + signing_bonus

    # Negotiation tips
    tips: list[str] = []
    if req.years_exp >= 7:
        tips.append("With 7+ years of experience, emphasize your leadership track record to negotiate above the median.")
    elif req.years_exp >= 4:
        tips.append("Your experience level is typical for post-MBA roles — use competing offers to push past the median.")
    else:
        tips.append("With less than 4 years of experience, focus on unique skills and internship performance during negotiation.")

    if role == "consulting":
        tips.append("MBB firms have structured pay bands — negotiate on signing bonus and location rather than base salary.")
    elif role == "finance":
        tips.append("In finance, total compensation matters most — negotiate performance bonus guarantees for year one.")
    elif role == "tech":
        tips.append("Tech offers often include equity — make sure to factor RSU vesting schedule into total compensation.")
    else:
        tips.append("Research the specific company's pay bands on Glassdoor and Levels.fyi before your negotiation call.")

    if premium and premium > 0:
        tips.append(f"Your school's brand carries a {int(premium * 100)}% premium — leverage alumni placement data in your negotiation.")
    else:
        tips.append("Always negotiate — 87% of employers expect it, and the worst they can say is the offer stands.")

    return {
        "market_range": market_range,
        "adjusted_range": adjusted_range,
        "signing_bonus": signing_bonus,
        "salary_increase_pct": salary_increase_pct,
        "total_comp_first_year": total_comp_first_year,
        "negotiation_tips": tips,
        "school_premium": premium,
    }


# ── Visa & Work Permit Info ─────────────────────────────────────────────

VISA_INFO: dict = {
    "united states": {
        "student_visa": "F-1",
        "work_permit": "OPT (12 months, 36 months for STEM)",
        "stem_extension": True,
        "spouse_work": "H-4 EAD (with H-1B sponsor)",
        "post_grad_options": ["OPT", "H-1B lottery", "O-1 (extraordinary ability)"],
        "tips": ["STEM-designated programs give 3x longer OPT", "Start H-1B search by fall of 2nd year"],
    },
    "united kingdom": {
        "student_visa": "Student Visa (Tier 4)",
        "work_permit": "Graduate Route (2 years)",
        "stem_extension": False,
        "spouse_work": "Dependant visa allows full-time work",
        "post_grad_options": ["Graduate Route", "Skilled Worker Visa", "Innovator Founder"],
        "tips": ["Graduate Route: 2 years work without sponsorship", "No lottery — employer visas are predictable"],
    },
    "singapore": {
        "student_visa": "Student Pass",
        "work_permit": "Employment Pass (EP)",
        "stem_extension": False,
        "spouse_work": "Dependant Pass (Letter of Consent for work)",
        "post_grad_options": ["Employment Pass", "S Pass", "EntrePass"],
        "tips": ["EP minimum salary rising — check COMPASS framework", "Strong fintech/startup ecosystem"],
    },
    "france": {
        "student_visa": "VLS-TS (long-stay student visa)",
        "work_permit": "APS — 1 year post-graduation",
        "stem_extension": False,
        "spouse_work": "Spouse visa allows work",
        "post_grad_options": ["APS", "Passeport Talent", "Salarié"],
        "tips": ["APS gives 1 year to find work", "EU Blue Card available for high-skill roles"],
    },
    "canada": {
        "student_visa": "Study Permit",
        "work_permit": "PGWP (up to 3 years)",
        "stem_extension": False,
        "spouse_work": "Open Work Permit for spouse",
        "post_grad_options": ["PGWP", "Express Entry PR", "Provincial Nominee"],
        "tips": ["PGWP length matches program length", "Express Entry PR is fastest globally"],
    },
    "india": {
        "student_visa": "Student Visa",
        "work_permit": "Employment Visa (employer-sponsored)",
        "stem_extension": False,
        "spouse_work": "Dependent visa does not allow work",
        "post_grad_options": ["Employment Visa", "Business Visa"],
        "tips": ["No formal post-study work permit", "Strong domestic placement at IIMs"],
    },
    "spain": {
        "student_visa": "Visado de Estudiante",
        "work_permit": "Job search residence permit (1 year)",
        "stem_extension": False,
        "spouse_work": "Family reunification visa allows work",
        "post_grad_options": ["Job Search Permit", "Highly Qualified Professional Visa", "Entrepreneur Visa"],
        "tips": ["1-year job search permit after graduation", "Digital Nomad Visa also available"],
    },
}


@router.get("/visa-info")
def get_visa_info(country: str = "united states"):
    """Get visa and work permit info for a specific country."""
    country_lower = country.lower().strip()
    info = VISA_INFO.get(country_lower)
    if not info:
        for key, val in VISA_INFO.items():
            if country_lower in key or key in country_lower:
                info = val
                country_lower = key
                break
    if not info:
        return {
            "country": country, "available": False,
            "message": f"Visa info not yet available for {country}.",
            "countries_available": list(VISA_INFO.keys()),
        }
    return {"country": country_lower.title(), "available": True, **info}


@router.get("/visa-info/countries")
def get_visa_countries():
    """List countries with visa info."""
    return {"countries": [c.title() for c in VISA_INFO.keys()]}


# ── Fee Waiver Finder ───────────────────────────────────────────────────

FEE_WAIVER_DATA: dict = {
    "hbs": {"waivers": ["Diversity waiver (Consortium members)", "Need-based waiver (request via admissions)"], "consortium": True, "auto_waiver": False},
    "gsb": {"waivers": ["Need-based waiver (online form)", "Diversity/military waiver"], "consortium": False, "auto_waiver": False},
    "wharton": {"waivers": ["Need-based waiver", "Military/AmeriCorps auto-waiver", "Consortium auto-waiver"], "consortium": True, "auto_waiver": True},
    "booth": {"waivers": ["Need-based waiver", "Diversity conference waiver", "Consortium waiver"], "consortium": True, "auto_waiver": False},
    "kellogg": {"waivers": ["Need-based waiver", "Military auto-waiver", "Consortium waiver"], "consortium": True, "auto_waiver": True},
    "cbs": {"waivers": ["Need-based waiver", "Campus visit waiver", "Military waiver"], "consortium": True, "auto_waiver": False},
    "sloan": {"waivers": ["Need-based waiver", "Military/Peace Corps waiver"], "consortium": False, "auto_waiver": True},
    "tuck": {"waivers": ["Need-based waiver", "Diversity conference waiver", "Military waiver"], "consortium": True, "auto_waiver": False},
    "haas": {"waivers": ["Need-based waiver", "Consortium waiver", "Military waiver"], "consortium": True, "auto_waiver": False},
    "ross": {"waivers": ["Need-based waiver", "Consortium waiver", "Military/AmeriCorps waiver"], "consortium": True, "auto_waiver": True},
    "fuqua": {"waivers": ["Need-based waiver", "Consortium waiver", "Campus visit waiver"], "consortium": True, "auto_waiver": False},
    "darden": {"waivers": ["Need-based waiver", "Consortium waiver", "Military waiver"], "consortium": True, "auto_waiver": False},
    "stern": {"waivers": ["Need-based waiver", "Consortium waiver", "Military waiver"], "consortium": True, "auto_waiver": False},
    "yale_som": {"waivers": ["Need-based waiver", "Military waiver", "Nonprofit/public sector waiver"], "consortium": False, "auto_waiver": True},
    "anderson": {"waivers": ["Need-based waiver", "Consortium waiver", "Military waiver"], "consortium": True, "auto_waiver": False},
}


@router.get("/fee-waivers")
def get_fee_waivers(school_ids: str | None = None, is_military: bool = False, is_consortium: bool = False):
    """Find application fee waiver opportunities."""
    ids = [s.strip().lower() for s in school_ids.split(",") if s.strip()] if school_ids else list(FEE_WAIVER_DATA.keys())
    results = []
    for sid in ids:
        waiver = FEE_WAIVER_DATA.get(sid)
        school = SCHOOL_DB.get(sid)
        school_name = school.get("name", sid) if school else sid
        if waiver:
            results.append({
                "school_id": sid, "school_name": school_name,
                "waivers": waiver["waivers"],
                "consortium": waiver["consortium"],
                "auto_waiver": waiver["auto_waiver"],
                "qualifies_military": is_military and any("military" in w.lower() for w in waiver["waivers"]),
                "qualifies_consortium": is_consortium and waiver["consortium"],
            })
        else:
            results.append({
                "school_id": sid, "school_name": school_name,
                "waivers": ["Contact admissions directly"],
                "consortium": False, "auto_waiver": False,
                "qualifies_military": False, "qualifies_consortium": False,
            })
    return {
        "waivers": results, "total_schools": len(results),
        "consortium_eligible": sum(1 for r in results if r["qualifies_consortium"]),
        "military_eligible": sum(1 for r in results if r["qualifies_military"]),
    }


# ── Scholarship Estimator ─────────────────────────────────────────────────────

from routers.schools import SCHOOL_DB as _SCHOL_SCHOOL_DB, SCHOOL_ALIASES as _SCHOL_ALIASES


class ScholarshipRequest(_BaseModel):
    gmat: int = 700
    gpa: float = 3.5
    work_years: int = 4
    school_ids: list[str] = []
    is_urm: bool = False
    is_international: bool = False
    financial_need: bool = False


SCHOLARSHIP_DATA = {
    "hbs": {"avg_award": 40000, "pct_receiving": 50, "merit_based": True, "need_based": True, "full_tuition_pct": 5, "total_tuition": 150000},
    "gsb": {"avg_award": 45000, "pct_receiving": 52, "merit_based": True, "need_based": True, "full_tuition_pct": 7, "total_tuition": 155000},
    "wharton": {"avg_award": 35000, "pct_receiving": 45, "merit_based": True, "need_based": True, "full_tuition_pct": 3, "total_tuition": 148000},
    "booth": {"avg_award": 38000, "pct_receiving": 50, "merit_based": True, "need_based": True, "full_tuition_pct": 5, "total_tuition": 146000},
    "kellogg": {"avg_award": 32000, "pct_receiving": 48, "merit_based": True, "need_based": True, "full_tuition_pct": 4, "total_tuition": 145000},
    "cbs": {"avg_award": 30000, "pct_receiving": 40, "merit_based": True, "need_based": True, "full_tuition_pct": 3, "total_tuition": 152000},
    "sloan": {"avg_award": 35000, "pct_receiving": 42, "merit_based": True, "need_based": True, "full_tuition_pct": 4, "total_tuition": 148000},
    "tuck": {"avg_award": 40000, "pct_receiving": 55, "merit_based": True, "need_based": True, "full_tuition_pct": 6, "total_tuition": 142000},
    "haas": {"avg_award": 28000, "pct_receiving": 45, "merit_based": True, "need_based": True, "full_tuition_pct": 3, "total_tuition": 132000},
    "ross": {"avg_award": 30000, "pct_receiving": 50, "merit_based": True, "need_based": True, "full_tuition_pct": 4, "total_tuition": 138000},
    "fuqua": {"avg_award": 32000, "pct_receiving": 48, "merit_based": True, "need_based": True, "full_tuition_pct": 4, "total_tuition": 140000},
    "darden": {"avg_award": 35000, "pct_receiving": 50, "merit_based": True, "need_based": True, "full_tuition_pct": 5, "total_tuition": 140000},
    "stern": {"avg_award": 28000, "pct_receiving": 38, "merit_based": True, "need_based": True, "full_tuition_pct": 2, "total_tuition": 150000},
    "yale_som": {"avg_award": 30000, "pct_receiving": 50, "merit_based": True, "need_based": True, "full_tuition_pct": 5, "total_tuition": 142000},
    "anderson": {"avg_award": 25000, "pct_receiving": 42, "merit_based": True, "need_based": True, "full_tuition_pct": 3, "total_tuition": 132000},
}

_SCHOL_M7 = ["hbs", "gsb", "wharton", "booth", "kellogg", "cbs", "sloan"]


@router.post("/scholarship-estimate")
def estimate_scholarship(req: ScholarshipRequest):
    """Estimate MBA scholarship probability and award amount based on applicant profile."""
    ids = req.school_ids if req.school_ids else list(_SCHOL_M7)
    # Resolve aliases (SCHOOL_ALIASES values may be lists)
    resolved = []
    for sid in ids:
        alias = _SCHOL_ALIASES.get(sid, sid)
        r = alias[0] if isinstance(alias, list) else alias
        if r not in resolved:
            resolved.append(r)

    results = []
    for sid in resolved:
        sdata = SCHOLARSHIP_DATA.get(sid)
        if not sdata:
            continue
        school = _SCHOL_SCHOOL_DB.get(sid, {})
        school_name = school.get("name", sid)
        school_gmat_avg = school.get("gmat_avg") or 720

        # 1. Base probability
        prob = sdata["pct_receiving"]

        # 2. GMAT boost
        gmat_diff = req.gmat - school_gmat_avg
        if gmat_diff >= 30:
            prob += 10
        elif gmat_diff >= 15:
            prob += 5

        # 3. URM boost
        if req.is_urm:
            prob += 8

        # 4. Financial need boost (only for need-based schools)
        if req.financial_need and sdata["need_based"]:
            prob += 10

        prob = min(prob, 95)

        # 5. Estimated award — multiplier based on profile strength
        strength = 1.0
        if gmat_diff >= 30:
            strength += 0.25
        elif gmat_diff >= 15:
            strength += 0.10
        if req.gpa >= 3.8:
            strength += 0.15
        elif req.gpa >= 3.6:
            strength += 0.05
        if req.work_years >= 6:
            strength += 0.10
        if req.is_urm:
            strength += 0.10
        if req.financial_need and sdata["need_based"]:
            strength += 0.15

        estimated_award = int(sdata["avg_award"] * strength)
        total_tuition = sdata["total_tuition"]
        net_cost = total_tuition - estimated_award

        results.append({
            "school_id": sid,
            "school_name": school_name,
            "estimated_award": estimated_award,
            "probability_pct": prob,
            "total_tuition": total_tuition,
            "net_cost": net_cost,
            "school_data": {
                "avg_award": sdata["avg_award"],
                "pct_receiving": sdata["pct_receiving"],
                "merit_based": sdata["merit_based"],
                "need_based": sdata["need_based"],
                "full_tuition_pct": sdata["full_tuition_pct"],
            },
        })

    results.sort(key=lambda x: x["estimated_award"], reverse=True)
    total_savings = sum(r["estimated_award"] for r in results)
    best = max(results, key=lambda x: x["estimated_award"]) if results else None

    return {
        "estimates": results,
        "total_schools": len(results),
        "total_potential_savings": total_savings,
        "best_opportunity": {
            "school_id": best["school_id"],
            "school_name": best["school_name"],
            "estimated_award": best["estimated_award"],
        } if best else None,
    }


# ── Application Fee Calculator ────────────────────────────────────────


class FeeCalcRequest(_BaseModel):
    school_ids: list[str]


_APPLICATION_FEES: dict[str, int] = {
    "hbs": 250,
    "gsb": 275,
    "wharton": 275,
    "booth": 275,
    "kellogg": 250,
    "cbs": 250,
    "sloan": 250,
    "tuck": 275,
    "haas": 275,
    "ross": 250,
    "fuqua": 250,
    "darden": 250,
    "stern": 275,
    "yale_som": 250,
    "anderson": 275,
    "tepper": 250,
    "johnson": 250,
    "kenan_flagler": 225,
    "marshall": 275,
    "mccombs": 200,
    "kelley": 225,
    "foster": 200,
    "goizueta": 220,
    "georgetown_msb": 225,
    "rice_jones": 200,
    "vanderbilt_owen": 225,
    "olin": 225,
    "fisher": 200,
    "mendoza": 200,
    "scheller": 200,
    "iima": 50,
    "iimb": 50,
    "iimc": 50,
    "isb": 100,
    "lbs": 175,
    "insead": 275,
    "said": 150,
    "judge": 150,
    "hec_paris": 200,
    "iese": 175,
    "esade": 150,
    "ie": 150,
    "rotman": 175,
    "ivey": 150,
}

_GMAT_SCORE_REPORT_FEE = 35

_TRANSCRIPT_FEES: dict[str, int] = {
    "hbs": 25,
    "gsb": 20,
    "wharton": 25,
    "booth": 20,
    "kellogg": 15,
    "cbs": 25,
    "sloan": 20,
    "tuck": 15,
    "haas": 20,
    "ross": 15,
    "fuqua": 15,
    "darden": 15,
    "stern": 25,
    "yale_som": 15,
    "anderson": 20,
}

_WAIVER_PROGRAMS: dict[str, list[str]] = {
    "hbs": ["HBS 2+2 fee waiver", "Need-based waiver (request via AdCom)"],
    "gsb": ["Stanford fee waiver (financial hardship)", "Military/AmeriCorps service waiver"],
    "wharton": ["Wharton application fee waiver (campus visit)", "Military service waiver"],
    "booth": ["Booth merit waiver (info sessions)", "Consortium fee waiver"],
    "kellogg": ["Kellogg campus visit waiver", "Military service waiver", "Consortium fee waiver"],
    "cbs": ["CBS Hermes Society waiver", "Military/Peace Corps waiver", "Consortium fee waiver"],
    "sloan": ["MIT Sloan fee waiver (financial need)", "Military service waiver"],
    "tuck": ["Tuck diversity conference waiver", "Military service waiver"],
    "haas": ["Haas Consortium waiver", "Military service waiver"],
    "ross": ["Ross fee waiver (info session attendance)", "Military service waiver", "Consortium fee waiver"],
    "fuqua": ["Fuqua fee waiver (campus visit)", "Military service waiver"],
    "darden": ["Darden fee waiver (preview weekend)", "Military service waiver", "Consortium fee waiver"],
    "stern": ["Stern campus visit waiver", "Military service waiver"],
    "yale_som": ["SOM need-based waiver", "Military service waiver", "Consortium fee waiver"],
    "anderson": ["Anderson fee waiver (info session)", "Military service waiver"],
    "insead": ["INSEAD need-based waiver"],
    "lbs": ["LBS financial hardship waiver"],
}


@router.post("/fee-calculator")
def fee_calculator(req: FeeCalcRequest):
    """Calculate total application fees across selected schools with per-school breakdown."""
    if not req.school_ids:
        raise HTTPException(status_code=400, detail="At least one school_id is required.")
    if len(req.school_ids) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 schools per request.")

    schools_breakdown: list[dict] = []
    grand_total = 0

    for sid in req.school_ids:
        sid_lower = sid.strip().lower()
        school = SCHOOL_DB.get(sid_lower)
        school_name = school.get("name", sid_lower) if school else sid_lower.upper()

        app_fee = _APPLICATION_FEES.get(sid_lower, 250)  # default $250
        gmat_fee = _GMAT_SCORE_REPORT_FEE
        transcript_fee = _TRANSCRIPT_FEES.get(sid_lower, 15)
        total = app_fee + gmat_fee + transcript_fee

        waivers = _WAIVER_PROGRAMS.get(sid_lower, [])

        schools_breakdown.append({
            "school_id": sid_lower,
            "school_name": school_name,
            "application_fee": app_fee,
            "gmat_score_report_fee": gmat_fee,
            "transcript_fee": transcript_fee,
            "total_per_school": total,
            "potential_waivers": waivers,
        })
        grand_total += total

    return {
        "schools": schools_breakdown,
        "grand_total": grand_total,
        "total_schools": len(schools_breakdown),
    }


# ── MBA Salary Database ───────────────────────────────────────────────────────

_SALARY_INDUSTRIES = [
    "consulting", "finance", "tech", "healthcare",
    "consumer_goods", "energy", "nonprofit",
]

_SALARY_DB: list[dict] = [
    {
        "school_id": "hbs",
        "school_name": "Harvard Business School",
        "median_base_salary": 175000,
        "median_signing_bonus": 30000,
        "median_total_comp": 220000,
        "top_industries": [
            {"industry": "consulting", "pct_of_class": 26, "median_salary": 190000},
            {"industry": "finance", "pct_of_class": 22, "median_salary": 185000},
            {"industry": "tech", "pct_of_class": 20, "median_salary": 195000},
            {"industry": "healthcare", "pct_of_class": 8, "median_salary": 160000},
            {"industry": "consumer_goods", "pct_of_class": 7, "median_salary": 155000},
            {"industry": "energy", "pct_of_class": 5, "median_salary": 165000},
            {"industry": "nonprofit", "pct_of_class": 4, "median_salary": 105000},
        ],
    },
    {
        "school_id": "gsb",
        "school_name": "Stanford GSB",
        "median_base_salary": 180000,
        "median_signing_bonus": 32000,
        "median_total_comp": 228000,
        "top_industries": [
            {"industry": "tech", "pct_of_class": 30, "median_salary": 200000},
            {"industry": "finance", "pct_of_class": 20, "median_salary": 190000},
            {"industry": "consulting", "pct_of_class": 16, "median_salary": 192000},
            {"industry": "healthcare", "pct_of_class": 7, "median_salary": 165000},
            {"industry": "consumer_goods", "pct_of_class": 6, "median_salary": 160000},
            {"industry": "energy", "pct_of_class": 5, "median_salary": 170000},
            {"industry": "nonprofit", "pct_of_class": 8, "median_salary": 110000},
        ],
    },
    {
        "school_id": "wharton",
        "school_name": "Wharton School",
        "median_base_salary": 175000,
        "median_signing_bonus": 30000,
        "median_total_comp": 220000,
        "top_industries": [
            {"industry": "finance", "pct_of_class": 32, "median_salary": 195000},
            {"industry": "consulting", "pct_of_class": 24, "median_salary": 190000},
            {"industry": "tech", "pct_of_class": 18, "median_salary": 188000},
            {"industry": "healthcare", "pct_of_class": 8, "median_salary": 160000},
            {"industry": "consumer_goods", "pct_of_class": 6, "median_salary": 152000},
            {"industry": "energy", "pct_of_class": 4, "median_salary": 162000},
            {"industry": "nonprofit", "pct_of_class": 3, "median_salary": 100000},
        ],
    },
    {
        "school_id": "booth",
        "school_name": "Chicago Booth",
        "median_base_salary": 170000,
        "median_signing_bonus": 28000,
        "median_total_comp": 212000,
        "top_industries": [
            {"industry": "consulting", "pct_of_class": 28, "median_salary": 185000},
            {"industry": "finance", "pct_of_class": 28, "median_salary": 182000},
            {"industry": "tech", "pct_of_class": 16, "median_salary": 180000},
            {"industry": "healthcare", "pct_of_class": 7, "median_salary": 155000},
            {"industry": "consumer_goods", "pct_of_class": 8, "median_salary": 150000},
            {"industry": "energy", "pct_of_class": 5, "median_salary": 160000},
            {"industry": "nonprofit", "pct_of_class": 3, "median_salary": 98000},
        ],
    },
    {
        "school_id": "kellogg",
        "school_name": "Kellogg School of Management",
        "median_base_salary": 168000,
        "median_signing_bonus": 27000,
        "median_total_comp": 210000,
        "top_industries": [
            {"industry": "consulting", "pct_of_class": 30, "median_salary": 185000},
            {"industry": "tech", "pct_of_class": 20, "median_salary": 178000},
            {"industry": "finance", "pct_of_class": 16, "median_salary": 175000},
            {"industry": "consumer_goods", "pct_of_class": 12, "median_salary": 155000},
            {"industry": "healthcare", "pct_of_class": 8, "median_salary": 152000},
            {"industry": "energy", "pct_of_class": 4, "median_salary": 158000},
            {"industry": "nonprofit", "pct_of_class": 4, "median_salary": 95000},
        ],
    },
    {
        "school_id": "sloan",
        "school_name": "MIT Sloan",
        "median_base_salary": 170000,
        "median_signing_bonus": 28000,
        "median_total_comp": 215000,
        "top_industries": [
            {"industry": "tech", "pct_of_class": 28, "median_salary": 190000},
            {"industry": "consulting", "pct_of_class": 24, "median_salary": 188000},
            {"industry": "finance", "pct_of_class": 18, "median_salary": 180000},
            {"industry": "healthcare", "pct_of_class": 8, "median_salary": 155000},
            {"industry": "energy", "pct_of_class": 6, "median_salary": 165000},
            {"industry": "consumer_goods", "pct_of_class": 5, "median_salary": 148000},
            {"industry": "nonprofit", "pct_of_class": 4, "median_salary": 100000},
        ],
    },
    {
        "school_id": "cbs",
        "school_name": "Columbia Business School",
        "median_base_salary": 172000,
        "median_signing_bonus": 30000,
        "median_total_comp": 218000,
        "top_industries": [
            {"industry": "finance", "pct_of_class": 34, "median_salary": 195000},
            {"industry": "consulting", "pct_of_class": 22, "median_salary": 185000},
            {"industry": "tech", "pct_of_class": 16, "median_salary": 182000},
            {"industry": "healthcare", "pct_of_class": 7, "median_salary": 155000},
            {"industry": "consumer_goods", "pct_of_class": 6, "median_salary": 150000},
            {"industry": "energy", "pct_of_class": 4, "median_salary": 160000},
            {"industry": "nonprofit", "pct_of_class": 5, "median_salary": 102000},
        ],
    },
    {
        "school_id": "haas",
        "school_name": "UC Berkeley Haas",
        "median_base_salary": 165000,
        "median_signing_bonus": 25000,
        "median_total_comp": 205000,
        "top_industries": [
            {"industry": "tech", "pct_of_class": 35, "median_salary": 185000},
            {"industry": "consulting", "pct_of_class": 18, "median_salary": 178000},
            {"industry": "finance", "pct_of_class": 14, "median_salary": 172000},
            {"industry": "healthcare", "pct_of_class": 8, "median_salary": 150000},
            {"industry": "energy", "pct_of_class": 7, "median_salary": 160000},
            {"industry": "consumer_goods", "pct_of_class": 6, "median_salary": 148000},
            {"industry": "nonprofit", "pct_of_class": 6, "median_salary": 95000},
        ],
    },
    {
        "school_id": "tuck",
        "school_name": "Dartmouth Tuck",
        "median_base_salary": 167000,
        "median_signing_bonus": 27000,
        "median_total_comp": 208000,
        "top_industries": [
            {"industry": "consulting", "pct_of_class": 32, "median_salary": 185000},
            {"industry": "finance", "pct_of_class": 20, "median_salary": 178000},
            {"industry": "tech", "pct_of_class": 18, "median_salary": 180000},
            {"industry": "healthcare", "pct_of_class": 8, "median_salary": 152000},
            {"industry": "consumer_goods", "pct_of_class": 8, "median_salary": 150000},
            {"industry": "energy", "pct_of_class": 5, "median_salary": 158000},
            {"industry": "nonprofit", "pct_of_class": 4, "median_salary": 96000},
        ],
    },
    {
        "school_id": "darden",
        "school_name": "UVA Darden",
        "median_base_salary": 165000,
        "median_signing_bonus": 25000,
        "median_total_comp": 204000,
        "top_industries": [
            {"industry": "consulting", "pct_of_class": 30, "median_salary": 182000},
            {"industry": "finance", "pct_of_class": 22, "median_salary": 175000},
            {"industry": "tech", "pct_of_class": 16, "median_salary": 176000},
            {"industry": "healthcare", "pct_of_class": 9, "median_salary": 150000},
            {"industry": "consumer_goods", "pct_of_class": 8, "median_salary": 148000},
            {"industry": "energy", "pct_of_class": 6, "median_salary": 155000},
            {"industry": "nonprofit", "pct_of_class": 4, "median_salary": 92000},
        ],
    },
]


@router.get("/salary-database")
def salary_database(school_id: str | None = None, industry: str | None = None):
    """MBA salary database — median comp and industry breakdown for top programs."""
    data = _SALARY_DB

    if school_id:
        sid = school_id.strip().lower()
        data = [s for s in data if s["school_id"] == sid]
        if not data:
            raise HTTPException(status_code=404, detail=f"School '{school_id}' not found in salary database")

    if industry:
        ind = industry.strip().lower()
        if ind not in _SALARY_INDUSTRIES:
            raise HTTPException(status_code=400, detail=f"Invalid industry. Choose from: {', '.join(_SALARY_INDUSTRIES)}")
        filtered = []
        for school in data:
            match = [i for i in school["top_industries"] if i["industry"] == ind]
            if match:
                filtered.append({**school, "_industry_salary": match[0]["median_salary"]})
        filtered.sort(key=lambda x: x["_industry_salary"], reverse=True)
        # Remove internal sort key
        data = [{k: v for k, v in s.items() if k != "_industry_salary"} for s in filtered]

    return {
        "schools": data,
        "total": len(data),
        "industries": _SALARY_INDUSTRIES,
    }
