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

from pydantic import BaseModel as _BaseModel


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


# ── Interview Question Bank ─────────────────────────────────────────────────

from pydantic import BaseModel as _BaseModel  # noqa: E402


class InterviewQuestion(_BaseModel):
    question: str
    category: str
    difficulty: int
    tips: list[str]
    school_specific: bool


class InterviewQuestionBankResponse(_BaseModel):
    questions: list[InterviewQuestion]
    count: int
    categories: list[str]


_IQ_CATEGORIES = [
    "behavioral",
    "why_mba",
    "why_school",
    "leadership",
    "career_goals",
    "strengths_weaknesses",
    "teamwork",
    "ethical_dilemma",
]

_QUESTION_BANK: dict[str, list[dict]] = {
    "behavioral": [
        {"question": "Tell me about a time you failed and what you learned from it.", "difficulty": 1, "tips": ["Use the STAR method", "Focus on the lesson, not just the failure", "Show self-awareness"]},
        {"question": "Describe a situation where you had to influence someone without direct authority.", "difficulty": 2, "tips": ["Highlight interpersonal skills", "Show strategic thinking", "Quantify the outcome"]},
        {"question": "Walk me through a time you received critical feedback. How did you respond?", "difficulty": 1, "tips": ["Show humility and growth mindset", "Describe concrete changes you made", "Avoid being defensive in your retelling"]},
        {"question": "Tell me about a time you had to make a decision with incomplete information.", "difficulty": 2, "tips": ["Explain your reasoning framework", "Show comfort with ambiguity", "Describe the outcome and what you'd do differently"]},
        {"question": "Describe a conflict with a colleague and how you resolved it.", "difficulty": 2, "tips": ["Show emotional intelligence", "Focus on the resolution process", "Avoid placing blame"]},
        {"question": "Give an example of when you went above and beyond what was expected.", "difficulty": 1, "tips": ["Quantify the impact", "Explain your motivation", "Connect to your values"]},
        {"question": "Tell me about a time you had to adapt to a major change at work.", "difficulty": 2, "tips": ["Show flexibility and resilience", "Describe your mindset shift", "Highlight how you helped others adapt"]},
        {"question": "Describe a situation where you had to manage competing priorities.", "difficulty": 2, "tips": ["Show your prioritization framework", "Demonstrate time management skills", "Explain trade-offs you made"]},
        {"question": "Tell me about a time you took a calculated risk.", "difficulty": 3, "tips": ["Explain your risk assessment process", "Show that you weighed pros and cons", "Describe the outcome honestly"]},
        {"question": "Describe a moment when you demonstrated resilience.", "difficulty": 1, "tips": ["Choose a genuinely challenging situation", "Show the emotional journey", "Connect to personal growth"]},
    ],
    "why_mba": [
        {"question": "Why do you want to pursue an MBA at this point in your career?", "difficulty": 1, "tips": ["Be specific about timing", "Connect to career trajectory", "Show you've explored alternatives"]},
        {"question": "What skills do you hope to develop during your MBA?", "difficulty": 1, "tips": ["Be specific — avoid generic answers", "Connect skills to career goals", "Show self-awareness about current gaps"]},
        {"question": "How will an MBA help you achieve your long-term goals?", "difficulty": 2, "tips": ["Have a clear 5-10 year vision", "Explain why an MBA is necessary, not just nice-to-have", "Be realistic and specific"]},
        {"question": "What would you do if you don't get into any MBA program this year?", "difficulty": 3, "tips": ["Show resilience and alternative planning", "Demonstrate genuine passion beyond the credential", "Be honest but optimistic"]},
        {"question": "How do you plan to contribute to the MBA community?", "difficulty": 2, "tips": ["Reference specific clubs or initiatives", "Draw from past community involvement", "Be genuine, not transactional"]},
        {"question": "What is the biggest misconception people have about MBAs?", "difficulty": 2, "tips": ["Show critical thinking", "Demonstrate your research", "Be thoughtful, not cynical"]},
        {"question": "How have you prepared for the MBA experience?", "difficulty": 1, "tips": ["Mention conversations with alumni", "Reference relevant pre-MBA activities", "Show intentionality"]},
        {"question": "What alternatives to an MBA have you considered?", "difficulty": 2, "tips": ["Be honest about other paths", "Explain why MBA won out", "Show thorough self-reflection"]},
    ],
    "why_school": [
        {"question": "Why is this school your top choice?", "difficulty": 2, "tips": ["Name specific courses, professors, or programs", "Reference campus visits or alumni conversations", "Show genuine fit, not flattery"]},
        {"question": "What specific programs or courses attract you to this school?", "difficulty": 2, "tips": ["Research the curriculum deeply", "Connect courses to your goals", "Mention unique offerings"]},
        {"question": "How does this school's culture align with your values?", "difficulty": 2, "tips": ["Reference specific cultural elements", "Share examples of your values in action", "Show you've talked to current students"]},
        {"question": "What will you bring to the incoming class?", "difficulty": 2, "tips": ["Highlight unique perspectives", "Be specific about contributions", "Connect to the school's community needs"]},
        {"question": "Which clubs or organizations do you plan to join?", "difficulty": 1, "tips": ["Name specific clubs", "Explain why they matter to you", "Show leadership aspirations within them"]},
        {"question": "How does this school's alumni network align with your career goals?", "difficulty": 2, "tips": ["Reference specific alumni outcomes", "Show you've done informational interviews", "Connect to your target industry"]},
        {"question": "What do you know about our learning methodology?", "difficulty": 2, "tips": ["Research the school's pedagogy", "Explain how the method suits your learning style", "Give examples from past learning experiences"]},
        {"question": "If admitted to multiple schools, how would you make your decision?", "difficulty": 3, "tips": ["Be diplomatic but honest", "Show your decision framework", "Emphasize unique school strengths"]},
    ],
    "leadership": [
        {"question": "Describe your leadership style.", "difficulty": 1, "tips": ["Give concrete examples, not just adjectives", "Show situational adaptability", "Reference feedback from others"]},
        {"question": "Tell me about a time you led a team through a difficult challenge.", "difficulty": 2, "tips": ["Focus on your specific actions", "Show how you motivated the team", "Quantify the outcome"]},
        {"question": "How do you develop talent in others?", "difficulty": 2, "tips": ["Give specific mentoring examples", "Show investment in others' growth", "Describe your coaching approach"]},
        {"question": "Describe a time you had to lead a team with diverse perspectives.", "difficulty": 2, "tips": ["Show inclusive leadership", "Highlight how you leveraged different viewpoints", "Demonstrate cultural awareness"]},
        {"question": "Tell me about a leadership failure and what it taught you.", "difficulty": 3, "tips": ["Choose a genuine failure, not a humble brag", "Focus on the learning", "Show how you've changed"]},
        {"question": "How do you build trust with a new team?", "difficulty": 1, "tips": ["Describe specific actions, not platitudes", "Show authenticity", "Reference real examples"]},
        {"question": "Describe a time you had to lead without a formal title.", "difficulty": 2, "tips": ["Show influence skills", "Demonstrate initiative", "Highlight the outcome"]},
        {"question": "How do you handle underperforming team members?", "difficulty": 3, "tips": ["Show empathy balanced with accountability", "Describe your process step by step", "Give a real example"]},
        {"question": "Tell me about a decision you made that was unpopular.", "difficulty": 3, "tips": ["Show conviction and courage", "Explain your reasoning clearly", "Describe how you managed pushback"]},
        {"question": "What leader do you admire and why?", "difficulty": 1, "tips": ["Choose someone relevant to your field", "Be specific about qualities you admire", "Connect to your own leadership development"]},
    ],
    "career_goals": [
        {"question": "Where do you see yourself five years after your MBA?", "difficulty": 1, "tips": ["Be specific about role, industry, and impact", "Show a logical progression from your background", "Connect to the MBA program"]},
        {"question": "What is your long-term career vision?", "difficulty": 2, "tips": ["Think 15-20 years out", "Be ambitious but credible", "Show purpose beyond personal success"]},
        {"question": "Why are you switching industries/functions?", "difficulty": 2, "tips": ["Explain the pull, not just the push", "Show transferable skills", "Demonstrate industry knowledge"]},
        {"question": "How does your pre-MBA experience prepare you for your post-MBA goals?", "difficulty": 2, "tips": ["Draw clear connections", "Identify skill gaps the MBA fills", "Show intentional career planning"]},
        {"question": "What is your backup plan if your primary career goal doesn't work out?", "difficulty": 2, "tips": ["Show flexibility without seeming unfocused", "Demonstrate realistic thinking", "Connect backup to your core interests"]},
        {"question": "What impact do you want to have in your career?", "difficulty": 2, "tips": ["Go beyond financial success", "Be genuine about your motivations", "Connect to personal experiences"]},
        {"question": "How do you define professional success?", "difficulty": 1, "tips": ["Be authentic", "Show maturity in your definition", "Connect to values and purpose"]},
        {"question": "What industry trends excite you most?", "difficulty": 2, "tips": ["Show you're well-read on your target industry", "Explain how you want to contribute", "Be specific and current"]},
        {"question": "Who is your professional role model and why?", "difficulty": 1, "tips": ["Choose someone in your target field", "Be specific about what you admire", "Show how they inspire your goals"]},
        {"question": "What would you do if you couldn't work in your target industry?", "difficulty": 3, "tips": ["Show breadth of interests", "Demonstrate core transferable passions", "Be creative but credible"]},
    ],
    "strengths_weaknesses": [
        {"question": "What is your greatest strength?", "difficulty": 1, "tips": ["Back it up with a specific example", "Choose something relevant to MBA success", "Avoid cliches"]},
        {"question": "What is your biggest weakness?", "difficulty": 2, "tips": ["Be genuine — avoid disguised strengths", "Show what you're doing to improve", "Pick something real but manageable"]},
        {"question": "What would your colleagues say is your biggest area for growth?", "difficulty": 2, "tips": ["Reference actual feedback you've received", "Show self-awareness", "Describe your improvement plan"]},
        {"question": "How do you handle stress and pressure?", "difficulty": 1, "tips": ["Give a specific high-pressure example", "Describe your coping strategies", "Show that you thrive, not just survive"]},
        {"question": "What skill are you most eager to develop in business school?", "difficulty": 1, "tips": ["Be specific about the skill and why", "Connect to your career goals", "Show how the school can help"]},
        {"question": "Describe a time your biggest strength became a liability.", "difficulty": 3, "tips": ["Show nuanced self-understanding", "Demonstrate adaptability", "Explain what you learned"]},
        {"question": "How do you solicit and process feedback?", "difficulty": 2, "tips": ["Describe your feedback-seeking habits", "Give examples of acting on feedback", "Show growth mindset"]},
        {"question": "What do people misunderstand about you?", "difficulty": 2, "tips": ["Be honest and reflective", "Show how you bridge the gap", "Use this to reveal a hidden strength"]},
        {"question": "Rate yourself on a scale of 1-10 and explain why.", "difficulty": 3, "tips": ["Avoid extremes (not 10, not below 6)", "Be thoughtful about your reasoning", "Show ambition to improve"]},
    ],
    "teamwork": [
        {"question": "Describe your role in a successful team project.", "difficulty": 1, "tips": ["Clarify your specific contribution", "Show how you enabled others", "Quantify the team's achievement"]},
        {"question": "How do you handle disagreements within a team?", "difficulty": 2, "tips": ["Show your conflict resolution approach", "Give a specific example", "Emphasize productive outcomes"]},
        {"question": "Tell me about a time a team project didn't go as planned.", "difficulty": 2, "tips": ["Take appropriate ownership", "Focus on the team's recovery process", "Share the lesson learned"]},
        {"question": "How do you ensure all team members contribute?", "difficulty": 2, "tips": ["Show inclusive facilitation skills", "Describe specific techniques", "Give an example"]},
        {"question": "Describe a time you had to work with someone you didn't get along with.", "difficulty": 2, "tips": ["Show professionalism and maturity", "Focus on the working relationship, not personality", "Describe the outcome"]},
        {"question": "What role do you typically play on a team?", "difficulty": 1, "tips": ["Show self-awareness", "Demonstrate flexibility across roles", "Give examples of different roles you've played"]},
        {"question": "How do you build consensus when opinions differ?", "difficulty": 2, "tips": ["Describe your process step by step", "Show respect for diverse viewpoints", "Give a concrete example"]},
        {"question": "Tell me about a time you helped a struggling teammate.", "difficulty": 1, "tips": ["Show empathy and initiative", "Describe your specific actions", "Focus on the teammate's growth"]},
        {"question": "How do you handle a team member who isn't pulling their weight?", "difficulty": 3, "tips": ["Show direct but empathetic communication", "Describe escalation if needed", "Focus on the team's success"]},
        {"question": "Describe a cross-functional team experience.", "difficulty": 2, "tips": ["Show ability to bridge different perspectives", "Highlight communication skills", "Quantify the impact"]},
    ],
    "ethical_dilemma": [
        {"question": "Describe a time you faced an ethical dilemma at work.", "difficulty": 3, "tips": ["Choose a genuine dilemma, not an obvious right/wrong", "Walk through your decision-making process", "Show your values in action"]},
        {"question": "What would you do if you discovered a colleague was being dishonest?", "difficulty": 2, "tips": ["Show moral courage", "Describe a measured approach", "Balance loyalty with integrity"]},
        {"question": "How do you handle situations where business goals conflict with ethics?", "difficulty": 3, "tips": ["Show that you don't see it as binary", "Demonstrate creative problem-solving", "Reference your personal framework"]},
        {"question": "Tell me about a time you had to speak truth to power.", "difficulty": 3, "tips": ["Show courage balanced with tact", "Describe the preparation involved", "Share the outcome honestly"]},
        {"question": "Describe a situation where you had to choose between two right answers.", "difficulty": 3, "tips": ["Show sophisticated moral reasoning", "Explain your decision framework", "Be honest about the trade-offs"]},
        {"question": "How do you ensure ethical behavior in your team?", "difficulty": 2, "tips": ["Describe specific practices", "Show proactive culture-building", "Give a concrete example"]},
        {"question": "What is your personal code of ethics?", "difficulty": 2, "tips": ["Be specific, not vague", "Root it in experiences", "Show how it guides decisions"]},
        {"question": "Describe a time you sacrificed personal gain for the right thing.", "difficulty": 3, "tips": ["Choose a meaningful example", "Show that you'd do it again", "Connect to your core values"]},
    ],
}

