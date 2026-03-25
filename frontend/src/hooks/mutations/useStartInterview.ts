"use client";

import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────────

export type StartInterviewRequest = {
  schoolSlug: string;
  /** Interview style: behavioral, case, mixed */
  style?: "behavioral" | "case " | "mixed";
};

export type StartInterviewResponse = {
  session_id: string;
  school_id: string;
  first_question: string;
  style: string;
  total_questions: number;
};

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Start a new mock interview session.
 * POST /api/interview/start
 */
export function useStartInterview() {
  return useMutation<StartInterviewResponse, Error, StartInterviewRequest>({
    mutationFn: ({ schoolSlug, style = "mixed" }) =>
      apiFetch<StartInterviewResponse>("/api/interview/start", {
        method: "POST",
        body: JSON.stringify({
          school_id: schoolSlug,
          style,
        }),
      }),
  });
}
