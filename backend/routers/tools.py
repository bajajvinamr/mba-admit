"""Standalone tool endpoints — evaluator, roaster, recommender, interview, outreach, waitlist."""

import random

from fastapi import APIRouter, HTTPException, Request
from middleware import rate_limit
from agents import (
    SCHOOL_DB,
    evaluate_essay_draft,
    roast_resume_bullet,
    generate_recommender_strategy,
    simulate_interview_pass,
    generate_outreach_strategy,
    generate_waitlist_strategy,
)
from models import (
    ResumeRoastRequest,
    EssayEvaluationRequest,
    RecommenderStrategyRequest,
    InterviewStartRequest,
    InterviewResponseRequest,
    ControlCenterInitRequest,
    OutreachStrategyRequest,
    WaitlistStrategyRequest,
)

router = APIRouter(prefix="/api", tags=["tools"])


# ── Resume Roaster ─────────────────────────────────────────────────────────────

@router.post("/roast_resume")
@rate_limit("10/minute")
def roast_resume(request: Request, req: ResumeRoastRequest):
    """Brutal AI roast of a resume bullet + MBA-level rewrite — powered by Claude."""
    return roast_resume_bullet(req.bullet)


# ── Essay Evaluator ────────────────────────────────────────────────────────────

@router.post("/evaluate_essay")
@rate_limit("10/minute")
def evaluate_essay(request: Request, req: EssayEvaluationRequest):
    """Rigorous AI Essay B.S. Detector."""
    return evaluate_essay_draft(req.school_id, req.prompt, req.essay_text)


# ── Recommender Strategy ──────────────────────────────────────────────────────

@router.post("/recommender_strategy")
@rate_limit("10/minute")
def get_recommender_strategy(request: Request, req: RecommenderStrategyRequest):
    """Generates a structured prep packet for recommenders."""
    recs_list = [r.model_dump() for r in req.recommenders]
    return generate_recommender_strategy(req.school_id, req.applicant_strengths, recs_list)


# ── Interview Simulator ──────────────────────────────────────────────────────

@router.post("/interview/start")
@rate_limit("10/minute")
def start_mock_interview(request: Request, req: InterviewStartRequest):
    """Starts a fresh mock interview for a school."""
    return simulate_interview_pass(req.school_id, [], difficulty=req.difficulty, question_count=req.question_count)


@router.post("/interview/respond")
@rate_limit("20/minute")
def respond_mock_interview(request: Request, req: InterviewResponseRequest):
    """Next prompt or final feedback based on session history."""
    return simulate_interview_pass(req.school_id, req.history, difficulty=req.difficulty, question_count=req.question_count)


# ── Control Center ────────────────────────────────────────────────────────────

@router.post("/control_center/init")
def get_application_logistics(req: ControlCenterInitRequest):
    """Returns real deadlines, essay counts, and requirements for a batch of target schools."""
    import re

    logistics = []
    for sid in req.school_ids:
        school = SCHOOL_DB.get(sid, {})
        if not school:
            continue

        # Extract real deadlines from school data
        deadlines = school.get("admission_deadlines", [])
        deadline_map = {}
        for d in deadlines:
            round_label = d.get("round", "")
            if "1" in round_label:
                deadline_map["deadline_r1"] = d.get("deadline", "TBD")
                deadline_map["decision_r1"] = d.get("decision", "TBD")
            elif "2" in round_label:
                deadline_map["deadline_r2"] = d.get("deadline", "TBD")
                deadline_map["decision_r2"] = d.get("decision", "TBD")
            elif "3" in round_label:
                deadline_map["deadline_r3"] = d.get("deadline", "TBD")
                deadline_map["decision_r3"] = d.get("decision", "TBD")

        # Extract recommendation count from requirements text
        req_text = school.get("admission_requirements", {}).get("recommendations", "")
        rec_match = re.search(r"(\d+)", req_text)
        rec_count = int(rec_match.group(1)) if rec_match else 2

        logistics.append({
            "id": sid,
            "name": school.get("name"),
            "country": school.get("country", ""),
            "essay_count": len(school.get("essay_prompts", [])),
            "essay_prompts": school.get("essay_prompts", []),
            "recommendation_count": rec_count,
            "application_fee": school.get("admission_requirements", {}).get("application_fee", ""),
            "interview": school.get("admission_requirements", {}).get("interview", ""),
            **deadline_map,
        })
    return {"logistics": logistics}