_SCHOOL_SPECIFIC_TEMPLATES = [
    "Why {school_name} specifically? What makes it the right fit for you?",
    "Which {school_name} professor's research resonates with your interests and why?",
    "How will you contribute to the {school_name} community outside the classroom?",
    "What {school_name} tradition or program are you most excited about?",
    "How does {school_name}'s approach to {approach} align with your learning style?",
]

_SCHOOL_APPROACHES = {
    "hbs": "the case method",
    "gsb": "personal leadership development",
    "wharton": "analytical rigor and teamwork",
    "booth": "flexible curriculum and data-driven decision making",
    "kellogg": "collaborative culture and team-based learning",
    "sloan": "innovation and action learning",
    "cbs": "value investing and New York immersion",
    "tuck": "tight-knit community and general management",
    "haas": "questioning the status quo and confidence without attitude",
    "ross": "action-based learning and positive business impact",
    "fuqua": "Team Fuqua and consequential leadership",
    "darden": "the case method and ethical leadership",
    "stern": "IQ + EQ and urban immersion",
    "johnson": "experiential learning and tech entrepreneurship",
    "anderson": "entrepreneurship and social impact",
    "iima": "analytical rigor and case-based pedagogy",
    "isb": "accelerated learning and global exposure",
    "lbs": "global perspective and experiential learning",
    "insead": "diversity and the one-year intensive format",
}


