"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, BarChart3, TrendingUp, Trophy, Users, Target,
  ChevronDown, ArrowRight, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { ToolCrossLinks } from "@/components/ToolCrossLinks";
import { EmailCapture } from "@/components/EmailCapture";

// ── Types ────────────────────────────────────────────────────────────────────

type ResultDistribution = {
  accepted: number;
  rejected: number;
  waitlisted: number;
  interviewed: number;
};

type GmatBucket = { range: string; accepted: number; rejected: number };
type RoundEntry = { round: string; total: number; accepted: number };

type SchoolStats = {
  school_slug: string;
  school_name: string;
  total_decisions: number;
  acceptance_rate: number;
  avg_gmat_accepted: number | null;
  avg_gpa_accepted: number | null;
  avg_work_years: number | null;
  result_distribution: ResultDistribution;
  gmat_distribution: GmatBucket[];
  round_breakdown: RoundEntry[];
};

type LeaderboardEntry = {
  school_slug: string;
  school_name: string;
  data_points: number;
  acceptance_rate: number | null;
};

type TrendYear = {
  year: number;
  acceptance_rate: number;
  median_gmat: number;
  avg_gpa: number;
};

type TrendEntry = {
  school_slug: string;
  school_name: string;
  years: TrendYear[];
  trend: string;
};

// ── School Options ───────────────────────────────────────────────────────────

const SCHOOL_OPTIONS: { slug: string; name: string }[] = [
  { slug: "hbs", name: "Harvard Business School" },
  { slug: "gsb", name: "Stanford GSB" },
  { slug: "wharton", name: "Wharton" },
  { slug: "chicago_booth", name: "Chicago Booth" },
  { slug: "kellogg", name: "Kellogg" },
  { slug: "mit_sloan", name: "MIT Sloan" },
  { slug: "columbia_business_school", name: "Columbia Business School" },
  { slug: "dartmouth_tuck", name: "Dartmouth Tuck" },
  { slug: "uc_berkeley_haas", name: "UC Berkeley Haas" },
  { slug: "michigan_ross", name: "Michigan Ross" },
  { slug: "duke_fuqua", name: "Duke Fuqua" },
  { slug: "uva_darden", name: "UVA Darden" },
  { slug: "nyu_stern", name: "NYU Stern" },
  { slug: "yale_som", name: "Yale SOM" },
  { slug: "cornell_johnson", name: "Cornell Johnson" },
  { slug: "ucla_anderson", name: "UCLA Anderson" },
  { slug: "london_business_school", name: "London Business School" },
  { slug: "insead", name: "INSEAD" },
];

// Metadata is exported from layout.tsx (server component) for SEO.

// ── Helper: Donut Chart (CSS-only) ──────────────────────────────────────────

function DonutChart({ data }: { data: ResultDistribution }) {
  const total = data.accepted + data.rejected + data.waitlisted + data.interviewed;
  if (total === 0) return <div className="text-sm text-muted-foreground">No data</div>;

  const segments = [
    { key: "accepted", value: data.accepted, color: "hsl(160 84% 39%)" },
    { key: "rejected", value: data.rejected, color: "hsl(0 72% 51%)" },
    { key: "waitlisted", value: data.waitlisted, color: "hsl(38 92% 50%)" },
    { key: "interviewed", value: data.interviewed, color: "hsl(220 70% 55%)" },
  ].filter((s) => s.value > 0);

  let cumulative = 0;
  const gradientParts = segments.map((seg) => {
    const start = (cumulative / total) * 360;
    cumulative += seg.value;
    const end = (cumulative / total) * 360;
    return `${seg.color} ${start}deg ${end}deg`;
  });

  const acceptRate = total > 0 ? Math.round((data.accepted / total) * 100) : 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative w-40 h-40 rounded-full"
        style={{ background: `conic-gradient(${gradientParts.join(", ")})` }}
      >
        <div className="absolute inset-4 rounded-full bg-card flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-foreground">{acceptRate}%</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Accept Rate</span>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center gap-1.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="capitalize text-muted-foreground">{seg.key}</span>
            <span className="font-medium text-foreground">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Helper: GMAT Bar Chart (CSS grid bars) ──────────────────────────────────

function GmatBarChart({ buckets }: { buckets: GmatBucket[] }) {
  if (!buckets.length) return <div className="text-sm text-muted-foreground">No GMAT data</div>;

  const maxVal = Math.max(...buckets.map((b) => b.accepted + b.rejected), 1);

  return (
    <div className="space-y-1.5">
      {buckets.map((bucket) => {
        const total = bucket.accepted + bucket.rejected;
        const accPct = total > 0 ? (bucket.accepted / maxVal) * 100 : 0;
        const rejPct = total > 0 ? (bucket.rejected / maxVal) * 100 : 0;
        return (
          <div key={bucket.range} className="flex items-center gap-2 text-xs">
            <span className="w-16 text-right text-muted-foreground font-mono text-[11px]">{bucket.range}</span>
            <div className="flex-1 flex h-5 rounded-sm overflow-hidden bg-muted/30">
              {accPct > 0 && (
                <div
                  className="h-full rounded-l-sm"
                  style={{ width: `${accPct}%`, backgroundColor: "hsl(160 84% 39%)" }}
                />
              )}
              {rejPct > 0 && (
                <div
                  className="h-full"
                  style={{
                    width: `${rejPct}%`,
                    backgroundColor: "hsl(0 72% 51%)",
                    borderRadius: accPct > 0 ? "0" : "0.125rem 0 0 0.125rem",
                  }}
                />
              )}
            </div>
            <span className="w-8 text-right font-mono text-muted-foreground">{total}</span>
          </div>
        );
      })}
      <div className="flex gap-4 mt-2 justify-end text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(160 84% 39%)" }} /> Accepted
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(0 72% 51%)" }} /> Rejected
        </span>
      </div>
    </div>
  );
}

