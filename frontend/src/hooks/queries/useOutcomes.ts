"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { SchoolOutcomes } from "@/app/school/[schoolId]/_components/types";

// ── Types ────────────────────────────────────────────────────────────────────

export type OutcomesResponse = SchoolOutcomes;

// ── Query Keys ───────────────────────────────────────────────────────────────

export const outcomeKeys = {
  all: ["outcomes"] as const,
  bySchool: (slug: string) => ["outcomes", slug] as const,
};

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetch outcome/decision data for a specific school.
 * GET /api/outcomes/{slug}
 */
export function useOutcomes(schoolSlug: string) {
  return useQuery<OutcomesResponse>({
    queryKey: outcomeKeys.bySchool(schoolSlug),
    queryFn: () =>
      apiFetch<OutcomesResponse>(`/api/outcomes/${encodeURIComponent(schoolSlug)}`),
    enabled: !!schoolSlug,
    staleTime: 5 * 60_000,
  });
}
