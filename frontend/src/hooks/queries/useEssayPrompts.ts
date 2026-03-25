"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────────

export type EssayPrompt = {
  school_id: string;
  school_name: string;
  prompt_index: number;
  prompt_text: string;
  word_limit: number | null;
};

export type EssayPromptsResponse = {
  prompts: EssayPrompt[];
  total_prompts: number;
  school_count: number;
};

// ── Query Keys ───────────────────────────────────────────────────────────────

export const essayPromptKeys = {
  all: ["essayPrompts"] as const,
  bySchool: (schoolSlug: string) => ["essayPrompts", schoolSlug] as const,
};

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetch essay prompts for a specific school.
 * GET /api/essay-prompts?school_id={slug}
 *
 * When called without a slug (empty string), fetches all prompts.
 */
export function useEssayPrompts(schoolSlug: string = "") {
  const params = schoolSlug
    ? `?school_id=${encodeURIComponent(schoolSlug)}`
    : "";

  return useQuery<EssayPromptsResponse>({
    queryKey: schoolSlug
      ? essayPromptKeys.bySchool(schoolSlug)
      : essayPromptKeys.all,
    queryFn: () => apiFetch<EssayPromptsResponse>(`/api/essay-prompts${params}`),
    staleTime: 10 * 60_000, // prompts change infrequently
  });
}
