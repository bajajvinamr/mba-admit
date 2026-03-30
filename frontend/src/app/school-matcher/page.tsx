"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crosshair, ChevronDown, ChevronUp, Loader2,
  MapPin, DollarSign, GraduationCap, Briefcase, Globe, Target,
  Shield, TrendingUp, Sparkles,
} from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { track } from "@/lib/analytics";
import { ToolCrossLinks } from "@/components/ToolCrossLinks";

/* ── Types ─────────────────────────────────────────────────────────── */

type FitBreakdown = {
  gmat: number;
  gpa: number;
  work_experience: number;
  country: number;
  budget: number;
  program_strength: number;
};

type MatchedSchool = {
  school_id: string;
  name: string;
  fit_score: number;
  fit_breakdown: FitBreakdown;
  classification: "Reach" | "Target" | "Safety";
  key_highlights: string[];
  country: string;
  location: string;
  tuition_usd: number | null;
  gmat_avg: number | null;
  acceptance_rate: number | null;
  median_salary: string | null;
};

type MatchResponse = {
  matches: MatchedSchool[];
  profile_summary: Record<string, unknown>;
  tier_counts: { reach: number; target: number; safety: number };
};

/* ── Constants ────────────────────────────────────────────────────── */

const COUNTRIES = [
  "USA", "UK", "Canada", "France", "Spain", "Germany", "India",
  "Singapore", "Australia", "China", "Switzerland", "Netherlands",
  "Italy", "Japan", "Hong Kong", "UAE", "South Korea", "Brazil",
];

const GOALS = [
  "Consulting", "Tech", "Finance", "Entrepreneurship", "Healthcare",
  "Marketing", "Operations", "Real Estate", "Social Impact", "Energy",
  "General Management",
];

/* ── Helpers ──────────────────────────────────────────────────────── */

function classificationStyle(c: string) {
  if (c === "Safety") return { bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-400", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" };
  if (c === "Target") return { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-400", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" };
  return { bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-800", text: "text-red-700 dark:text-red-400", badge: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" };
}

function scoreColor(score: number) {
  if (score >= 70) return "stroke-emerald-500";
  if (score >= 40) return "stroke-amber-500";
  return "stroke-red-500";
}

function barColor(score: number) {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-400";
}

/* ── Circular Score ───────────────────────────────────────────────── */

