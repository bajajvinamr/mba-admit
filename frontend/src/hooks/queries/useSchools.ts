"use client";

import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────────

export type SearchFilters = {
  gmat_min?: number;
  gmat_max?: number;
  acceptance_min?: number;
  acceptance_max?: number;
  tuition_max?: number;
  countries?: string[];
  formats?: string[];
  concentrations?: string[];
  tier?: string[];
  test_optional?: boolean;
};

export type SearchRequest = {
  query?: string;
  filters?: SearchFilters;
  sort?: string;
  page?: number;
  per_page?: number;
};

export type SchoolSummary = {
  id: string;
  name: string;
  country: string;
  location: string;
  gmat_avg: number | null;
  acceptance_rate: number | null;
  tuition_usd: number | null;
  class_size: number | null;
  essay_count: number;
  tier: string;
  data_source: string;
  data_confidence: number;
};

export type SearchResponse = {
  schools: SchoolSummary[];
  total: number;
  page: number;
  per_page: number;
  filters_applied: Record<string, unknown>;
};

// ── Query Keys ───────────────────────────────────────────────────────────────

export const schoolKeys = {
  all: ["schools"] as const,
  search: (filters: Omit<SearchRequest, "page">) =>
    ["schools", "search", filters] as const,
  detail: (slug: string) => ["school", slug] as const,
};

// ── Hooks ────────────────────────────────────────────────────────────────────

const DEFAULT_PER_PAGE = 20;

/**
 * Infinite-scroll school search via POST /api/schools/search.
 * Each page is fetched on demand as the user scrolls.
 */
export function useSchools(
  request: Omit<SearchRequest, "page"> = {},
  enabled = true,
) {
  const perPage = request.per_page ?? DEFAULT_PER_PAGE;

  return useInfiniteQuery<SearchResponse, Error>({
    queryKey: schoolKeys.search(request),
    queryFn: ({ pageParam }) =>
      apiFetch<SearchResponse>("/schools/search", {
        method: "POST",
        body: JSON.stringify({
          ...request,
          page: pageParam,
          per_page: perPage,
        }),
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const fetched = lastPage.page * lastPage.per_page;
      return fetched < lastPage.total ? lastPage.page + 1 : undefined;
    },
    enabled,
    staleTime: 2 * 60_000,
  });
}

/**
 * Simple paginated search (non-infinite) for backward compat.
 * Returns a single page of results.
 */
export function useSchoolSearch(request: SearchRequest, enabled = true) {
  return useQuery<SearchResponse>({
    queryKey: ["schools", "search", request],
    queryFn: () =>
      apiFetch<SearchResponse>("/schools/search", {
        method: "POST",
        body: JSON.stringify(request),
      }),
    enabled,
    staleTime: 2 * 60_000,
  });
}

/**
 * Fetch a single school by slug via GET /api/schools/{slug}.
 */
export function useSchool(slug: string) {
  return useQuery({
    queryKey: schoolKeys.detail(slug),
    queryFn: () => apiFetch(`/schools/${slug}`),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });
}
