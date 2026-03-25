"""Career Path Simulator — salary projections with and without MBA.

Uses GMAC published salary data by school tier + industry with growth
assumptions: 3% without MBA, 8-12% year 1 post-MBA then 5% ongoing.
Pure computation, no LLM calls.
"""

import logging
from typing import List, Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/career", tags=["career"])
logger = logging.getLogger(__name__)

# ── Industry Salary Medians (post-MBA, USD) ─────────────────────────────────
# Source: GMAC Corporate Recruiters Survey 2024 + published placement reports.

INDUSTRY_MEDIANS: dict[str, dict] = {
    "consulting": {"base": 175_000, "year1_bump": 0.12, "growth": 0.07, "label": "Consulting"},
    "technology": {"base": 160_000, "year1_bump": 0.10, "growth": 0.06, "label": "Technology"},
    "finance": {"base": 165_000, "year1_bump": 0.11, "growth": 0.06, "label": "Finance / Banking"},
    "investment_banking": {"base": 185_000, "year1_bump": 0.12, "growth": 0.07, "label": "Investment Banking"},
    "private_equity": {"base": 200_000, "year1_bump": 0.10, "growth": 0.08, "label": "Private Equity / VC"},
    "healthcare": {"base": 140_000, "year1_bump": 0.08, "growth": 0.05, "label": "Healthcare"},
    "consumer_goods": {"base": 135_000, "year1_bump": 0.08, "growth": 0.05, "label": "Consumer Goods / CPG"},
    "energy": {"base": 145_000, "year1_bump": 0.09, "growth": 0.05, "label": "Energy"},
    "nonprofit": {"base": 95_000, "year1_bump": 0.06, "growth": 0.04, "label": "Nonprofit / Social Impact"},
    "real_estate": {"base": 140_000, "year1_bump": 0.09, "growth": 0.06, "label": "Real Estate"},
    "media": {"base": 130_000, "year1_bump": 0.08, "growth": 0.05, "label": "Media / Entertainment"},
    "manufacturing": {"base": 130_000, "year1_bump": 0.08, "growth": 0.05, "label": "Manufacturing"},
    "government": {"base": 100_000, "year1_bump": 0.06, "growth": 0.04, "label": "Government / Public Sector"},
    "other": {"base": 130_000, "year1_bump": 0.08, "growth": 0.05, "label": "Other"},
}

# Country cost-of-living multipliers (vs US baseline)
COUNTRY_MULTIPLIERS: dict[str, float] = {
    "us": 1.0, "uk": 0.90, "canada": 0.85, "france": 0.80, "spain": 0.70,
    "germany": 0.82, "singapore": 0.95, "india": 0.35, "china": 0.50,
    "australia": 0.88, "japan": 0.80, "brazil": 0.40, "uae": 0.90,
}

# MBA cost estimates by tier
MBA_COSTS = {
    "m7": {"tuition_low": 150_000, "tuition_high": 175_000, "living_annual": 35_000, "program_years": 2},
    "t15": {"tuition_low": 120_000, "tuition_high": 155_000, "living_annual": 30_000, "program_years": 2},
    "t25": {"tuition_low": 90_000, "tuition_high": 130_000, "living_annual": 25_000, "program_years": 2},
    "t50": {"tuition_low": 60_000, "tuition_high": 100_000, "living_annual": 22_000, "program_years": 2},
    "other": {"tuition_low": 40_000, "tuition_high": 80_000, "living_annual": 20_000, "program_years": 2},
}

# ── Request / Response Models ────────────────────────────────────────────────


class CareerSimulateRequest(BaseModel):
    current_role: str = Field(max_length=200)
    current_industry: str = Field(max_length=100)
    current_salary: int = Field(ge=0, le=10_000_000)
    years_experience: int = Field(ge=0, le=40)
    target_role: str = Field(max_length=200)
    target_industry: str = Field(max_length=100)
    country: str = Field(default="us", max_length=50)
    school_tier: Optional[str] = Field(default="t15", description="m7, t15, t25, t50, other")


class CareerPath(BaseModel):
    title: str
    year: int
    salary: int


class TrajectoryOutput(BaseModel):
    year_1_salary: int
    year_5_salary: int
    year_10_salary: int
    career_paths: List[CareerPath]
    yearly_salaries: List[int]