function CircularScore({ score, size = 56 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" strokeWidth={4}
        className="stroke-foreground/10"
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        className={scoreColor(score)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle" dominantBaseline="central"
        className="fill-foreground text-xs font-bold"
      >
        {Math.round(score)}
      </text>
    </svg>
  );
}

/* ── Breakdown Bar ────────────────────────────────────────────────── */

function BreakdownBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-24 text-foreground/50 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-foreground/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor(score)}`}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
      <span className="w-7 text-right text-foreground/40 tabular-nums">{Math.round(score)}</span>
    </div>
  );
}

/* ── School Card ──────────────────────────────────────────────────── */

function SchoolCard({ school }: { school: MatchedSchool }) {
  const [expanded, setExpanded] = useState(false);
  const style = classificationStyle(school.classification);
  const bd = school.fit_breakdown;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-lg p-4 ${style.border} ${style.bg} transition-all`}
    >
      <div className="flex items-start gap-3">
        <CircularScore score={school.fit_score} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/school/${school.school_id}`}
              className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate"
            >
              {school.name}
            </Link>
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${style.badge}`}>
              {school.classification}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-foreground/50">
            <span className="flex items-center gap-1"><MapPin size={11} />{school.location}</span>
            {school.gmat_avg && <span>GMAT {school.gmat_avg}</span>}
            {school.tuition_usd && <span>${school.tuition_usd.toLocaleString()}</span>}
          </div>
        </div>
      </div>

      {/* Highlights */}
      {school.key_highlights.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {school.key_highlights.slice(0, expanded ? 4 : 2).map((h, i) => (
            <span
              key={i}
              className="text-[10px] px-2 py-0.5 rounded-full bg-foreground/5 text-foreground/60"
            >
              {h}
            </span>
          ))}
        </div>
      )}

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-2 text-[10px] font-medium text-foreground/40 hover:text-foreground/60 flex items-center gap-0.5 transition-colors"
      >
        {expanded ? <><ChevronUp size={12} />Less</> : <><ChevronDown size={12} />Fit breakdown</>}
      </button>

      {/* Breakdown */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-1.5">
              <BreakdownBar label="GMAT Fit" score={bd.gmat} />
              <BreakdownBar label="GPA Fit" score={bd.gpa} />
              <BreakdownBar label="Work Exp" score={bd.work_experience} />
              <BreakdownBar label="Country" score={bd.country} />
              <BreakdownBar label="Budget" score={bd.budget} />
              <BreakdownBar label="Goals Match" score={bd.program_strength} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Multi-Select Pill Input ──────────────────────────────────────── */

function PillSelect({
  options,
  selected,
  onChange,
  placeholder,
}: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);

  const toggle = (item: string) => {
    if (selected.includes(item)) {
      onChange(selected.filter((s) => s !== item));
    } else {
      onChange([...selected, item]);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2 border border-border/10 rounded text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
      >
        <span className={selected.length ? "text-foreground" : "text-foreground/30"}>
          {selected.length ? `${selected.length} selected` : placeholder}
        </span>
        <ChevronDown size={14} className="text-foreground/30" />
      </button>

      {/* Selected pills */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.map((s) => (
            <button
              key={s}
              onClick={() => toggle(s)}
              className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
            >
              {s} &times;
            </button>
          ))}
        </div>
      )}

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto bg-card border border-border rounded-lg shadow-lg p-2"
          >
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => toggle(opt)}
                className={`w-full text-left text-sm px-2 py-1.5 rounded transition-colors ${
                  selected.includes(opt)
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground/70 hover:bg-foreground/5"
                }`}
              >
                {opt}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click-away */}
      {open && (
        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}

/* ── Column Header ────────────────────────────────────────────────── */

function TierColumn({
  title,
  icon,
  schools,
  color,
}: {
  title: string;
  icon: React.ReactNode;
  schools: MatchedSchool[];
  color: string;
}) {
  return (
    <div className="flex-1 min-w-[300px]">
      <div className={`flex items-center gap-2 mb-4 pb-2 border-b ${color}`}>
        {icon}
        <h3 className="text-sm font-bold uppercase tracking-widest">{title}</h3>
        <span className="ml-auto text-xs text-foreground/40 tabular-nums">{schools.length}</span>
      </div>
      <div className="space-y-3">
        {schools.map((s) => (
          <SchoolCard key={s.school_id} school={s} />
        ))}
        {schools.length === 0 && (
          <p className="text-xs text-foreground/30 text-center py-8">No schools in this tier</p>
        )}
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function SchoolMatcherPage() {
  /* Form state */
  const [gmat, setGmat] = useState(700);
  const [gpa, setGpa] = useState(3.5);
  const [workYears, setWorkYears] = useState(4);
  const [targetCountries, setTargetCountries] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [budget, setBudget] = useState<number>(150000);
  const [noBudgetLimit, setNoBudgetLimit] = useState(false);

  /* Results */
  const [results, setResults] = useState<MatchedSchool[] | null>(null);
  const [tierCounts, setTierCounts] = useState({ reach: 0, target: 0, safety: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* Run matching */
  const runMatch = async () => {
    setLoading(true);
    setError("");
    try {
      const body = {
        gmat,
        gpa,
        work_years: workYears,
        target_countries: targetCountries,
        goals: goals.map((g) => g.toLowerCase()),
        budget_usd: noBudgetLimit ? null : budget,
      };
      const res = await apiFetch<MatchResponse>("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setResults(res.matches);
      setTierCounts(res.tier_counts);
      track("school_match_completed", {
        gmat,
        gpa,
        work_years: workYears,
        countries: targetCountries.length,
        goals: goals.length,
        results: res.matches.length,
      });
    } catch {
      setError("Matching failed. Please check your inputs and try again.");
    } finally {
      setLoading(false);
    }
  };

  /* Split results by tier */
  const reach = results?.filter((s) => s.classification === "Reach") ?? [];
  const target = results?.filter((s) => s.classification === "Target") ?? [];
  const safety = results?.filter((s) => s.classification === "Safety") ?? [];

  return (
    <main className="min-h-screen bg-background">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="bg-foreground text-white py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
            School Matcher
          </h1>
          <p className="text-white/70 text-lg">
            Find your best-fit MBA programs. We score 1,800+ schools across GMAT, GPA, career goals, budget, and more.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* ── Profile Form ───────────────────────────────────────── */}
        <div className="border border-border rounded-lg p-6 mb-8 bg-card shadow-[var(--shadow-card)]">
          <h2 className="font-semibold text-foreground mb-5 flex items-center gap-2">
            <Crosshair size={18} className="text-primary" />
            Your Profile
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* GMAT */}
            <div>
              <label htmlFor="match-gmat" className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 block mb-1">
                GMAT Score
              </label>
              <input
                id="match-gmat"
                type="number" min={200} max={800} value={gmat}
                onChange={(e) => setGmat(Math.max(200, Math.min(800, +e.target.value || 700)))}
                className="w-full px-3 py-2 border border-border/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <span className="text-[10px] text-foreground/30 mt-0.5 block">200 - 800</span>
            </div>

            {/* GPA */}
            <div>
              <label htmlFor="match-gpa" className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 block mb-1">
                GPA (4.0 scale)
              </label>
              <input
                id="match-gpa"
                type="number" step={0.1} min={0} max={4.0} value={gpa}
                onChange={(e) => setGpa(Math.max(0, Math.min(4.0, +e.target.value || 3.5)))}
                className="w-full px-3 py-2 border border-border/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <span className="text-[10px] text-foreground/30 mt-0.5 block">0 - 4.0</span>
            </div>

            {/* Work Years */}
            <div>
              <label htmlFor="match-work" className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 block mb-1">
                Work Experience (years)
              </label>
              <input
                id="match-work"
                type="number" min={0} max={30} value={workYears}
                onChange={(e) => setWorkYears(Math.max(0, Math.min(30, +e.target.value || 0)))}
                className="w-full px-3 py-2 border border-border/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <span className="text-[10px] text-foreground/30 mt-0.5 block">0 - 30 years</span>
            </div>

            {/* Target Countries */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 block mb-1">
                Target Countries
              </label>
              <PillSelect
                options={COUNTRIES}
                selected={targetCountries}
                onChange={setTargetCountries}
                placeholder="Any country"
              />
            </div>

            {/* Goals */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 block mb-1">
                Career Goals
              </label>
              <PillSelect
                options={GOALS}
                selected={goals}
                onChange={setGoals}
                placeholder="Select goals"
              />
            </div>

            {/* Budget */}
            <div>
              <label htmlFor="match-budget" className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 block mb-1">
                Budget (USD)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="match-budget"
                  type="range"
                  min={20000} max={300000} step={5000}
                  value={budget}
                  onChange={(e) => setBudget(+e.target.value)}
                  disabled={noBudgetLimit}
                  className="flex-1 accent-primary"
                />
                <span className="text-xs text-foreground/60 tabular-nums w-20 text-right">
                  {noBudgetLimit ? "No limit" : `$${(budget / 1000).toFixed(0)}k`}
                </span>
              </div>
              <label className="flex items-center gap-1.5 mt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noBudgetLimit}
                  onChange={(e) => setNoBudgetLimit(e.target.checked)}
                  className="accent-primary w-3 h-3"
                />
                <span className="text-[10px] text-foreground/40">No budget limit</span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={runMatch}
              disabled={loading}
              className="btn-primary rounded-lg disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" />Matching...</>
              ) : (
                <><Sparkles size={16} />Find My Schools</>
              )}
            </button>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        </div>

        {/* ── Results ────────────────────────────────────────────── */}
        {results !== null && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Summary */}
            <div className="flex items-center gap-6 mb-6 text-sm text-foreground/60">
              <span className="font-semibold text-foreground">
                {results.length} schools matched
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                {tierCounts.reach} Reach
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                {tierCounts.target} Target
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {tierCounts.safety} Safety
              </span>
            </div>

            {/* 3-column layout */}
            <div className="flex flex-col lg:flex-row gap-8">
              <TierColumn
                title="Reach"
                icon={<TrendingUp size={16} className="text-red-500" />}
                schools={reach}
                color="border-red-200 dark:border-red-800"
              />
              <TierColumn
                title="Target"
                icon={<Target size={16} className="text-amber-500" />}
                schools={target}
                color="border-amber-200 dark:border-amber-800"
              />
              <TierColumn
                title="Safety"
                icon={<Shield size={16} className="text-emerald-500" />}
                schools={safety}
                color="border-emerald-200 dark:border-emerald-800"
              />
            </div>
          </motion.div>
        )}

        {/* No results placeholder */}
        {results === null && !loading && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto rounded-full bg-foreground/5 flex items-center justify-center mb-4">
              <GraduationCap size={28} className="text-foreground/20" />
            </div>
            <p className="text-sm font-medium text-foreground/50 mb-1">Enter your profile to find matching schools</p>
            <p className="text-xs text-foreground/30 max-w-sm mx-auto">
              We will score 1,800+ programs on GMAT fit, GPA, career goals, location, and budget to find your best matches.
            </p>
          </div>
        )}

        {/* Cross-links */}
        <div className="mt-16">
          <ToolCrossLinks current="/school-matcher" />
        </div>
      </div>
    </main>
  );
}
