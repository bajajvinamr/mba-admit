/**
 * Zod validation schemas for all user-facing forms.
 * Use these at the form boundary before sending data to the API.
 */

import { z } from "zod";

// ── Odds Calculator ──────────────────────────────────────────────────────────

export const oddsCalculatorSchema = z.object({
  gmat: z.number().int().min(200, "GMAT must be at least 200").max(800, "GMAT cannot exceed 800"),
  gpa: z.number().min(0, "GPA must be at least 0").max(4.0, "GPA cannot exceed 4.0"),
  undergrad_tier: z.string().optional().default(""),
  industry: z.string().optional().default(""),
  leadership_roles: z.string().optional().default(""),
  intl_experience: z.boolean().optional().default(false),
  community_service: z.boolean().optional().default(false),
});

export type OddsCalculatorInput = z.infer<typeof oddsCalculatorSchema>;

// ── Application Profile ─────────────────────────────────────────────────────

export const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  gmat: z.number().int().min(200, "GMAT must be at least 200").max(800, "GMAT cannot exceed 800"),
  gpa: z.number().min(0, "GPA must be at least 0").max(4.0, "GPA cannot exceed 4.0"),
  industry_background: z.string().min(1, "Industry is required"),
});

export type ProfileInput = z.infer<typeof profileSchema>;

// ── Chat Message ─────────────────────────────────────────────────────────────

export const chatMessageSchema = z.object({
  session_id: z.string().min(1, "Session ID is required"),
  message: z.string().min(1, "Message cannot be empty").max(5000, "Message too long (5000 char limit)"),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;

// ── Essay Evaluation ────────────────────────────────────────────────────────

export const essayEvaluationSchema = z.object({
  school_id: z.string().min(1, "School is required"),
  prompt: z.string().min(1, "Essay prompt is required"),
  essay_text: z.string().min(50, "Essay must be at least 50 characters"),
});

export type EssayEvaluationInput = z.infer<typeof essayEvaluationSchema>;

// ── Resume Roast ────────────────────────────────────────────────────────────

export const resumeRoastSchema = z.object({
  bullet: z.string().min(1, "Resume bullet is required").max(2000, "Bullet too long"),
});

export type ResumeRoastInput = z.infer<typeof resumeRoastSchema>;

// ── Auth ────────────────────────────────────────────────────────────────────

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;

// ── Checkout ────────────────────────────────────────────────────────────────

export const checkoutSchema = z.object({
  plan: z.enum(["pro", "premium", "consultant"], { message: "Invalid plan" }),
  billing: z.enum(["monthly", "annual"]).optional().default("monthly"),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

// ── Interview ───────────────────────────────────────────────────────────────

export const interviewQuestionSchema = z.object({
  school_id: z.string().min(1, "School is required"),
  question_type: z.string().optional().default("behavioral"),
});

export type InterviewQuestionInput = z.infer<typeof interviewQuestionSchema>;

// ── Storyteller ─────────────────────────────────────────────────────────────

export const storytellerSchema = z.object({
  background: z.string().min(10, "Tell us a bit more about yourself (at least 10 chars)").max(3000, "Background too long"),
  goals: z.string().min(10, "Goals should be at least 10 characters").max(2000, "Goals too long"),
});

export type StorytellerInput = z.infer<typeof storytellerSchema>;
