"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from"react";
import { useInfiniteQuery } from"@tanstack/react-query";
import { ArrowUpDown, SearchX, RefreshCw } from"lucide-react";
import { SearchBar } from"@/components/search/SearchBar";
import {
 FilterPanel,
 MobileFilterTrigger,
 type SearchFilters,
 DEFAULT_FILTERS,
 hasActiveFilters,
} from"@/components/search/FilterPanel";
import { FilterChip } from"@/components/search/FilterChip";
import { SchoolCard, SchoolCardSkeleton, type SchoolSearchResult } from"@/components/search/SchoolCard";
import { SchoolCard3D } from"@/components/search/SchoolCard3D";
import { EmptyState } from"@/components/EmptyState";
import { EmailCapture } from"@/components/EmailCapture";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import { useDebounce } from"@/hooks/useDebounce";
import { apiFetch } from"@/lib/api";
import { track } from"@/lib/analytics";

// ── Types ────────────────────────────────────────────────────────────────────

type SearchResponse = {
 schools: SchoolSearchResult[];
 total: number;
 page: number;
 per_page: number;
 filters_applied: Record<string, unknown>;
};

type SortOption = {
 label: string;
 value: string;
};

// ── Constants ────────────────────────────────────────────────────────────────

const PER_PAGE = 24;

const SORT_OPTIONS: SortOption[] = [
 { label:"Ranking", value:"ranking"},
 { label:"Fit Score", value:"fit_score"},
 { label:"Acceptance Rate", value:"acceptance"},
 { label:"Tuition", value:"tuition"},
 { label:"GMAT", value:"gmat"},
 { label:"Name (A-Z)", value:"name"},
];

// ── API ──────────────────────────────────────────────────────────────────────

function buildSearchBody(
 query: string,
 filters: SearchFilters,
 sort: string,
 page: number,
) {
 const body: Record<string, unknown> = {
 sort,
 page,
 per_page: PER_PAGE,
 };

 if (query.trim()) {
 body.query = query.trim();
 }

 const f: Record<string, unknown> = {};

 if (filters.gmatRange[0] !== 400) f.gmat_min = filters.gmatRange[0];
 if (filters.gmatRange[1] !== 800) f.gmat_max = filters.gmatRange[1];
 if (filters.acceptanceRange[0] !== 0) f.acceptance_min = filters.acceptanceRange[0];
 if (filters.acceptanceRange[1] !== 100) f.acceptance_max = filters.acceptanceRange[1];
 if (filters.tuitionRange[0] !== 0) f.tuition_min = filters.tuitionRange[0];
 if (filters.tuitionRange[1] !== 200000) f.tuition_max = filters.tuitionRange[1];
 if (filters.countries.length > 0) f.countries = filters.countries;
 if (filters.formats.length > 0) f.formats = filters.formats;
 if (filters.tiers.length > 0) f.tier = filters.tiers;
 if (filters.testOptional) f.test_optional = true;

 if (Object.keys(f).length > 0) {
 body.filters = f;
 }

 return body;
}

async function fetchSearchPage(
 query: string,
 filters: SearchFilters,
 sort: string,
 page: number,
): Promise<SearchResponse> {
 const body = buildSearchBody(query, filters, sort, page);
 const result = await apiFetch<SearchResponse>("/api/schools/search", {
 method:"POST",
 body: JSON.stringify(body),
 });
 // Defensive: ensure response has expected shape
 return {
 schools: Array.isArray(result.schools) ? result.schools : [],
 total: typeof result.total ==="number" ? result.total : 0,
 page: typeof result.page ==="number" ? result.page : page,
 per_page: typeof result.per_page ==="number" ? result.per_page : PER_PAGE,
 filters_applied: result.filters_applied ?? {},
 };
}

// ── Active Filter Chips ──────────────────────────────────────────────────────

