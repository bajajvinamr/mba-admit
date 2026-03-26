"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Search, Filter, X, ChevronDown, GraduationCap,
  Briefcase, Star, MessageSquare, Award, FileText,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { ToolCrossLinks } from "@/components/ToolCrossLinks";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

/* ── Types ─────────────────────────────────────────────────────────── */

type Background = {
  industry: string;
  years_experience: number;
  gmat: number;
  outcome: string;
};

type EssayCard = {
  id: string;
  school: string;
  school_name: string;
  prompt: string;
  year: string;
  word_count: number;
  background: Background;
  themes: string[];
  strengths: string[];
};

type EssayFull = EssayCard & {
  content: string;
  coach_notes: string;
};

type ListResponse = {
  examples: EssayCard[];
  total: number;
  limit: number;
  offset: number;
};

type ThemesResponse = {
  themes: { theme: string; count: number }[];
  total_themes: number;
};

type StatsResponse = {
  total_examples: number;
  by_school: { school: string; count: number }[];
  by_theme: { theme: string; count: number }[];
  by_industry: { industry: string; count: number }[];
  by_outcome: Record<string, number>;
};

/* ── Constants ─────────────────────────────────────────────────────── */

const SCHOOLS = [
  { slug: "hbs", name: "Harvard Business School" },
  { slug: "gsb", name: "Stanford GSB" },
  { slug: "wharton", name: "Wharton" },
  { slug: "booth", name: "Chicago Booth" },
  { slug: "kellogg", name: "Kellogg" },
  { slug: "columbia", name: "Columbia Business School" },
  { slug: "sloan", name: "MIT Sloan" },
  { slug: "tuck", name: "Tuck" },
  { slug: "ross", name: "Michigan Ross" },
  { slug: "stern", name: "NYU Stern" },
  { slug: "yale", name: "Yale SOM" },
  { slug: "haas", name: "UC Berkeley Haas" },
  { slug: "lbs", name: "London Business School" },
  { slug: "insead", name: "INSEAD" },
];

const OUTCOME_COLORS: Record<string, string> = {
  admitted: "bg-emerald-500/20 text-emerald-400",
  waitlisted: "bg-amber-500/20 text-amber-400",
  denied: "bg-red-500/20 text-red-400",
};

const THEME_COLORS: Record<string, string> = {
  leadership: "bg-amber-500/20 text-amber-300",
  impact: "bg-emerald-500/20 text-emerald-300",
  failure: "bg-rose-500/20 text-rose-300",
  career_pivot: "bg-violet-500/20 text-violet-300",
  community: "bg-sky-500/20 text-sky-300",
  entrepreneurship: "bg-orange-500/20 text-orange-300",
  innovation: "bg-indigo-500/20 text-indigo-300",
  global: "bg-teal-500/20 text-teal-300",
  growth: "bg-pink-500/20 text-pink-300",
  resilience: "bg-red-500/20 text-red-300",
  diversity: "bg-cyan-500/20 text-cyan-300",
  teamwork: "bg-blue-500/20 text-blue-300",
  values: "bg-lime-500/20 text-lime-300",
  vision: "bg-fuchsia-500/20 text-fuchsia-300",
  analytical: "bg-gray-500/20 text-gray-300",
};

