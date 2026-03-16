"""School data endpoints — checklist, employment, ROI, rankings, campus life, etc."""

import random

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel as _BaseModel
from agents import SCHOOL_DB

router = APIRouter(prefix="/api", tags=["school-data"])

# ── Application Checklist Generator ─────────────────────────────────────

@router.get("/schools/{school_id}/checklist")
def get_application_checklist(school_id: str):
    """Generate a per-school application checklist from admission requirements."""
    school = SCHOOL_DB.get(school_id)
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    reqs = school.get("admission_requirements", {})
    essays = school.get("essay_prompts", [])
    deadlines = school.get("admission_deadlines", [])
    app_qs = school.get("application_questions", [])

    checklist = []

    # Standard required items
    std_items = [
        ("application_fee", "Pay application fee", reqs.get("application_fee")),
        ("transcripts", "Submit official transcripts", reqs.get("transcripts")),
        ("resume", "Upload resume/CV", reqs.get("resume")),
        ("gmat_gre", "Submit GMAT/GRE score", reqs.get("gmat_gre")),
        ("recommendations", "Secure letters of recommendation", reqs.get("recommendations")),
        ("interview", "Complete interview (if invited)", reqs.get("interview")),
        ("english_proficiency", "Submit English proficiency score (if applicable)", reqs.get("english_proficiency")),
    ]

    for item_id, label, detail in std_items:
        if detail and detail.lower() not in ("n/a", "none", "not required"):
            checklist.append({
                "id": item_id,
                "label": label,
                "detail": detail if isinstance(detail, str) else str(detail),
                "category": "requirements",
                "required": True,
            })

    # Essays
    for i, essay in enumerate(essays):
        prompt = essay if isinstance(essay, str) else essay.get("prompt", essay.get("question", str(essay)))
        checklist.append({
            "id": f"essay_{i}",
            "label": f"Essay {i + 1}",
            "detail": prompt[:200] if len(prompt) > 200 else prompt,
            "category": "essays",
            "required": True,
        })

    # Application questions
    for i, q in enumerate(app_qs):
        q_text = q if isinstance(q, str) else q.get("question", str(q))
        checklist.append({
            "id": f"appq_{i}",
            "label": f"Application question {i + 1}",
            "detail": q_text[:200] if len(q_text) > 200 else q_text,
            "category": "questions",
            "required": True,
        })

    # Deadlines
    deadline_info = []
    for dl in deadlines:
        if isinstance(dl, dict):
            deadline_info.append({
                "round": dl.get("round", ""),
                "deadline": dl.get("deadline", ""),
                "decision": dl.get("decision", ""),
            })

    return {
        "school_id": school_id,
        "school_name": school.get("name", school_id),
        "checklist": checklist,
        "total_items": len(checklist),
        "deadlines": deadline_info,
        "categories": {
            "requirements": len([c for c in checklist if c["category"] == "requirements"]),
            "essays": len([c for c in checklist if c["category"] == "essays"]),
            "questions": len([c for c in checklist if c["category"] == "questions"]),
        },
    }

# ── Employment Outcomes ─────────────────────────────────────────────────

@router.get("/schools/{school_id}/employment")
def get_employment_stats(school_id: str):
    """Get detailed employment/placement data for a school."""
    school = SCHOOL_DB.get(school_id)
    if not school:
        raise HTTPException(404, f"School '{school_id}' not found")

    placement = school.get("placement_stats", {})
    if not placement:
        # Return empty structure
        return {
            "school_id": school_id,
            "school_name": school.get("name", school_id),
            "has_data": False,
        }

    # Parse industry breakdown
    industries = placement.get("top_industries", [])
    if isinstance(industries, dict):
        industries = [{"industry": k, "percentage": v} for k, v in industries.items()]

    return {
        "school_id": school_id,
        "school_name": school.get("name", school_id),
        "has_data": True,
        "median_base_salary": placement.get("median_base_salary_usd") or placement.get("median_base_salary"),
        "median_signing_bonus": placement.get("median_signing_bonus_usd") or placement.get("median_signing_bonus"),
        "employment_rate_3mo": placement.get("employment_rate_3mo_pct") or placement.get("employment_rate_3_months"),
        "internship_rate": placement.get("internship_rate"),
        "top_industries": industries[:10] if isinstance(industries, list) else [],
        "top_employers": (placement.get("top_employers") or [])[:15],
    }



# ── MBA Salary ROI ─────────────────────────────────────────────────────

@router.get("/schools/{school_id}/roi")
def get_school_roi(school_id: str, current_salary: float = 60000, years: int = 10):
    """Calculate MBA ROI for a specific school."""
    school = SCHOOL_DB.get(school_id)
    if not school:
        raise HTTPException(404, f"School '{school_id}' not found")

    tuition = school.get("tuition_usd", 0)
    # Parse median salary
    median_str = school.get("median_salary", "0")
    import re
    salary_match = re.search(r"[\d,]+", str(median_str).replace(",", ""))
    post_mba_salary = float(salary_match.group().replace(",", "")) if salary_match else 0

    # 2 years of tuition + opportunity cost
    total_cost = (tuition * 2) + (current_salary * 2)
    salary_increase = post_mba_salary - current_salary

    # Calculate ROI over N years
    cumulative_earnings_mba = sum(post_mba_salary * (1.03 ** y) for y in range(years))
    cumulative_earnings_no_mba = sum(current_salary * (1.03 ** y) for y in range(years))
    net_gain = cumulative_earnings_mba - cumulative_earnings_no_mba - total_cost

    # Breakeven year
    breakeven_year = None
    running_diff = -total_cost
    for y in range(1, years + 1):
        running_diff += salary_increase * (1.03 ** y)
        if running_diff >= 0 and breakeven_year is None:
            breakeven_year = y + 2  # +2 for MBA years

    roi_pct = round((net_gain / total_cost) * 100, 1) if total_cost > 0 else 0

    return {
        "school_id": school_id,
        "school_name": school.get("name", school_id),
        "tuition_total": tuition * 2,
        "opportunity_cost": current_salary * 2,
        "total_investment": total_cost,
        "post_mba_salary": post_mba_salary,
        "salary_increase": salary_increase,
        "roi_pct": roi_pct,
        "net_gain_10yr": round(net_gain),
        "breakeven_year": breakeven_year,
        "assumptions": f"3% annual raise, {years}-year horizon, current salary ${current_salary:,.0f}",
    }



# ── Diversity Stats ─────────────────────────────────────────────────────

@router.get("/diversity-stats")
def get_diversity_stats(school_ids: str | None = None):
    """Get diversity statistics across MBA programs."""
    if school_ids:
        ids = [s.strip().lower() for s in school_ids.split(",") if s.strip()]
    else:
        ids = ["hbs", "gsb", "wharton", "booth", "kellogg", "cbs", "sloan",
               "tuck", "haas", "ross", "fuqua", "darden", "stern", "yale_som", "anderson"]

    stats = []
    for sid in ids:
        school = SCHOOL_DB.get(sid)
        if not school:
            continue
        prog = school.get("program_details", {}) or {}
        cp = school.get("class_profile", {}) or {}
        stats.append({
            "school_id": sid,
            "school_name": school.get("name", sid),
            "female_pct": prog.get("female_percentage") or cp.get("female_pct"),
            "international_pct": prog.get("international_percentage") or cp.get("international_pct"),
            "countries_represented": prog.get("countries_represented") or cp.get("countries"),
            "avg_age": prog.get("avg_age") or cp.get("avg_age"),
            "stem_designated": school.get("stem_designated", False),
        })

    # Compute averages
    def avg(key: str) -> float | None:
        vals = [s[key] for s in stats if s[key] is not None]
        if not vals:
            return None
        nums = [float(str(v).replace("%", "")) for v in vals if str(v).replace(".", "").replace("%", "").isdigit()]
        return round(sum(nums) / len(nums), 1) if nums else None

    return {
        "schools": stats,
        "averages": {
            "female_pct": avg("female_pct"),
            "international_pct": avg("international_pct"),
            "avg_age": avg("avg_age"),
        },
        "total_schools": len(stats),
    }



# ── Networking Events ──────────────────────────────────────────────────

_EVENT_TYPES = ["info_session", "campus_visit", "webinar", "coffee_chat", "conference", "alumni_mixer"]

_SAMPLE_EVENTS = {
    "hbs": [
        {"title": "HBS Virtual Info Session", "type": "webinar", "frequency": "Monthly", "format": "online",
         "description": "Overview of the HBS MBA program, admissions process, and student life.",
         "registration_url": "https://www.hbs.edu/mba/admissions/events"},
        {"title": "HBS Campus Visit Day", "type": "campus_visit", "frequency": "Bi-weekly (Sep-Mar)", "format": "in_person",
         "description": "Full-day campus visit including class visit, campus tour, and student lunch.",
         "registration_url": "https://www.hbs.edu/mba/admissions/visit"},
    ],
    "gsb": [
        {"title": "Stanford GSB Admission Chat", "type": "coffee_chat", "frequency": "Weekly", "format": "online",
         "description": "Informal Q&A with current students and admissions staff.",
         "registration_url": "https://www.gsb.stanford.edu/programs/mba/admission/events"},
        {"title": "GSB In-Person Information Session", "type": "info_session", "frequency": "Monthly", "format": "in_person",
         "description": "On-campus info session with admissions presentation and Q&A.",
         "registration_url": "https://www.gsb.stanford.edu/programs/mba/admission/events"},
    ],
    "wharton": [
        {"title": "Wharton MBA Webinar Series", "type": "webinar", "frequency": "Bi-weekly", "format": "online",
         "description": "Themed webinars covering curriculum, career outcomes, and student experience.",
         "registration_url": "https://mba.wharton.upenn.edu/admissions-events/"},
        {"title": "Wharton Campus Tour", "type": "campus_visit", "frequency": "Weekly (Sep-Apr)", "format": "in_person",
         "description": "Student-led campus tour and class visit.",
         "registration_url": "https://mba.wharton.upenn.edu/visit/"},
    ],
    "booth": [
        {"title": "Chicago Booth Virtual Session", "type": "webinar", "frequency": "Monthly", "format": "online",
         "description": "Live webinar with admissions team covering program highlights.",
         "registration_url": "https://www.chicagobooth.edu/mba/admissions/events"},
    ],
    "kellogg": [
        {"title": "Kellogg Inside Day", "type": "campus_visit", "frequency": "Monthly (Oct-Mar)", "format": "in_person",
         "description": "Full-day immersive campus experience with classes, tours, and networking.",
         "registration_url": "https://www.kellogg.northwestern.edu/programs/full-time-mba/admissions/visit.aspx"},
    ],
    "cbs": [
        {"title": "CBS Admissions Coffee Chat", "type": "coffee_chat", "frequency": "Bi-weekly", "format": "online",
         "description": "Small-group conversations with current CBS students.",
         "registration_url": "https://www8.gsb.columbia.edu/programs/mba/admissions/events"},
    ],
    "sloan": [
        {"title": "MIT Sloan Info Session", "type": "info_session", "frequency": "Monthly", "format": "hybrid",
         "description": "Admissions overview and Q&A with option for virtual or in-person attendance.",
         "registration_url": "https://mitsloan.mit.edu/mba/admissions/visit-us"},
    ],
}

_GENERAL_EVENTS = [
    {"title": "MBA Tour — Major Cities", "type": "conference", "frequency": "Annual (fall)", "format": "in_person",
     "description": "Multi-school MBA fair with presentations, booths, and 1-on-1 meetings with admissions."},
    {"title": "QS World MBA Tour", "type": "conference", "frequency": "Annual", "format": "in_person",
     "description": "International MBA fair connecting prospective students with top programs worldwide."},
    {"title": "Forté Foundation MBA Forum", "type": "conference", "frequency": "Annual", "format": "hybrid",
     "description": "Focused on women in business — panels, networking, and school presentations."},
    {"title": "ROMBA Conference", "type": "conference", "frequency": "Annual", "format": "in_person",
     "description": "Reaching Out MBA conference for LGBTQ+ business school community."},
    {"title": "National Black MBA Association Conference", "type": "conference", "frequency": "Annual", "format": "in_person",
     "description": "Largest gathering of Black MBA professionals and students."},
    {"title": "Consortium for Graduate Study Orientation", "type": "conference", "frequency": "Annual", "format": "in_person",
     "description": "Pre-MBA orientation for Consortium fellows — networking and professional development."},
]