# ── Outreach ──────────────────────────────────────────────────────────────────

@router.post("/outreach_strategy")
@rate_limit("10/minute")
def get_outreach_strategy(request: Request, req: OutreachStrategyRequest):
    """Generates personalized cold-email templates for networking."""
    return generate_outreach_strategy(req.school_id, req.background, req.goal)


# ── Waitlist ──────────────────────────────────────────────────────────────────

@router.post("/waitlist_strategy")
@rate_limit("10/minute")
def get_waitlist_strategy(request: Request, req: WaitlistStrategyRequest):
    """Generates a waitlist reality check and update letter draft."""
    return generate_waitlist_strategy(req.school_id, req.profile_updates, req.previous_essay_themes)


# ── Decisions (GMAT Club scraped data) ────────────────────────────────────────

from fastapi import Query
from compare_engine import load_gmatclub_data


@router.get("/decisions")
def get_decisions(
    school_id: str = None,
    status: str = None,
    round: str = None,
    year: str = None,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, le=200),
):
    """Returns GMAT Club decision tracker data with optional filters."""
    data = load_gmatclub_data()

    if school_id:
        data = [d for d in data if d.get("school_id") == school_id]
    if status:
        data = [d for d in data if status.lower() in d.get("status", "").lower()]
    if round:
        data = [d for d in data if round.lower() in d.get("round", "").lower()]
    if year:
        data = [d for d in data if d.get("year") == year]

    total = len(data)
    page = data[offset : offset + limit]

    return {
        "decisions": page,
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.get("/decisions/stats")
def get_decision_stats():
    """Aggregate stats across all scraped decisions."""
    data = load_gmatclub_data()
    from collections import Counter

    school_counts = Counter(d.get("school_id", "") for d in data)
    status_counts = Counter(d.get("status", "") for d in data)

    # Compute averages
    gmat_scores = [d.get("gmat") or d.get("gmat_focus") for d in data if d.get("gmat") or d.get("gmat_focus")]
    gpa_scores = [d["gpa"] for d in data if d.get("gpa")]

    return {
        "total_decisions": len(data),
        "schools": len(school_counts),
        "by_school": dict(school_counts.most_common()),
        "by_status": dict(status_counts.most_common()),
        "avg_gmat": round(sum(gmat_scores) / len(gmat_scores)) if gmat_scores else None,
        "avg_gpa": round(sum(gpa_scores) / len(gpa_scores), 2) if gpa_scores else None,
    }


# ── Admission Chances Calculator ──────────────────────────────────────────

from models import ChancesRequest

_ADMIT_STATUSES = {"Admitted", "Matriculating", "Admitted from WL"}
_DENY_STATUSES = {"Denied without Interview", "Denied with Interview"}


def _is_admitted(status: str) -> bool:
    """Check if a decision status counts as admitted (including scholarship tiers)."""
    for s in _ADMIT_STATUSES:
        if status.startswith(s):
            return True
    return False


def _is_denied(status: str) -> bool:
    return any(status.startswith(s) for s in _DENY_STATUSES)


@router.post("/decisions/chances")
def compute_chances(req: ChancesRequest):
    """Compute admission probability per school based on similar profiles in 12K real decisions.

    Uses a similarity window approach: finds applicants with similar GMAT (±30),
    GPA (±0.3), and work experience (±2 years), then computes admit rate.
    """
    data = load_gmatclub_data()

    # Filter to requested schools if specified
    if req.school_ids:
        school_set = set(req.school_ids)
        data = [d for d in data if d.get("school_id") in school_set]

    # Find similar profiles
    GMAT_WINDOW = 30
    GPA_WINDOW = 0.3
    YOE_WINDOW = 2

    def is_similar(d: dict) -> bool:
        if req.gmat is not None:
            d_gmat = d.get("gmat_focus") or d.get("gmat")
            if d_gmat is None:
                return False
            if abs(d_gmat - req.gmat) > GMAT_WINDOW:
                return False
        if req.gpa is not None:
            d_gpa = d.get("gpa")
            if d_gpa is None:
                return False
            if abs(d_gpa - req.gpa) > GPA_WINDOW:
                return False
        if req.work_exp_years is not None:
            d_yoe = d.get("yoe")
            if d_yoe is None:
                return False
            if abs(d_yoe - req.work_exp_years) > YOE_WINDOW:
                return False
        if req.industry is not None:
            d_ind = (d.get("industry") or "").lower()
            if req.industry.lower() not in d_ind:
                return False
        return True

    similar = [d for d in data if is_similar(d)]

    # Group by school
    from collections import defaultdict
    school_groups: dict[str, list] = defaultdict(list)
    for d in similar:
        school_groups[d.get("school_id", "")].append(d)

    results = []
    for sid, decisions in sorted(school_groups.items(), key=lambda x: -len(x[1])):
        admitted = sum(1 for d in decisions if _is_admitted(d.get("status", "")))
        denied = sum(1 for d in decisions if _is_denied(d.get("status", "")))
        total_resolved = admitted + denied
        if total_resolved == 0:
            continue

        admit_rate = round(admitted / total_resolved * 100, 1)

        # GMAT distribution of admitted applicants
        admitted_gmats = [
            d.get("gmat_focus") or d.get("gmat")
            for d in decisions
            if _is_admitted(d.get("status", "")) and (d.get("gmat_focus") or d.get("gmat"))
        ]
        admitted_gpas = [
            d["gpa"] for d in decisions
            if _is_admitted(d.get("status", "")) and d.get("gpa")
        ]

        # Scholarship rate among admitted
        scholarship_decisions = [
            d for d in decisions
            if d.get("status", "").startswith("Admitted") and "($" in d.get("status", "")
        ]
        scholarship_rate = round(len(scholarship_decisions) / admitted * 100, 1) if admitted > 0 else 0

        school = SCHOOL_DB.get(sid, {})
        results.append({
            "school_id": sid,
            "school_name": school.get("name", sid),
            "sample_size": len(decisions),
            "admitted": admitted,
            "denied": denied,
            "admit_rate": admit_rate,
            "confidence": "high" if total_resolved >= 20 else "medium" if total_resolved >= 8 else "low",
            "avg_gmat_admitted": round(sum(admitted_gmats) / len(admitted_gmats)) if admitted_gmats else None,
            "avg_gpa_admitted": round(sum(admitted_gpas) / len(admitted_gpas), 2) if admitted_gpas else None,
            "scholarship_rate": scholarship_rate,
        })

    results.sort(key=lambda x: -x["admit_rate"])

    return {
        "profile": {
            "gmat": req.gmat,
            "gpa": req.gpa,
            "work_exp_years": req.work_exp_years,
            "industry": req.industry,
        },
        "total_similar_profiles": len(similar),
        "schools": results,
    }


# ── Interview Question Bank ──────────────────────────────────────────────

import json as _json
import os as _os

_QUESTIONS_PATH = _os.path.join(_os.path.dirname(__file__), "..", "data", "interview_questions.json")
_questions_cache: dict | None = None


def _load_questions() -> dict:
    global _questions_cache
    if _questions_cache is None:
        with open(_QUESTIONS_PATH) as f:
            _questions_cache = _json.load(f)
    return _questions_cache


@router.get("/interview/questions")
def get_interview_questions(
    school_id: str = None,
    category: str = None,
    difficulty: str = None,
):
    """Browseable interview question bank with optional filters."""
    data = _load_questions()
    categories = data["categories"]
    result_categories = []

    for cat in categories:
        if category and cat["id"] != category:
            continue

        filtered_qs = cat["questions"]
        if school_id:
            filtered_qs = [q for q in filtered_qs if school_id in q.get("schools", [])]
        if difficulty:
            filtered_qs = [q for q in filtered_qs if q["difficulty"] == difficulty]

        if filtered_qs:
            result_categories.append({
                "id": cat["id"],
                "name": cat["name"],
                "questions": filtered_qs,
                "count": len(filtered_qs),
            })

    total = sum(c["count"] for c in result_categories)

    # School-specific tips
    school_info = None
    if school_id:
        school_info = data.get("school_specific", {}).get(school_id)

    return {
        "categories": result_categories,
        "total_questions": total,
        "school_info": school_info,
    }


@router.get("/interview/questions/random")
def get_random_questions(
    school_id: str = None,
    count: int = Query(default=5, ge=1, le=20),
):
    """Get random interview questions for practice mode."""
    data = _load_questions()
    all_qs = []
    for cat in data["categories"]:
        for q in cat["questions"]:
            if school_id and school_id not in q.get("schools", []):
                continue
            all_qs.append({**q, "category": cat["name"]})

    if not all_qs:
        return {"questions": [], "count": 0}

    selected = random.sample(all_qs, min(count, len(all_qs)))
    return {"questions": selected, "count": len(selected)}


# ── Admit Analytics ──────────────────────────────────────────────────────

@router.get("/decisions/analytics")
def get_decision_analytics(school_id: str = None):
    """Aggregated analytics: GMAT/GPA distributions, round trends, admit rates by school."""
    data = load_gmatclub_data()
    if school_id:
        data = [d for d in data if d.get("school_id") == school_id]

    if not data:
        return {"error": "No data found", "total": 0}

    # GMAT distribution (buckets of 20)
    gmat_dist: dict[str, int] = {}
    gpa_dist: dict[str, int] = {}
    round_stats: dict[str, dict[str, int]] = {}
    industry_stats: dict[str, dict[str, int]] = {}
    yoe_dist: dict[str, int] = {}

    for d in data:
        status_group = "admitted" if _is_admitted(d.get("status", "")) else "denied" if _is_denied(d.get("status", "")) else "other"

        # GMAT buckets
        gmat = d.get("gmat_focus") or d.get("gmat")
        if gmat:
            bucket = f"{(gmat // 20) * 20}-{(gmat // 20) * 20 + 19}"
            gmat_dist[bucket] = gmat_dist.get(bucket, 0) + 1

        # GPA buckets (0.2 increments)
        gpa = d.get("gpa")
        if gpa:
            bucket = f"{gpa // 0.2 * 0.2:.1f}-{gpa // 0.2 * 0.2 + 0.19:.2f}"
            gpa_dist[bucket] = gpa_dist.get(bucket, 0) + 1

        # Round breakdown
        rnd = d.get("round", "Unknown")
        if rnd not in round_stats:
            round_stats[rnd] = {"admitted": 0, "denied": 0, "other": 0, "total": 0}
        round_stats[rnd][status_group] = round_stats[rnd].get(status_group, 0) + 1
        round_stats[rnd]["total"] += 1

        # Industry breakdown (top industries)
        ind = d.get("industry", "Unknown")
        if ind and ind != "Unknown":
            if ind not in industry_stats:
                industry_stats[ind] = {"admitted": 0, "denied": 0, "total": 0}
            industry_stats[ind][status_group] = industry_stats[ind].get(status_group, 0) + 1
            industry_stats[ind]["total"] += 1

        # YOE distribution
        yoe = d.get("yoe")
        if yoe is not None:
            bucket = f"{yoe}y"
            yoe_dist[bucket] = yoe_dist.get(bucket, 0) + 1

    # Sort GMAT buckets
    sorted_gmat = sorted(gmat_dist.items(), key=lambda x: x[0])

    # Top 10 industries by total
    top_industries = sorted(industry_stats.items(), key=lambda x: -x[1]["total"])[:10]
    industry_result = []
    for ind, stats in top_industries:
        resolved = stats["admitted"] + stats["denied"]
        rate = round(stats["admitted"] / resolved * 100, 1) if resolved > 0 else 0
        industry_result.append({"industry": ind, "admit_rate": rate, **stats})

    # Round admit rates
    round_result = []
    for rnd, stats in sorted(round_stats.items()):
        resolved = stats["admitted"] + stats["denied"]
        rate = round(stats["admitted"] / resolved * 100, 1) if resolved > 0 else 0
        round_result.append({"round": rnd, "admit_rate": rate, **stats})

    return {
        "total": len(data),
        "gmat_distribution": sorted_gmat,
        "gpa_distribution": sorted(gpa_dist.items(), key=lambda x: x[0]),
        "yoe_distribution": sorted(yoe_dist.items(), key=lambda x: x[0]),
        "by_round": round_result,
        "by_industry": industry_result,
    }


# ── Essay Word Counter ──────────────────────────────────────────────────

import re as _re
from models import EssayWordCountRequest, ThemeAnalysisRequest


@router.post("/essay/word-count")
def essay_word_count(req: EssayWordCountRequest):
    """Analyze essay text: word count, character count, sentence count, reading time."""
    text = req.text.strip()
    words = text.split() if text else []
    word_count = len(words)
    char_count = len(text)
    char_no_spaces = len(text.replace(" ", ""))
    sentences = len(_re.findall(r"[.!?]+", text)) or (1 if text else 0)
    paragraphs = len([p for p in text.split("\n\n") if p.strip()]) if text else 0
    reading_time_sec = round(word_count / 3.5)  # ~210 words/min speaking pace for interviews

    result: dict = {
        "word_count": word_count,
        "char_count": char_count,
        "char_no_spaces": char_no_spaces,
        "sentence_count": sentences,
        "paragraph_count": paragraphs,
        "reading_time_seconds": reading_time_sec,
    }

    if req.word_limit:
        remaining = req.word_limit - word_count
        result["word_limit"] = req.word_limit
        result["words_remaining"] = remaining
        result["over_limit"] = remaining < 0
        result["utilization_pct"] = round(word_count / req.word_limit * 100, 1)

    if req.char_limit:
        remaining = req.char_limit - char_count
        result["char_limit"] = req.char_limit
        result["chars_remaining"] = remaining
        result["char_over_limit"] = remaining < 0

    return result


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


# ── Essay Prompt Library ────────────────────────────────────────────────

@router.get("/essay-prompts")
def get_essay_prompts(school_id: str = None):
    """Get essay prompts for all schools or a specific school."""
    results = []
    schools = SCHOOL_DB

    if school_id:
        if school_id not in schools:
            raise HTTPException(404, f"School '{school_id}' not found")
        schools = {school_id: SCHOOL_DB[school_id]}

    for sid, school in schools.items():
        prompts = school.get("essay_prompts", [])
        if not prompts:
            continue
        for i, prompt in enumerate(prompts):
            word_limit = None
            text = prompt if isinstance(prompt, str) else str(prompt)
            # Try to extract word limit from prompt text
            import re
            wl_match = re.search(r"(\d+)\s*word", text.lower())
            if wl_match:
                word_limit = int(wl_match.group(1))
            results.append({
                "school_id": sid,
                "school_name": school.get("name", sid),
                "prompt_index": i,
                "prompt_text": text,
                "word_limit": word_limit,
            })

    # Sort by school name
    results.sort(key=lambda x: x["school_name"])

    return {
        "prompts": results,
        "total_prompts": len(results),
        "school_count": len(set(r["school_id"] for r in results)),
    }


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
            "percentile_estimate": _gmat_percentile(score),
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
            "percentile_estimate": _gmat_percentile(gmat_equiv),
            "note": "Based on official ETS/GMAC concordance table",
        }
    else:
        raise HTTPException(400, "from_test must be 'gmat' or 'gre'")