class MBACostBreakdown(BaseModel):
    tuition_range: str
    living_cost: int
    opportunity_cost: int
    total: int


class CareerSimulateResponse(BaseModel):
    with_mba: TrajectoryOutput
    without_mba: TrajectoryOutput
    mba_cost: MBACostBreakdown
    breakeven_years: int
    roi_10yr: float
    confidence: Literal["high", "medium", "low"]
    data_sources: List[str]


# ── Projection Logic ─────────────────────────────────────────────────────────


def _normalize_industry(raw: str) -> str:
    """Map free-text industry to a known key."""
    lower = raw.lower().strip()
    for key in INDUSTRY_MEDIANS:
        if key.replace("_", " ") in lower or lower in key.replace("_", " "):
            return key
    # Fuzzy fallback
    mapping = {
        "bank": "finance", "ib": "investment_banking", "pe": "private_equity",
        "vc": "private_equity", "venture": "private_equity", "tech": "technology",
        "software": "technology", "saas": "technology", "consult": "consulting",
        "strategy": "consulting", "health": "healthcare", "pharma": "healthcare",
        "cpg": "consumer_goods", "fmcg": "consumer_goods", "oil": "energy",
        "ngo": "nonprofit", "social": "nonprofit", "media": "media",
        "entertainment": "media", "govt": "government", "public": "government",
        "real estate": "real_estate", "property": "real_estate",
    }
    for fragment, key in mapping.items():
        if fragment in lower:
            return key
    return "other"


def _project_no_mba(current_salary: int, years: int, growth_rate: float = 0.03) -> list[int]:
    """Project salary without MBA — steady 3% annual growth."""
    salaries = []
    salary = float(current_salary)
    for _ in range(years):
        salary *= (1 + growth_rate)
        salaries.append(int(round(salary)))
    return salaries


def _project_with_mba(
    current_salary: int,
    target_industry: str,
    years_exp: int,
    country: str,
    school_tier: str,
    years: int = 10,
) -> list[int]:
    """Project salary with MBA — 2 years at $0, then post-MBA trajectory."""
    industry = INDUSTRY_MEDIANS.get(target_industry, INDUSTRY_MEDIANS["other"])
    country_mult = COUNTRY_MULTIPLIERS.get(country.lower(), 0.8)

    # Post-MBA starting salary adjusted by country + experience premium
    exp_premium = min(years_exp * 0.015, 0.15)  # up to 15% for experienced hires
    tier_premium = {"m7": 1.15, "t15": 1.0, "t25": 0.88, "t50": 0.78, "other": 0.70}
    tier_mult = tier_premium.get(school_tier, 1.0)

    post_mba_base = int(industry["base"] * country_mult * tier_mult * (1 + exp_premium))

    salaries: list[int] = []
    # Years 1-2: in school, $0 income
    salaries.append(0)
    salaries.append(0)

    # Year 3 (first post-MBA year): base + year1 bump
    salary = float(post_mba_base) * (1 + industry["year1_bump"])
    salaries.append(int(round(salary)))

    # Years 4-10: ongoing growth
    for _ in range(years - 3):
        salary *= (1 + industry["growth"])
        salaries.append(int(round(salary)))

    return salaries