@router.get("/networking-events")
def get_networking_events(
    school_id: str | None = None,
    event_type: str | None = None,
    format: str | None = None,
):
    """Get MBA networking events, info sessions, and conferences."""
    results = []

    if school_id:
        ids = [s.strip().lower() for s in school_id.split(",") if s.strip()]
    else:
        ids = list(_SAMPLE_EVENTS.keys())

    for sid in ids:
        school = SCHOOL_DB.get(sid)
        school_name = school.get("name", sid) if school else sid.upper()
        events = _SAMPLE_EVENTS.get(sid, [])
        for ev in events:
            results.append({**ev, "school_id": sid, "school_name": school_name, "scope": "school_specific"})

    # Always include general events
    for ev in _GENERAL_EVENTS:
        results.append({**ev, "school_id": None, "school_name": None, "scope": "general"})

    # Filter by event_type
    if event_type:
        results = [e for e in results if e["type"] == event_type]

    # Filter by format
    if format:
        results = [e for e in results if e.get("format") == format]

    return {
        "events": results,
        "total": len(results),
        "event_types": _EVENT_TYPES,
        "formats": ["online", "in_person", "hybrid"],
    }



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



# ── Exchange Programs ──────────────────────────────────────────────────

_EXCHANGE_DB = {
    "hbs": [
        {"partner": "INSEAD", "country": "France/Singapore", "region": "europe", "duration": "1 quarter", "focus": ["General Management", "Entrepreneurship"], "language": "English"},
        {"partner": "IESE Business School", "country": "Spain", "region": "europe", "duration": "1 semester", "focus": ["General Management", "Entrepreneurship"], "language": "English/Spanish"},
        {"partner": "Tsinghua SEM", "country": "China", "region": "asia", "duration": "1 quarter", "focus": ["Technology", "China Business"], "language": "English"},
    ],
    "gsb": [
        {"partner": "London Business School", "country": "UK", "region": "europe", "duration": "1 quarter", "focus": ["Finance", "Strategy"], "language": "English"},
        {"partner": "NUS Business School", "country": "Singapore", "region": "asia", "duration": "1 quarter", "focus": ["Asian Business", "Finance"], "language": "English"},
    ],
    "wharton": [
        {"partner": "INSEAD", "country": "France/Singapore", "region": "europe", "duration": "1 semester", "focus": ["Finance", "General Management"], "language": "English"},
        {"partner": "HEC Paris", "country": "France", "region": "europe", "duration": "1 semester", "focus": ["Luxury", "Entrepreneurship"], "language": "English/French"},
        {"partner": "CEIBS", "country": "China", "region": "asia", "duration": "1 semester", "focus": ["China Business"], "language": "English"},
    ],
    "booth": [
        {"partner": "London Business School", "country": "UK", "region": "europe", "duration": "1 quarter", "focus": ["Finance", "Economics"], "language": "English"},
        {"partner": "HEC Paris", "country": "France", "region": "europe", "duration": "1 quarter", "focus": ["General Management"], "language": "English"},
    ],
    "kellogg": [
        {"partner": "WHU Otto Beisheim", "country": "Germany", "region": "europe", "duration": "1 quarter", "focus": ["Innovation", "Entrepreneurship"], "language": "English"},
        {"partner": "HKUST Business School", "country": "Hong Kong", "region": "asia", "duration": "1 quarter", "focus": ["Asian Markets", "Finance"], "language": "English"},
        {"partner": "Tel Aviv University", "country": "Israel", "region": "europe", "duration": "1 quarter", "focus": ["Technology", "Entrepreneurship"], "language": "English"},
    ],
    "sloan": [
        {"partner": "Tsinghua SEM", "country": "China", "region": "asia", "duration": "1 semester", "focus": ["Technology", "Innovation"], "language": "English"},
        {"partner": "INSEAD", "country": "France/Singapore", "region": "europe", "duration": "1 semester", "focus": ["General Management"], "language": "English"},
    ],
    "insead": [
        {"partner": "Wharton", "country": "USA", "region": "americas", "duration": "1 semester", "focus": ["Finance"], "language": "English"},
        {"partner": "Kellogg", "country": "USA", "region": "americas", "duration": "1 period", "focus": ["Marketing", "Management"], "language": "English"},
    ],
}


@router.get("/exchange-programs")
def get_exchange_programs(school_id: str | None = None, region: str | None = None):
    """Get MBA exchange and study abroad programs."""
    programs = []

    if school_id:
        ids = [s.strip().lower() for s in school_id.split(",") if s.strip()]
    else:
        ids = list(_EXCHANGE_DB.keys())

    for sid in ids:
        school = SCHOOL_DB.get(sid)
        school_name = school.get("name", sid) if school else sid.upper()
        exchanges = _EXCHANGE_DB.get(sid, [])
        for ex in exchanges:
            programs.append({
                "school_id": sid,
                "school_name": school_name,
                **ex,
            })

    if region:
        programs = [p for p in programs if p.get("region") == region.lower()]

    return {"programs": programs, "total": len(programs)}



# ── Specialty Rankings ─────────────────────────────────────────────────

_SPECIALTY_RANKINGS = {
    "finance": {
        "display_name": "Finance",
        "schools": [
            {"rank": 1, "school_id": "wharton", "score": 98, "features": ["Largest finance faculty", "150+ finance electives", "Wall Street pipeline"], "centers": ["Wharton Financial Institutions Center"]},
            {"rank": 2, "school_id": "booth", "score": 96, "features": ["Nobel laureate faculty", "Quant-heavy curriculum", "Strong trading culture"], "centers": ["Fama-Miller Center for Research in Finance"]},
            {"rank": 3, "school_id": "cbs", "score": 93, "features": ["NYC location", "Value investing heritage", "Buffett connection"], "centers": ["Heilbrunn Center for Graham & Dodd Investing"]},
            {"rank": 4, "school_id": "stern", "score": 90, "features": ["Wall Street proximity", "Strong PE/hedge fund placement"], "centers": ["Salomon Center"]},
            {"rank": 5, "school_id": "hbs", "score": 88, "features": ["PE/VC placement", "Case method for finance"], "centers": ["Rock Center for Entrepreneurship"]},
            {"rank": 6, "school_id": "gsb", "score": 86, "features": ["VC focus", "Silicon Valley finance"], "centers": ["Center for Entrepreneurial Studies"]},
            {"rank": 7, "school_id": "sloan", "score": 84, "features": ["Quant finance", "Fintech innovation"], "centers": ["MIT Laboratory for Financial Engineering"]},
            {"rank": 8, "school_id": "kellogg", "score": 81, "features": ["Asset management focus", "Strong alumni network in finance"], "centers": ["Kellogg Finance Department"]},
        ],
    },
    "consulting": {
        "display_name": "Management Consulting",
        "schools": [
            {"rank": 1, "school_id": "hbs", "score": 97, "features": ["30%+ class enters consulting", "Case method = consulting prep"], "centers": ["HBS Case Writing Program"]},
            {"rank": 2, "school_id": "kellogg", "score": 95, "features": ["Team-based culture", "Highest consulting placement %"], "centers": ["Kellogg Consulting Club"]},
            {"rank": 3, "school_id": "booth", "score": 93, "features": ["Analytical rigor", "Strong MBB pipeline"], "centers": ["Management Consulting Group"]},
            {"rank": 4, "school_id": "wharton", "score": 91, "features": ["Strategy focus", "Dual-degree options"], "centers": ["Mack Institute"]},
            {"rank": 5, "school_id": "gsb", "score": 89, "features": ["Selective placement", "West Coast consulting"], "centers": ["Stanford Consulting Partnership"]},
            {"rank": 6, "school_id": "tuck", "score": 87, "features": ["Small class, strong community", "High MBB conversion"], "centers": ["Center for Business, Government & Society"]},
            {"rank": 7, "school_id": "fuqua", "score": 85, "features": ["Team Fuqua culture", "Strong Deloitte pipeline"], "centers": ["Fuqua Client Consulting Practicum"]},
            {"rank": 8, "school_id": "ross", "score": 83, "features": ["MAP program (real consulting)", "Action-based learning"], "centers": ["Multidisciplinary Action Projects"]},
        ],
    },
    "technology": {
        "display_name": "Technology & Product Management",
        "schools": [
            {"rank": 1, "school_id": "gsb", "score": 98, "features": ["Silicon Valley hub", "35%+ enter tech", "VC ecosystem"], "centers": ["Stanford Technology Ventures Program"]},
            {"rank": 2, "school_id": "sloan", "score": 96, "features": ["MIT integration", "Deep tech focus", "AI/ML curriculum"], "centers": ["Martin Trust Center for MIT Entrepreneurship"]},
            {"rank": 3, "school_id": "haas", "score": 93, "features": ["Bay Area location", "Innovation focus", "Tech trek"], "centers": ["Berkeley SkyDeck"]},
            {"rank": 4, "school_id": "hbs", "score": 90, "features": ["Tech placement growing", "HBX digital platform"], "centers": ["Digital Initiative"]},
            {"rank": 5, "school_id": "booth", "score": 87, "features": ["Polsky Center", "Data analytics"], "centers": ["Polsky Center for Entrepreneurship"]},
            {"rank": 6, "school_id": "kellogg", "score": 85, "features": ["MMM dual degree (design+MBA)", "Tech club"], "centers": ["Kellogg Innovation & Entrepreneurship"]},
            {"rank": 7, "school_id": "anderson", "score": 83, "features": ["LA tech scene", "Entertainment tech"], "centers": ["Price Center for Entrepreneurship"]},
            {"rank": 8, "school_id": "tepper", "score": 81, "features": ["Quantitative + tech", "Carnegie Mellon CS access"], "centers": ["Swartz Center for Entrepreneurship"]},
        ],
    },
    "entrepreneurship": {
        "display_name": "Entrepreneurship",
        "schools": [
            {"rank": 1, "school_id": "gsb", "score": 98, "features": ["16%+ start companies", "$300B+ alumni company value"], "centers": ["Center for Entrepreneurial Studies"]},
            {"rank": 2, "school_id": "hbs", "score": 96, "features": ["Largest startup ecosystem", "Rock Center", "New Venture Competition"], "centers": ["Arthur Rock Center"]},
            {"rank": 3, "school_id": "sloan", "score": 94, "features": ["MIT ecosystem", "$100K competition", "Deep tech startups"], "centers": ["Martin Trust Center"]},
            {"rank": 4, "school_id": "haas", "score": 91, "features": ["Bay Area startup scene", "Lean Launchpad"], "centers": ["Berkeley SkyDeck"]},
            {"rank": 5, "school_id": "babson_olin", "score": 89, "features": ["#1 undergrad entrepreneurship", "FME program"], "centers": ["Arthur M. Blank Center"]},
            {"rank": 6, "school_id": "booth", "score": 87, "features": ["Polsky Center", "New Venture Challenge"], "centers": ["Polsky Center"]},
            {"rank": 7, "school_id": "kellogg", "score": 85, "features": ["Zell Fellows", "NVC competition"], "centers": ["Kellogg Innovation & Entrepreneurship"]},
            {"rank": 8, "school_id": "wharton", "score": 83, "features": ["Venture Initiation Program", "Penn ecosystem"], "centers": ["Wharton Entrepreneurship"]},
        ],
    },
    "social_impact": {
        "display_name": "Social Impact & Nonprofit",
        "schools": [
            {"rank": 1, "school_id": "yale_som", "score": 97, "features": ["Mission-driven culture", "Broad curriculum with social focus"], "centers": ["Program on Social Enterprise"]},
            {"rank": 2, "school_id": "hbs", "score": 94, "features": ["Social Enterprise Initiative", "Largest nonprofit case library"], "centers": ["Social Enterprise Initiative"]},
            {"rank": 3, "school_id": "gsb", "score": 92, "features": ["PACS center", "Social innovation"], "centers": ["Center for Social Innovation"]},
            {"rank": 4, "school_id": "fuqua", "score": 89, "features": ["CASE i3", "Impact investing"], "centers": ["Center for Advancement of Social Entrepreneurship"]},
            {"rank": 5, "school_id": "haas", "score": 87, "features": ["Center for Social Sector Leadership"], "centers": ["CSSL"]},
        ],
    },
    "healthcare": {
        "display_name": "Healthcare Management",
        "schools": [
            {"rank": 1, "school_id": "wharton", "score": 96, "features": ["Health Care Management Dept", "Penn Med integration"], "centers": ["Wharton Healthcare Management"]},
            {"rank": 2, "school_id": "hbs", "score": 93, "features": ["Health care initiative", "Case method for healthcare"], "centers": ["Health Care Initiative"]},
            {"rank": 3, "school_id": "kellogg", "score": 90, "features": ["Health Enterprise Management Center"], "centers": ["HEMC"]},
            {"rank": 4, "school_id": "fuqua", "score": 87, "features": ["Health Sector Management concentration"], "centers": ["Duke Health"]},
            {"rank": 5, "school_id": "ross", "score": 84, "features": ["Michigan Medicine partnership"], "centers": ["Tauber Institute"]},
        ],
    },
    "marketing": {
        "display_name": "Marketing",
        "schools": [
            {"rank": 1, "school_id": "kellogg", "score": 97, "features": ["Marketing birthplace (Kotler)", "Strongest marketing faculty"], "centers": ["Kellogg Marketing Department"]},
            {"rank": 2, "school_id": "wharton", "score": 93, "features": ["Large marketing faculty", "Analytics + marketing"], "centers": ["Wharton Customer Analytics"]},
            {"rank": 3, "school_id": "hbs", "score": 90, "features": ["Brand management cases", "CPG placement"], "centers": ["Digital Initiative"]},
            {"rank": 4, "school_id": "booth", "score": 88, "features": ["Quantitative marketing", "Kilts Center"], "centers": ["Kilts Center for Marketing"]},
            {"rank": 5, "school_id": "stern", "score": 86, "features": ["NYC media/advertising", "Luxury marketing"], "centers": ["Center for Digital Economy"]},
        ],
    },
    "international_business": {
        "display_name": "International Business",
        "schools": [
            {"rank": 1, "school_id": "insead", "score": 98, "features": ["3 campuses", "90+ nationalities", "True global MBA"], "centers": ["INSEAD Global"]},
            {"rank": 2, "school_id": "lbs", "score": 95, "features": ["London hub", "90%+ international class"], "centers": ["Institute of Innovation & Entrepreneurship"]},
            {"rank": 3, "school_id": "iese", "score": 92, "features": ["5 campuses globally", "Strong LatAm + EU network"], "centers": ["Center for International Finance"]},
            {"rank": 4, "school_id": "hec_paris", "score": 89, "features": ["European leadership", "Strong luxury/strategy"], "centers": ["HEC Paris International"]},
            {"rank": 5, "school_id": "hbs", "score": 86, "features": ["Global immersion", "Research centers worldwide"], "centers": ["Global Initiative"]},
        ],
    },
}