def _gmat_percentile(score: int) -> int:
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


# ── Application Strength Meter ────────────────────────────────────────

from models import AppStrengthRequest


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


@router.post("/application-strength")
def application_strength(req: AppStrengthRequest):
    """Score an MBA applicant's profile across 5 dimensions and return actionable tips."""
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


# ── Cost of Living Comparison ─────────────────────────────────────────

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


# ── Essay Theme Analyzer ─────────────────────────────────────────────

THEME_KEYWORDS = {
    "Leadership": ["led", "managed", "team", "leader", "initiative", "directed", "spearheaded", "organized", "mentor"],
    "Innovation": ["created", "built", "designed", "developed", "launched", "startup", "entrepreneur", "innovation", "new"],
    "Impact": ["impact", "helped", "community", "volunteer", "social", "nonprofit", "improved", "transformed", "changed"],
    "Global": ["international", "global", "abroad", "diverse", "culture", "countries", "cross-cultural", "overseas"],
    "Analytical": ["analysis", "data", "strategy", "research", "quantitative", "financial", "problem-solving", "solve"],
    "Growth": ["learned", "growth", "challenge", "overcome", "failure", "resilience", "adapted", "evolved", "reflection"],
    "Collaboration": ["collaborated", "partnership", "cross-functional", "stakeholder", "consensus", "together", "teamwork"],
    "Vision": ["vision", "goal", "future", "aspire", "dream", "mission", "purpose", "long-term", "ambition"],
}


