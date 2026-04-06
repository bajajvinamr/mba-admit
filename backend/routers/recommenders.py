"""Recommender management — CRUD for tracking recommendation letters."""

import logging
from datetime import datetime
from typing import Optional, List
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api", tags=["recommenders"])
logger = logging.getLogger(__name__)


# ── In-memory store (V1 — swap for DB in production) ─────────────────────────

_recommenders: dict[str, dict] = {}


# ── Models ───────────────────────────────────────────────────────────────────

class CreateRecommenderRequest(BaseModel):
    user_id: str
    name: str = Field(min_length=1, max_length=200)
    email: Optional[str] = None
    relationship: str = Field(
        description="manager | colleague | professor | mentor | other"
    )
    school_assignments: List[str] = Field(default_factory=list)
    status: str = "not_asked"
    deadline: Optional[str] = None
    notes: Optional[str] = None


class UpdateRecommenderRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    relationship: Optional[str] = None
    school_assignments: Optional[List[str]] = None
    status: Optional[str] = None
    deadline: Optional[str] = None
    notes: Optional[str] = None


VALID_STATUSES = {"not_asked", "asked", "accepted", "submitted"}
VALID_RELATIONSHIPS = {"manager", "colleague", "professor", "mentor", "other"}


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/recommenders")
def list_recommenders(user_id: str = Query(..., description="User ID")):
    """List all recommenders for a given user."""
    user_recs = [
        rec for rec in _recommenders.values()
        if rec["user_id"] == user_id
    ]
    user_recs.sort(key=lambda r: r["created_at"], reverse=True)
    return {"recommenders": user_recs}


@router.post("/recommenders", status_code=201)
def create_recommender(req: CreateRecommenderRequest):
    """Create a new recommender."""
    if req.relationship not in VALID_RELATIONSHIPS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid relationship. Must be one of: {', '.join(VALID_RELATIONSHIPS)}",
        )
    if req.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}",
        )

    rec_id = str(uuid4())[:12]
    now = datetime.utcnow().isoformat()

    rec = {
        "id": rec_id,
        "user_id": req.user_id,
        "name": req.name,
        "email": req.email,
        "relationship": req.relationship,
        "school_assignments": req.school_assignments,
        "status": req.status,
        "deadline": req.deadline,
        "notes": req.notes,
        "created_at": now,
        "updated_at": now,
    }

    _recommenders[rec_id] = rec
    return rec


@router.patch("/recommenders/{rec_id}")
def update_recommender(rec_id: str, req: UpdateRecommenderRequest):
    """Update a recommender's status, notes, deadline, or other fields."""
    rec = _recommenders.get(rec_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Recommender not found")

    if req.status is not None and req.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}",
        )
    if req.relationship is not None and req.relationship not in VALID_RELATIONSHIPS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid relationship. Must be one of: {', '.join(VALID_RELATIONSHIPS)}",
        )

    update_data = req.model_dump(exclude_none=True)
    for key, value in update_data.items():
        rec[key] = value
    rec["updated_at"] = datetime.utcnow().isoformat()

    return rec