@router.get("/rankings/specialty")
def get_specialty_rankings(specialty: str | None = None):
    """Get MBA rankings by specialty area."""
    if specialty:
        sp = specialty.strip().lower()
        if sp not in _SPECIALTY_RANKINGS:
            raise HTTPException(status_code=404, detail=f"Specialty '{specialty}' not found")
        data = _SPECIALTY_RANKINGS[sp]
        # Enrich with school names
        schools = []
        for entry in data["schools"]:
            school = SCHOOL_DB.get(entry["school_id"])
            schools.append({
                **entry,
                "school_name": school.get("name", entry["school_id"]) if school else entry["school_id"].upper(),
            })
        return {
            "specialty": sp,
            "display_name": data["display_name"],
            "schools": schools,
            "total": len(schools),
        }

    # Return all specialties with summary
    result = []
    for key, data in _SPECIALTY_RANKINGS.items():
        top3 = [e["school_id"] for e in data["schools"][:3]]
        result.append({
            "specialty": key,
            "display_name": data["display_name"],
            "top_3_schools": top3,
            "total_ranked": len(data["schools"]),
        })
    return {"specialties": result, "total": len(result)}



# ── MBA Program Length Comparison ────────────────────────────────────

_PROGRAM_FORMATS = {
    "2_year": {
        "format": "2_year",
        "display_name": "2-Year Full-Time MBA",
        "typical_duration": "21-24 months",
        "schools": [
            {"school_id": "hbs", "program_name": "HBS MBA", "duration": "24 months", "total_cost_estimate": 230000},
            {"school_id": "gsb", "program_name": "Stanford MBA", "duration": "21 months", "total_cost_estimate": 240000},
            {"school_id": "wharton", "program_name": "Wharton MBA", "duration": "21 months", "total_cost_estimate": 225000},
            {"school_id": "booth", "program_name": "Chicago Booth MBA", "duration": "21 months", "total_cost_estimate": 215000},
            {"school_id": "kellogg", "program_name": "Kellogg 2Y MBA", "duration": "21 months", "total_cost_estimate": 220000},
            {"school_id": "columbia", "program_name": "CBS MBA", "duration": "20 months", "total_cost_estimate": 230000},
            {"school_id": "sloan", "program_name": "MIT Sloan MBA", "duration": "24 months", "total_cost_estimate": 225000},
            {"school_id": "tuck", "program_name": "Tuck MBA", "duration": "21 months", "total_cost_estimate": 210000},
            {"school_id": "haas", "program_name": "Haas MBA", "duration": "21 months", "total_cost_estimate": 215000},
            {"school_id": "stern", "program_name": "Stern MBA", "duration": "21 months", "total_cost_estimate": 220000},
        ],
        "pros": [
            "Deep immersion in coursework and campus life",
            "Summer internship opportunity for career switching",
            "Strongest alumni network and recruiting pipeline",
            "Maximum elective flexibility and specialization",
        ],
        "cons": [
            "Highest total cost (tuition + 2 years opportunity cost)",
            "Longest time away from the workforce",
            "May be overkill for career advancers (vs. switchers)",
        ],
        "best_for": "Career switchers, those seeking top-tier consulting/IB/tech recruiting, and anyone who wants the full MBA experience.",
        "avg_cost": 225000,
    },
    "1_year": {
        "format": "1_year",
        "display_name": "1-Year Accelerated MBA",
        "typical_duration": "10-16 months",
        "schools": [
            {"school_id": "insead", "program_name": "INSEAD MBA", "duration": "10 months", "total_cost_estimate": 120000},
            {"school_id": "lbs", "program_name": "LBS MBA", "duration": "15-21 months", "total_cost_estimate": 140000},
            {"school_id": "kellogg", "program_name": "Kellogg 1Y MBA", "duration": "12 months", "total_cost_estimate": 155000},
            {"school_id": "cornell", "program_name": "Johnson Cornell Tech MBA", "duration": "12 months", "total_cost_estimate": 130000},
            {"school_id": "iese", "program_name": "IESE MBA", "duration": "15 months", "total_cost_estimate": 110000},
        ],
        "pros": [
            "Lower total cost and less time away from career",
            "Fast-track back to workforce",
            "Great for career advancers with clear goals",
            "International exposure (especially INSEAD, LBS)",
        ],
        "cons": [
            "No summer internship — harder for career switchers",
            "Compressed curriculum with fewer electives",
            "Less time for networking and extracurriculars",
        ],
        "best_for": "Career advancers with 5+ years of experience and clear post-MBA goals who want to minimize time and cost.",
        "avg_cost": 131000,
    },
    "accelerated": {
        "format": "accelerated",
        "display_name": "Accelerated / J-Term MBA",
        "typical_duration": "16-20 months",
        "schools": [
            {"school_id": "kellogg", "program_name": "Kellogg Accelerated MBA", "duration": "16 months", "total_cost_estimate": 170000},
            {"school_id": "columbia", "program_name": "CBS J-Term MBA", "duration": "16 months", "total_cost_estimate": 195000},
            {"school_id": "darden", "program_name": "Darden Accelerated MBA", "duration": "16 months", "total_cost_estimate": 165000},
        ],
        "pros": [
            "Shorter than 2-year but still includes summer internship",
            "Lower opportunity cost than traditional 2-year",
            "January start avoids fall rush",
        ],
        "cons": [
            "Very intense pace with fewer breaks",
            "Smaller cohort — less diverse peer group",
            "Limited program options at top schools",
        ],
        "best_for": "Experienced professionals who want internship access but prefer a compressed timeline.",
        "avg_cost": 177000,
    },
    "part_time": {
        "format": "part_time",
        "display_name": "Part-Time / Evening / Weekend MBA",
        "typical_duration": "24-36 months",
        "schools": [
            {"school_id": "booth", "program_name": "Booth Evening MBA", "duration": "33 months", "total_cost_estimate": 175000},
            {"school_id": "booth", "program_name": "Booth Weekend MBA", "duration": "33 months", "total_cost_estimate": 175000},
            {"school_id": "haas", "program_name": "Haas EWMBA", "duration": "30 months", "total_cost_estimate": 170000},
            {"school_id": "stern", "program_name": "Stern Part-Time MBA", "duration": "24-30 months", "total_cost_estimate": 165000},
            {"school_id": "anderson", "program_name": "Anderson FEMBA", "duration": "33 months", "total_cost_estimate": 160000},
            {"school_id": "kellogg", "program_name": "Kellogg Part-Time MBA", "duration": "24-30 months", "total_cost_estimate": 170000},
        ],
        "pros": [
            "Keep your job and income while earning the degree",
            "Employer may sponsor tuition",
            "Immediately apply lessons at work",
            "Same degree as full-time at many schools",
        ],
        "cons": [
            "Extremely demanding schedule (work + school)",
            "Limited access to full-time recruiting and internships",
            "Longer time to completion",
            "Less immersive campus experience",
        ],
        "best_for": "Working professionals who want to advance at their current employer or industry without leaving their job.",
        "avg_cost": 169000,
    },
    "executive": {
        "format": "executive",
        "display_name": "Executive MBA (EMBA)",
        "typical_duration": "18-24 months",
        "schools": [
            {"school_id": "wharton", "program_name": "Wharton EMBA", "duration": "22 months", "total_cost_estimate": 215000},
            {"school_id": "kellogg", "program_name": "Kellogg EMBA", "duration": "22 months", "total_cost_estimate": 210000},
            {"school_id": "booth", "program_name": "Booth EMBA", "duration": "21 months", "total_cost_estimate": 200000},
            {"school_id": "columbia", "program_name": "CBS EMBA", "duration": "20 months", "total_cost_estimate": 220000},
            {"school_id": "sloan", "program_name": "MIT Sloan EMBA", "duration": "20 months", "total_cost_estimate": 205000},
        ],
        "pros": [
            "Designed for senior leaders — no career break needed",
            "Cohort of experienced executives (10-15+ years experience)",
            "Often employer-sponsored",
            "Weekend/module-based schedule",
        ],
        "cons": [
            "Highest tuition among MBA formats",
            "Less flexibility — fixed cohort schedule",
            "Not designed for career switching",
            "GMAT often waived but standards are high",
        ],
        "best_for": "Senior managers and directors with 10+ years of experience looking to move into C-suite or board roles.",
        "avg_cost": 210000,
    },
    "online": {
        "format": "online",
        "display_name": "Online MBA",
        "typical_duration": "18-36 months",
        "schools": [
            {"school_id": "booth", "program_name": "Booth Online MBA (proposed)", "duration": "24 months", "total_cost_estimate": 145000},
            {"school_id": "tepper", "program_name": "Tepper Online MBA", "duration": "32 months", "total_cost_estimate": 120000},
            {"school_id": "kelley", "program_name": "Kelley Direct Online MBA", "duration": "24-60 months", "total_cost_estimate": 78000},
            {"school_id": "unc", "program_name": "UNC Kenan-Flagler Online MBA", "duration": "18-36 months", "total_cost_estimate": 125000},
            {"school_id": "warwick", "program_name": "Warwick Distance Learning MBA", "duration": "24-48 months", "total_cost_estimate": 45000},
        ],
        "pros": [
            "Maximum flexibility — study from anywhere",
            "Lowest total cost among MBA formats",
            "No relocation required",
            "Can maintain full-time employment",
        ],
        "cons": [
            "Limited networking and on-campus experience",
            "May carry less prestige with some employers",
            "Requires strong self-discipline",
            "Fewer recruiting opportunities compared to on-campus",
        ],
        "best_for": "Professionals in remote locations or with family obligations who need maximum flexibility and lower cost.",
        "avg_cost": 103000,
    },
}


@router.get("/program-formats")
def get_program_formats(format: str = None):
    """Return MBA program format comparisons with schools, costs, pros/cons."""
    if format:
        fmt = _PROGRAM_FORMATS.get(format)
        if not fmt:
            raise HTTPException(status_code=404, detail=f"Unknown format: {format}. Options: {', '.join(_PROGRAM_FORMATS.keys())}")

        # Enrich school entries with names from SCHOOL_DB
        enriched = _enrich_format(fmt)
        return {"formats": [enriched]}

    # Return all formats
    return {"formats": [_enrich_format(f) for f in _PROGRAM_FORMATS.values()]}


def _enrich_format(fmt: dict) -> dict:
    """Add school_name from SCHOOL_DB to each school entry."""
    enriched_schools = []
    for s in fmt["schools"]:
        school = SCHOOL_DB.get(s["school_id"])
        school_name = school.get("name", s["school_id"]) if school else s["school_id"]
        enriched_schools.append({**s, "school_name": school_name})
    return {**fmt, "schools": enriched_schools}



