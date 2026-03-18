"""Profile & career endpoints — application strength, GMAT predictor, career paths, etc."""

import random
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel as _BaseModel
from agents import SCHOOL_DB
from models import AppStrengthRequest

router = APIRouter(prefix="/api", tags=["profile"])


# ── GMAT ↔ GRE Score Conversion ────────────────────────────────────────


@router.get("/score-convert")
def convert_test_score(
    score: int,
    from_test: str = "gmat",  # gmat | gre
):
    """Convert between GMAT and GRE scores using official concordance table."""
    # Official ETS/GMAC concordance (approximate)
    GMAT_TO_GRE = {
        800: 340, 790: 340, 780: 339, 770: 338, 760: 337,
        750: 336, 740: 335, 730: 333, 720: 332, 710: 330,
        700: 329, 690: 327, 680: 326, 670: 324, 660: 323,
        650: 321, 640: 319, 630: 318, 620: 316, 610: 314,
        600: 312, 590: 311, 580: 309, 570: 307, 560: 305,
        550: 303, 540: 301, 530: 299, 520: 297, 510: 295,
        500: 293, 490: 291, 480: 289, 470: 287, 460: 285,
        450: 283, 440: 281, 430: 279, 420: 277, 410: 275,
        400: 273,
    }
    GRE_TO_GMAT = {v: k for k, v in GMAT_TO_GRE.items()}

    if from_test == "gmat":
        if score < 200 or score > 800:
            raise HTTPException(400, "GMAT score must be 200-800")
        # Round to nearest 10
        rounded = round(score / 10) * 10
        gre_equiv = GMAT_TO_GRE.get(rounded)
        if not gre_equiv:
            # Interpolate
            keys = sorted(GMAT_TO_GRE.keys())
            for i in range(len(keys) - 1):
                if keys[i] <= rounded <= keys[i + 1]:
                    ratio = (rounded - keys[i]) / (keys[i + 1] - keys[i])
                    gre_equiv = int(GMAT_TO_GRE[keys[i]] + ratio * (GMAT_TO_GRE[keys[i + 1]] - GMAT_TO_GRE[keys[i]]))
                    break
            if not gre_equiv:
                gre_equiv = 260
        return {
            "input_test": "gmat",
            "input_score": score,
            "converted_test": "gre",
            "converted_score": gre_equiv,
            "percentile_estimate": _score_convert_gmat_percentile(score),
            "note": "Based on official ETS/GMAC concordance table",
        }
    elif from_test == "gre":
        if score < 260 or score > 340:
            raise HTTPException(400, "GRE score must be 260-340")
        # Find closest match
        closest_gre = min(GRE_TO_GMAT.keys(), key=lambda x: abs(x - score))
        gmat_equiv = GRE_TO_GMAT[closest_gre]
        return {
            "input_test": "gre",
            "input_score": score,
            "converted_test": "gmat",
            "converted_score": gmat_equiv,
            "percentile_estimate": _score_convert_gmat_percentile(gmat_equiv),
            "note": "Based on official ETS/GMAC concordance table",
        }
    else:
        raise HTTPException(400, "from_test must be 'gmat' or 'gre'")


