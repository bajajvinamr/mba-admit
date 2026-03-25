"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { schoolKeys } from "@/hooks/queries/useSchools";

// ── Types ────────────────────────────────────────────────────────────────────

export type SaveSchoolRequest = {
  schoolSlug: string;
  action: "track" | "untrack";
};

export type SaveSchoolResponse = {
  success: boolean;
  tracked: boolean;
};

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Track or untrack a school in the user's saved list.
 * POST /api/saved-schools
 */
export function useSaveSchool() {
  const queryClient = useQueryClient();

  return useMutation<SaveSchoolResponse, Error, SaveSchoolRequest>({
    mutationFn: ({ schoolSlug, action }) =>
      apiFetch<SaveSchoolResponse>("/api/saved-schools", {
        method: "POST",
        body: JSON.stringify({
          school_id: schoolSlug,
          action,
        }),
      }),
    onSuccess: (_data, { schoolSlug }) => {
      // Invalidate the school detail and any saved-schools list
      queryClient.invalidateQueries({ queryKey: schoolKeys.detail(schoolSlug) });
      queryClient.invalidateQueries({ queryKey: ["savedSchools"] });
    },
  });
}