# ── Campus Life Comparison ────────────────────────────────────────────


class _HousingInfo(_BaseModel):
    on_campus_available: bool
    avg_monthly_rent: int


class _CampusLifeEntry(_BaseModel):
    school_id: str
    school_name: str
    city: str
    state_or_country: str
    climate: str
    housing: _HousingInfo
    walkability_score: int
    nightlife_score: int
    cost_of_living_index: int
    nearby_attractions: list[str]
    student_clubs_count: int
    sports_facilities: list[str]


_CAMPUS_LIFE_DATA: list[dict] = [
    {
        "school_id": "hbs",
        "school_name": "Harvard Business School",
        "city": "Boston",
        "state_or_country": "Massachusetts",
        "climate": "Cold winters with snowy conditions; warm, humid summers. Four distinct seasons.",
        "housing": {"on_campus_available": True, "avg_monthly_rent": 2400},
        "walkability_score": 8,
        "nightlife_score": 7,
        "cost_of_living_index": 148,
        "nearby_attractions": ["Harvard Square", "Freedom Trail", "Charles River Esplanade", "Fenway Park", "MIT campus"],
        "student_clubs_count": 120,
        "sports_facilities": ["Shad Hall gym", "Indoor pool", "Basketball courts", "Squash courts", "Outdoor running trails"],
    },
    {
        "school_id": "gsb",
        "school_name": "Stanford GSB",
        "city": "Stanford",
        "state_or_country": "California",
        "climate": "Mediterranean climate — mild year-round, dry summers, occasional rain in winter.",
        "housing": {"on_campus_available": True, "avg_monthly_rent": 3200},
        "walkability_score": 6,
        "nightlife_score": 5,
        "cost_of_living_index": 172,
        "nearby_attractions": ["Palo Alto downtown", "Stanford Dish trail", "San Francisco (30 mi)", "Napa Valley", "Big Sur coast"],
        "student_clubs_count": 100,
        "sports_facilities": ["Arrillaga Recreation Center", "Golf course", "Tennis courts", "Olympic pool", "Climbing wall"],
    },
    {
        "school_id": "wharton",
        "school_name": "Wharton School",
        "city": "Philadelphia",
        "state_or_country": "Pennsylvania",
        "climate": "Four seasons — hot, humid summers and cold winters with moderate snowfall.",
        "housing": {"on_campus_available": True, "avg_monthly_rent": 1800},
        "walkability_score": 9,
        "nightlife_score": 8,
        "cost_of_living_index": 118,
        "nearby_attractions": ["Rittenhouse Square", "Philadelphia Museum of Art", "Reading Terminal Market", "South Street", "Schuylkill River Trail"],
        "student_clubs_count": 150,
        "sports_facilities": ["Pottruck Health & Fitness Center", "Squash courts", "Indoor pool", "Basketball courts", "Ice rink"],
    },
    {
        "school_id": "booth",
        "school_name": "Chicago Booth",
        "city": "Chicago",
        "state_or_country": "Illinois",
        "climate": "Cold, windy winters with heavy snow; warm summers along Lake Michigan.",
        "housing": {"on_campus_available": False, "avg_monthly_rent": 1900},
        "walkability_score": 9,
        "nightlife_score": 9,
        "cost_of_living_index": 107,
        "nearby_attractions": ["Millennium Park", "Art Institute of Chicago", "Wrigley Field", "Navy Pier", "Lake Michigan waterfront"],
        "student_clubs_count": 130,
        "sports_facilities": ["Ratner Athletics Center", "Stagg Field", "Indoor pool", "Squash courts", "Henry Crown Field House"],
    },
    {
        "school_id": "kellogg",
        "school_name": "Kellogg School of Management",
        "city": "Evanston",
        "state_or_country": "Illinois",
        "climate": "Similar to Chicago — harsh winters, pleasant summers. Lake-effect weather patterns.",
        "housing": {"on_campus_available": True, "avg_monthly_rent": 1700},
        "walkability_score": 7,
        "nightlife_score": 6,
        "cost_of_living_index": 105,
        "nearby_attractions": ["Northwestern campus lakefront", "downtown Evanston shops", "Chicago (12 mi)", "Grosse Point Lighthouse", "Baha'i Temple"],
        "student_clubs_count": 140,
        "sports_facilities": ["Henry Crown Sports Pavilion", "Norris Aquatics Center", "Tennis courts", "Running trails", "Ryan Fieldhouse"],
    },
    {
        "school_id": "cbs",
        "school_name": "Columbia Business School",
        "city": "New York City",
        "state_or_country": "New York",
        "climate": "Four seasons — hot, humid summers; cold winters with occasional nor'easters.",
        "housing": {"on_campus_available": True, "avg_monthly_rent": 3000},
        "walkability_score": 10,
        "nightlife_score": 10,
        "cost_of_living_index": 187,
        "nearby_attractions": ["Central Park", "Broadway theaters", "Hudson Yards", "Brooklyn Bridge", "Museum Mile"],
        "student_clubs_count": 160,
        "sports_facilities": ["Manhattanville campus gym", "Baker Athletics Complex", "Tennis courts", "Indoor pool", "Dodge Fitness Center"],
    },
    {
        "school_id": "sloan",
        "school_name": "MIT Sloan",
        "city": "Cambridge",
        "state_or_country": "Massachusetts",
        "climate": "Cold winters with nor'easters; warm, humid summers. Classic New England weather.",
        "housing": {"on_campus_available": True, "avg_monthly_rent": 2500},
        "walkability_score": 9,
        "nightlife_score": 7,
        "cost_of_living_index": 152,
        "nearby_attractions": ["Kendall Square tech hub", "Harvard Square", "Charles River", "Boston waterfront", "MIT Museum"],
        "student_clubs_count": 100,
        "sports_facilities": ["Zesiger Sports & Fitness Center", "Sailing pavilion", "Indoor pool", "Squash courts", "Outdoor track"],
    },
    {
        "school_id": "tuck",
        "school_name": "Tuck School of Business",
        "city": "Hanover",
        "state_or_country": "New Hampshire",
        "climate": "Long, snowy winters; beautiful fall foliage; short but warm summers.",
        "housing": {"on_campus_available": True, "avg_monthly_rent": 1400},
        "walkability_score": 5,
        "nightlife_score": 3,
        "cost_of_living_index": 92,
        "nearby_attractions": ["Appalachian Trail", "Dartmouth skiway", "Connecticut River", "Quechee Gorge", "Woodstock village"],
        "student_clubs_count": 70,
        "sports_facilities": ["Alumni Gymnasium", "Leverone Field House", "Dartmouth Skiway", "Golf course", "Outdoor pool"],
    },
    {
        "school_id": "haas",
        "school_name": "UC Berkeley Haas",
        "city": "Berkeley",
        "state_or_country": "California",
        "climate": "Mild Mediterranean — cool fog mornings, sunny afternoons, minimal rain May–October.",
        "housing": {"on_campus_available": False, "avg_monthly_rent": 2800},
        "walkability_score": 8,
        "nightlife_score": 7,
        "cost_of_living_index": 164,
        "nearby_attractions": ["San Francisco (15 mi)", "Tilden Regional Park", "Berkeley Marina", "Gourmet Ghetto", "UC Botanical Garden"],
        "student_clubs_count": 90,
        "sports_facilities": ["Recreational Sports Facility", "Strawberry Canyon pool", "Tennis courts", "Golden Bear Recreation Center", "Stadium running track"],
    },
    {
        "school_id": "ross",
        "school_name": "Michigan Ross",
        "city": "Ann Arbor",
        "state_or_country": "Michigan",
        "climate": "Cold, snowy winters; warm summers. Classic Midwest seasons with lake-effect snow.",
        "housing": {"on_campus_available": False, "avg_monthly_rent": 1400},
        "walkability_score": 7,
        "nightlife_score": 7,
        "cost_of_living_index": 95,
        "nearby_attractions": ["Michigan Stadium (The Big House)", "Ann Arbor Art Fair", "Huron River", "Nichols Arboretum", "Zingerman's Deli"],
        "student_clubs_count": 110,
        "sports_facilities": ["Central Campus Recreation Building", "Indoor pool", "Ross fitness center", "Golf course", "Ice arena"],
    },
]


@router.get("/campus-life")
def get_campus_life(
    school_id: str | None = Query(default=None, description="Comma-separated school IDs to filter"),
):
    """Return campus life data for MBA schools — housing, climate, scores, attractions."""
    if school_id:
        ids = [s.strip().lower() for s in school_id.split(",") if s.strip()]
        lookup = {e["school_id"]: e for e in _CAMPUS_LIFE_DATA}
        results = [lookup[sid] for sid in ids if sid in lookup]
        if not results:
            raise HTTPException(404, f"No campus life data for: {school_id}")
        return {"schools": results, "total": len(results)}

    return {"schools": _CAMPUS_LIFE_DATA, "total": len(_CAMPUS_LIFE_DATA)}



# ── School News Feed ──────────────────────────────────────────────────


class _NewsItem(_BaseModel):
    school_id: str
    school_name: str
    headline: str
    summary: str
    date: str
    category: str


_SCHOOL_NEWS: list[dict] = [
    {
        "school_id": "hbs",
        "school_name": "Harvard Business School",
        "headline": "HBS Launches New Climate-Focused MBA Elective",
        "summary": "Harvard Business School announced a new elective on climate finance and sustainability, reflecting growing student demand for ESG-oriented coursework.",
        "date": "2026-03-15",
        "category": "curriculum",
    },
    {
        "school_id": "gsb",
        "school_name": "Stanford GSB",
        "headline": "Stanford GSB Rises to #1 in Latest FT Global MBA Ranking",
        "summary": "Stanford Graduate School of Business reclaimed the top spot in the Financial Times 2026 Global MBA ranking, edging past Wharton and INSEAD.",
        "date": "2026-03-14",
        "category": "ranking",
    },
    {
        "school_id": "wharton",
        "school_name": "Wharton School",
        "headline": "Wharton Hires Former Fed Economist as Finance Chair",
        "summary": "The Wharton School appointed Dr. Elena Vasquez, previously a senior economist at the Federal Reserve, to lead its Finance Department.",
        "date": "2026-03-13",
        "category": "faculty",
    },
    {
        "school_id": "booth",
        "school_name": "Chicago Booth",
        "headline": "Booth Students Launch AI-Powered Consulting Club",
        "summary": "A group of second-year Booth students created an AI consulting club that partners with Chicago startups on machine learning strategy projects.",
        "date": "2026-03-12",
        "category": "student_life",
    },
    {
        "school_id": "kellogg",
        "school_name": "Kellogg School of Management",
        "headline": "Kellogg Reports Record Placement in Tech Sector",
        "summary": "Kellogg's 2025 employment report shows 38% of graduates entered tech roles, up from 29% last year — a new school record.",
        "date": "2026-03-11",
        "category": "career",
    },
    {
        "school_id": "cbs",
        "school_name": "Columbia Business School",
        "headline": "CBS Opens New Manhattanville Campus Building",
        "summary": "Columbia Business School officially opened its third Manhattanville building, adding state-of-the-art classrooms and a fintech innovation lab.",
        "date": "2026-03-10",
        "category": "student_life",
    },
    {
        "school_id": "sloan",
        "school_name": "MIT Sloan",
        "headline": "MIT Sloan Extends Application Deadline for Round 3",
        "summary": "MIT Sloan announced a two-week extension for Round 3 applications, citing high demand and a desire to accommodate more international applicants.",
        "date": "2026-03-09",
        "category": "admissions",
    },
    {
        "school_id": "tuck",
        "school_name": "Tuck School of Business",
        "headline": "Tuck Named Most Tight-Knit MBA Community for 5th Year",
        "summary": "Poets & Quants once again ranked Tuck #1 for student satisfaction and community culture, citing its small class size and Hanover setting.",
        "date": "2026-03-08",
        "category": "ranking",
    },
    {
        "school_id": "haas",
        "school_name": "UC Berkeley Haas",
        "headline": "Haas Introduces Blockchain & Web3 Concentration",
        "summary": "UC Berkeley Haas launched a new MBA concentration in blockchain technology and decentralized finance, leveraging the university's strong CS department.",
        "date": "2026-03-07",
        "category": "curriculum",
    },
    {
        "school_id": "ross",
        "school_name": "Michigan Ross",
        "headline": "Ross MAP Projects Generate $12M in Client Value",
        "summary": "Michigan Ross reported that its signature Multidisciplinary Action Projects (MAP) delivered over $12 million in measurable client value this academic year.",
        "date": "2026-03-06",
        "category": "career",
    },
    {
        "school_id": "hbs",
        "school_name": "Harvard Business School",
        "headline": "HBS Admits Most Diverse Class in School History",
        "summary": "The incoming HBS Class of 2028 is 47% female and represents 78 countries — the most diverse cohort since the school's founding.",
        "date": "2026-03-05",
        "category": "admissions",
    },
    {
        "school_id": "gsb",
        "school_name": "Stanford GSB",
        "headline": "Stanford GSB Faculty Win Nobel-Adjacent Econ Prize",
        "summary": "Two GSB professors were awarded the John Bates Clark Medal and the Fischer Black Prize, raising the school's research profile.",
        "date": "2026-03-04",
        "category": "faculty",
    },
]


