"""Pydantic request/response models for all API endpoints."""

from pydantic import BaseModel, Field
from typing import List, Dict, Literal, Optional


# ── Schools & Odds ─────────────────────────────────────────────────────────────

class OddsRequest(BaseModel):
    gmat: Optional[int] = Field(default=None, ge=200, le=800)
    gpa: float = Field(ge=0, le=10.0)
    gpa_scale: Optional[str] = Field(default="4.0", description="Grading scale: 4.0, 10.0, 5.0, percentage")
    test_type: Optional[str] = Field(default="gmat", description="Test type: gmat, gre, cat, xat, waiver")
    test_score: Optional[int] = Field(default=None, description="Test score if not GMAT")
    undergrad_tier: str = ""
    industry: str = ""
    work_exp: Optional[int] = Field(default=None, ge=0, le=30)
    leadership_roles: str = ""
    intl_experience: bool = False
    community_service: bool = False
    degree_type: Optional[str] = Field(default=None, description="Filter: MBA, MiM, Executive MBA, MBA (CAT)")


# ── Application Sessions ──────────────────────────────────────────────────────

class StartSessionRequest(BaseModel):
    session_id: str
    school_id: str
    name: str = Field(min_length=1, max_length=100)
    gmat: int = Field(ge=200, le=800)
    gpa: float = Field(ge=0, le=10.0)
    gpa_scale: Optional[str] = Field(default="4.0", description="Grading scale: 4.0, 10.0, 5.0, percentage")
    industry_background: str
    undergrad_tier: Optional[str] = None
    leadership_roles: Optional[str] = None
    target_intake: Optional[str] = None
    intl_experience: Optional[bool] = False
    community_service: Optional[bool] = False
    publications: Optional[bool] = False


class ChatMessageRequest(BaseModel):
    session_id: str
    message: str = Field(min_length=1, max_length=5000)


class PaymentRequest(BaseModel):
    session_id: str
    stripe_payment_intent_id: Optional[str] = None


# ── Resume Roaster ─────────────────────────────────────────────────────────────

class ResumeRoastRequest(BaseModel):
    bullet: str = Field(min_length=1, max_length=2000)


class RoastResponseSchema(BaseModel):
    score: int = Field(description="A brutal, aggressive score from 1 to 10.")
    roast: str = Field(description="A 2-3 sentence aggressive roast.")
    improvement: str = Field(description="A rewritten, impact-driven MBA bullet point.")


# ── Essay Evaluator ────────────────────────────────────────────────────────────

class EssayEvaluationRequest(BaseModel):
    school_id: str
    prompt: str = Field(min_length=1)
    essay_text: str = Field(min_length=50)


# ── Recommender Strategy ──────────────────────────────────────────────────────

class RecommenderInfo(BaseModel):
    title: str
    relationship: str
    years_known: str


class RecommenderStrategyRequest(BaseModel):
    school_id: str
    applicant_strengths: List[str]
    recommenders: List[RecommenderInfo]


# ── Interview Simulator ──────────────────────────────────────────────────────

class InterviewStartRequest(BaseModel):
    school_id: str
    difficulty: Literal["friendly", "standard", "pressure"] = "standard"
    question_count: int = Field(default=5, ge=3, le=10)


class InterviewResponseRequest(BaseModel):
    school_id: str
    history: List[Dict[str, str]]
    difficulty: Literal["friendly", "standard", "pressure"] = "standard"
    question_count: int = Field(default=5, ge=3, le=10)


# ── Control Center ────────────────────────────────────────────────────────────

class ControlCenterInitRequest(BaseModel):
    school_ids: List[str]


# ── Outreach ──────────────────────────────────────────────────────────────────

class OutreachStrategyRequest(BaseModel):
    school_id: str
    background: str = Field(max_length=2000)
    goal: str = Field(max_length=2000)


# ── Waitlist ──────────────────────────────────────────────────────────────────

class WaitlistStrategyRequest(BaseModel):
    school_id: str
    profile_updates: str = Field(max_length=2000)
    previous_essay_themes: str = Field(max_length=2000)


# ── Scholarships (Phase 21) ───────────────────────────────────────────────────

class NegotiateScholarshipRequest(BaseModel):
    primary_school_id: str
    primary_offer: str = Field(max_length=2000)
    competing_school_id: str
    competing_offer: str = Field(max_length=2000)


# ── Career Goal Sculptor (Phase 23) ──────────────────────────────────────────

class SculptGoalRequest(BaseModel):
    current_role: str = Field(max_length=2000)
    industry: str = Field(max_length=2000)
    vague_goal: str = Field(max_length=2000)
    target_school_id: str


# ── Master Storyteller (Phase 24) ─────────────────────────────────────────────

class StorytellerMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str

class StorytellerRequest(BaseModel):
    school_name: str
    essay_prompt: str
    chat_history: List[StorytellerMessage] = Field(max_length=50)
    new_message: str = Field(max_length=2000)

class StorytellerResponse(BaseModel):
    reply: str
    is_complete: bool
    extracted_outline: Optional[str] = None


# ── User School List (Phase 6 Feature) ────────────────────────────────────────