def _score_convert_gmat_percentile(score: int) -> int:
    """Rough GMAT percentile estimate."""
    if score >= 760: return 99
    if score >= 740: return 97
    if score >= 720: return 94
    if score >= 700: return 89
    if score >= 680: return 82
    if score >= 660: return 76
    if score >= 640: return 68
    if score >= 620: return 60
    if score >= 600: return 51
    if score >= 580: return 43
    if score >= 560: return 36
    if score >= 540: return 28
    if score >= 520: return 22
    if score >= 500: return 16
    return max(1, (score - 200) * 15 // 300)


# ── Application Strength Meter ────────────────────────────────────────


def _score_academics(gmat: int | None, gpa: float | None) -> tuple[int, list[str]]:
    """Score academic dimension 0-100 with tips."""
    tips: list[str] = []
    scores: list[int] = []

    if gmat is not None:
        if gmat >= 750:
            scores.append(95)
        elif gmat >= 700:
            scores.append(90)
        elif gmat >= 650:
            scores.append(70)
        elif gmat >= 600:
            scores.append(55)
        else:
            scores.append(35)
        if gmat < 700:
            tips.append("A GMAT above 700 significantly strengthens your academic profile.")
        if gmat < 650:
            tips.append("Consider retaking the GMAT or switching to the GRE if it better suits your strengths.")
    else:
        tips.append("Add your GMAT score for a more accurate academic assessment.")

    if gpa is not None:
        if gpa >= 3.8:
            scores.append(95)
        elif gpa >= 3.7:
            scores.append(90)
        elif gpa >= 3.5:
            scores.append(75)
        elif gpa >= 3.2:
            scores.append(60)
        else:
            scores.append(40)
        if gpa < 3.5:
            tips.append("Highlight quantitative coursework or certifications to offset a lower GPA.")
    else:
        tips.append("Add your GPA for a more accurate academic assessment.")

    return (round(sum(scores) / len(scores)) if scores else 50, tips)


def _score_professional(work_years: int | None) -> tuple[int, list[str]]:
    tips: list[str] = []
    if work_years is None:
        return (50, ["Add your work experience for a better assessment."])
    if 3 <= work_years <= 5:
        score = 90
    elif 2 <= work_years < 3:
        score = 70
        tips.append("One more year of experience would put you in the sweet spot for most programs.")
    elif 5 < work_years <= 7:
        score = 80
        tips.append("Emphasize leadership progression and strategic impact in your application.")
    elif work_years < 2:
        score = 50
        tips.append("Most top programs prefer 3-5 years of experience. Consider deferring or targeting early-career programs.")
    else:
        score = 50
        tips.append("With 7+ years, highlight why an MBA now. Consider executive MBA programs as an alternative.")
    return (score, tips)


def _score_leadership(examples: int) -> tuple[int, list[str]]:
    tips: list[str] = []
    score = min(examples * 25, 100)
    if examples == 0:
        tips.append("Leadership is critical — document any team lead, project ownership, or mentoring experiences.")
    elif examples < 3:
        tips.append("Seek additional leadership opportunities (volunteer roles, side projects, ERGs).")
    return (score, tips)


def _score_extracurriculars(count: int) -> tuple[int, list[str]]:
    tips: list[str] = []
    score = min(count * 20, 100)
    if count == 0:
        tips.append("Extracurriculars show passion beyond work — start a community initiative or join a board.")
    elif count < 3:
        tips.append("Depth matters more than breadth — show sustained commitment to your activities.")
    return (score, tips)


def _score_diversity(international_exp: bool) -> tuple[int, list[str]]:
    tips: list[str] = []
    score = 40
    if international_exp:
        score += 30
    else:
        tips.append("International experience (work, study, or volunteering abroad) strengthens your diversity profile.")
    if score < 70:
        tips.append("Highlight any cross-cultural experiences, multilingual skills, or global projects.")
    return (score, tips)


@router.post("/application-strength", deprecated=True)
def application_strength(req: AppStrengthRequest):
    """Score an MBA applicant's profile across 5 dimensions and return actionable tips.

    DEPRECATED: Prefer /api/profile/analyze which has 6 dimensions (adds pedigree)
    and richer scoring. This endpoint is kept for backwards compatibility.
    """
    acad_score, acad_tips = _score_academics(req.gmat, req.gpa)
    prof_score, prof_tips = _score_professional(req.work_years)
    lead_score, lead_tips = _score_leadership(req.leadership_examples or 0)
    extra_score, extra_tips = _score_extracurriculars(req.extracurriculars or 0)
    div_score, div_tips = _score_diversity(req.international_exp)

    dimensions = [
        {"name": "Academics", "score": acad_score, "max": 100, "tips": acad_tips},
        {"name": "Professional", "score": prof_score, "max": 100, "tips": prof_tips},
        {"name": "Leadership", "score": lead_score, "max": 100, "tips": lead_tips},
        {"name": "Extracurriculars", "score": extra_score, "max": 100, "tips": extra_tips},
        {"name": "Diversity", "score": div_score, "max": 100, "tips": div_tips},
    ]

    overall = round(
        acad_score * 0.30
        + prof_score * 0.25
        + lead_score * 0.20
        + extra_score * 0.15
        + div_score * 0.10
    )

    if overall >= 80:
        label = "Very Strong"
    elif overall >= 65:
        label = "Strong"
    elif overall >= 50:
        label = "Moderate"
    else:
        label = "Needs Work"

    result: dict = {
        "dimensions": dimensions,
        "overall_score": overall,
        "overall_label": label,
    }

    # School comparison
    if req.target_school_id:
        school = SCHOOL_DB.get(req.target_school_id)
        if school:
            school_gmat = school.get("gmat_avg")
            school_gpa = None
            # Try to extract GPA from class profile
            class_profile = school.get("class_profile", {})
            if isinstance(class_profile, dict):
                school_gpa = class_profile.get("avg_gpa") or class_profile.get("median_gpa")

            comparison: dict = {
                "school_id": req.target_school_id,
                "school_name": school.get("name", req.target_school_id),
            }

            if school_gmat and req.gmat is not None:
                diff = req.gmat - school_gmat
                comparison["gmat_avg"] = school_gmat
                comparison["gmat_diff"] = diff
                comparison["gmat_assessment"] = (
                    "Above average" if diff > 20
                    else "At average" if diff >= -10
                    else "Below average"
                )

            if school_gpa and req.gpa is not None:
                try:
                    sgpa = float(school_gpa)
                    diff = round(req.gpa - sgpa, 2)
                    comparison["gpa_avg"] = sgpa
                    comparison["gpa_diff"] = diff
                    comparison["gpa_assessment"] = (
                        "Above average" if diff > 0.1
                        else "At average" if diff >= -0.1
                        else "Below average"
                    )
                except (ValueError, TypeError):
                    pass

            result["school_comparison"] = comparison

    return result


# ── Resume Keywords Optimizer ───────────────────────────────────────────

MBA_KEYWORDS: dict[str, list[str]] = {
    "Leadership": ["led", "managed", "directed", "oversaw", "spearheaded", "headed", "supervised", "mentored", "coordinated", "orchestrated"],
    "Impact": ["increased", "decreased", "improved", "generated", "achieved", "delivered", "grew", "reduced", "saved", "accelerated"],
    "Quantitative": ["analyzed", "modeled", "forecasted", "calculated", "measured", "quantified", "optimized", "benchmarked"],
    "Strategy": ["developed", "designed", "launched", "implemented", "created", "built", "established", "initiated", "pioneered"],
    "Collaboration": ["collaborated", "partnered", "cross-functional", "stakeholder", "team", "aligned", "negotiated", "influenced"],
    "Innovation": ["innovated", "transformed", "disrupted", "automated", "streamlined", "redesigned", "modernized", "digitized"],
}

WEAK_VERBS = ["helped", "assisted", "worked on", "was responsible for", "participated in", "was involved in", "handled", "dealt with"]
POWER_VERBS_LIST = ["spearheaded", "orchestrated", "transformed", "generated", "accelerated", "pioneered", "architected", "catalyzed"]


class ResumeKeywordsRequest(_BaseModel):
    resume_text: str
    target_role: str = "general"


@router.post("/resume/keywords")
def analyze_resume_keywords(req: ResumeKeywordsRequest):
    """Analyze resume for MBA-relevant keywords and suggest improvements."""
    import re
    text_lower = req.resume_text.lower()
    words = req.resume_text.split()
    word_count = len(words)

    category_scores: dict[str, dict] = {}
    for category, keywords in MBA_KEYWORDS.items():
        found = [kw for kw in keywords if kw in text_lower]
        missing = [kw for kw in keywords if kw not in text_lower]
        score = min(100, len(found) * 20)
        category_scores[category] = {"score": score, "found": found, "suggested": missing[:3]}

    weak_verbs_found = [v for v in WEAK_VERBS if v in text_lower]
    metrics = re.findall(r'\d+[%$KMB]|\$[\d,.]+|\d+\+', req.resume_text)
    metrics_count = len(metrics)
    overall_score = round(sum(c["score"] for c in category_scores.values()) / len(category_scores))

    tips: list[str] = []
    if weak_verbs_found:
        tips.append(f"Replace weak verbs ({', '.join(weak_verbs_found[:3])}) with power verbs.")
    if metrics_count < 3:
        tips.append("Add more quantifiable achievements — aim for one metric per bullet.")
    low = [c for c, v in category_scores.items() if v["score"] < 40]
    if low:
        tips.append(f"Strengthen these themes: {', '.join(low)}.")
    if overall_score >= 70:
        tips.append("Strong keyword density! Focus on clear impact stories.")

    return {
        "overall_score": overall_score, "word_count": word_count,
        "metrics_count": metrics_count, "categories": category_scores,
        "weak_verbs_found": weak_verbs_found,
        "power_verb_suggestions": POWER_VERBS_LIST[:5], "tips": tips,
    }


# ── Peer Comparison ──────────────────────────────────────────────────────────


class PeerCompareRequest(_BaseModel):
    gmat: int = 700
    gpa: float = 3.5
    work_years: int = 4
    industry: str = "technology"


@router.post("/peer-compare")
def peer_compare(req: PeerCompareRequest):
    """Compare your profile against the full school database — percentile rankings."""

    gmat_avgs: list[int] = []
    gpa_avgs: list[float] = []

    for school in SCHOOL_DB.values():
        g = school.get("gmat_avg")
        if isinstance(g, (int, float)) and 400 <= g <= 800:
            gmat_avgs.append(int(g))

        cp = school.get("class_profile") or {}
        gpa = cp.get("avg_gpa")
        if isinstance(gpa, (int, float)) and 0 < gpa <= 4.0:
            gpa_avgs.append(float(gpa))

    total_schools = len(SCHOOL_DB)

    # GMAT percentile — % of schools whose avg GMAT the user exceeds
    if gmat_avgs:
        schools_below_gmat = sum(1 for g in gmat_avgs if req.gmat >= g)
        schools_above_gmat = len(gmat_avgs) - schools_below_gmat
        gmat_percentile = round(schools_below_gmat / len(gmat_avgs) * 100)
    else:
        schools_below_gmat = 0
        schools_above_gmat = 0
        gmat_percentile = 50

    # GPA percentile
    if gpa_avgs:
        below_gpa = sum(1 for g in gpa_avgs if req.gpa >= g)
        gpa_percentile = round(below_gpa / len(gpa_avgs) * 100)
    else:
        gpa_percentile = 50

    # Work experience percentile — typical MBA range 3-7 years
    work_min, work_max = 3, 7
    if req.work_years <= work_min:
        work_exp_percentile = max(10, round((req.work_years / work_min) * 30))
    elif req.work_years >= work_max:
        work_exp_percentile = min(95, 70 + round((req.work_years - work_max) * 5))
    else:
        work_exp_percentile = 30 + round((req.work_years - work_min) / (work_max - work_min) * 40)

    # Build strengths / areas to improve
    strengths: list[str] = []
    areas_to_improve: list[str] = []

    if gmat_percentile >= 70:
        strengths.append("Strong GMAT — above average at most T25 schools")
    elif gmat_percentile < 40:
        areas_to_improve.append("GMAT is below median — consider retaking or emphasizing GRE")

    if gpa_percentile >= 70:
        strengths.append("High GPA — competitive across most programs")
    elif gpa_percentile < 40:
        areas_to_improve.append("GPA is below average for M7 — highlight work experience instead")

    if 3 <= req.work_years <= 7:
        strengths.append(f"{req.work_years} years of experience is in the sweet spot for MBA programs")
    elif req.work_years < 3:
        areas_to_improve.append("Less than 3 years of experience — target deferred-enrollment or early-career programs")
    else:
        areas_to_improve.append("Senior profile — emphasize why MBA now and target EMBA-friendly programs")

    if req.industry.lower() in {"technology", "consulting", "finance", "investment banking"}:
        strengths.append(f"{req.industry} is a well-represented industry at top MBA programs")
    elif req.industry.lower() in {"non-profit", "military", "government", "education"}:
        strengths.append(f"{req.industry} background adds diversity — highlight unique perspective")

    # Summary
    peer_summary = f"Your GMAT places you above the average at {gmat_percentile}% of programs."
    if gpa_percentile >= 60:
        peer_summary += f" Your GPA is competitive at most schools."
    else:
        peer_summary += f" Your GPA may need offsetting strengths at more selective programs."

    return {
        "gmat_percentile": gmat_percentile,
        "gpa_percentile": gpa_percentile,
        "work_exp_percentile": work_exp_percentile,
        "schools_above_gmat": schools_above_gmat,
        "schools_below_gmat": schools_below_gmat,
        "total_schools": total_schools,
        "peer_summary": peer_summary,
        "strengths": strengths,
        "areas_to_improve": areas_to_improve,
    }


# ── Career Paths Explorer ─────────────────────────────────────────────────

_CAREER_DATA = {
    "consulting": {
        "industry": "consulting",
        "display_name": "Consulting",
        "roles": [
            {"title": "Associate Consultant", "avg_salary": 105000, "yoe_required": 0, "description": "Entry-level post-MBA role focused on client engagement and analysis.", "top_recruiters": ["McKinsey", "BCG", "Bain", "Deloitte", "Accenture"]},
            {"title": "Engagement Manager", "avg_salary": 175000, "yoe_required": 3, "description": "Leads project workstreams and manages junior consultants.", "top_recruiters": ["McKinsey", "BCG", "Bain", "Oliver Wyman"]},
            {"title": "Principal / Associate Partner", "avg_salary": 300000, "yoe_required": 7, "description": "Owns client relationships and drives firm revenue.", "top_recruiters": ["McKinsey", "BCG", "Bain", "Kearney"]},
        ],
        "mba_advantage": "MBA is the primary feeder for top consulting firms. Case-method training, structured problem-solving, and peer networks are directly transferable to consulting engagements.",
        "top_schools": ["hbs", "gsb", "wharton", "booth", "kellogg", "cbs", "tuck"],
        "growth_outlook": "stable",
    },
    "finance": {
        "industry": "finance",
        "display_name": "Finance",
        "roles": [
            {"title": "Investment Banking Associate", "avg_salary": 150000, "yoe_required": 0, "description": "Post-MBA IB role focused on deal execution, modeling, and client pitches.", "top_recruiters": ["Goldman Sachs", "Morgan Stanley", "JP Morgan", "Evercore", "Lazard"]},
            {"title": "Private Equity Associate", "avg_salary": 180000, "yoe_required": 2, "description": "Evaluate and execute leveraged buyout transactions.", "top_recruiters": ["KKR", "Blackstone", "Apollo", "Carlyle", "Warburg Pincus"]},
            {"title": "Hedge Fund Analyst", "avg_salary": 200000, "yoe_required": 2, "description": "Research-driven role managing portfolio positions.", "top_recruiters": ["Citadel", "Point72", "Bridgewater", "Two Sigma", "DE Shaw"]},
            {"title": "VP / Director", "avg_salary": 350000, "yoe_required": 6, "description": "Senior deal leadership and client relationship management.", "top_recruiters": ["Goldman Sachs", "Morgan Stanley", "JP Morgan"]},
        ],
        "mba_advantage": "MBA unlocks associate-level entry at bulge-bracket banks and provides the network essential for PE/HF recruiting. Finance-focused curricula and alumni connections are unmatched.",
        "top_schools": ["wharton", "cbs", "booth", "stern", "hbs", "gsb"],
        "growth_outlook": "moderate",
    },
    "tech": {
        "industry": "tech",
        "display_name": "Technology",
        "roles": [
            {"title": "Product Manager", "avg_salary": 160000, "yoe_required": 0, "description": "Own product strategy, roadmap, and cross-functional execution.", "top_recruiters": ["Google", "Amazon", "Meta", "Apple", "Microsoft"]},
            {"title": "Strategy & Operations Manager", "avg_salary": 155000, "yoe_required": 0, "description": "Drive internal strategy and operational improvements.", "top_recruiters": ["Google", "Uber", "Airbnb", "Stripe", "DoorDash"]},
            {"title": "Senior PM / Group PM", "avg_salary": 250000, "yoe_required": 4, "description": "Lead product teams and define multi-year product vision.", "top_recruiters": ["Google", "Amazon", "Meta", "Netflix"]},
            {"title": "VP of Product", "avg_salary": 400000, "yoe_required": 8, "description": "Executive leadership of product organization.", "top_recruiters": ["Google", "Amazon", "Microsoft", "Salesforce"]},
        ],
        "mba_advantage": "MBA provides structured frameworks for product thinking, go-to-market strategy, and leadership. Top tech firms actively recruit from M7/T15 programs for PM and strategy roles.",
        "top_schools": ["gsb", "hbs", "haas", "sloan", "kellogg", "booth", "anderson"],
        "growth_outlook": "high",
    },
    "healthcare": {
        "industry": "healthcare",
        "display_name": "Healthcare & Life Sciences",
        "roles": [
            {"title": "Healthcare Consultant", "avg_salary": 120000, "yoe_required": 0, "description": "Advise hospitals, payers, and pharma on strategy and operations.", "top_recruiters": ["McKinsey", "BCG", "Huron", "ZS Associates"]},
            {"title": "Pharma Brand Manager", "avg_salary": 140000, "yoe_required": 1, "description": "Lead product marketing for pharmaceutical brands.", "top_recruiters": ["Johnson & Johnson", "Pfizer", "Abbott", "Merck"]},
            {"title": "Director of Strategy", "avg_salary": 220000, "yoe_required": 5, "description": "Shape corporate strategy for healthcare organizations.", "top_recruiters": ["UnitedHealth", "CVS Health", "Mayo Clinic"]},
        ],
        "mba_advantage": "Healthcare is the largest sector in the US economy. MBA graduates bring business acumen to a field dominated by clinical expertise, creating unique value at the intersection of strategy and patient outcomes.",
        "top_schools": ["wharton", "hbs", "kellogg", "fuqua", "ross", "darden"],
        "growth_outlook": "high",
    },
    "energy": {
        "industry": "energy",
        "display_name": "Energy & Sustainability",
        "roles": [
            {"title": "Energy Consultant", "avg_salary": 115000, "yoe_required": 0, "description": "Advise utilities and energy companies on strategy and transition planning.", "top_recruiters": ["McKinsey", "BCG", "Bain", "Wood Mackenzie"]},
            {"title": "Renewables Project Manager", "avg_salary": 130000, "yoe_required": 2, "description": "Manage solar, wind, or storage project development.", "top_recruiters": ["NextEra", "Enphase", "First Solar", "Tesla Energy"]},
            {"title": "VP of Strategy", "avg_salary": 250000, "yoe_required": 7, "description": "Lead corporate strategy for energy transition.", "top_recruiters": ["BP", "Shell", "TotalEnergies", "Brookfield"]},
        ],
        "mba_advantage": "The energy transition is creating massive demand for business leaders who understand both technology and finance. MBA graduates bridge the gap between engineering teams and investors.",
        "top_schools": ["gsb", "hbs", "yale_som", "erb_institute", "fuqua", "sloan"],
        "growth_outlook": "high",
    },
    "nonprofit": {
        "industry": "nonprofit",
        "display_name": "Nonprofit & Social Impact",
        "roles": [
            {"title": "Program Manager", "avg_salary": 80000, "yoe_required": 0, "description": "Design and execute social impact programs.", "top_recruiters": ["Gates Foundation", "Teach For America", "USAID", "World Bank"]},
            {"title": "Director of Operations", "avg_salary": 110000, "yoe_required": 3, "description": "Oversee organizational operations and efficiency.", "top_recruiters": ["Red Cross", "United Way", "Habitat for Humanity"]},
            {"title": "Executive Director", "avg_salary": 160000, "yoe_required": 8, "description": "Lead nonprofit organizations and drive fundraising strategy.", "top_recruiters": ["Large foundations", "NGOs", "Social enterprises"]},
        ],
        "mba_advantage": "MBA provides operational and financial skills that nonprofits desperately need. Schools with strong social enterprise centers offer dedicated recruiting pipelines and loan forgiveness programs.",
        "top_schools": ["yale_som", "hbs", "gsb", "haas", "fuqua", "ross"],
        "growth_outlook": "moderate",
    },
    "entrepreneurship": {
        "industry": "entrepreneurship",
        "display_name": "Entrepreneurship",
        "roles": [
            {"title": "Founder / CEO", "avg_salary": 0, "yoe_required": 0, "description": "Launch and lead a startup. Salary varies widely by funding stage.", "top_recruiters": ["Self-funded", "Y Combinator", "Techstars", "a16z"]},
            {"title": "Venture Capital Associate", "avg_salary": 150000, "yoe_required": 2, "description": "Source deals, perform due diligence, and support portfolio companies.", "top_recruiters": ["Sequoia", "a16z", "Accel", "Bessemer"]},
            {"title": "Chief of Staff (Startup)", "avg_salary": 130000, "yoe_required": 1, "description": "Right hand to the CEO, driving cross-functional initiatives.", "top_recruiters": ["Series A-C startups"]},
        ],
        "mba_advantage": "MBA provides a co-founder network, structured frameworks for building businesses, access to startup competitions and funding, and a safety net of recruiting options if the venture fails.",
        "top_schools": ["gsb", "hbs", "sloan", "haas", "booth", "kellogg"],
        "growth_outlook": "high",
    },
    "real_estate": {
        "industry": "real_estate",
        "display_name": "Real Estate",
        "roles": [
            {"title": "Acquisitions Analyst", "avg_salary": 120000, "yoe_required": 0, "description": "Underwrite and evaluate commercial real estate deals.", "top_recruiters": ["Brookfield", "Blackstone Real Estate", "Starwood", "Hines"]},
            {"title": "Development Manager", "avg_salary": 145000, "yoe_required": 3, "description": "Manage ground-up construction and renovation projects.", "top_recruiters": ["Related Companies", "Tishman Speyer", "Greystar"]},
            {"title": "Portfolio Manager", "avg_salary": 220000, "yoe_required": 6, "description": "Oversee a portfolio of properties and optimize returns.", "top_recruiters": ["CBRE Investment", "Prologis", "Vornado"]},
        ],
        "mba_advantage": "Real estate combines finance, negotiation, and operations. MBA programs with dedicated real estate centers offer unmatched access to deal flow, alumni networks, and REIT recruiting.",
        "top_schools": ["wharton", "cbs", "stern", "hbs", "ross", "wisconsin"],
        "growth_outlook": "moderate",
    },
}


@router.get("/career-paths")
def get_career_paths(industry: str | None = None):
    """Post-MBA career paths explorer with roles, salaries, and top schools by industry."""
    if industry:
        key = industry.strip().lower()
        if key not in _CAREER_DATA:
            raise HTTPException(status_code=404, detail=f"Unknown industry: {industry}. Valid: {', '.join(_CAREER_DATA.keys())}")
        return _CAREER_DATA[key]

    # Return summary for all industries
    summaries = []
    for key, data in _CAREER_DATA.items():
        summaries.append({
            "industry": data["industry"],
            "display_name": data["display_name"],
            "role_count": len(data["roles"]),
            "top_schools": data["top_schools"][:3],
            "growth_outlook": data["growth_outlook"],
            "mba_advantage": data["mba_advantage"],
        })
    return {"industries": summaries, "total": len(summaries)}


# ── Application Checklist Generator ───────────────────────────────────────

class ChecklistGeneratorRequest(_BaseModel):
    school_ids: list[str]
    round: str = "R1"


_ROUND_DEADLINES: dict[str, dict[str, str]] = {
    "hbs": {"R1": "Sep 4, 2025", "R2": "Jan 6, 2026", "2+2": "Apr 15, 2025"},
    "gsb": {"R1": "Sep 10, 2025", "R2": "Jan 8, 2026", "R3": "Apr 8, 2026"},
    "wharton": {"R1": "Sep 3, 2025", "R2": "Jan 5, 2026", "R3": "Mar 25, 2026"},
    "booth": {"R1": "Sep 12, 2025", "R2": "Jan 7, 2026", "R3": "Apr 2, 2026"},
    "kellogg": {"R1": "Sep 10, 2025", "R2": "Jan 8, 2026", "R3": "Apr 1, 2026"},
    "cbs": {"R1": "Sep 4, 2025", "ED": "Jan 6, 2026"},
    "sloan": {"R1": "Sep 17, 2025", "R2": "Jan 14, 2026", "R3": "Apr 8, 2026"},
    "tuck": {"R1": "Sep 8, 2025", "R2": "Jan 6, 2026", "R3": "Mar 31, 2026"},
    "haas": {"R1": "Sep 11, 2025", "R2": "Jan 8, 2026", "R3": "Apr 1, 2026"},
    "ross": {"R1": "Sep 15, 2025", "R2": "Jan 10, 2026", "R3": "Mar 20, 2026"},
    "fuqua": {"R1": "Sep 10, 2025", "R2": "Jan 7, 2026", "R3": "Mar 19, 2026"},
    "darden": {"R1": "Sep 8, 2025", "R2": "Jan 5, 2026", "R3": "Apr 1, 2026"},
    "stern": {"R1": "Sep 15, 2025", "R2": "Jan 15, 2026", "R3": "Mar 15, 2026"},
    "yale_som": {"R1": "Sep 10, 2025", "R2": "Jan 7, 2026", "R3": "Apr 8, 2026"},
    "anderson": {"R1": "Sep 17, 2025", "R2": "Jan 8, 2026", "R3": "Apr 15, 2026"},
}

_SCHOOL_ESSAY_COUNTS: dict[str, int] = {
    "hbs": 1, "gsb": 2, "wharton": 1, "booth": 2, "kellogg": 3,
    "cbs": 3, "sloan": 1, "tuck": 2, "haas": 4, "ross": 2,
    "fuqua": 2, "darden": 3, "stern": 2, "yale_som": 3, "anderson": 3,
}


def _build_checklist(school_id: str, school_name: str, round_name: str) -> list[dict]:
    """Build a generic MBA application checklist for a school."""
    items: list[dict] = []
    essay_count = _SCHOOL_ESSAY_COUNTS.get(school_id, 2)

    # Testing
    items.append({
        "task": "Complete GMAT/GRE and submit official score",
        "category": "testing",
        "priority": "critical",
        "estimated_days": 60,
        "notes": "Most schools accept both GMAT and GRE. Plan 2-3 months for preparation.",
    })
    items.append({
        "task": "Request official TOEFL/IELTS score report (if applicable)",
        "category": "testing",
        "priority": "important",
        "estimated_days": 14,
        "notes": "Required for non-native English speakers. Some schools waive if undergrad was in English.",
    })

    # Essays
    for i in range(1, essay_count + 1):
        items.append({
            "task": f"Write Essay {i} for {school_name}",
            "category": "essays",
            "priority": "critical",
            "estimated_days": 14,
            "notes": f"Essay {i} of {essay_count}. Start early — allow time for multiple drafts and feedback.",
        })
    items.append({
        "task": "Have essays reviewed by 2-3 trusted readers",
        "category": "essays",
        "priority": "important",
        "estimated_days": 7,
        "notes": "Get feedback from people who know you well AND from someone in admissions consulting.",
    })

    # Recommendations
    items.append({
        "task": "Select 2 recommenders and brief them",
        "category": "recommendations",
        "priority": "critical",
        "estimated_days": 7,
        "notes": "Choose people who can speak to your leadership and impact. Ideally direct supervisors.",
    })
    items.append({
        "task": "Follow up with recommenders 2 weeks before deadline",
        "category": "recommendations",
        "priority": "important",
        "estimated_days": 1,
        "notes": "Send a gentle reminder with the deadline and a summary of key points you'd like them to cover.",
    })

    # Application form
    items.append({
        "task": "Complete online application form",
        "category": "application_form",
        "priority": "critical",
        "estimated_days": 3,
        "notes": "Includes employment history, education, extracurriculars, and short-answer questions.",
    })
    items.append({
        "task": "Upload polished MBA resume (1 page)",
        "category": "application_form",
        "priority": "critical",
        "estimated_days": 5,
        "notes": "MBA resume format differs from corporate. Focus on impact, leadership, and quantified results.",
    })
    items.append({
        "task": "Request official transcripts from all universities attended",
        "category": "application_form",
        "priority": "critical",
        "estimated_days": 14,
        "notes": "Some schools accept unofficial transcripts initially, but official ones are needed for matriculation.",
    })

    # Financial
    items.append({
        "task": "Pay application fee or request fee waiver",
        "category": "financial",
        "priority": "important",
        "estimated_days": 1,
        "notes": "Fees range from $200-$275. Fee waivers available through campus visits, diversity programs, or financial need.",
    })
    items.append({
        "task": "Research scholarship and financial aid options",
        "category": "financial",
        "priority": "nice_to_have",
        "estimated_days": 3,
        "notes": "Many merit scholarships are auto-considered with your application. Some require separate essays.",
    })

    # Interview
    items.append({
        "task": "Prepare for admissions interview",
        "category": "interview",
        "priority": "important",
        "estimated_days": 10,
        "notes": "Practice behavioral stories (leadership, teamwork, failure). Research the school's interview format.",
    })

    # Supplemental
    items.append({
        "task": "Write optional essay (if addressing a weakness)",
        "category": "supplemental",
        "priority": "nice_to_have",
        "estimated_days": 5,
        "notes": "Use the optional essay to address gaps — low GPA, employment gap, or lack of quant background.",
    })
    items.append({
        "task": "Attend a virtual or in-person info session / campus visit",
        "category": "supplemental",
        "priority": "nice_to_have",
        "estimated_days": 1,
        "notes": "Demonstrates interest and helps you write stronger 'why this school' essays.",
    })

    return items


@router.post("/application-checklist")
def generate_application_checklist(req: ChecklistGeneratorRequest):
    """Generate a per-school application checklist with deadlines and prioritized tasks."""
    if not req.school_ids:
        raise HTTPException(status_code=400, detail="At least one school_id is required.")
    if len(req.school_ids) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 schools per request.")

    round_name = req.round.strip()
    results = []

    for sid in req.school_ids:
        sid_lower = sid.strip().lower()
        school = SCHOOL_DB.get(sid_lower)
        school_name = school.get("name", sid_lower) if school else sid_lower.upper()

        deadlines = _ROUND_DEADLINES.get(sid_lower, {})
        deadline = deadlines.get(round_name, "Check school website")

        checklist = _build_checklist(sid_lower, school_name, round_name)

        results.append({
            "school_id": sid_lower,
            "school_name": school_name,
            "round": round_name,
            "deadline": deadline,
            "checklist": checklist,
            "total_items": len(checklist),
            "critical_count": sum(1 for c in checklist if c["priority"] == "critical"),
        })

    return {"schools": results, "total_schools": len(results)}


# ── GMAT Score Predictor ─────────────────────────────────────────────


class GmatPredictorRequest(_BaseModel):
    practice_scores: list[int]
    study_hours_per_week: int = 10
    weeks_remaining: int = 4


# GMAT percentile lookup (approximate, based on recent distributions)
_GMAT_PERCENTILES = [
    (800, 99), (780, 99), (770, 98), (760, 97), (750, 96),
    (740, 94), (730, 93), (720, 90), (710, 88), (700, 85),
    (690, 82), (680, 79), (670, 76), (660, 72), (650, 68),
    (640, 64), (630, 60), (620, 56), (610, 51), (600, 47),
    (590, 43), (580, 39), (570, 35), (560, 31), (550, 27),
    (540, 24), (530, 21), (520, 18), (510, 15), (500, 13),
    (490, 11), (480, 9), (470, 7), (460, 6), (450, 5),
    (400, 2), (350, 1), (200, 0),
]


def _gmat_percentile(score: int) -> int:
    for threshold, pct in _GMAT_PERCENTILES:
        if score >= threshold:
            return pct
    return 0


@router.post("/gmat-predictor")
def predict_gmat(req: GmatPredictorRequest):
    """Predict GMAT score from practice scores, study hours, and weeks remaining."""
    scores = req.practice_scores
    if not scores:
        raise HTTPException(status_code=400, detail="At least one practice score is required.")

    n = len(scores)

    # Weighted average with recency bias: weight = index + 1
    total_weight = 0.0
    weighted_sum = 0.0
    for i, s in enumerate(scores):
        w = i + 1
        weighted_sum += s * w
        total_weight += w
    weighted_avg = weighted_sum / total_weight

    # Study factor: predicted = weighted_avg * (1 + 0.01 * min(weeks * hours / 10, 0.05))
    study_factor = 1 + 0.01 * min(req.weeks_remaining * req.study_hours_per_week / 10, 0.05)
    predicted_raw = weighted_avg * study_factor
    predicted = int(round(predicted_raw / 10) * 10)  # round to nearest 10

    # Confidence range: +/- 30
    conf_low = predicted - 30
    conf_high = predicted + 30

    # Score trend
    if n >= 2:
        first_half = scores[: n // 2]
        second_half = scores[n // 2 :]
        avg_first = sum(first_half) / len(first_half)
        avg_second = sum(second_half) / len(second_half)
        diff = avg_second - avg_first
        if diff > 10:
            trend = "improving"
        elif diff < -10:
            trend = "declining"
        else:
            trend = "plateauing"
    else:
        trend = "plateauing"

    # Percentile
    percentile = _gmat_percentile(predicted)

    # Recommendations
    recommendations: list[str] = []
    if trend == "declining":
        recommendations.append("Your scores are trending down — consider taking a break to avoid burnout.")
        recommendations.append("Review fundamentals before attempting more practice tests.")
    elif trend == "plateauing":
        recommendations.append("Try changing your study approach — focus on your weakest areas.")
        recommendations.append("Consider timed section practice to improve pacing.")
    else:
        recommendations.append("Great momentum! Maintain your current study routine.")
        recommendations.append("Start taking full-length practice tests under exam conditions.")

    if req.study_hours_per_week < 10:
        recommendations.append("Consider increasing study hours to at least 10-15 per week for meaningful progress.")
    if req.weeks_remaining <= 2:
        recommendations.append("With limited time left, focus on your highest-impact weak areas only.")
    if predicted < 700:
        recommendations.append("Target Quant improvement — it typically offers the biggest score gains.")

    # Target schools comparison
    target_school_ids = ["hbs", "gsb", "wharton", "columbia", "booth", "kellogg",
                         "sloan", "tuck", "haas", "stern", "ross", "darden",
                         "fuqua", "anderson", "yale-som", "insead", "lbs"]
    target_schools = []
    for sid in target_school_ids:
        school = SCHOOL_DB.get(sid)
        if not school:
            continue
        median_gmat = school.get("gmat_avg", school.get("median_gmat", 720))
        try:
            median_gmat = int(median_gmat)
        except (ValueError, TypeError):
            median_gmat = 720
        target_schools.append({
            "school_id": sid,
            "school_name": school.get("name", sid),
            "median_gmat": median_gmat,
            "your_delta": predicted - median_gmat,
        })

    target_schools.sort(key=lambda s: s["your_delta"], reverse=True)

    return {
        "predicted_score": predicted,
        "confidence_range": {"low": conf_low, "high": conf_high},
        "score_trend": trend,
        "percentile": percentile,
        "recommendations": recommendations,
        "target_schools": target_schools,
    }