@router.get("/school-news")
def get_school_news(
    school_id: str | None = Query(default=None, description="Filter by school ID"),
):
    """Return recent MBA school news items, optionally filtered by school."""
    if school_id:
        sid = school_id.strip().lower()
        items = [n for n in _SCHOOL_NEWS if n["school_id"] == sid]
        if not items:
            raise HTTPException(404, f"No news found for school: {school_id}")
        return {"news": items, "total": len(items)}

    return {"news": _SCHOOL_NEWS, "total": len(_SCHOOL_NEWS)}



# ── Dual Degree Explorer ─────────────────────────────────────────────

_DUAL_DEGREE_PROGRAMS = [
    {
        "school_id": "hbs",
        "school_name": "Harvard Business School",
        "partner_school": "Harvard Law School",
        "degree_combo": "MBA/JD",
        "duration": "4 years",
        "typical_applicants": "Students interested in corporate law, private equity, venture capital, or policy.",
        "unique_benefits": "Access to both HBS and HLS networks; joint career services; strong placement in PE/VC.",
    },
    {
        "school_id": "hbs",
        "school_name": "Harvard Business School",
        "partner_school": "Harvard Kennedy School",
        "degree_combo": "MBA/MPP",
        "duration": "3 years",
        "typical_applicants": "Future public sector leaders, policy entrepreneurs, and social impact professionals.",
        "unique_benefits": "Combines analytical rigor of HBS with policy depth; strong government and nonprofit placement.",
    },
    {
        "school_id": "hbs",
        "school_name": "Harvard Business School",
        "partner_school": "Harvard Medical School",
        "degree_combo": "MBA/MD",
        "duration": "5 years",
        "typical_applicants": "Physician-leaders pursuing healthcare administration, biotech, or med-tech startups.",
        "unique_benefits": "Unique physician-executive training; access to Harvard's health system and innovation labs.",
    },
    {
        "school_id": "gsb",
        "school_name": "Stanford GSB",
        "partner_school": "Stanford School of Engineering",
        "degree_combo": "MBA/MS",
        "duration": "3 years",
        "typical_applicants": "Tech founders, product managers, and engineers seeking business acumen.",
        "unique_benefits": "Silicon Valley network; access to Stanford's engineering labs and CS faculty.",
    },
    {
        "school_id": "gsb",
        "school_name": "Stanford GSB",
        "partner_school": "Stanford Law School",
        "degree_combo": "MBA/JD",
        "duration": "4 years",
        "typical_applicants": "Aspiring tech lawyers, venture capitalists, and startup founders with legal interests.",
        "unique_benefits": "Premier West Coast legal-business network; strong VC and tech law placement.",
    },
    {
        "school_id": "wharton",
        "school_name": "Wharton",
        "partner_school": "Penn Law",
        "degree_combo": "MBA/JD",
        "duration": "3.5 years",
        "typical_applicants": "Future M&A lawyers, corporate counsels, and finance-law professionals.",
        "unique_benefits": "One of the oldest JD/MBA programs; strong Wall Street and BigLaw placement.",
    },
    {
        "school_id": "wharton",
        "school_name": "Wharton",
        "partner_school": "Penn Engineering",
        "degree_combo": "MBA/MS",
        "duration": "2.5 years",
        "typical_applicants": "Tech professionals seeking quantitative and business leadership skills.",
        "unique_benefits": "Integrated curriculum combining Wharton analytics with Penn Engineering depth.",
    },
    {
        "school_id": "cbs",
        "school_name": "Columbia Business School",
        "partner_school": "Columbia Law School",
        "degree_combo": "MBA/JD",
        "duration": "4 years",
        "typical_applicants": "NYC-focused professionals in corporate law, media, and financial regulation.",
        "unique_benefits": "NYC location premium; strong placement in media, entertainment law, and Wall Street.",
    },
    {
        "school_id": "cbs",
        "school_name": "Columbia Business School",
        "partner_school": "SIPA (Columbia)",
        "degree_combo": "MBA/MPA",
        "duration": "3 years",
        "typical_applicants": "International development professionals and aspiring policy leaders.",
        "unique_benefits": "UN proximity; global development network; strong international placement.",
    },
    {
        "school_id": "kellogg",
        "school_name": "Kellogg",
        "partner_school": "Northwestern Pritzker School of Law",
        "degree_combo": "MBA/JD",
        "duration": "3.5 years",
        "typical_applicants": "Corporate strategy professionals interested in law, governance, and compliance.",
        "unique_benefits": "Collaborative culture across schools; strong Chicago corporate placement.",
    },
    {
        "school_id": "kellogg",
        "school_name": "Kellogg",
        "partner_school": "Northwestern McCormick School of Engineering",
        "degree_combo": "MBA/MS",
        "duration": "2.5 years",
        "typical_applicants": "Engineers transitioning to product management, tech strategy, or operations.",
        "unique_benefits": "Design thinking integration; access to MMM (Manufacturing & Management) program resources.",
    },
    {
        "school_id": "booth",
        "school_name": "Chicago Booth",
        "partner_school": "University of Chicago Law School",
        "degree_combo": "MBA/JD",
        "duration": "4 years",
        "typical_applicants": "Analytically minded professionals pursuing law and economics, antitrust, or policy.",
        "unique_benefits": "Economics-rooted approach to both law and business; top placement in consulting and law.",
    },
    {
        "school_id": "booth",
        "school_name": "Chicago Booth",
        "partner_school": "Pritzker School of Medicine",
        "degree_combo": "MBA/MD",
        "duration": "5 years",
        "typical_applicants": "Future healthcare executives, biotech entrepreneurs, and health policy leaders.",
        "unique_benefits": "Strong quantitative training combined with clinical experience; Chicago's health sector access.",
    },
    {
        "school_id": "sloan",
        "school_name": "MIT Sloan",
        "partner_school": "MIT School of Engineering",
        "degree_combo": "MBA/MS",
        "duration": "2.5 years",
        "typical_applicants": "Deep-tech founders, AI/ML professionals, and hardware entrepreneurs.",
        "unique_benefits": "Unmatched engineering integration; MIT Media Lab and CSAIL access; strong in robotics and AI.",
    },
    {
        "school_id": "sloan",
        "school_name": "MIT Sloan",
        "partner_school": "Harvard Kennedy School",
        "degree_combo": "MBA/MPP",
        "duration": "3 years",
        "typical_applicants": "Tech policy professionals, civic tech entrepreneurs, and government innovators.",
        "unique_benefits": "Cross-registration between MIT and Harvard; unique tech-policy intersection.",
    },
    {
        "school_id": "haas",
        "school_name": "UC Berkeley Haas",
        "partner_school": "UC Berkeley School of Public Health",
        "degree_combo": "MBA/MPH",
        "duration": "3 years",
        "typical_applicants": "Health-tech founders, global health leaders, and biotech executives.",
        "unique_benefits": "Bay Area biotech ecosystem; strong public health research; access to UCSF network.",
    },
    {
        "school_id": "tuck",
        "school_name": "Dartmouth Tuck",
        "partner_school": "Thayer School of Engineering",
        "degree_combo": "MBA/MS",
        "duration": "2.5 years",
        "typical_applicants": "Engineers seeking general management roles in manufacturing or tech.",
        "unique_benefits": "Small, tight-knit cohort; strong alumni loyalty; integrated curriculum.",
    },
]

_DEGREE_TYPE_MAP = {
    "JD": "JD",
    "MD": "MD",
    "MPP": "MPP",
    "MPA": "MPP",
    "MS": "MS",
    "PhD": "PhD",
    "MPH": "MPH",
}


@router.get("/dual-degrees")
def get_dual_degrees(
    school_id: str | None = Query(default=None, description="Filter by school ID"),
    degree_type: str | None = Query(default=None, description="Filter by degree type: JD, MD, MPP, MS, PhD"),
):
    """Return dual degree programs offered at top MBA schools."""
    results = list(_DUAL_DEGREE_PROGRAMS)

    if school_id:
        sid = school_id.strip().lower()
        results = [p for p in results if p["school_id"] == sid]

    if degree_type:
        dt = degree_type.strip().upper()
        results = [p for p in results if dt in p["degree_combo"].upper()]

    return {"programs": results, "total": len(results)}



# ── Class Size Comparison ────────────────────────────────────────────

_CLASS_SIZE_DATA = [
    {"school_id": "hbs", "school_name": "Harvard Business School", "class_size": 930, "sections": 10, "avg_section_size": 93, "student_faculty_ratio": 5.2, "international_pct": 37},
    {"school_id": "gsb", "school_name": "Stanford GSB", "class_size": 424, "sections": 8, "avg_section_size": 53, "student_faculty_ratio": 4.1, "international_pct": 41},
    {"school_id": "wharton", "school_name": "Wharton", "class_size": 918, "sections": 12, "avg_section_size": 77, "student_faculty_ratio": 5.0, "international_pct": 33},
    {"school_id": "booth", "school_name": "Chicago Booth", "class_size": 614, "sections": 0, "avg_section_size": 0, "student_faculty_ratio": 5.8, "international_pct": 36},
    {"school_id": "kellogg", "school_name": "Kellogg", "class_size": 504, "sections": 6, "avg_section_size": 84, "student_faculty_ratio": 5.5, "international_pct": 37},
    {"school_id": "cbs", "school_name": "Columbia Business School", "class_size": 850, "sections": 8, "avg_section_size": 106, "student_faculty_ratio": 6.0, "international_pct": 48},
    {"school_id": "sloan", "school_name": "MIT Sloan", "class_size": 480, "sections": 6, "avg_section_size": 80, "student_faculty_ratio": 4.5, "international_pct": 42},
    {"school_id": "tuck", "school_name": "Dartmouth Tuck", "class_size": 295, "sections": 4, "avg_section_size": 74, "student_faculty_ratio": 4.0, "international_pct": 36},
    {"school_id": "haas", "school_name": "UC Berkeley Haas", "class_size": 291, "sections": 4, "avg_section_size": 73, "student_faculty_ratio": 4.8, "international_pct": 40},
    {"school_id": "ross", "school_name": "Michigan Ross", "class_size": 425, "sections": 6, "avg_section_size": 71, "student_faculty_ratio": 5.3, "international_pct": 34},
    {"school_id": "fuqua", "school_name": "Duke Fuqua", "class_size": 440, "sections": 6, "avg_section_size": 73, "student_faculty_ratio": 5.0, "international_pct": 39},
    {"school_id": "darden", "school_name": "UVA Darden", "class_size": 345, "sections": 5, "avg_section_size": 69, "student_faculty_ratio": 4.2, "international_pct": 35},
    {"school_id": "stern", "school_name": "NYU Stern", "class_size": 392, "sections": 6, "avg_section_size": 65, "student_faculty_ratio": 5.6, "international_pct": 42},
    {"school_id": "anderson", "school_name": "UCLA Anderson", "class_size": 360, "sections": 5, "avg_section_size": 72, "student_faculty_ratio": 5.1, "international_pct": 33},
    {"school_id": "johnson", "school_name": "Cornell Johnson", "class_size": 290, "sections": 4, "avg_section_size": 73, "student_faculty_ratio": 4.9, "international_pct": 31},
    {"school_id": "tepper", "school_name": "CMU Tepper", "class_size": 220, "sections": 4, "avg_section_size": 55, "student_faculty_ratio": 4.3, "international_pct": 44},
    {"school_id": "mcdonough", "school_name": "Georgetown McDonough", "class_size": 260, "sections": 4, "avg_section_size": 65, "student_faculty_ratio": 5.4, "international_pct": 38},
    {"school_id": "marshall", "school_name": "USC Marshall", "class_size": 230, "sections": 4, "avg_section_size": 58, "student_faculty_ratio": 5.2, "international_pct": 35},
]

