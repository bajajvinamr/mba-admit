"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Star,
  Filter,
  ChevronDown,
  Users,
  GraduationCap,
  Briefcase,
  CheckCircle2,
  Clock,
  MessageSquare,
  ArrowUpDown,
  X,
  Sparkles,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { ToolCrossLinks } from "@/components/ToolCrossLinks";

/* ── Types ─────────────────────────────────────────────────────────── */

type Mentor = {
  id: string;
  displayName: string;
  school: string;
  schoolName: string;
  graduationYear: number | null;
  status: string;
  currentRole: string | null;
  currentCompany: string | null;
  industry: string;
  expertise: string[];
  hourlyRate: number;
  currency: string;
  availability: string;
  rating: number;
  reviewCount: number;
  sessionsCompleted: number;
  verified: boolean;
  profileImage: string | null;
};

type MentorSchool = {
  slug: string;
  name: string;
  mentorCount: number;
};

type MentorStats = {
  totalMentors: number;
  avgRate: number;
  minRate: number;
  maxRate: number;
  totalSessions: number;
  avgRating: number;
};

type MentorsResponse = {
  mentors: Mentor[];
  total: number;
};

/* ── Constants ─────────────────────────────────────────────────────── */

const EXPERTISE_OPTIONS = [
  { value: "essays", label: "Essays" },
  { value: "interview_prep", label: "Interview Prep" },
  { value: "career_strategy", label: "Career Strategy" },
  { value: "school_selection", label: "School Selection" },
];

const SORT_OPTIONS = [
  { value: "rating", label: "Top Rated" },
  { value: "rate_asc", label: "Rate: Low to High" },
  { value: "rate_desc", label: "Rate: High to Low" },
  { value: "sessions", label: "Most Sessions" },
];

const AVAILABILITY_COLORS: Record<string, string> = {
  available: "bg-emerald-50 text-emerald-700 border-emerald-200",
  limited: "bg-amber-50 text-amber-700 border-amber-200",
  unavailable: "bg-red-50 text-red-700 border-red-200",
};

/* ── Helpers ───────────────────────────────────────────────────────── */

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={13}
          className={cn(
            i < Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "fill-transparent text-border"
          )}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">
        {rating.toFixed(1)} ({count})
      </span>
    </div>
  );
}

