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
from models import EssayWordCountRequest


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