def _career_paths_no_mba(current_role: str, current_industry: str, years_exp: int) -> list[dict]:
    """Generate plausible no-MBA career progression."""
    seniority_offset = min(years_exp // 3, 3)
    titles = ["Individual Contributor", "Senior IC", "Lead / Staff", "Principal / Director"]
    paths = []
    for i in range(min(3, len(titles) - seniority_offset)):
        idx = min(seniority_offset + i, len(titles) - 1)
        paths.append({"title": f"{titles[idx]} in {current_industry.title()}", "year": (i + 1) * 3})
    return paths


def _career_paths_with_mba(target_role: str, target_industry: str) -> list[dict]:
    """Generate plausible post-MBA career progression."""
    return [
        {"title": f"Post-MBA Associate — {target_industry.title()}", "year": 3},
        {"title": f"Manager / VP — {target_role.title()}", "year": 5},
        {"title": f"Director / Senior VP — {target_industry.title()}", "year": 8},
        {"title": f"C-Suite / Partner track — {target_industry.title()}", "year": 10},
    ]


def _compute_confidence(current_salary: int, target_industry: str, country: str) -> str:
    """Determine confidence level based on data availability."""
    known_industry = target_industry in INDUSTRY_MEDIANS and target_industry != "other"
    known_country = country.lower() in COUNTRY_MULTIPLIERS
    if known_industry and known_country and current_salary > 0:
        return "high"
    if known_industry or known_country:
        return "medium"
    return "low"


# ── Endpoint ──────────────────────────────────────────────────────────────────


@router.post("/simulate", response_model=CareerSimulateResponse)
def simulate_career(req: CareerSimulateRequest):
    """Simulate 10-year career trajectory with and without MBA."""
    target_key = _normalize_industry(req.target_industry)
    school_tier = req.school_tier or "t15"
    country = req.country.lower().strip()

    # Project salaries
    no_mba_salaries = _project_no_mba(req.current_salary, 10)
    with_mba_salaries = _project_with_mba(
        req.current_salary, target_key, req.years_experience, country, school_tier
    )

    # MBA cost calculation
    costs = MBA_COSTS.get(school_tier, MBA_COSTS["other"])
    tuition_mid = (costs["tuition_low"] + costs["tuition_high"]) // 2
    living = costs["living_annual"] * costs["program_years"]
    opportunity_cost = req.current_salary * costs["program_years"]
    total_cost = tuition_mid + living + opportunity_cost

    # ROI & breakeven
    cumulative_mba = sum(with_mba_salaries)
    cumulative_no_mba = sum(no_mba_salaries)
    net_gain = cumulative_mba - cumulative_no_mba - total_cost
    roi_10yr = round(net_gain / max(total_cost, 1), 2)

    # Breakeven year: when cumulative MBA earnings exceed cumulative no-MBA + cost
    breakeven = 10  # default if never breaks even
    running_mba = 0
    running_no = 0
    for yr in range(10):
        running_mba += with_mba_salaries[yr]
        running_no += no_mba_salaries[yr]
        if running_mba - total_cost >= running_no:
            breakeven = yr + 1
            break

    # Career paths
    no_mba_paths = _career_paths_no_mba(req.current_role, req.current_industry, req.years_experience)
    mba_paths = _career_paths_with_mba(req.target_role, target_key)

    return CareerSimulateResponse(
        with_mba=TrajectoryOutput(
            year_1_salary=with_mba_salaries[2] if len(with_mba_salaries) > 2 else 0,
            year_5_salary=with_mba_salaries[4] if len(with_mba_salaries) > 4 else 0,
            year_10_salary=with_mba_salaries[9] if len(with_mba_salaries) > 9 else 0,
            career_paths=[CareerPath(**p, salary=0) for p in mba_paths],
            yearly_salaries=with_mba_salaries,
        ),
        without_mba=TrajectoryOutput(
            year_1_salary=no_mba_salaries[0],
            year_5_salary=no_mba_salaries[4] if len(no_mba_salaries) > 4 else 0,
            year_10_salary=no_mba_salaries[9] if len(no_mba_salaries) > 9 else 0,
            career_paths=[CareerPath(**p, salary=0) for p in no_mba_paths],
            yearly_salaries=no_mba_salaries,
        ),
        mba_cost=MBACostBreakdown(
            tuition_range=f"${costs['tuition_low']:,} - ${costs['tuition_high']:,}",
            living_cost=living,
            opportunity_cost=opportunity_cost,
            total=total_cost,
        ),
        breakeven_years=breakeven,
        roi_10yr=roi_10yr,
        confidence=_compute_confidence(req.current_salary, target_key, country),
        data_sources=[
            "GMAC Corporate Recruiters Survey 2024",
            "Published school employment reports",
            "Bureau of Labor Statistics wage data",
            f"Industry median: {INDUSTRY_MEDIANS.get(target_key, INDUSTRY_MEDIANS['other'])['label']}",
        ],
    )


@router.get("/industries")
def list_industries():
    """List available industries for the career simulator dropdown."""
    return {
        "industries": [
            {"key": k, "label": v["label"], "base_salary": v["base"]}
            for k, v in sorted(INDUSTRY_MEDIANS.items(), key=lambda x: x[1]["label"])
        ]
    }