class AddSchoolRequest(BaseModel):
    school_id: str
    round: Optional[str] = None
    notes: Optional[str] = None
    priority: int = 0


class UpdateSchoolStatusRequest(BaseModel):
    status: Optional[str] = None
    round: Optional[str] = None
    notes: Optional[str] = None
    priority: Optional[int] = None


# ── School Comparison (Phase 6) ──────────────────────────────────────────────

class CompareSchoolsRequest(BaseModel):
    school_ids: List[str] = Field(min_length=2, max_length=4)
    profile: Optional[dict] = Field(default=None, description="User profile: {gmat, gpa, yoe}")


# ── Profile Strength Report (Phase 6) ────────────────────────────────────────

class ProfileAnalysisRequest(BaseModel):
    gmat: int = Field(ge=200, le=800)
    gpa: float = Field(ge=0, le=10.0)
    gpa_scale: Optional[str] = Field(default="4.0", description="Grading scale: 4.0, 10.0, 5.0, percentage")
    industry: str
    years_experience: int = Field(ge=0, le=30)
    undergrad_tier: str = ""
    leadership_roles: str = ""
    intl_experience: bool = False
    community_service: bool = False
    target_school_ids: List[str] = []


# ── Essay Versioning (Phase 6) ───────────────────────────────────────────────

class SaveEssayVersionRequest(BaseModel):
    content: str = Field(min_length=1)
    source: str = "user_edit"  # user_edit | ai_generated


# ── Community Decisions (Phase 6) ────────────────────────────────────────────

class SubmitDecisionRequest(BaseModel):
    school_id: str
    round: Literal["R1", "R2", "R3", "ED", "Rolling", "Deferred", "EMBA", "Other"]
    status: Literal["Admitted", "Waitlisted", "Dinged"]
    gmat: Optional[int] = Field(default=None, ge=200, le=800)
    gpa: Optional[float] = Field(default=None, ge=0.0, le=10.0)
    gpa_scale: Optional[str] = Field(default="4.0", description="Grading scale: 4.0, 10.0, 5.0, percentage")
    work_years: Optional[int] = None
    industry: Optional[str] = None
    is_anonymous: bool = True


# ── Auth ─────────────────────────────────────────────────────────────────────

class VerifyCredentialsRequest(BaseModel):
    email: str
    password: str


class SignupRequest(BaseModel):
    email: str
    password: str = Field(min_length=8)
    name: str = Field(min_length=1, max_length=100)


# ── Financial Comparison ────────────────────────────────────────────────────

class SchoolFinancialInput(BaseModel):
    school_id: str
    scholarship_amount: float = 0

class FinancialCompareRequest(BaseModel):
    schools: List[SchoolFinancialInput] = Field(min_length=2, max_length=5)
    current_salary: float = Field(ge=0)
    living_cost_override: Optional[float] = None
    gmat: Optional[int] = Field(default=None, ge=200, le=800)
    gpa: Optional[float] = Field(default=None, ge=0, le=10.0)
    work_exp_years: Optional[int] = Field(default=None, ge=0, le=30)
    loan_rate: float = Field(default=7.0, ge=0, le=30)
    loan_term_years: int = Field(default=10, ge=1, le=30)


# ── Admission Chances ──────────────────────────────────────────────────────

class ChancesRequest(BaseModel):
    gmat: Optional[int] = Field(default=None, ge=200, le=800)
    gpa: Optional[float] = Field(default=None, ge=0.0, le=4.0)
    work_exp_years: Optional[int] = Field(default=None, ge=0, le=30)
    industry: Optional[str] = None
    school_ids: Optional[List[str]] = Field(default=None, max_length=10)


# ── Fit Score ──────────────────────────────────────────────────────────────

class FitScoreRequest(BaseModel):
    school_ids: List[str] = Field(min_length=1, max_length=10)
    gmat: Optional[int] = Field(default=None, ge=200, le=800)
    gpa: Optional[float] = Field(default=None, ge=0.0, le=4.0)
    work_exp_years: Optional[int] = Field(default=None, ge=0, le=30)
    target_industry: Optional[str] = None
    budget_max: Optional[float] = None  # max tuition willing to pay


# ── Application Fee Calculator (Feature 9) ──────────────────────────────────

class ApplicationFeesRequest(BaseModel):
    school_ids: List[str] = Field(min_length=1, max_length=20)


# ── Essay Word Count ───────────────────────────────────────────────────────

class EssayWordCountRequest(BaseModel):
    text: str
    word_limit: Optional[int] = None
    char_limit: Optional[int] = None


# ── Essay Theme Analyzer ─────────────────────────────────────────────────

class ThemeAnalysisEssay(BaseModel):
    title: str
    content: str

class ThemeAnalysisRequest(BaseModel):
    essays: List[ThemeAnalysisEssay]


# ── Application Strength Meter ────────────────────────────────────────────

class AppStrengthRequest(BaseModel):
    gmat: Optional[int] = None
    gpa: Optional[float] = None
    work_years: Optional[int] = None
    leadership_examples: Optional[int] = 0
    extracurriculars: Optional[int] = 0
    international_exp: bool = False
    target_school_id: Optional[str] = None