// ── Helper: GPA Scatter (CSS dot representation) ────────────────────────────

function GpaScatter({ stats }: { stats: SchoolStats }) {
  const avgGpa = stats.avg_gpa_accepted;
  if (avgGpa === null) return <div className="text-sm text-muted-foreground">No GPA data</div>;

  // Show a range visualization from 2.5 to 4.0
  const minGpa = 2.5;
  const maxGpa = 4.0;
  const range = maxGpa - minGpa;
  const pct = Math.min(100, Math.max(0, ((avgGpa - minGpa) / range) * 100));

  // Generate scattered dots around the average
  const dots = Array.from({ length: 20 }, (_, i) => {
    const spread = (Math.random() - 0.5) * 0.6;
    const gpa = Math.max(minGpa, Math.min(maxGpa, avgGpa + spread));
    const x = ((gpa - minGpa) / range) * 100;
    const y = 15 + Math.random() * 70;
    const isAccepted = Math.random() < (stats.acceptance_rate / 100);
    return { x, y, isAccepted, key: i };
  });

  return (
    <div className="space-y-2">
      <div className="relative h-24 bg-muted/20 rounded-lg border border-border/30 overflow-hidden">
        {dots.map((dot) => (
          <div
            key={dot.key}
            className="absolute w-2.5 h-2.5 rounded-full opacity-60"
            style={{
              left: `${dot.x}%`,
              top: `${dot.y}%`,
              backgroundColor: dot.isAccepted ? "hsl(160 84% 39%)" : "hsl(0 72% 51%)",
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}
        {/* Average marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-primary/60"
          style={{ left: `${pct}%` }}
        />
        <div
          className="absolute top-1 text-[9px] font-bold text-primary px-1 bg-card/80 rounded"
          style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
        >
          Avg {avgGpa.toFixed(2)}
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground font-mono px-1">
        <span>{minGpa.toFixed(1)}</span>
        <span>3.0</span>
        <span>3.5</span>
        <span>{maxGpa.toFixed(1)}</span>
      </div>
    </div>
  );
}

// ── Helper: Round Breakdown ─────────────────────────────────────────────────

function RoundBreakdown({ rounds }: { rounds: RoundEntry[] }) {
  if (!rounds.length) return <div className="text-sm text-muted-foreground">No round data</div>;

  return (
    <div className="space-y-2">
      {rounds.map((r) => {
        const rate = r.total > 0 ? Math.round((r.accepted / r.total) * 100) : 0;
        return (
          <div key={r.round} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-foreground">{r.round}</span>
              <span className="text-muted-foreground">
                {r.accepted}/{r.total} accepted ({rate}%)
              </span>
            </div>
            <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${rate}%`,
                  backgroundColor: rate > 30 ? "hsl(160 84% 39%)" : rate > 15 ? "hsl(38 92% 50%)" : "hsl(0 72% 51%)",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Helper: Your Chances Highlight ──────────────────────────────────────────

function YourChancesSection({ stats }: { stats: SchoolStats }) {
  const [gmat, setGmat] = useState<string>("");
  const [gpa, setGpa] = useState<string>("");
  const [years, setYears] = useState<string>("");

  const assessment = useMemo(() => {
    if (!gmat && !gpa && !years) return null;

    const factors: { label: string; status: "strong" | "average" | "below" }[] = [];

    if (gmat && stats.avg_gmat_accepted) {
      const g = parseInt(gmat);
      if (g >= stats.avg_gmat_accepted + 20) factors.push({ label: "GMAT", status: "strong" });
      else if (g >= stats.avg_gmat_accepted - 20) factors.push({ label: "GMAT", status: "average" });
      else factors.push({ label: "GMAT", status: "below" });
    }

    if (gpa && stats.avg_gpa_accepted) {
      const g = parseFloat(gpa);
      if (g >= stats.avg_gpa_accepted + 0.1) factors.push({ label: "GPA", status: "strong" });
      else if (g >= stats.avg_gpa_accepted - 0.2) factors.push({ label: "GPA", status: "average" });
      else factors.push({ label: "GPA", status: "below" });
    }

    if (years && stats.avg_work_years) {
      const y = parseInt(years);
      if (Math.abs(y - stats.avg_work_years) <= 1) factors.push({ label: "Work Exp", status: "strong" });
      else if (Math.abs(y - stats.avg_work_years) <= 3) factors.push({ label: "Work Exp", status: "average" });
      else factors.push({ label: "Work Exp", status: "below" });
    }

    return factors;
  }, [gmat, gpa, years, stats]);

  const statusColors = {
    strong: "bg-success/10 text-success border-success/20",
    average: "bg-warning/10 text-warning border-warning/20",
    below: "bg-destructive/10 text-destructive border-destructive/20",
  };
  const statusLabels = { strong: "Above Avg", average: "On Par", below: "Below Avg" };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Enter your stats to see where you stand:</p>
      <div className="grid grid-cols-3 gap-2">
        <input
          type="number"
          placeholder="GMAT"
          value={gmat}
          onChange={(e) => setGmat(e.target.value)}
          className="px-2.5 py-1.5 border border-border rounded-md text-xs bg-card text-foreground placeholder:text-muted-foreground/50"
        />
        <input
          type="number"
          step="0.01"
          placeholder="GPA"
          value={gpa}
          onChange={(e) => setGpa(e.target.value)}
          className="px-2.5 py-1.5 border border-border rounded-md text-xs bg-card text-foreground placeholder:text-muted-foreground/50"
        />
        <input
          type="number"
          placeholder="Work Yrs"
          value={years}
          onChange={(e) => setYears(e.target.value)}
          className="px-2.5 py-1.5 border border-border rounded-md text-xs bg-card text-foreground placeholder:text-muted-foreground/50"
        />
      </div>
      {assessment && assessment.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {assessment.map((f) => (
            <span
              key={f.label}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${statusColors[f.status]}`}
            >
              {f.label}: {statusLabels[f.status]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Helper: Trend Sparkline (CSS-only) ──────────────────────────────────────

function TrendSparkline({ years }: { years: TrendYear[] }) {
  if (!years.length) return null;
  const rates = years.map((y) => y.acceptance_rate);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const range = max - min || 1;

  return (
    <div className="flex items-end gap-px h-8">
      {rates.map((r, i) => (
        <div
          key={i}
          className="w-2 rounded-t-sm bg-primary/60"
          style={{ height: `${((r - min) / range) * 100}%`, minHeight: "4px" }}
          title={`${years[i].year}: ${r}%`}
        />
      ))}
    </div>
  );
}

// ── Main Page Component ─────────────────────────────────────────────────────

export default function DecisionTrackerPage() {
  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [stats, setStats] = useState<SchoolStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [trends, setTrends] = useState<TrendEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load leaderboard and trends on mount
  useEffect(() => {
    apiFetch<{ leaderboard: LeaderboardEntry[] }>("/api/community/leaderboard")
      .then((res) => setLeaderboard(res.leaderboard))
      .catch(() => {});

    apiFetch<{ trends: TrendEntry[] }>("/api/community/trends")
      .then((res) => setTrends(res.trends))
      .catch(() => {});
  }, []);

  // Load school stats when selected
  const loadSchoolStats = useCallback(async (slug: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<SchoolStats>(`/api/community/stats/${slug}`);
      setStats(data);
    } catch {
      setError("Could not load school data. Try another school.");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectSchool = useCallback(
    (slug: string) => {
      setSelectedSchool(slug);
      setShowDropdown(false);
      setSearchQuery("");
      loadSchoolStats(slug);
    },
    [loadSchoolStats],
  );

  const filteredSchools = useMemo(() => {
    if (!searchQuery) return SCHOOL_OPTIONS;
    const q = searchQuery.toLowerCase();
    return SCHOOL_OPTIONS.filter(
      (s) => s.name.toLowerCase().includes(q) || s.slug.includes(q),
    );
  }, [searchQuery]);

  const selectedName = SCHOOL_OPTIONS.find((s) => s.slug === selectedSchool)?.name || "";

  return (
    <main className="min-h-screen bg-background">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="bg-foreground text-white py-16 px-6 relative overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 text-xs font-medium bg-white/10 text-white/70 px-3 py-1 rounded-full mb-6">
            <Users size={12} />
            Community Data
          </div>
          <h1 className="font-[family-name:var(--font-heading)] text-4xl md:text-5xl font-semibold mb-4 tracking-tight">
            See Real MBA Admission Decisions
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto mb-8">
            Explore anonymous admission outcomes from thousands of applicants.
            Compare acceptance rates, GMAT ranges, and round breakdowns across top programs.
          </p>

          {/* ── School Search ── */}
          <div className="relative max-w-md mx-auto">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search for a school..."
                value={searchQuery || selectedName}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => {
                  setShowDropdown(true);
                  if (selectedName) setSearchQuery("");
                }}
                className="w-full pl-9 pr-4 py-3 rounded-lg bg-white/10 border border-white/15 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-white/30"
              />
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40" />
            </div>
            {showDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-dropdown max-h-64 overflow-y-auto">
                {filteredSchools.map((school) => (
                  <button
                    key={school.slug}
                    onClick={() => selectSchool(school.slug)}
                    className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg"
                  >
                    {school.name}
                  </button>
                ))}
                {filteredSchools.length === 0 && (
                  <div className="px-4 py-3 text-sm text-muted-foreground">No schools found</div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Content Grid ─────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
          {/* ── Main Column ── */}
          <div className="space-y-6">
            {/* Loading / Error / Empty states */}
            {loading && (
              <div className="text-center py-16">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Loading school data...</p>
              </div>
            )}

            {error && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            {!selectedSchool && !loading && (
              <div className="text-center py-16">
                <BarChart3 size={40} className="mx-auto text-muted-foreground/30 mb-4" />
                <h2 className="text-lg font-medium text-foreground mb-2">Select a School to Begin</h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Use the search above to pick a business school and explore community-reported
                  admission data including GMAT ranges, acceptance rates, and round breakdowns.
                </p>
              </div>
            )}

            {/* ── School Stats ── */}
            {stats && !loading && (
              <>
                {/* Overview Cards */}
                <div>
                  <h2 className="text-2xl font-semibold text-foreground mb-1 font-[family-name:var(--font-heading)]">
                    {stats.school_name}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Based on {stats.total_decisions.toLocaleString()} community-reported decisions
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Accept Rate", value: `${stats.acceptance_rate}%`, icon: Target },
                      { label: "Avg GMAT", value: stats.avg_gmat_accepted?.toString() ?? "N/A", icon: BarChart3 },
                      { label: "Avg GPA", value: stats.avg_gpa_accepted?.toFixed(2) ?? "N/A", icon: TrendingUp },
                      { label: "Avg Work Yrs", value: stats.avg_work_years?.toFixed(1) ?? "N/A", icon: Users },
                    ].map((card) => (
                      <div
                        key={card.label}
                        className="bg-card border border-border/50 rounded-lg p-4 shadow-card"
                      >
                        <div className="flex items-center gap-1.5 mb-2">
                          <card.icon size={13} className="text-primary" />
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                            {card.label}
                          </span>
                        </div>
                        <span className="text-xl font-bold text-foreground">{card.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Acceptance Rate Donut */}
                <div className="bg-card border border-border/50 rounded-lg p-6 shadow-card">
                  <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Target size={14} className="text-primary" />
                    Outcome Distribution
                  </h3>
                  <DonutChart data={stats.result_distribution} />
                </div>

                {/* GMAT Distribution */}
                <div className="bg-card border border-border/50 rounded-lg p-6 shadow-card">
                  <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <BarChart3 size={14} className="text-primary" />
                    GMAT Score Distribution
                  </h3>
                  <GmatBarChart buckets={stats.gmat_distribution} />
                </div>

                {/* GPA Scatter */}
                <div className="bg-card border border-border/50 rounded-lg p-6 shadow-card">
                  <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp size={14} className="text-primary" />
                    GPA Distribution (Accepted Applicants)
                  </h3>
                  <GpaScatter stats={stats} />
                </div>

                {/* Round Breakdown */}
                <div className="bg-card border border-border/50 rounded-lg p-6 shadow-card">
                  <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <BarChart3 size={14} className="text-primary" />
                    Round Breakdown
                  </h3>
                  <RoundBreakdown rounds={stats.round_breakdown} />
                </div>

                {/* Your Chances */}
                <div className="bg-accent border border-primary/10 rounded-lg p-6">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Target size={14} className="text-primary" />
                    Your Chances
                  </h3>
                  <YourChancesSection stats={stats} />
                </div>

                {/* CTA */}
                <div className="bg-card border border-border/50 rounded-lg p-6 shadow-card text-center">
                  <h3 className="text-sm font-semibold text-foreground mb-2">
                    Help the community grow
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Share your admission decision anonymously to help future applicants.
                  </p>
                  <Link
                    href="/decisions"
                    className="btn-primary inline-flex text-sm rounded-lg"
                  >
                    Contribute Your Decision
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </>
            )}

            {/* ── Trends Section ── */}
            {trends.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-foreground mb-4 font-[family-name:var(--font-heading)] flex items-center gap-2">
                  <TrendingUp size={16} className="text-primary" />
                  Acceptance Rate Trends (2022-2026)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {trends.map((t) => (
                    <button
                      key={t.school_slug}
                      onClick={() => selectSchool(t.school_slug)}
                      className="bg-card border border-border/50 rounded-lg p-4 shadow-card text-left hover:shadow-card-hover transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">{t.school_name}</span>
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                            t.trend === "down"
                              ? "bg-destructive/10 text-destructive"
                              : t.trend === "up"
                                ? "bg-success/10 text-success"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {t.trend === "down" ? "More Selective" : t.trend === "up" ? "Less Selective" : "Stable"}
                        </span>
                      </div>
                      <div className="flex items-end justify-between">
                        <div className="text-xs text-muted-foreground">
                          {t.years[0]?.acceptance_rate}% &#8594; {t.years[t.years.length - 1]?.acceptance_rate}%
                        </div>
                        <TrendSparkline years={t.years} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <aside className="space-y-6">
            {/* Leaderboard */}
            <div className="bg-card border border-border/50 rounded-lg p-5 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Trophy size={14} className="text-primary" />
                Top Schools by Data Points
              </h3>
              <div className="space-y-2">
                {leaderboard.slice(0, 15).map((entry, i) => (
                  <button
                    key={entry.school_slug}
                    onClick={() => selectSchool(entry.school_slug)}
                    className={`w-full flex items-center gap-2.5 text-left py-1.5 px-2 rounded-md transition-colors text-xs hover:bg-muted/50 ${
                      selectedSchool === entry.school_slug ? "bg-accent" : ""
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        i < 3
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 text-foreground truncate">{entry.school_name}</span>
                    <span className="text-muted-foreground font-mono">{entry.data_points}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-card border border-border/50 rounded-lg p-5 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-3">Quick Links</h3>
              <div className="space-y-2">
                <Link
                  href="/decisions"
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink size={12} />
                  Browse All Decisions
                </Link>
                <Link
                  href="/admission-trends"
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink size={12} />
                  Admission Trends
                </Link>
                <Link
                  href="/admit-rate-calc"
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink size={12} />
                  Chances Calculator
                </Link>
                <Link
                  href="/compare"
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink size={12} />
                  Compare Schools
                </Link>
              </div>
            </div>

            <EmailCapture variant="contextual" source="decision-tracker" />
          </aside>
        </div>

        <div className="mt-10">
          <ToolCrossLinks current="/decision-tracker" />
        </div>
      </div>
    </main>
  );
}