@router.post("/essay/analyze-themes")
def analyze_essay_themes(req: ThemeAnalysisRequest):
    """Keyword-based theme analysis across multiple essays — no LLM needed."""
    if not req.essays:
        raise HTTPException(400, "At least one essay is required")

    per_essay = []
    overall_raw: dict[str, int] = {t: 0 for t in THEME_KEYWORDS}

    for essay in req.essays:
        text_lower = essay.content.lower()
        words = essay.content.split() if essay.content.strip() else []
        word_count = len(words)

        # Count keyword matches per theme
        theme_counts: dict[str, int] = {}
        for theme, keywords in THEME_KEYWORDS.items():
            count = sum(text_lower.count(kw) for kw in keywords)
            theme_counts[theme] = count
            overall_raw[theme] += count

        # Normalize to percentages
        total_hits = sum(theme_counts.values()) or 1
        theme_pcts = {t: round(c / total_hits * 100) for t, c in theme_counts.items()}

        # Find dominant theme for this essay
        dominant = max(theme_pcts, key=lambda t: theme_pcts[t]) if any(theme_pcts.values()) else "None"

        per_essay.append({
            "title": essay.title,
            "themes": theme_pcts,
            "dominant": dominant,
            "word_count": word_count,
        })

    # Overall percentages
    overall_total = sum(overall_raw.values()) or 1
    overall_pcts = {t: round(c / overall_total * 100) for t, c in overall_raw.items()}

    # Top 3 dominant themes
    sorted_themes = sorted(overall_pcts.items(), key=lambda x: -x[1])
    dominant_themes = [t for t, _ in sorted_themes[:3]]

    # Gaps: themes with < 5% representation
    gaps = [t for t, pct in sorted_themes if pct < 5]

    # Generate tips
    tips: list[str] = []
    if sorted_themes and sorted_themes[0][1] > 40:
        tips.append(
            f"Your essays focus heavily on {sorted_themes[0][0]} — consider diversifying to show breadth."
        )
    if gaps:
        gap_str = ", ".join(gaps[:3])
        tips.append(
            f"Themes like {gap_str} are underrepresented — weaving in these elements can strengthen your narrative."
        )
    if len(req.essays) == 1:
        tips.append(
            "Add more essays to get a more comprehensive theme balance analysis."
        )
    if not tips:
        tips.append("Your essays show a well-balanced theme distribution across key MBA dimensions.")

    return {
        "per_essay": per_essay,
        "overall": overall_pcts,
        "dominant_themes": dominant_themes,
        "gaps": gaps,
        "tips": tips,
    }