function getActiveFilterChips(
 filters: SearchFilters,
 onFiltersChange: (f: SearchFilters) => void,
): { label: string; onRemove: () => void }[] {
 const chips: { label: string; onRemove: () => void }[] = [];

 if (filters.gmatRange[0] !== 400 || filters.gmatRange[1] !== 800) {
 chips.push({
 label: `GMAT: ${filters.gmatRange[0]}-${filters.gmatRange[1]}`,
 onRemove: () => onFiltersChange({ ...filters, gmatRange: [400, 800] }),
 });
 }
 if (filters.acceptanceRange[0] !== 0 || filters.acceptanceRange[1] !== 100) {
 chips.push({
 label: `Accept: ${filters.acceptanceRange[0]}%-${filters.acceptanceRange[1]}%`,
 onRemove: () => onFiltersChange({ ...filters, acceptanceRange: [0, 100] }),
 });
 }
 if (filters.tuitionRange[0] !== 0 || filters.tuitionRange[1] !== 200000) {
 const fmtTuition = (v: number) => (v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${v}`);
 chips.push({
 label: `Tuition: ${fmtTuition(filters.tuitionRange[0])}-${fmtTuition(filters.tuitionRange[1])}`,
 onRemove: () => onFiltersChange({ ...filters, tuitionRange: [0, 200000] }),
 });
 }
 for (const country of filters.countries) {
 chips.push({
 label: country,
 onRemove: () =>
 onFiltersChange({
 ...filters,
 countries: filters.countries.filter((c) => c !== country),
 }),
 });
 }
 for (const fmt of filters.formats) {
 chips.push({
 label: fmt.charAt(0).toUpperCase() + fmt.slice(1),
 onRemove: () =>
 onFiltersChange({
 ...filters,
 formats: filters.formats.filter((f) => f !== fmt),
 }),
 });
 }
 for (const tier of filters.tiers) {
 chips.push({
 label: tier,
 onRemove: () =>
 onFiltersChange({
 ...filters,
 tiers: filters.tiers.filter((t) => t !== tier),
 }),
 });
 }
 if (filters.testOptional) {
 chips.push({
 label:"Test Optional",
 onRemove: () => onFiltersChange({ ...filters, testOptional: false }),
 });
 }
 if (filters.scholarshipFriendly) {
 chips.push({
 label:"Scholarship Friendly",
 onRemove: () => onFiltersChange({ ...filters, scholarshipFriendly: false }),
 });
 }

 return chips;
}

// ── Page Component ───────────────────────────────────────────────────────────

export default function SchoolsSearchPage() {
 const [searchQuery, setSearchQuery] = useState("");
 const [filters, setFilters] = useState<SearchFilters>({ ...DEFAULT_FILTERS });
 const [sort, setSort] = useState("ranking");
 const debouncedSearch = useDebounce(searchQuery, 300);

 // Fetch country list for filter dropdown
 const [availableCountries, setAvailableCountries] = useState<string[]>([]);
 useEffect(() => {
 apiFetch<SchoolSearchResult[]>("/api/schools")
 .then((schools) => {
 const countries = Array.from(
 new Set(schools.map((s) => s.country).filter(Boolean)),
 ).sort();
 setAvailableCountries(countries);
 })
 .catch(() => {
 // Non-critical, filter panel still works without this
 });
 }, []);

 // Track searches
 useEffect(() => {
 if (debouncedSearch && debouncedSearch.length >= 2) {
 track("school_searched", { query: debouncedSearch });
 }
 }, [debouncedSearch]);

 // Infinite query
 const {
 data,
 fetchNextPage,
 hasNextPage,
 isFetchingNextPage,
 isLoading,
 isError,
 refetch,
 } = useInfiniteQuery({
 queryKey: ["schools-search", debouncedSearch, filters, sort],
 queryFn: ({ pageParam = 1 }) =>
 fetchSearchPage(debouncedSearch, filters, sort, pageParam),
 getNextPageParam: (lastPage) => {
 const totalPages = Math.ceil(lastPage.total / lastPage.per_page);
 return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
 },
 initialPageParam: 1,
 });

 // Flatten pages into a single list
 const schools = useMemo(
 () => data?.pages.flatMap((p) => p.schools) ?? [],
 [data],
 );
 const totalCount = data?.pages[0]?.total ?? 0;

 // IntersectionObserver for infinite scroll
 const sentinelRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
 const sentinel = sentinelRef.current;
 if (!sentinel) return;

 const observer = new IntersectionObserver(
 (entries) => {
 if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
 fetchNextPage();
 }
 },
 { rootMargin:"200px"},
 );

 observer.observe(sentinel);
 return () => observer.disconnect();
 }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

 // Active filter chips
 const filterChips = useMemo(
 () => getActiveFilterChips(filters, setFilters),
 [filters],
 );

 const handleFiltersChange = useCallback((newFilters: SearchFilters) => {
 setFilters(newFilters);
 }, []);

 return (
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 {/* Header */}
 <div className="pt-8 pb-6">
 <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-medium">
 School Directory
 </p>
 <h1 className="heading-1 mb-1">
 Explore MBA Programs
 </h1>
 <p className="text-muted-foreground">
 Search, filter, and find the right program for you.
 </p>
 </div>

 {/* Search bar */}
 <SearchBar
 value={searchQuery}
 onChange={setSearchQuery}
 className="mb-6"
 />

 {/* Layout: FilterPanel (left) + Results (right) */}
 <div className="flex gap-8 items-start">
 <FilterPanel
 filters={filters}
 onFiltersChange={handleFiltersChange}
 availableCountries={availableCountries}
 />

 <div className="flex-1 min-w-0">
 {/* Toolbar: mobile filter trigger + sort + result count */}
 <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
 <div className="flex items-center gap-3">
 <MobileFilterTrigger
 filters={filters}
 onFiltersChange={handleFiltersChange}
 availableCountries={availableCountries}
 />
 <p className="text-sm text-muted-foreground">
 {isLoading
 ?"Searching..."
 : `${totalCount.toLocaleString()} programs`}
 {debouncedSearch && !isLoading && (
 <> for &quot;{debouncedSearch}&quot;</>
 )}
 </p>
 </div>

 {/* Sort dropdown */}
 <div className="relative">
 <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none"/>
 <select
 value={sort}
 onChange={(e) => setSort(e.target.value)}
 className="appearance-none rounded-lg border border-border bg-card pl-8 pr-8 py-2 text-sm outline-none cursor-pointer focus:border-primary focus:ring-1 focus:ring-primary/30"
 aria-label="Sort results"
 >
 {SORT_OPTIONS.map((opt) => (
 <option key={opt.value} value={opt.value}>
 {opt.label}
 </option>
 ))}
 </select>
 </div>
 </div>

 {/* Active filter chips */}
 {filterChips.length > 0 && (
 <div className="flex flex-wrap gap-2 mb-4">
 {filterChips.map((chip) => (
 <FilterChip
 key={chip.label}
 label={chip.label}
 onRemove={chip.onRemove}
 />
 ))}
 </div>
 )}

 {/* Error state */}
 {isError && (
 <div className="rounded-lg bg-destructive/10 border border-destructive/20 text-destructive p-6 mb-6 flex flex-col items-center text-center">
 <p className="text-sm font-medium mb-1">Failed to load schools</p>
 <p className="text-xs opacity-70 mb-3">
 The server may be temporarily unavailable.
 </p>
 <button
 onClick={() => refetch()}
 className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 px-4 py-2 text-xs font-medium hover:bg-destructive/10 transition-colors"
 >
 <RefreshCw className="size-3"/> Retry
 </button>
 </div>
 )}

 {/* Loading skeleton grid */}
 {isLoading && (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {Array.from({ length: 12 }).map((_, i) => (
 <SchoolCardSkeleton key={i} />
 ))}
 </div>
 )}

 {/* Empty state */}
 {!isLoading && !isError && schools.length === 0 && (
 <div className="py-12">
 <EmptyState
 icon={SearchX}
 title={
 debouncedSearch
 ? `No results for"${debouncedSearch}"`
 :"No schools match your filters"
 }
 description={
 debouncedSearch
 ?"Try a different search term, or adjust your filters to broaden results."
 :"Adjust or clear your filters to see more programs."
 }
 />
 {hasActiveFilters(filters) && (
 <div className="flex justify-center mt-4">
 <button
 onClick={() => setFilters({ ...DEFAULT_FILTERS })}
 className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
 >
 Clear All Filters
 </button>
 </div>
 )}
 </div>
 )}

 {/* Results grid */}
 {!isLoading && schools.length > 0 && (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {schools.map((school) => (
 <SchoolCard3D key={school.id} school={school} />
 ))}

 {/* Infinite scroll loading skeletons */}
 {isFetchingNextPage &&
 Array.from({ length: 6 }).map((_, i) => (
 <SchoolCardSkeleton key={`loading-${i}`} />
 ))}
 </div>
 )}

 {/* Intersection observer sentinel */}
 <div ref={sentinelRef} className="h-px" aria-hidden="true"/>

 {/* End of results indicator */}
 {!isLoading && schools.length > 0 && !hasNextPage && (
 <p className="text-center text-sm text-muted-foreground py-8">
 Showing all {totalCount.toLocaleString()} programs
 </p>
 )}
 </div>
 </div>

 <EmailCapture variant="contextual"source="schools-directory"/>
 <ToolCrossLinks current="/schools"/>
 </div>
 );
}