_VALID_SORT_FIELDS = {"class_size", "school_name", "avg_section_size", "student_faculty_ratio", "international_pct", "sections"}


@router.get("/class-size")
def get_class_size(
    sort_by: str = Query(default="class_size", description="Sort field: class_size, school_name, avg_section_size, student_faculty_ratio, international_pct"),
):
    """Return class size data for tracked MBA schools."""
    key = sort_by.strip().lower()
    if key not in _VALID_SORT_FIELDS:
        raise HTTPException(400, f"Invalid sort_by '{sort_by}'. Options: {', '.join(sorted(_VALID_SORT_FIELDS))}")

    reverse = key != "school_name"
    sorted_data = sorted(_CLASS_SIZE_DATA, key=lambda s: s.get(key, 0), reverse=reverse)

    return {"schools": sorted_data, "total": len(sorted_data), "sorted_by": key}



# ── Post-MBA Location Guide ─────────────────────────────────────────

_POST_MBA_LOCATIONS = [
    {
        "city": "New York City",
        "country": "United States",
        "top_industries": ["Finance", "Consulting", "Media", "Tech"],
        "avg_mba_salary": 185000,
        "cost_of_living_index": 187,
        "quality_of_life_score": 7.2,
        "visa_friendliness": "Moderate — H-1B lottery required; OPT available for recent grads.",
        "top_employers": ["Goldman Sachs", "McKinsey", "JPMorgan", "Google", "Amazon"],
        "feeder_schools": ["Columbia", "Wharton", "NYU Stern", "Harvard", "Booth"],
    },
    {
        "city": "San Francisco",
        "country": "United States",
        "top_industries": ["Tech", "Venture Capital", "Startups", "Biotech"],
        "avg_mba_salary": 195000,
        "cost_of_living_index": 179,
        "quality_of_life_score": 7.8,
        "visa_friendliness": "Moderate — H-1B lottery; tech companies sponsor frequently.",
        "top_employers": ["Google", "Meta", "Apple", "Salesforce", "Sequoia Capital"],
        "feeder_schools": ["Stanford", "Haas", "Wharton", "Booth", "Kellogg"],
    },
    {
        "city": "London",
        "country": "United Kingdom",
        "top_industries": ["Finance", "Consulting", "Private Equity", "Fintech"],
        "avg_mba_salary": 135000,
        "cost_of_living_index": 152,
        "quality_of_life_score": 7.5,
        "visa_friendliness": "Good — Graduate visa (2 years) for UK MBA grads; Skilled Worker visa for jobs.",
        "top_employers": ["McKinsey", "Goldman Sachs", "Bain", "Revolut", "Barclays"],
        "feeder_schools": ["LBS", "INSEAD", "Oxford Said", "Cambridge Judge", "Harvard"],
    },
    {
        "city": "Singapore",
        "country": "Singapore",
        "top_industries": ["Finance", "Consulting", "Tech", "Private Equity"],
        "avg_mba_salary": 120000,
        "cost_of_living_index": 134,
        "quality_of_life_score": 8.3,
        "visa_friendliness": "Very Good — Employment Pass is straightforward for MBA grads; low rejection rate.",
        "top_employers": ["DBS", "GIC", "Temasek", "BCG", "Grab"],
        "feeder_schools": ["INSEAD", "NUS", "Booth", "Wharton", "Kellogg"],
    },
    {
        "city": "Dubai",
        "country": "UAE",
        "top_industries": ["Finance", "Consulting", "Real Estate", "Energy"],
        "avg_mba_salary": 115000,
        "cost_of_living_index": 112,
        "quality_of_life_score": 7.6,
        "visa_friendliness": "Excellent — Employer-sponsored work visa; no income tax; golden visa available.",
        "top_employers": ["McKinsey", "Emirates NBD", "Mubadala", "BCG", "ADNOC"],
        "feeder_schools": ["INSEAD", "LBS", "Booth", "Wharton", "Kellogg"],
    },
    {
        "city": "Chicago",
        "country": "United States",
        "top_industries": ["Consulting", "Finance", "CPG", "Healthcare"],
        "avg_mba_salary": 170000,
        "cost_of_living_index": 107,
        "quality_of_life_score": 7.0,
        "visa_friendliness": "Moderate — H-1B lottery; strong employer sponsorship in consulting.",
        "top_employers": ["McKinsey", "BCG", "Abbott", "Boeing", "Citadel"],
        "feeder_schools": ["Booth", "Kellogg", "Ross", "Harvard", "Wharton"],
    },
    {
        "city": "Los Angeles",
        "country": "United States",
        "top_industries": ["Entertainment", "Tech", "Healthcare", "Real Estate"],
        "avg_mba_salary": 165000,
        "cost_of_living_index": 146,
        "quality_of_life_score": 7.4,
        "visa_friendliness": "Moderate — H-1B lottery; entertainment and tech industries sponsor.",
        "top_employers": ["Disney", "Netflix", "SpaceX", "BCG", "CBRE"],
        "feeder_schools": ["Anderson", "Marshall", "Stanford", "Haas", "Wharton"],
    },
    {
        "city": "Boston",
        "country": "United States",
        "top_industries": ["Consulting", "Biotech", "Finance", "Education/Tech"],
        "avg_mba_salary": 175000,
        "cost_of_living_index": 152,
        "quality_of_life_score": 7.3,
        "visa_friendliness": "Moderate — H-1B lottery; strong biotech and consulting sponsorship.",
        "top_employers": ["Bain", "BCG", "Fidelity", "Moderna", "HubSpot"],
        "feeder_schools": ["Harvard", "MIT Sloan", "Tuck", "Yale SOM", "Wharton"],
    },
    {
        "city": "Hong Kong",
        "country": "China (SAR)",
        "top_industries": ["Finance", "Private Equity", "Consulting", "Real Estate"],
        "avg_mba_salary": 125000,
        "cost_of_living_index": 143,
        "quality_of_life_score": 6.8,
        "visa_friendliness": "Good — IANG visa for graduates; relatively easy employer sponsorship.",
        "top_employers": ["Goldman Sachs", "HSBC", "McKinsey", "Bain", "KKR"],
        "feeder_schools": ["HKUST", "INSEAD", "Booth", "Wharton", "LBS"],
    },
    {
        "city": "Mumbai",
        "country": "India",
        "top_industries": ["Finance", "Consulting", "Tech", "Consumer Goods"],
        "avg_mba_salary": 75000,
        "cost_of_living_index": 46,
        "quality_of_life_score": 5.8,
        "visa_friendliness": "Challenging — Employment visa requires sponsorship; slow processing.",
        "top_employers": ["McKinsey", "Reliance", "Tata", "BCG", "HDFC"],
        "feeder_schools": ["ISB", "IIM Ahmedabad", "IIM Bangalore", "XLRI", "Harvard"],
    },
    {
        "city": "Shanghai",
        "country": "China",
        "top_industries": ["Finance", "Tech", "Manufacturing", "Consumer"],
        "avg_mba_salary": 95000,
        "cost_of_living_index": 85,
        "quality_of_life_score": 6.5,
        "visa_friendliness": "Moderate — Z-visa required; employer must sponsor; improving for STEM talent.",
        "top_employers": ["Alibaba", "Tencent", "McKinsey", "CICC", "ByteDance"],
        "feeder_schools": ["CEIBS", "INSEAD", "Booth", "Wharton", "Kellogg"],
    },
]


@router.get("/post-mba-locations")
def get_post_mba_locations(
    sort_by: str = Query(default="avg_mba_salary", description="Sort field: avg_mba_salary, cost_of_living_index, quality_of_life_score, city"),
):
    """Return data on popular post-MBA cities worldwide."""
    valid = {"avg_mba_salary", "cost_of_living_index", "quality_of_life_score", "city"}
    key = sort_by.strip().lower()
    if key not in valid:
        raise HTTPException(400, f"Invalid sort_by '{sort_by}'. Options: {', '.join(sorted(valid))}")

    reverse = key != "city"
    sorted_data = sorted(_POST_MBA_LOCATIONS, key=lambda c: c.get(key, 0) if key != "city" else c["city"], reverse=reverse)

    return {"locations": sorted_data, "total": len(sorted_data), "sorted_by": key}



# ── MBA Concentration Finder ────────────────────────────────────────

_CONCENTRATIONS = [
    {"school_id": "hbs", "school_name": "Harvard Business School", "concentration_name": "Finance", "field": "finance", "courses_required": 5, "notable_faculty": "Mihir Desai, Victoria Ivashina", "career_outcomes": "Investment banking, private equity, corporate finance at top-tier firms."},
    {"school_id": "hbs", "school_name": "Harvard Business School", "concentration_name": "Entrepreneurship", "field": "entrepreneurship", "courses_required": 4, "notable_faculty": "Tom Eisenmann, Jeffrey Bussgang", "career_outcomes": "Startup founding, venture capital, corporate innovation."},
    {"school_id": "hbs", "school_name": "Harvard Business School", "concentration_name": "Social Enterprise", "field": "social_impact", "courses_required": 4, "notable_faculty": "Dutch Leonard, Allen Grossman", "career_outcomes": "Nonprofit leadership, impact investing, social venture founding."},
    {"school_id": "gsb", "school_name": "Stanford GSB", "concentration_name": "Strategic Management", "field": "consulting", "courses_required": 4, "notable_faculty": "Robert Burgelman, Jesper Sorensen", "career_outcomes": "Strategy consulting, corporate development, CEO/COO roles."},
    {"school_id": "gsb", "school_name": "Stanford GSB", "concentration_name": "Finance", "field": "finance", "courses_required": 5, "notable_faculty": "Jonathan Berk, Peter DeMarzo", "career_outcomes": "Venture capital, hedge funds, fintech startups."},
    {"school_id": "gsb", "school_name": "Stanford GSB", "concentration_name": "Entrepreneurship & Innovation", "field": "entrepreneurship", "courses_required": 4, "notable_faculty": "Chuck Eesley, Ilya Strebulaev", "career_outcomes": "Tech startup founding, product management, venture capital."},
    {"school_id": "wharton", "school_name": "Wharton", "concentration_name": "Finance", "field": "finance", "courses_required": 4, "notable_faculty": "Jeremy Siegel, Itay Goldstein", "career_outcomes": "Investment banking, private equity, quantitative finance."},
    {"school_id": "wharton", "school_name": "Wharton", "concentration_name": "Marketing", "field": "marketing", "courses_required": 4, "notable_faculty": "Jonah Berger, Peter Fader", "career_outcomes": "Brand management, digital marketing leadership, CMO track."},
    {"school_id": "wharton", "school_name": "Wharton", "concentration_name": "Health Care Management", "field": "healthcare", "courses_required": 4, "notable_faculty": "Mark Pauly, Lawton Burns", "career_outcomes": "Hospital administration, pharma strategy, health-tech ventures."},
    {"school_id": "wharton", "school_name": "Wharton", "concentration_name": "Operations, Information and Decisions", "field": "operations", "courses_required": 4, "notable_faculty": "Morris Cohen, Christian Terwiesch", "career_outcomes": "Supply chain leadership, operations consulting, tech operations."},
    {"school_id": "booth", "school_name": "Chicago Booth", "concentration_name": "Analytic Finance", "field": "finance", "courses_required": 5, "notable_faculty": "John Cochrane, Raghuram Rajan", "career_outcomes": "Quantitative trading, hedge funds, asset management."},
    {"school_id": "booth", "school_name": "Chicago Booth", "concentration_name": "Entrepreneurship", "field": "entrepreneurship", "courses_required": 4, "notable_faculty": "Steve Kaplan, Waverly Deutsch", "career_outcomes": "Startup founding, venture capital, private equity."},
    {"school_id": "booth", "school_name": "Chicago Booth", "concentration_name": "Marketing Management", "field": "marketing", "courses_required": 4, "notable_faculty": "Jean-Pierre Dube, Pradeep Chintagunta", "career_outcomes": "Data-driven marketing, CPG brand strategy, ad-tech."},
    {"school_id": "kellogg", "school_name": "Kellogg", "concentration_name": "Marketing", "field": "marketing", "courses_required": 4, "notable_faculty": "Philip Kotler, Lakshman Krishnamurthi", "career_outcomes": "Brand strategy, consumer insights, marketing analytics leadership."},
    {"school_id": "kellogg", "school_name": "Kellogg", "concentration_name": "Management & Organizations", "field": "consulting", "courses_required": 4, "notable_faculty": "Brian Uzzi, Adam Galinsky", "career_outcomes": "Management consulting, organizational transformation, leadership."},
    {"school_id": "kellogg", "school_name": "Kellogg", "concentration_name": "Social Impact", "field": "social_impact", "courses_required": 3, "notable_faculty": "Megan Kashner, William Ocasio", "career_outcomes": "Social enterprise leadership, ESG consulting, impact measurement."},
    {"school_id": "cbs", "school_name": "Columbia Business School", "concentration_name": "Finance & Economics", "field": "finance", "courses_required": 5, "notable_faculty": "Tano Santos, Patrick Bolton", "career_outcomes": "Investment banking, hedge funds, Wall Street trading desks."},
    {"school_id": "cbs", "school_name": "Columbia Business School", "concentration_name": "Media, Technology & Entrepreneurship", "field": "tech", "courses_required": 4, "notable_faculty": "Oded Netzer, Michael Woodford", "career_outcomes": "Media-tech leadership, digital product management, startup founding."},
    {"school_id": "sloan", "school_name": "MIT Sloan", "concentration_name": "Finance", "field": "finance", "courses_required": 4, "notable_faculty": "Andrew Lo, Antoinette Schoar", "career_outcomes": "Fintech, quantitative finance, venture capital."},
    {"school_id": "sloan", "school_name": "MIT Sloan", "concentration_name": "Technological Innovation, Entrepreneurship, and Strategic Management", "field": "tech", "courses_required": 5, "notable_faculty": "Fiona Murray, Scott Stern", "career_outcomes": "Deep-tech founding, AI/ML product leadership, tech consulting."},
    {"school_id": "sloan", "school_name": "MIT Sloan", "concentration_name": "Operations Management", "field": "operations", "courses_required": 4, "notable_faculty": "Georgia Perakis, Retsef Levi", "career_outcomes": "Supply chain optimization, operations consulting, logistics tech."},
    {"school_id": "haas", "school_name": "UC Berkeley Haas", "concentration_name": "Healthcare", "field": "healthcare", "courses_required": 3, "notable_faculty": "Brent Fulton, James Robinson", "career_outcomes": "Health-tech ventures, biotech commercialization, hospital strategy."},
    {"school_id": "haas", "school_name": "UC Berkeley Haas", "concentration_name": "Social Impact", "field": "social_impact", "courses_required": 3, "notable_faculty": "Laura Tyson, Catherine Wolfram", "career_outcomes": "Impact investing, cleantech, social enterprise leadership."},
    {"school_id": "tuck", "school_name": "Dartmouth Tuck", "concentration_name": "Healthcare", "field": "healthcare", "courses_required": 3, "notable_faculty": "Erin Sullivan, Phillip Phan", "career_outcomes": "Pharma management, health-tech, hospital administration."},
    {"school_id": "ross", "school_name": "Michigan Ross", "concentration_name": "Technology & Operations", "field": "tech", "courses_required": 4, "notable_faculty": "M.S. Krishnan, Ravi Anupindi", "career_outcomes": "Tech strategy, digital transformation, product management."},
    {"school_id": "fuqua", "school_name": "Duke Fuqua", "concentration_name": "Health Sector Management", "field": "healthcare", "courses_required": 4, "notable_faculty": "David Ridley, Kevin Schulman", "career_outcomes": "Healthcare consulting, pharma strategy, biotech commercialization."},
]