function themeColor(theme: string): string {
  return THEME_COLORS[theme.toLowerCase()] ?? "bg-foreground/10 text-foreground/70";
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function EssayExamplesPage() {
  const [examples, setExamples] = useState<EssayCard[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [themes, setThemes] = useState<{ theme: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [schoolFilter, setSchoolFilter] = useState("");
  const [themeFilter, setThemeFilter] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEssay, setSelectedEssay] = useState<EssayFull | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Fetch examples
  const fetchExamples = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (schoolFilter) params.set("school", schoolFilter);
      if (themeFilter) params.set("theme", themeFilter);
      if (industryFilter) params.set("industry", industryFilter);
      params.set("limit", "50");
      const qs = params.toString();
      const data = await apiFetch<ListResponse>(`/api/essays/examples?${qs}`);
      setExamples(data.examples);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load examples");
    } finally {
      setLoading(false);
    }
  }, [schoolFilter, themeFilter, industryFilter]);

  // Fetch stats + themes on mount
  useEffect(() => {
    apiFetch<StatsResponse>("/api/essays/examples/stats").then(setStats).catch(() => {});
    apiFetch<ThemesResponse>("/api/essays/examples/themes").then((d) => setThemes(d.themes)).catch(() => {});
  }, []);

  // Refetch on filter change
  useEffect(() => { fetchExamples(); }, [fetchExamples]);

  // Open essay modal
  const openEssay = useCallback(async (id: string) => {
    setSelectedId(id);
    setModalLoading(true);
    try {
      const data = await apiFetch<EssayFull>(`/api/essays/examples/${id}`);
      setSelectedEssay(data);
    } catch {
      setSelectedEssay(null);
    } finally {
      setModalLoading(false);
    }
  }, []);

  const closeModal = useCallback(() => {
    setSelectedId(null);
    setSelectedEssay(null);
  }, []);

  // Filter by search query client-side
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return examples;
    const q = searchQuery.toLowerCase();
    return examples.filter(
      (e) =>
        e.school_name.toLowerCase().includes(q) ||
        e.prompt.toLowerCase().includes(q) ||
        e.background.industry.toLowerCase().includes(q) ||
        e.themes.some((t) => t.toLowerCase().includes(q))
    );
  }, [examples, searchQuery]);

  // Unique industries from loaded examples for filter dropdown
  const industries = useMemo(() => {
    const set = new Set(examples.map((e) => e.background.industry));
    return Array.from(set).sort();
  }, [examples]);

  const clearFilters = () => {
    setSchoolFilter("");
    setThemeFilter("");
    setIndustryFilter("");
    setSearchQuery("");
  };

  const hasFilters = schoolFilter || themeFilter || industryFilter || searchQuery;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Breadcrumb items={[
          { label: "Essays", href: "/essays/examples" },
          { label: "Examples" },
        ]} />
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <BookOpen size={16} />
            Essay Examples Library
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Real Essays That Got People In
          </h1>
          <p className="mt-3 text-lg text-foreground/60">
            {stats
              ? `${stats.total_examples} anonymized essays from ${stats.by_school.length} top programs`
              : "Browse anonymized essay examples with expert coach notes"}
          </p>
        </motion.div>

        {/* Stats bar */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.total_examples}</div>
              <div className="text-xs text-foreground/50">Essays</div>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">{stats.by_school.length}</div>
              <div className="text-xs text-foreground/50">Schools</div>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">{stats.by_theme.length}</div>
              <div className="text-xs text-foreground/50">Themes</div>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
              <div className="text-2xl font-bold text-violet-400">{stats.by_outcome.admitted ?? 0}</div>
              <div className="text-xs text-foreground/50">Admitted</div>
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8 rounded-xl border border-border/50 bg-card p-4"
        >
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground/70">
            <Filter size={14} />
            Filter Essays
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
              <input
                type="text"
                placeholder="Search essays..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border/50 bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
              />
            </div>
            {/* School */}
            <div className="relative">
              <select
                value={schoolFilter}
                onChange={(e) => setSchoolFilter(e.target.value)}
                className="w-full appearance-none rounded-lg border border-border/50 bg-background py-2 pl-3 pr-8 text-sm outline-none focus:border-primary/50"
              >
                <option value="">All Schools</option>
                {SCHOOLS.map((s) => (
                  <option key={s.slug} value={s.slug}>{s.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40" />
            </div>
            {/* Theme */}
            <div className="relative">
              <select
                value={themeFilter}
                onChange={(e) => setThemeFilter(e.target.value)}
                className="w-full appearance-none rounded-lg border border-border/50 bg-background py-2 pl-3 pr-8 text-sm outline-none focus:border-primary/50"
              >
                <option value="">All Themes</option>
                {themes.map((t) => (
                  <option key={t.theme} value={t.theme}>
                    {t.theme} ({t.count})
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40" />
            </div>
            {/* Industry */}
            <div className="relative">
              <select
                value={industryFilter}
                onChange={(e) => setIndustryFilter(e.target.value)}
                className="w-full appearance-none rounded-lg border border-border/50 bg-background py-2 pl-3 pr-8 text-sm outline-none focus:border-primary/50"
              >
                <option value="">All Industries</option>
                {industries.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40" />
            </div>
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="mt-3 inline-flex items-center gap-1 text-xs text-foreground/50 hover:text-foreground/80"
            >
              <X size={12} /> Clear all filters
            </button>
          )}
        </motion.div>

        {/* Results */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-xl border border-border/30 bg-card" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center">
            <p className="text-red-400">{error}</p>
            <button onClick={fetchExamples} className="mt-3 text-sm text-primary underline">
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border/30 bg-card p-12 text-center">
            <FileText size={32} className="mx-auto mb-3 text-foreground/30" />
            <p className="text-foreground/50">No essays match your filters.</p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-2 text-sm text-primary underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-foreground/50">
              Showing {filtered.length} essay{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((essay, i) => (
                <motion.button
                  key={essay.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  onClick={() => openEssay(essay.id)}
                  className="group rounded-xl border border-border/50 bg-card p-5 text-left transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                >
                  {/* School + Outcome */}
                  <div className="mb-3 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground/90">
                      <GraduationCap size={14} className="text-primary" />
                      {essay.school_name}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${OUTCOME_COLORS[essay.background.outcome] ?? "bg-foreground/10 text-foreground/50"}`}>
                      {essay.background.outcome}
                    </span>
                  </div>

                  {/* Prompt */}
                  <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-foreground/60">
                    &ldquo;{essay.prompt}&rdquo;
                  </p>

                  {/* Themes */}
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {essay.themes.map((t) => (
                      <span key={t} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${themeColor(t)}`}>
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-3 text-[11px] text-foreground/40">
                    <span className="inline-flex items-center gap-1">
                      <Briefcase size={11} /> {essay.background.industry}
                    </span>
                    <span>{essay.word_count} words</span>
                    <span>GMAT {essay.background.gmat}</span>
                  </div>

                  {/* Strengths preview */}
                  {essay.strengths.length > 0 && (
                    <div className="mt-3 border-t border-border/30 pt-2">
                      <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                        <Star size={10} /> Why it works
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-foreground/50">
                        {essay.strengths[0]}
                      </p>
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          </>
        )}

        {/* Modal */}
        <AnimatePresence>
          {selectedId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-16 backdrop-blur-sm"
              onClick={closeModal}
            >
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.97 }}
                onClick={(e) => e.stopPropagation()}
                className="relative mb-16 w-full max-w-3xl rounded-2xl border border-border/50 bg-card shadow-2xl"
              >
                {/* Close */}
                <button
                  onClick={closeModal}
                  className="absolute right-4 top-4 rounded-full p-1.5 text-foreground/40 hover:bg-foreground/10 hover:text-foreground"
                >
                  <X size={18} />
                </button>

                {modalLoading ? (
                  <div className="flex h-64 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : selectedEssay ? (
                  <div className="p-6 sm:p-8">
                    {/* Header */}
                    <div className="mb-1 flex items-center gap-2">
                      <GraduationCap size={18} className="text-primary" />
                      <span className="text-lg font-bold">{selectedEssay.school_name}</span>
                      <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium uppercase ${OUTCOME_COLORS[selectedEssay.background.outcome] ?? ""}`}>
                        {selectedEssay.background.outcome}
                      </span>
                    </div>
                    <p className="mb-4 text-sm text-foreground/50">{selectedEssay.year}</p>

                    {/* Prompt */}
                    <div className="mb-5 rounded-lg bg-primary/5 px-4 py-3">
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-primary/60">Prompt</div>
                      <p className="text-sm leading-relaxed text-foreground/80">&ldquo;{selectedEssay.prompt}&rdquo;</p>
                    </div>

                    {/* Meta */}
                    <div className="mb-5 flex flex-wrap gap-4 text-xs text-foreground/50">
                      <span className="inline-flex items-center gap-1"><Briefcase size={12} /> {selectedEssay.background.industry}</span>
                      <span>{selectedEssay.background.years_experience} yrs experience</span>
                      <span>GMAT {selectedEssay.background.gmat}</span>
                      <span>{selectedEssay.word_count} words</span>
                    </div>

                    {/* Themes */}
                    <div className="mb-5 flex flex-wrap gap-1.5">
                      {selectedEssay.themes.map((t) => (
                        <span key={t} className={`rounded-full px-2.5 py-1 text-xs font-medium ${themeColor(t)}`}>
                          {t}
                        </span>
                      ))}
                    </div>

                    {/* Essay content */}
                    <div className="mb-6">
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                        <FileText size={14} /> Full Essay
                      </h3>
                      <div className="max-h-[400px] overflow-y-auto rounded-lg border border-border/30 bg-background p-5">
                        {selectedEssay.content.split("\n\n").map((para, i) => (
                          <p key={i} className="mb-4 text-sm leading-relaxed text-foreground/80 last:mb-0">
                            {para}
                          </p>
                        ))}
                      </div>
                    </div>

                    {/* Strengths */}
                    {selectedEssay.strengths.length > 0 && (
                      <div className="mb-5">
                        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-400">
                          <Star size={14} /> Key Strengths
                        </h3>
                        <ul className="space-y-1.5">
                          {selectedEssay.strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-foreground/70">
                              <Award size={12} className="mt-0.5 shrink-0 text-emerald-400" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Coach Notes */}
                    {selectedEssay.coach_notes && (
                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-400">
                          <MessageSquare size={14} /> Coach Notes
                        </h3>
                        <p className="text-sm leading-relaxed text-foreground/70">{selectedEssay.coach_notes}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-48 items-center justify-center text-foreground/40">
                    Failed to load essay
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cross-links & CTA */}
        <div className="mt-16 space-y-8">
          <ToolCrossLinks current="/essays/examples" />
        </div>
      </div>
    </div>
  );
}
