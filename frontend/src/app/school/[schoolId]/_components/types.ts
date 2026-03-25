/** Shared types for the school detail page and its sub-components. */

export type DataQuality = {
  source: "scraped" | "synthetic" | "unknown";
  verified_fields: string[];
  confidence: number;
  last_scraped: string | null;
  source_urls?: string[];
  estimated_fields?: string[];
};

export type SchoolData = {
  id: string; name: string; location: string; country: string;
  gmat_avg: number | null; acceptance_rate: number; class_size: number;
  tuition_usd: number; median_salary: string; degree_type: string;
  specializations: string[]; essay_prompts: (string | { prompt: string; word_limit?: number; required?: boolean; category?: string; type?: string })[];
  data_quality_summary?: DataQuality;
  admission_requirements?: {
    gmat_gre: string; work_experience: string; avg_work_experience: string;
    english_proficiency: string; transcripts: string; recommendations: string;
    resume: string; interview: string; application_fee: string;
  };
  program_details?: {
    duration: string; format: string; total_credits: number;
    core_courses: number; elective_courses: string; class_size: number;
    avg_age: number; female_percentage: string; international_percentage: string;
    countries_represented: number; stem_designated: boolean; start_date: string;
  };
  program_duration?: string;
  unique_features?: string[];
  placement_stats?: {
    employment_rate_3_months: string; median_base_salary: string;
    median_signing_bonus: string;
    industry_breakdown: { industry: string; percentage: number }[];
    top_recruiters: string[]; internship_rate: string;
  };
  admission_deadlines?: { round: string; deadline: string; decision: string }[];
  application_questions?: (string | { prompt: string; word_limit?: number; required?: boolean; category?: string; type?: string })[];
  programs?: {
    name: string; full_name: string; type: string; admission_test: string;
    duration: string; fees?: string; class_size?: number; avg_salary?: string;
    min_experience?: string;
  }[];
  primary_admission_test?: string;
  tuition_inr?: string;
  application_url?: string;
  application_fee_usd?: number;
  scholarships?: { name: string; amount_usd?: number | null; criteria?: string; description?: string }[];
};

export type GmatDistBucket = { range: string; admitted: number; denied: number };
export type IndustryBreakdown = { industry: string; count: number; pct: number };
export type YoeDistBucket = { range: string; count: number };

export type SchoolOutcomes = {
  total_decisions: number; admit_count: number; deny_count: number;
  waitlist_count: number; interview_count: number;
  median_gmat_admitted: number | null; median_gpa_admitted: number | null;
  median_yoe_admitted: number | null;
  gmat_distribution: GmatDistBucket[]; gpa_distribution: GmatDistBucket[];
  top_industries: IndustryBreakdown[]; yoe_distribution: YoeDistBucket[];
};

export type ProfileFit = {
  gmat_percentile: number; gpa_percentile: number; yoe_percentile: number;
  verdict: string;
};

export type SimilarApplicant = {
  gmat: number | null; gpa: number | null; yoe: number | null;
  industry: string | null; outcome: string; round: string | null;
};

export type SchoolInsights = {
  school_id: string; has_data: boolean;
  outcomes: SchoolOutcomes | null; profile_fit: ProfileFit | null;
  similar_applicants?: SimilarApplicant[];
};

export type ApplicantProfile = {
  gmat_score: number | null;
  gpa: number | null;
  work_experience_years: number | null;
  industry: string | null;
  result: string;
  round: string | null;
  year: number | null;
  scholarship_info: string | null;
  nationality: string | null;
  undergraduate_school: string | null;
};

export type InterviewQuestion = {
  question: string;
  category: string | null;
  frequency: string | null;
};

export type StudentReview = {
  rating: number | null;
  pros: string | null;
  cons: string | null;
  year_of_review: number | null;
};

export type RealApplicantData = {
  school_id: string;
  decisions: { school: string; result: string; round: string | null; gmat_score: number | null; gpa: number | null; work_experience_years: number | null; industry: string | null; date: string | null; international: boolean | null }[];
  applicant_profiles: ApplicantProfile[];
  interview_questions: InterviewQuestion[];
  student_reviews: StudentReview[];
  admission_stats: { avg_gmat_accepted: number | null; avg_gpa_accepted: number | null; acceptance_rate: string | null; class_size: number | null } | null;
  data_counts: { decisions: number; profiles: number; interview_questions: number; reviews: number };
};

export type Message = { role: string; content: string };

export type AppState = {
  profile: unknown; match_scores: unknown[]; interview_history: Message[];
  drafts: Record<string, string>; current_agent: string;
  status_message: string; is_paid: boolean;
};