@router.get("/interview-questions")
def get_interview_questions(
    school_id: str = Query(default=None, description="Filter for school-specific questions"),
    category: str = Query(default=None, description="Filter by question category"),
):
    """Interview question bank with tips — filterable by school and category."""
    categories_to_include = [category] if category and category in _IQ_CATEGORIES else _IQ_CATEGORIES
    questions: list[dict] = []

    for cat in categories_to_include:
        cat_questions = _QUESTION_BANK.get(cat, [])
        for q in cat_questions:
            questions.append({
                "question": q["question"],
                "category": cat,
                "difficulty": q["difficulty"],
                "tips": q["tips"],
                "school_specific": False,
            })

    # Add school-specific questions if school_id provided
    if school_id:
        school = SCHOOL_DB.get(school_id)
        school_name = school.get("name", school_id.upper()) if school else school_id.upper()
        approach = _SCHOOL_APPROACHES.get(school_id, "experiential learning")

        school_questions = []
        for template in _SCHOOL_SPECIFIC_TEMPLATES:
            q_text = template.format(school_name=school_name, approach=approach)
            school_questions.append({
                "question": q_text,
                "category": "why_school",
                "difficulty": 2,
                "tips": [
                    f"Research {school_name}'s unique programs and culture",
                    "Reference specific conversations with alumni or students",
                    "Connect your goals to what makes this school distinct",
                ],
                "school_specific": True,
            })
        questions.extend(school_questions)

    return {
        "questions": questions,
        "count": len(questions),
        "categories": categories_to_include,
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