_VALID_FIELDS = {"finance", "tech", "consulting", "marketing", "healthcare", "social_impact", "entrepreneurship", "operations"}


@router.get("/concentrations")
def get_concentrations(
    school_id: str | None = Query(default=None, description="Filter by school ID"),
    field: str | None = Query(default=None, description="Filter by field: finance, tech, consulting, marketing, healthcare, social_impact, entrepreneurship, operations"),
):
    """Return MBA concentrations/majors at top schools."""
    results = list(_CONCENTRATIONS)

    if school_id:
        sid = school_id.strip().lower()
        results = [c for c in results if c["school_id"] == sid]

    if field:
        f = field.strip().lower()
        if f not in _VALID_FIELDS:
            raise HTTPException(400, f"Invalid field '{field}'. Options: {', '.join(sorted(_VALID_FIELDS))}")
        results = [c for c in results if c["field"] == f]

    return {"concentrations": results, "total": len(results)}



# ── Acceptance Rate History ────────────────────────────────────────────────


class _YearRecord(_BaseModel):
    year: int
    acceptance_rate: float
    applications: int
    class_size: int


class _AcceptanceSchool(_BaseModel):
    school_id: str
    school_name: str
    years: list[_YearRecord]
    trend: str


class _AcceptanceRateHistoryResponse(_BaseModel):
    schools: list[_AcceptanceSchool]
    total: int


def _calc_trend(years: list[dict]) -> str:
    """Determine trend from first to last year acceptance rate."""
    if len(years) < 2:
        return "stable"
    first = years[0]["acceptance_rate"]
    last = years[-1]["acceptance_rate"]
    diff = last - first
    if diff > 1.0:
        return "up"
    elif diff < -1.0:
        return "down"
    return "stable"


_ACCEPTANCE_RATE_DATA: list[dict] = [
    {
        "school_id": "hbs",
        "school_name": "Harvard Business School",
        "years": [
            {"year": 2022, "acceptance_rate": 11.0, "applications": 9773, "class_size": 938},
            {"year": 2023, "acceptance_rate": 11.5, "applications": 9520, "class_size": 930},
            {"year": 2024, "acceptance_rate": 12.0, "applications": 9304, "class_size": 935},
            {"year": 2025, "acceptance_rate": 11.8, "applications": 9610, "class_size": 940},
            {"year": 2026, "acceptance_rate": 11.3, "applications": 9900, "class_size": 932},
        ],
    },
    {
        "school_id": "gsb",
        "school_name": "Stanford GSB",
        "years": [
            {"year": 2022, "acceptance_rate": 6.2, "applications": 7368, "class_size": 424},
            {"year": 2023, "acceptance_rate": 6.0, "applications": 7510, "class_size": 420},
            {"year": 2024, "acceptance_rate": 5.7, "applications": 7880, "class_size": 418},
            {"year": 2025, "acceptance_rate": 5.5, "applications": 8100, "class_size": 421},
            {"year": 2026, "acceptance_rate": 5.3, "applications": 8350, "class_size": 417},
        ],
    },
    {
        "school_id": "wharton",
        "school_name": "Wharton",
        "years": [
            {"year": 2022, "acceptance_rate": 19.2, "applications": 7158, "class_size": 916},
            {"year": 2023, "acceptance_rate": 18.5, "applications": 7340, "class_size": 912},
            {"year": 2024, "acceptance_rate": 17.8, "applications": 7600, "class_size": 920},
            {"year": 2025, "acceptance_rate": 17.2, "applications": 7850, "class_size": 918},
            {"year": 2026, "acceptance_rate": 16.5, "applications": 8100, "class_size": 910},
        ],
    },
    {
        "school_id": "booth",
        "school_name": "Chicago Booth",
        "years": [
            {"year": 2022, "acceptance_rate": 21.3, "applications": 4650, "class_size": 618},
            {"year": 2023, "acceptance_rate": 20.8, "applications": 4800, "class_size": 620},
            {"year": 2024, "acceptance_rate": 20.2, "applications": 4950, "class_size": 615},
            {"year": 2025, "acceptance_rate": 19.5, "applications": 5100, "class_size": 622},
            {"year": 2026, "acceptance_rate": 19.0, "applications": 5300, "class_size": 618},
        ],
    },
    {
        "school_id": "kellogg",
        "school_name": "Kellogg",
        "years": [
            {"year": 2022, "acceptance_rate": 20.1, "applications": 4780, "class_size": 504},
            {"year": 2023, "acceptance_rate": 19.6, "applications": 4900, "class_size": 500},
            {"year": 2024, "acceptance_rate": 19.0, "applications": 5050, "class_size": 498},
            {"year": 2025, "acceptance_rate": 18.5, "applications": 5200, "class_size": 502},
            {"year": 2026, "acceptance_rate": 18.0, "applications": 5400, "class_size": 500},
        ],
    },
    {
        "school_id": "cbs",
        "school_name": "Columbia Business School",
        "years": [
            {"year": 2022, "acceptance_rate": 15.5, "applications": 6100, "class_size": 776},
            {"year": 2023, "acceptance_rate": 15.0, "applications": 6300, "class_size": 770},
            {"year": 2024, "acceptance_rate": 14.3, "applications": 6550, "class_size": 768},
            {"year": 2025, "acceptance_rate": 13.8, "applications": 6800, "class_size": 772},
            {"year": 2026, "acceptance_rate": 13.2, "applications": 7050, "class_size": 765},
        ],
    },
    {
        "school_id": "sloan",
        "school_name": "MIT Sloan",
        "years": [
            {"year": 2022, "acceptance_rate": 14.6, "applications": 5430, "class_size": 480},
            {"year": 2023, "acceptance_rate": 14.0, "applications": 5600, "class_size": 475},
            {"year": 2024, "acceptance_rate": 13.5, "applications": 5800, "class_size": 478},
            {"year": 2025, "acceptance_rate": 13.0, "applications": 6000, "class_size": 474},
            {"year": 2026, "acceptance_rate": 12.5, "applications": 6250, "class_size": 472},
        ],
    },
    {
        "school_id": "tuck",
        "school_name": "Dartmouth Tuck",
        "years": [
            {"year": 2022, "acceptance_rate": 23.2, "applications": 2780, "class_size": 286},
            {"year": 2023, "acceptance_rate": 22.5, "applications": 2850, "class_size": 282},
            {"year": 2024, "acceptance_rate": 22.0, "applications": 2920, "class_size": 284},
            {"year": 2025, "acceptance_rate": 21.5, "applications": 3000, "class_size": 280},
            {"year": 2026, "acceptance_rate": 21.0, "applications": 3100, "class_size": 283},
        ],
    },
    {
        "school_id": "haas",
        "school_name": "UC Berkeley Haas",
        "years": [
            {"year": 2022, "acceptance_rate": 17.5, "applications": 3800, "class_size": 292},
            {"year": 2023, "acceptance_rate": 16.8, "applications": 3950, "class_size": 288},
            {"year": 2024, "acceptance_rate": 16.2, "applications": 4100, "class_size": 290},
            {"year": 2025, "acceptance_rate": 15.5, "applications": 4250, "class_size": 286},
            {"year": 2026, "acceptance_rate": 15.0, "applications": 4400, "class_size": 284},
        ],
    },
    {
        "school_id": "stern",
        "school_name": "NYU Stern",
        "years": [
            {"year": 2022, "acceptance_rate": 23.8, "applications": 3950, "class_size": 360},
            {"year": 2023, "acceptance_rate": 23.0, "applications": 4100, "class_size": 356},
            {"year": 2024, "acceptance_rate": 22.3, "applications": 4250, "class_size": 358},
            {"year": 2025, "acceptance_rate": 21.5, "applications": 4400, "class_size": 354},
            {"year": 2026, "acceptance_rate": 21.0, "applications": 4550, "class_size": 352},
        ],
    },
    {
        "school_id": "ross",
        "school_name": "Michigan Ross",
        "years": [
            {"year": 2022, "acceptance_rate": 25.1, "applications": 3400, "class_size": 426},
            {"year": 2023, "acceptance_rate": 24.5, "applications": 3500, "class_size": 420},
            {"year": 2024, "acceptance_rate": 23.8, "applications": 3620, "class_size": 418},
            {"year": 2025, "acceptance_rate": 23.2, "applications": 3750, "class_size": 422},
            {"year": 2026, "acceptance_rate": 22.5, "applications": 3900, "class_size": 416},
        ],
    },
    {
        "school_id": "fuqua",
        "school_name": "Duke Fuqua",
        "years": [
            {"year": 2022, "acceptance_rate": 22.0, "applications": 3680, "class_size": 440},
            {"year": 2023, "acceptance_rate": 21.5, "applications": 3800, "class_size": 435},
            {"year": 2024, "acceptance_rate": 20.8, "applications": 3950, "class_size": 438},
            {"year": 2025, "acceptance_rate": 20.2, "applications": 4100, "class_size": 432},
            {"year": 2026, "acceptance_rate": 19.5, "applications": 4280, "class_size": 430},
        ],
    },
]

# Pre-compute trends
for _school_entry in _ACCEPTANCE_RATE_DATA:
    _school_entry["trend"] = _calc_trend(_school_entry["years"])


@router.get("/acceptance-rate-history")
def get_acceptance_rate_history(
    school_id: str | None = Query(default=None, description="Comma-separated school IDs"),
):
    """Return 5-year acceptance rate history for top MBA programs."""
    if school_id:
        ids = [s.strip().lower() for s in school_id.split(",") if s.strip()]
        results = [s for s in _ACCEPTANCE_RATE_DATA if s["school_id"] in ids]
        if not results:
            raise HTTPException(404, f"No acceptance rate data for: {school_id}")
    else:
        results = list(_ACCEPTANCE_RATE_DATA)

    return {"schools": results, "total": len(results)}