@router.delete("/recommenders/{rec_id}")
def delete_recommender(rec_id: str, user_id: str = Query(..., description="User ID")):
    """Remove a recommender."""
    rec = _recommenders.get(rec_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Recommender not found")
    if rec["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    del _recommenders[rec_id]
    return {"deleted": rec_id}


@router.post("/recommenders/{rec_id}/briefing")
def generate_briefing(
    rec_id: str,
    school_id: str = Query(..., description="School slug"),
    user_profile: Optional[str] = Query(None, description="JSON-encoded user profile"),
):
    """Generate a personalized recommender briefing via Claude API.

    Enhanced: Takes recommender info + school data + user profile to generate
    a detailed, school-specific briefing document.
    """
    import os
    from agents import SCHOOL_DB

    rec = _recommenders.get(rec_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Recommender not found")

    school = SCHOOL_DB.get(school_id)
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    school_name = school.get("name", school_id)
    program = school.get("degree_type", "MBA")
    values = school.get("specializations", [])[:5]
    values_str = ", ".join(values) if values else "leadership, innovation, and collaboration"

    # Parse user profile if provided
    profile_data = {}
    if user_profile:
        try:
            import json
            profile_data = json.loads(user_profile)
        except Exception:
            pass

    # Try Claude API for personalized briefing
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if api_key:
        try:
            import json
            import anthropic

            client = anthropic.Anthropic(api_key=api_key)

            prompt = f"""Generate a comprehensive recommender briefing document for an MBA applicant.

RECOMMENDER INFO:
- Name: {rec['name']}
- Relationship: {rec['relationship']}
- Email: {rec.get('email', 'Not provided')}

SCHOOL INFO:
- School: {school_name}
- Program: {program}
- Key Values: {values_str}
- Culture: {school.get('description', '')[:300]}
- Class Size: {school.get('class_size', 'N/A')}

APPLICANT PROFILE:
{json.dumps(profile_data, indent=2)[:1000] if profile_data else 'Not provided'}

DEADLINE: {rec.get('deadline', 'Not specified')}

Generate a JSON response with:
{{
  "briefing_html": "Full HTML briefing document (styled with inline CSS) that the applicant can share with their recommender. Include: what the school values, what this recommender should emphasize given their relationship, specific stories/themes to highlight, what NOT to say, formatting tips for the recommendation letter.",
  "key_themes": ["3-5 key themes the recommender should weave in"],
  "what_to_emphasize": ["specific qualities/stories to highlight"],
  "what_to_avoid": ["things the recommender should NOT mention or do"],
  "school_specific_tips": ["tips specific to this school's recommendation process"],
  "suggested_anecdotes": ["types of stories/examples that would resonate with this school"]
}}"""

            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=3000,
                system="You are an expert MBA admissions consultant who specializes in recommendation letter strategy. Generate detailed, personalized briefing documents. Output valid JSON only.",
                messages=[{"role": "user", "content": prompt}],
            )

            response_text = message.content[0].text.strip()
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()

            briefing_data = json.loads(response_text)

            return {
                "school_name": school_name,
                "program": program,
                "recommender_name": rec["name"],
                "relationship": rec["relationship"],
                "ai_generated": True,
                "briefing_html": briefing_data.get("briefing_html", ""),
                "key_themes": briefing_data.get("key_themes", []),
                "what_to_emphasize": briefing_data.get("what_to_emphasize", []),
                "what_to_avoid": briefing_data.get("what_to_avoid", []),
                "school_specific_tips": briefing_data.get("school_specific_tips", []),
                "suggested_anecdotes": briefing_data.get("suggested_anecdotes", []),
                "template": briefing_data.get("briefing_html", ""),
                "tips": briefing_data.get("school_specific_tips", []),
            }

        except Exception as e:
            logger.warning("Claude briefing generation failed, falling back to template: %s", str(e))

    # Fallback: template-based briefing
    briefing = {
        "school_name": school_name,
        "program": program,
        "recommender_name": rec["name"],
        "relationship": rec["relationship"],
        "ai_generated": False,
        "briefing_html": "",
        "key_themes": ["Leadership impact", "Teamwork and collaboration", "Growth trajectory"],
        "what_to_emphasize": [
            "Specific examples of leadership and impact",
            "Ability to work in teams and drive results",
            "Growth trajectory and potential for future leadership",
        ],
        "what_to_avoid": [
            "Generic praise without specific examples",
            "Repeating what's already in the resume",
            "Mentioning weaknesses without context of growth",
        ],
        "school_specific_tips": [
            "Share this briefing 4-6 weeks before the deadline",
            "Offer to provide your resume and essay drafts for context",
            "Mention specific projects or achievements you'd like them to reference",
            "Follow up 2 weeks before the deadline if not yet submitted",
        ],
        "suggested_anecdotes": [],
        "template": (
            f"Dear {rec['name']},\n\n"
            f"Thank you for agreeing to write a recommendation letter for my application "
            f"to the {program} program at {school_name}.\n\n"
            f"Here are some key areas the admissions committee values: {values_str}.\n\n"
            f"I would appreciate it if you could highlight:\n"
            f"- Specific examples of my leadership and impact\n"
            f"- My ability to work in teams and drive results\n"
            f"- My growth trajectory and potential for future leadership\n\n"
            f"The recommendation is due by {rec.get('deadline', 'the application deadline')}.\n\n"
            f"Please let me know if you need any additional information or if you'd like "
            f"to discuss this further.\n\n"
            f"Best regards"
        ),
        "tips": [
            "Share this briefing 4-6 weeks before the deadline",
            "Offer to provide your resume and essay drafts for context",
            "Mention specific projects or achievements you'd like them to reference",
            "Follow up 2 weeks before the deadline if not yet submitted",
        ],
    }

    return briefing


@router.post("/recommenders/suggest-assignment")
def suggest_recommender_assignment(
    user_id: str = Query(...),
    school_ids: List[str] = Query(..., description="School slugs to assign recommenders to"),
):
    """AI suggests which recommender to assign to which school based on fit."""
    from agents import SCHOOL_DB

    user_recs = [rec for rec in _recommenders.values() if rec["user_id"] == user_id]
    if not user_recs:
        raise HTTPException(404, detail="No recommenders found for this user")

    suggestions = []
    for school_id in school_ids:
        school = SCHOOL_DB.get(school_id, {})
        school_name = school.get("name", school_id)
        values = school.get("specializations", [])

        # Simple heuristic: managers for leadership-focused schools, professors for academic
        best_rec = None
        best_reason = ""
        for rec in user_recs:
            rel = rec.get("relationship", "")
            if "leadership" in " ".join(values).lower() and rel == "manager":
                best_rec = rec
                best_reason = f"{school_name} values leadership — a manager's perspective carries weight"
            elif "academic" in " ".join(values).lower() and rel == "professor":
                best_rec = rec
                best_reason = f"{school_name} emphasizes academic rigor — a professor's recommendation stands out"
            elif not best_rec:
                best_rec = rec
                best_reason = f"Strong match based on {rel} relationship"

        if best_rec:
            suggestions.append({
                "school_id": school_id,
                "school_name": school_name,
                "recommended_recommender_id": best_rec["id"],
                "recommended_recommender_name": best_rec["name"],
                "reasoning": best_reason,
            })

    return {"suggestions": suggestions}
