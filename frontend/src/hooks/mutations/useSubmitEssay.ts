"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { essayPromptKeys } from "@/hooks/queries/useEssayPrompts";

// ── Types ────────────────────────────────────────────────────────────────────

export type SubmitEssayRequest = {
  schoolSlug: string;
  promptIndex: number;
  content: string;
  /** Optional title for the draft */
  title?: string;
};

export type SubmitEssayResponse = {
  success: boolean;
  draft_id: string;
  word_count: number;
  saved_at: string;
};

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Save an essay draft to the server.
 * POST /api/essays/drafts
 */
export function useSubmitEssay() {
  const queryClient = useQueryClient();

  return useMutation<SubmitEssayResponse, Error, SubmitEssayRequest>({
    mutationFn: ({ schoolSlug, promptIndex, content, title }) =>
      apiFetch<SubmitEssayResponse>("/api/essays/drafts", {
        method: "POST",
        body: JSON.stringify({
          school_id: schoolSlug,
          prompt_index: promptIndex,
          content,
          title,
        }),
      }),
    onSuccess: (_data, { schoolSlug }) => {
      // Invalidate essay-related queries for this school
      queryClient.invalidateQueries({
        queryKey: essayPromptKeys.bySchool(schoolSlug),
      });
      queryClient.invalidateQueries({ queryKey: ["essayDrafts"] });
    },
  });
}