# ── Employment Report Browser ────────────────────────────────────────────────

from pydantic import BaseModel as _BaseModel  # noqa: E811


class _IndustryBreakdown(_BaseModel):
    industry: str
    pct: float


class _FunctionBreakdown(_BaseModel):
    function: str
    pct: float


class _EmploymentReport(_BaseModel):
    school_id: str
    school_name: str
    year: int
    employment_rate_at_3_months: float
    median_base_salary: int
    median_signing_bonus: int
    top_industries: list[_IndustryBreakdown]
    top_employers: list[str]
    top_functions: list[_FunctionBreakdown]


class _EmploymentReportsResponse(_BaseModel):
    schools: list[_EmploymentReport]
    total: int
    industries: list[str]
    functions: list[str]


_EMPLOYMENT_REPORT_DATA: list[dict] = [
    {
        "school_id": "hbs",
        "school_name": "Harvard Business School",
        "year": 2025,
        "employment_rate_at_3_months": 96.2,
        "median_base_salary": 175000,
        "median_signing_bonus": 30000,
        "top_industries": [
            {"industry": "consulting", "pct": 25},
            {"industry": "technology", "pct": 22},
            {"industry": "financial_services", "pct": 20},
            {"industry": "pe_vc", "pct": 15},
            {"industry": "healthcare", "pct": 8},
        ],
        "top_employers": ["McKinsey", "BCG", "Bain", "Amazon", "Google", "Goldman Sachs"],
        "top_functions": [
            {"function": "consulting", "pct": 25},
            {"function": "finance", "pct": 24},
            {"function": "general_management", "pct": 16},
            {"function": "marketing", "pct": 12},
            {"function": "operations", "pct": 8},
        ],
    },
    {
        "school_id": "gsb",
        "school_name": "Stanford GSB",
        "year": 2025,
        "employment_rate_at_3_months": 95.8,
        "median_base_salary": 180000,
        "median_signing_bonus": 30000,
        "top_industries": [
            {"industry": "technology", "pct": 30},
            {"industry": "pe_vc", "pct": 18},
            {"industry": "consulting", "pct": 14},
            {"industry": "financial_services", "pct": 12},
            {"industry": "entrepreneurship", "pct": 10},
        ],
        "top_employers": ["Google", "Apple", "McKinsey", "Bain", "KKR", "Sequoia"],
        "top_functions": [
            {"function": "general_management", "pct": 22},
            {"function": "finance", "pct": 20},
            {"function": "consulting", "pct": 14},
            {"function": "product_management", "pct": 13},
            {"function": "entrepreneurship", "pct": 12},
        ],
    },
    {
        "school_id": "wharton",
        "school_name": "Wharton School",
        "year": 2025,
        "employment_rate_at_3_months": 97.1,
        "median_base_salary": 175000,
        "median_signing_bonus": 30000,
        "top_industries": [
            {"industry": "financial_services", "pct": 32},
            {"industry": "consulting", "pct": 24},
            {"industry": "technology", "pct": 18},
            {"industry": "pe_vc", "pct": 12},
            {"industry": "healthcare", "pct": 6},
        ],
        "top_employers": ["McKinsey", "BCG", "Goldman Sachs", "JP Morgan", "Amazon", "Google"],
        "top_functions": [
            {"function": "finance", "pct": 34},
            {"function": "consulting", "pct": 24},
            {"function": "general_management", "pct": 14},
            {"function": "marketing", "pct": 10},
            {"function": "operations", "pct": 7},
        ],
    },
    {
        "school_id": "booth",
        "school_name": "Chicago Booth",
        "year": 2025,
        "employment_rate_at_3_months": 96.8,
        "median_base_salary": 170000,
        "median_signing_bonus": 30000,
        "top_industries": [
            {"industry": "consulting", "pct": 28},
            {"industry": "financial_services", "pct": 26},
            {"industry": "technology", "pct": 18},
            {"industry": "pe_vc", "pct": 10},
            {"industry": "consumer_goods", "pct": 6},
        ],
        "top_employers": ["McKinsey", "BCG", "Bain", "Citadel", "Amazon", "Google"],
        "top_functions": [
            {"function": "consulting", "pct": 28},
            {"function": "finance", "pct": 26},
            {"function": "general_management", "pct": 14},
            {"function": "marketing", "pct": 11},
            {"function": "operations", "pct": 8},
        ],
    },
    {
        "school_id": "kellogg",
        "school_name": "Kellogg School of Management",
        "year": 2025,
        "employment_rate_at_3_months": 96.5,
        "median_base_salary": 165000,
        "median_signing_bonus": 30000,
        "top_industries": [
            {"industry": "consulting", "pct": 30},
            {"industry": "technology", "pct": 22},
            {"industry": "financial_services", "pct": 14},
            {"industry": "consumer_goods", "pct": 12},
            {"industry": "healthcare", "pct": 8},
        ],
        "top_employers": ["McKinsey", "BCG", "Bain", "Google", "Amazon", "Deloitte"],
        "top_functions": [
            {"function": "consulting", "pct": 30},
            {"function": "marketing", "pct": 18},
            {"function": "general_management", "pct": 16},
            {"function": "finance", "pct": 14},
            {"function": "operations", "pct": 9},
        ],
    },
    {
        "school_id": "cbs",
        "school_name": "Columbia Business School",
        "year": 2025,
        "employment_rate_at_3_months": 95.9,
        "median_base_salary": 170000,
        "median_signing_bonus": 30000,
        "top_industries": [
            {"industry": "financial_services", "pct": 34},
            {"industry": "consulting", "pct": 20},
            {"industry": "technology", "pct": 16},
            {"industry": "pe_vc", "pct": 12},
            {"industry": "media_entertainment", "pct": 6},
        ],
        "top_employers": ["Goldman Sachs", "JP Morgan", "McKinsey", "BCG", "Amazon", "Blackstone"],
        "top_functions": [
            {"function": "finance", "pct": 36},
            {"function": "consulting", "pct": 20},
            {"function": "general_management", "pct": 14},
            {"function": "marketing", "pct": 10},
            {"function": "operations", "pct": 7},
        ],
    },
    {
        "school_id": "sloan",
        "school_name": "MIT Sloan",
        "year": 2025,
        "employment_rate_at_3_months": 96.0,
        "median_base_salary": 165000,
        "median_signing_bonus": 27500,
        "top_industries": [
            {"industry": "technology", "pct": 28},
            {"industry": "consulting", "pct": 24},
            {"industry": "financial_services", "pct": 16},
            {"industry": "pe_vc", "pct": 10},
            {"industry": "healthcare", "pct": 8},
        ],
        "top_employers": ["McKinsey", "BCG", "Google", "Amazon", "Apple", "Microsoft"],
        "top_functions": [
            {"function": "consulting", "pct": 24},
            {"function": "product_management", "pct": 16},
            {"function": "finance", "pct": 16},
            {"function": "general_management", "pct": 14},
            {"function": "operations", "pct": 10},
        ],
    },
    {
        "school_id": "tuck",
        "school_name": "Tuck School of Business",
        "year": 2025,
        "employment_rate_at_3_months": 97.5,
        "median_base_salary": 165000,
        "median_signing_bonus": 30000,
        "top_industries": [
            {"industry": "consulting", "pct": 32},
            {"industry": "technology", "pct": 18},
            {"industry": "financial_services", "pct": 16},
            {"industry": "consumer_goods", "pct": 12},
            {"industry": "healthcare", "pct": 8},
        ],
        "top_employers": ["McKinsey", "Bain", "BCG", "Deloitte", "Amazon", "Microsoft"],
        "top_functions": [
            {"function": "consulting", "pct": 32},
            {"function": "general_management", "pct": 18},
            {"function": "finance", "pct": 16},
            {"function": "marketing", "pct": 14},
            {"function": "operations", "pct": 8},
        ],
    },
    {
        "school_id": "haas",
        "school_name": "UC Berkeley Haas",
        "year": 2025,
        "employment_rate_at_3_months": 95.5,
        "median_base_salary": 165000,
        "median_signing_bonus": 28000,
        "top_industries": [
            {"industry": "technology", "pct": 34},
            {"industry": "consulting", "pct": 18},
            {"industry": "financial_services", "pct": 12},
            {"industry": "entrepreneurship", "pct": 10},
            {"industry": "healthcare", "pct": 8},
        ],
        "top_employers": ["Google", "Amazon", "Apple", "Meta", "McKinsey", "BCG"],
        "top_functions": [
            {"function": "product_management", "pct": 20},
            {"function": "consulting", "pct": 18},
            {"function": "general_management", "pct": 16},
            {"function": "finance", "pct": 14},
            {"function": "marketing", "pct": 12},
        ],
    },
    {
        "school_id": "stern",
        "school_name": "NYU Stern",
        "year": 2025,
        "employment_rate_at_3_months": 95.2,
        "median_base_salary": 160000,
        "median_signing_bonus": 28000,
        "top_industries": [
            {"industry": "financial_services", "pct": 30},
            {"industry": "consulting", "pct": 22},
            {"industry": "technology", "pct": 18},
            {"industry": "media_entertainment", "pct": 10},
            {"industry": "consumer_goods", "pct": 7},
        ],
        "top_employers": ["Goldman Sachs", "JP Morgan", "McKinsey", "BCG", "Google", "Deloitte"],
        "top_functions": [
            {"function": "finance", "pct": 30},
            {"function": "consulting", "pct": 22},
            {"function": "marketing", "pct": 14},
            {"function": "general_management", "pct": 12},
            {"function": "operations", "pct": 8},
        ],
    },
    {
        "school_id": "ross",
        "school_name": "Michigan Ross",
        "year": 2025,
        "employment_rate_at_3_months": 96.3,
        "median_base_salary": 160000,
        "median_signing_bonus": 27500,
        "top_industries": [
            {"industry": "consulting", "pct": 28},
            {"industry": "technology", "pct": 20},
            {"industry": "financial_services", "pct": 16},
            {"industry": "consumer_goods", "pct": 12},
            {"industry": "healthcare", "pct": 8},
        ],
        "top_employers": ["McKinsey", "BCG", "Bain", "Amazon", "Google", "Ford"],
        "top_functions": [
            {"function": "consulting", "pct": 28},
            {"function": "general_management", "pct": 16},
            {"function": "finance", "pct": 16},
            {"function": "marketing", "pct": 14},
            {"function": "operations", "pct": 10},
        ],
    },
    {
        "school_id": "fuqua",
        "school_name": "Duke Fuqua",
        "year": 2025,
        "employment_rate_at_3_months": 96.0,
        "median_base_salary": 160000,
        "median_signing_bonus": 27500,
        "top_industries": [
            {"industry": "consulting", "pct": 30},
            {"industry": "technology", "pct": 20},
            {"industry": "financial_services", "pct": 14},
            {"industry": "healthcare", "pct": 12},
            {"industry": "consumer_goods", "pct": 8},
        ],
        "top_employers": ["McKinsey", "BCG", "Deloitte", "Amazon", "Google", "Microsoft"],
        "top_functions": [
            {"function": "consulting", "pct": 30},
            {"function": "general_management", "pct": 16},
            {"function": "marketing", "pct": 14},
            {"function": "finance", "pct": 14},
            {"function": "operations", "pct": 10},
        ],
    },
]

_ALL_INDUSTRIES = sorted({ind["industry"] for s in _EMPLOYMENT_REPORT_DATA for ind in s["top_industries"]})
_ALL_FUNCTIONS = sorted({fn["function"] for s in _EMPLOYMENT_REPORT_DATA for fn in s["top_functions"]})


@router.get("/employment-reports")
def get_employment_reports(
    school_id: str | None = Query(default=None, description="Filter by school ID"),
    industry: str | None = Query(default=None, description="Filter by industry"),
):
    """Return employment outcome data for top MBA programs."""
    results = list(_EMPLOYMENT_REPORT_DATA)

    if school_id:
        ids = [s.strip().lower() for s in school_id.split(",") if s.strip()]
        results = [s for s in results if s["school_id"] in ids]
        if not results:
            raise HTTPException(404, f"No employment data for: {school_id}")

    if industry:
        ind_lower = industry.strip().lower()
        results = [
            s for s in results
            if any(i["industry"] == ind_lower for i in s["top_industries"])
        ]

    return {"schools": results, "total": len(results), "industries": _ALL_INDUSTRIES, "functions": _ALL_FUNCTIONS}

