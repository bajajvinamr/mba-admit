"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { outcomeKeys } from "@/hooks/queries/useOutcomes";

// ── Types ────────────────────────────────────────────────────────────────────

export type SubmitOutcomeRequest = {
  schoolSlug: string;
  round: "R1" | "R2" | "R3" | "ED" | "Rolling";
  result: "admitted" | "rejected" | "waitlisted" | "withdrew";
  gmatScore: number | null;
  gpa: number | null;
  yearsExp: number | null;
  industry: string | null;
  scholarship: boolean;
  anonymous: boolean;
};

export type SubmitOutcomeResponse = {
  success: boolean;
  outcome_id: string;
};

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Submit an outcome contribution (admit/deny/waitlist decision).
 * POST /api/outcomes
 */
export function useSubmitOutcome() {
  const queryClient = useQueryClient();

  return useMutation<SubmitOutcomeResponse, Error, SubmitOutcomeRequest>({
    mutationFn: ({
      schoolSlug,
      round,
      result,
      gmatScore,
      gpa,
      yearsExp,
      industry,
      scholarship,
      anonymous,
    }) =>
      apiFetch<SubmitOutcomeResponse>("/api/outcomes", {
        method: "POST",
        body: JSON.stringify({
          school_id: schoolSlug,
          round,
          result,
          gmat_score: gmatScore,
          gpa,
          years_experience: yearsExp,
          industry,
          scholarship,
          anonymous,
        }),
      }),
    onSuccess: (_data, { schoolSlug }) => {
      // Invalidate outcomes for this school so fresh data is shown
      queryClient.invalidateQueries({
        queryKey: outcomeKeys.bySchool(schoolSlug),
      });
    },
  });
}
