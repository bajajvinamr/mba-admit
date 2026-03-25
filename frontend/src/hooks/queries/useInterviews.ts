"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────────

export type InterviewQuestion = {
  q: string;
  difficulty: "easy" | "medium" | "hard";
  schools: string[];
  tips: string;
  category?: string;
};

export type InterviewCategory = {
  id: string;
  name: string;
  questions: InterviewQuestion[];
  count: number;
};

export type InterviewSchoolInfo = {
  format: string;
  interviewer: string;
  prep_tip: string;
};

export type InterviewQuestionsResponse = {
  categories: InterviewCategory[];
  total_questions: number;
  school_info: InterviewSchoolInfo | null;
};

export type InterviewFilters = {
  school_id?: string;
  difficulty?: string;
  category?: string;
};

// ── Query Keys ───────────────────────────────────────────────────────────────

export const interviewKeys = {
  all: ["interviewQuestions"] as const,
  bySchool: (schoolSlug: string) =>
    ["interviewQuestions", schoolSlug] as const,
  filtered: (filters: InterviewFilters) =>
    ["interviewQuestions", filters] as const,
};

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetch interview questions, optionally filtered by school.
 * GET /api/interview/questions?school_id={slug}
 */
export function useInterviewQuestions(
  schoolSlug: string = "",
  filters: Omit<InterviewFilters, "school_id"> = {},
) {
  const allFilters: InterviewFilters = {
    ...filters,
    ...(schoolSlug ? { school_id: schoolSlug } : {}),
  };

  const params = new URLSearchParams();
  if (allFilters.school_id) params.set("school_id", allFilters.school_id);
  if (allFilters.difficulty) params.set("difficulty", allFilters.difficulty);
  if (allFilters.category) params.set("category", allFilters.category);

  const search = params.toString();

  return useQuery<InterviewQuestionsResponse>({
    queryKey: interviewKeys.filtered(allFilters),
    queryFn: () =>
      apiFetch<InterviewQuestionsResponse>(
        `/api/interview/questions${search ? `?${search}` : ""}`,
      ),
    staleTime: 10 * 60_000,
  });
}