# ── Admit Probability Simulator ──────────────────────────────────────

from pydantic import BaseModel as _BaseModel


class SimulatorRequest(_BaseModel):
    gmat: int = 700
    gpa: float = 3.5
    work_years: int = 4
    school_ids: list[str] = []
    is_urm: bool = False
    is_international: bool = False
    is_military: bool = False
    has_nonprofit: bool = False


_M7_IDS = ["hbs", "gsb", "wharton", "booth", "kellogg", "cbs", "sloan"]

_US_SCHOOL_COUNTRIES = {"USA", "United States", "US"}


@router.post("/admit-simulator")
def admit_simulator(req: SimulatorRequest):
    """Monte-Carlo-style admit probability simulator.

    For each school, calculates a base probability from GMAT/GPA relative
    to the school average, applies profile modifiers, runs 100 simulation
    rounds with +-5% noise, and returns per-school results.
    """
    school_ids = req.school_ids if req.school_ids else list(_M7_IDS)
    # Cap to 8
    school_ids = school_ids[:8]

    results = []

    for sid in school_ids:
        school = SCHOOL_DB.get(sid)
        if not school:
            # Try alias
            resolved = SCHOOL_ALIASES.get(sid, "")
            school = SCHOOL_DB.get(resolved) if resolved else None
            if school:
                sid = resolved
        if not school:
            continue

        school_gmat = school.get("gmat_avg", 720)
        school_name = school.get("name", sid)
        country = school.get("country", "Unknown")

        # ── 1. Base probability from GMAT + GPA ──────────────────────
        # GMAT component: each point above/below avg shifts probability
        gmat_diff = req.gmat - school_gmat
        gmat_factor = gmat_diff * 0.3  # 30 points above → +9%

        # GPA component: compare to expected ~3.6
        expected_gpa = 3.6
        gpa_diff = req.gpa - expected_gpa
        gpa_factor = gpa_diff * 15  # 0.2 above → +3%

        # Acceptance rate as difficulty baseline
        accept_rate = 30.0
        try:
            accept_rate = float(school.get("acceptance_rate", 30))
        except (ValueError, TypeError):
            pass

        # Base: start from acceptance rate scaled to profile
        base = accept_rate + gmat_factor + gpa_factor

        # ── 2. Profile modifiers ─────────────────────────────────────
        if req.is_urm:
            base += 8
        if req.is_military:
            base += 5
        if req.has_nonprofit:
            base += 3
        if req.is_international and country in _US_SCHOOL_COUNTRIES:
            base -= 3

        # ── 3. Work experience curve (sweet spot 3-5 years) ─────────
        if 3 <= req.work_years <= 5:
            base += 4
        elif 2 <= req.work_years < 3 or 5 < req.work_years <= 7:
            base += 1
        elif req.work_years < 2:
            base -= 5
        elif req.work_years > 7:
            base -= 3

        # Clamp base before simulation
        base = max(3.0, min(95.0, base))

        # ── 4. Run 100 simulation rounds with +-5% noise ────────────
        num_rounds = 100
        accepted = 0
        probs: list[float] = []

        for _ in range(num_rounds):
            noise = random.uniform(-5.0, 5.0)
            sim_prob = max(1.0, min(99.0, base + noise))
            probs.append(sim_prob)
            if random.random() * 100 < sim_prob:
                accepted += 1

        rejected = num_rounds - accepted
        probability_pct = round(sum(probs) / len(probs), 1)

        # Confidence interval: 5th and 95th percentile of sim probs
        sorted_probs = sorted(probs)
        ci_low = round(sorted_probs[4], 1)   # 5th percentile
        ci_high = round(sorted_probs[94], 1)  # 95th percentile

        # ── 5. Verdict ───────────────────────────────────────────────
        if probability_pct >= 60:
            verdict = "Safety"
        elif probability_pct >= 30:
            verdict = "Target"
        else:
            verdict = "Reach"

        results.append({
            "school_id": sid,
            "school_name": school_name,
            "probability_pct": probability_pct,
            "confidence_interval": [ci_low, ci_high],
            "verdict": verdict,
            "simulations": {"accepted": accepted, "rejected": rejected},
        })

    # Sort by probability descending
    results.sort(key=lambda r: -r["probability_pct"])

    return {"results": results, "simulation_rounds": 100}


# ── Salary Negotiation Calculator ─────────────────────────────────────


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