function ExpertiseTag({ label }: { label: string }) {
  const display = label
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-foreground/5 text-muted-foreground border border-border/40">
      {display}
    </span>
  );
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function MentorsPage() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [schools, setSchools] = useState<MentorSchool[]>([]);
  const [stats, setStats] = useState<MentorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [query, setQuery] = useState("");
  const [school, setSchool] = useState("");
  const [expertise, setExpertise] = useState("");
  const [sort, setSort] = useState("rating");
  const [minRate, setMinRate] = useState(0);
  const [maxRate, setMaxRate] = useState(300);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch schools + stats once
  useEffect(() => {
    track("mentors_page_view");
    apiFetch<{ schools: MentorSchool[] }>("/api/mentors/schools").then((r) =>
      setSchools(r.schools)
    ).catch(() => {});
    apiFetch<MentorStats>("/api/mentors/stats").then(setStats).catch(() => {});
  }, []);

  // Fetch mentors on filter change
  const fetchMentors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (school) params.set("school", school);
      if (expertise) params.set("expertise", expertise);
      if (sort) params.set("sort", sort);
      if (minRate > 0) params.set("min_rate", String(minRate));
      if (maxRate < 300) params.set("max_rate", String(maxRate));
      if (availableOnly) params.set("availability", "available");

      const res = await apiFetch<MentorsResponse>(
        `/api/mentors?${params.toString()}`
      );
      setMentors(res.mentors);
      setTotal(res.total);
    } catch {
      setMentors([]);
    } finally {
      setLoading(false);
    }
  }, [query, school, expertise, sort, minRate, maxRate, availableOnly]);

  useEffect(() => {
    const timer = setTimeout(fetchMentors, 300);
    return () => clearTimeout(timer);
  }, [fetchMentors]);

  const hasActiveFilters = school || expertise || minRate > 0 || maxRate < 300 || availableOnly;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="border-b border-border bg-white">
        <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
              <Users size={22} className="text-amber-600" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
              Mentor Marketplace
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Learn from those who have been there
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mb-6">
            Connect 1-on-1 with MBA students and alumni from top programs.
            Get honest advice on essays, interviews, school selection, and
            career strategy.
          </p>

          {/* Stats bar */}
          {stats && (
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="font-semibold text-foreground">{stats.totalMentors}</span>{" "}
                <span className="text-muted-foreground">mentors</span>
              </div>
              <div>
                <span className="font-semibold text-foreground">{stats.totalSessions}+</span>{" "}
                <span className="text-muted-foreground">sessions completed</span>
              </div>
              <div>
                <span className="font-semibold text-foreground">{stats.avgRating}</span>{" "}
                <span className="text-muted-foreground">avg rating</span>
              </div>
              <div>
                <span className="font-semibold text-foreground">${stats.minRate}-${stats.maxRate}</span>{" "}
                <span className="text-muted-foreground">per hour</span>
              </div>
            </div>
          )}

          <div className="mt-6">
            <Link
              href="/mentors/apply"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
            >
              <Sparkles size={16} />
              Become a Mentor
            </Link>
          </div>
        </div>
      </section>

      {/* Search + Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Search bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Find a mentor by name, school, or keyword..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border rounded-lg transition-colors",
              showFilters || hasActiveFilters
                ? "bg-amber-50 border-amber-200 text-amber-700"
                : "bg-white border-border text-muted-foreground hover:bg-foreground/5"
            )}
          >
            <Filter size={16} />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 w-5 h-5 flex items-center justify-center text-[10px] font-bold bg-amber-500 text-white rounded-full">
                {[school, expertise, minRate > 0, maxRate < 300, availableOnly].filter(Boolean).length}
              </span>
            )}
          </button>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ArrowUpDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="mb-6 p-4 border border-border rounded-lg bg-white">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* School */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  School
                </label>
                <select
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white"
                >
                  <option value="">All Schools</option>
                  {schools.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.name} ({s.mentorCount})
                    </option>
                  ))}
                </select>
              </div>

              {/* Expertise */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Expertise
                </label>
                <select
                  value={expertise}
                  onChange={(e) => setExpertise(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white"
                >
                  <option value="">All Areas</option>
                  {EXPERTISE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rate range */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Rate: ${minRate} - ${maxRate}/hr
                </label>
                <div className="flex gap-2">
                  <input
                    type="range"
                    min={0}
                    max={300}
                    step={10}
                    value={minRate}
                    onChange={(e) => setMinRate(Number(e.target.value))}
                    className="flex-1 accent-amber-500"
                  />
                  <input
                    type="range"
                    min={0}
                    max={300}
                    step={10}
                    value={maxRate}
                    onChange={(e) => setMaxRate(Number(e.target.value))}
                    className="flex-1 accent-amber-500"
                  />
                </div>
              </div>

              {/* Availability */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Availability
                </label>
                <button
                  onClick={() => setAvailableOnly(!availableOnly)}
                  className={cn(
                    "w-full px-3 py-2 text-sm border rounded-lg transition-colors",
                    availableOnly
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-white border-border text-muted-foreground"
                  )}
                >
                  {availableOnly ? "Available Only" : "Show All"}
                </button>
              </div>
            </div>

            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSchool("");
                  setExpertise("");
                  setMinRate(0);
                  setMaxRate(300);
                  setAvailableOnly(false);
                }}
                className="mt-3 text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
              >
                <X size={12} /> Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {loading ? "Searching..." : `${total} mentor${total !== 1 ? "s" : ""} found`}
          </p>
        </div>

        {/* Mentor grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="border border-border rounded-xl p-5 bg-white animate-pulse"
              >
                <div className="h-5 bg-foreground/10 rounded w-2/3 mb-3" />
                <div className="h-4 bg-foreground/5 rounded w-1/2 mb-2" />
                <div className="h-4 bg-foreground/5 rounded w-3/4 mb-4" />
                <div className="h-8 bg-foreground/5 rounded w-full" />
              </div>
            ))}
          </div>
        ) : mentors.length === 0 ? (
          <div className="text-center py-16">
            <Users size={40} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              No mentors match your search. Try adjusting your filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mentors.map((m) => (
              <div
                key={m.id}
                className="group border border-border rounded-xl p-5 bg-white hover:border-amber-200 hover:shadow-sm transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground truncate">
                        {m.displayName}
                      </h3>
                      {m.verified && (
                        <CheckCircle2
                          size={14}
                          className="text-blue-500 shrink-0"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <GraduationCap size={13} className="text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">
                        {m.schoolName}
                        {m.graduationYear ? ` '${String(m.graduationYear).slice(-2)}` : ""}
                      </span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0",
                      AVAILABILITY_COLORS[m.availability] || AVAILABILITY_COLORS.available
                    )}
                  >
                    {m.availability}
                  </span>
                </div>

                {/* Role */}
                {m.currentRole && (
                  <div className="flex items-center gap-1.5 mb-3">
                    <Briefcase size={13} className="text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground truncate">
                      {m.currentRole}
                      {m.currentCompany ? ` @ ${m.currentCompany}` : ""}
                    </span>
                  </div>
                )}

                {/* Expertise */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {m.expertise.slice(0, 3).map((e) => (
                    <ExpertiseTag key={e} label={e} />
                  ))}
                </div>

                {/* Rating + Stats */}
                <div className="flex items-center justify-between mb-4">
                  <StarRating rating={m.rating} count={m.reviewCount} />
                  <span className="text-xs text-muted-foreground">
                    {m.sessionsCompleted} sessions
                  </span>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-border/60">
                  <span className="text-lg font-bold text-foreground">
                    ${m.hourlyRate}
                    <span className="text-xs font-normal text-muted-foreground">
                      /hr
                    </span>
                  </span>
                  <div className="flex gap-2">
                    <Link
                      href={`/mentors/${m.id}`}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      View Profile
                    </Link>
                    <button
                      onClick={() => {
                        track("mentor_book_click", {
                          mentor_id: m.id,
                          school: m.school,
                        });
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                    >
                      Book Session
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cross-links */}
        <div className="mt-12">
          <ToolCrossLinks current="mentors" />
        </div>
      </div>
    </div>
  );
}
