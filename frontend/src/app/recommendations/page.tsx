"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, TrendingUp, Shield, Search,
  MapPin, GraduationCap, DollarSign, Globe,
  ChevronRight, Loader2, Users,
} from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { track } from "@/lib/analytics";

/* ── Types ─────────────────────────────────────────────────────────── */

type SchoolRec = {
  school_id: string;
  name: string;
  fit_score: number;
  why: string;
  gmat_avg: number | null;
  acceptance_rate: number | null;
  location: string;
  country: string;
  tuition_usd: number | null;
  median_salary: string;
  specializations: string[];
  class_size: number | null;
  degree_type: string;
};

type RecResponse = {
  reach: SchoolRec[];
  target: SchoolRec[];
  safety: SchoolRec[];
  profile_summary: string;
  total_evaluated: number;
};

/* ── Constants ──────────────────────────────────────────────────────── */

const INDUSTRIES = [
  "Consulting", "Finance", "Tech", "Healthcare", "Energy",
  "Nonprofit", "Military", "Government", "Real Estate",
  "Manufacturing", "Retail", "Media", "Education", "Legal", "Other",
];

const COUNTRIES = [
  { code: "US", label: "United States" },
  { code: "UK", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
  { code: "FR", label: "France" },
  { code: "DE", label: "Germany" },
  { code: "ES", label: "Spain" },
  { code: "CH", label: "Switzerland" },
  { code: "SG", label: "Singapore" },
  { code: "AU", label: "Australia" },
  { code: "IN", label: "India" },
  { code: "CN", label: "China" },
  { code: "HK", label: "Hong Kong" },
  { code: "JP", label: "Japan" },
  { code: "AE", label: "UAE" },
  { code: "NL", label: "Netherlands" },
  { code: "IE", label: "Ireland" },
  { code: "IT", label: "Italy" },
  { code: "KR", label: "South Korea" },
];

const PRIORITIES = [
  { value: "career_outcomes", label: "Career Outcomes" },
  { value: "prestige", label: "Prestige" },
  { value: "location", label: "Location" },
  { value: "roi", label: "ROI" },
  { value: "entrepreneurship", label: "Entrepreneurship" },
  { value: "diversity", label: "Diversity" },
  { value: "international", label: "International Exposure" },
  { value: "network", label: "Alumni Network" },
];

/* ── Helpers ─────────────────────────────────────────────────────────── */

function fitScoreColor(score: number): string {
  if (score >= 72) return "text-emerald-600";
  if (score >= 45) return "text-amber-600";
  return "text-red-500";
}

function fitScoreBg(score: number): string {
  if (score >= 72) return "bg-emerald-500";
  if (score >= 45) return "bg-amber-500";
  return "bg-red-500";
}

function fitScoreTrack(score: number): string {
  if (score >= 72) return "bg-emerald-100";
  if (score >= 45) return "bg-amber-100";
  return "bg-red-100";
}

function tierLabel(tier: "reach" | "target" | "safety"): { label: string; icon: typeof Target; color: string; bg: string } {
  const map = {
    reach: { label: "Reach", icon: TrendingUp, color: "text-red-600", bg: "bg-red-50 border-red-200" },
    target: { label: "Target", icon: Target, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
    safety: { label: "Safety", icon: Shield, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
  };
  return map[tier];
}

/* ── SchoolCard Component ─────────────────────────────────────────── */

function SchoolCard({ school, tier }: { school: SchoolRec; tier: "reach" | "target" | "safety" }) {
  const t = tierLabel(tier);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-lg p-5 hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-sm leading-snug truncate">
            {school.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-1 text-muted-foreground text-xs">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{school.location}</span>
          </div>
        </div>
        {/* Fit Score Gauge */}
        <div className="flex flex-col items-center ml-3">
          <div className="relative w-12 h-12">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor"
                className="text-border/30" strokeWidth="4" />
              <circle cx="24" cy="24" r="20" fill="none"
                className={fitScoreBg(school.fit_score).replace("bg-", "text-")}
                strokeWidth="4"
                strokeDasharray={`${(school.fit_score / 100) * 125.6} 125.6`}
                strokeLinecap="round" />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${fitScoreColor(school.fit_score)}`}>
              {school.fit_score}
            </span>
          </div>
          <span className="text-[9px] text-muted-foreground mt-0.5 uppercase tracking-wider">Fit</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        {school.gmat_avg && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <GraduationCap className="w-3.5 h-3.5 shrink-0" />
            <span>GMAT {school.gmat_avg}</span>
          </div>
        )}
        {school.acceptance_rate !== null && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>{school.acceptance_rate}% accept</span>
          </div>
        )}
        {school.tuition_usd && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <DollarSign className="w-3.5 h-3.5 shrink-0" />
            <span>${(school.tuition_usd / 1000).toFixed(0)}k/yr</span>
          </div>
        )}
        {school.country && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{school.country}</span>
          </div>
        )}
      </div>

      {/* Why Explanation */}
      <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-3">
        {school.why}
      </p>

      {/* Specializations */}
      {school.specializations.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {school.specializations.map((s) => (
            <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {s}
            </span>
          ))}
        </div>
      )}

      {/* CTA */}
      <Link
        href={`/school/${school.school_id}`}
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
      >
        View School <ChevronRight className="w-3 h-3" />
      </Link>
    </motion.div>
  );
}

/* ── Multi-Select Pill Component ─────────────────────────────────── */

function PillSelect({
  options,
  selected,
  onToggle,
  labelKey = "label",
  valueKey = "value",
}: {
  options: { label: string; value: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  labelKey?: string;
  valueKey?: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const val = opt[valueKey as keyof typeof opt];
        const label = opt[labelKey as keyof typeof opt];
        const isSelected = selected.includes(val);
        return (
          <button
            key={val}
            type="button"
            onClick={() => onToggle(val)}
            className={`text-[11px] px-3 py-1 rounded-full border transition-colors ${
              isSelected
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Tier Column Component ───────────────────────────────────────── */

function TierColumn({ tier, schools }: { tier: "reach" | "target" | "safety"; schools: SchoolRec[] }) {
  const t = tierLabel(tier);
  const Icon = t.icon;

  return (
    <div className="flex flex-col">
      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg border ${t.bg}`}>
        <Icon className={`w-4 h-4 ${t.color}`} />
        <span className={`text-sm font-semibold ${t.color}`}>{t.label}</span>
        <span className="text-xs text-muted-foreground ml-auto">{schools.length} school{schools.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="flex flex-col gap-3 mt-3">
        {schools.length === 0 ? (
          <p className="text-xs text-muted-foreground italic px-2 py-4 text-center">
            No {tier} schools match your criteria.
          </p>
        ) : (
          schools.map((s) => <SchoolCard key={s.school_id} school={s} tier={tier} />)
        )}
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────── */

export default function RecommendationsPage() {
  /* Profile inputs */
  const [gmatVersion, setGmatVersion] = useState<"focus" | "classic">("focus");
  const [gmat, setGmat] = useState(655);
  const [gpa, setGpa] = useState(3.5);
  const [workYears, setWorkYears] = useState(4);
  const [industry, setIndustry] = useState("");
  const [targetIndustry, setTargetIndustry] = useState("");
  const [isUrm, setIsUrm] = useState(false);
  const [isInternational, setIsInternational] = useState(false);
  const [citizenship, setCitizenship] = useState("");
  const [budgetMax, setBudgetMax] = useState(150000);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [preferredCountries, setPreferredCountries] = useState<string[]>([]);

  /* Results */
  const [results, setResults] = useState<RecResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* Validation */
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateInputs = (): boolean => {
    const errors: Record<string, string> = {};
    if (gmatVersion === "focus") {
      if (gmat < 205 || gmat > 805) errors.gmat = "GMAT Focus must be 205-805";
    } else {
      if (gmat < 200 || gmat > 800) errors.gmat = "GMAT Classic must be 200-800";
    }
    if (gpa < 0 || gpa > 4.0) errors.gpa = "GPA must be 0-4.0";
    if (workYears < 0 || workYears > 30) errors.workYears = "Work years must be 0-30";
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const togglePriority = (val: string) => {
    setPriorities((prev) =>
      prev.includes(val) ? prev.filter((p) => p !== val) : [...prev, val]
    );
  };

  const toggleCountry = (val: string) => {
    setPreferredCountries((prev) =>
      prev.includes(val) ? prev.filter((c) => c !== val) : [...prev, val]
    );
  };

  const handleSubmit = async () => {
    if (!validateInputs()) return;
    setLoading(true);
    setError("");
    setResults(null);

    try {
      const body = {
        gmat,
        gmat_version: gmatVersion,
        gpa,
        work_years: workYears,
        industry: industry.toLowerCase(),
        target_industry: targetIndustry.toLowerCase(),
        is_urm: isUrm,
        is_international: isInternational,
        citizenship,
        budget_max_usd: budgetMax,
        priorities,
        preferred_countries: preferredCountries,
      };

      const res = await apiFetch<RecResponse>("/api/recommendations/personalized", {
        method: "POST",
        body: JSON.stringify(body),
      });

      setResults(res);

      track("personalized_recommendations", {
        gmat,
        gmat_version: gmatVersion,
        gpa,
        work_years: workYears,
        industry,
        target_industry: targetIndustry,
        reach_count: res.reach.length,
        target_count: res.target.length,
        safety_count: res.safety.length,
        total_evaluated: res.total_evaluated,
      });
    } catch {
      setError("Failed to get recommendations. Please check your inputs and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="bg-foreground text-white py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
            School Recommendation Engine
          </h1>
          <p className="text-white/70 text-lg">
            Get personalized reach, target, and safety school picks based on your profile.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* ── Input Form ────────────────────────────────────────── */}
        <div className="editorial-card p-6 mb-8">
          <h2 className="font-semibold text-foreground mb-5">Your Profile</h2>

          {/* Row 1: GMAT, GPA, Work Years */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            {/* GMAT */}
            <div>
              <label htmlFor="rec-gmat" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                GMAT Score
              </label>
              <div className="flex gap-1 mb-1">
                <button
                  type="button"
                  onClick={() => { setGmatVersion("focus"); setGmat(655); }}
                  className={`text-[9px] px-2 py-0.5 rounded-full border transition-colors ${
                    gmatVersion === "focus"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  Focus (205-805)
                </button>
                <button
                  type="button"
                  onClick={() => { setGmatVersion("classic"); setGmat(700); }}
                  className={`text-[9px] px-2 py-0.5 rounded-full border transition-colors ${
                    gmatVersion === "classic"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  Classic (200-800)
                </button>
              </div>
              <input
                id="rec-gmat"
                type="number"
                min={gmatVersion === "focus" ? 205 : 200}
                max={gmatVersion === "focus" ? 805 : 800}
                value={gmat}
                onChange={(e) => {
                  setGmat(+e.target.value || (gmatVersion === "focus" ? 655 : 700));
                  setValidationErrors((v) => { const { gmat: _, ...rest } = v; return rest; });
                }}
                className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                  validationErrors.gmat ? "border-red-400" : "border-border/10"
                }`}
              />
              {validationErrors.gmat && (
                <span className="text-[10px] text-red-500 mt-0.5 block">{validationErrors.gmat}</span>
              )}
            </div>

            {/* GPA */}
            <div>
              <label htmlFor="rec-gpa" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                GPA (4.0 scale)
              </label>
              <input
                id="rec-gpa"
                type="number"
                step="0.1"
                min={0}
                max={4.0}
                value={gpa}
                onChange={(e) => {
                  setGpa(+e.target.value || 3.5);
                  setValidationErrors((v) => { const { gpa: _, ...rest } = v; return rest; });
                }}
                className={`w-full px-3 py-2 border rounded text-sm mt-5 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                  validationErrors.gpa ? "border-red-400" : "border-border/10"
                }`}
              />
              {validationErrors.gpa && (
                <span className="text-[10px] text-red-500 mt-0.5 block">{validationErrors.gpa}</span>
              )}
            </div>

            {/* Work Years */}
            <div>
              <label htmlFor="rec-yoe" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                Work Experience (Years)
              </label>
              <input
                id="rec-yoe"
                type="number"
                min={0}
                max={30}
                value={workYears}
                onChange={(e) => {
                  setWorkYears(+e.target.value || 0);
                  setValidationErrors((v) => { const { workYears: _, ...rest } = v; return rest; });
                }}
                className={`w-full px-3 py-2 border rounded text-sm mt-5 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                  validationErrors.workYears ? "border-red-400" : "border-border/10"
                }`}
              />
              {validationErrors.workYears && (
                <span className="text-[10px] text-red-500 mt-0.5 block">{validationErrors.workYears}</span>
              )}
            </div>
          </div>

          {/* Row 2: Industry, Target Industry */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label htmlFor="rec-industry" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                Current Industry
              </label>
              <select
                id="rec-industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3 py-2 border border-border/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
              >
                <option value="">Select industry...</option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="rec-target-industry" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                Target Industry (Post-MBA)
              </label>
              <select
                id="rec-target-industry"
                value={targetIndustry}
                onChange={(e) => setTargetIndustry(e.target.value)}
                className="w-full px-3 py-2 border border-border/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
              >
                <option value="">Select target industry...</option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Checkboxes + Citizenship */}
          <div className="flex flex-wrap items-end gap-4 mb-5">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isInternational}
                onChange={(e) => setIsInternational(e.target.checked)}
                className="rounded border-border/20 text-primary focus:ring-primary/50"
              />
              International
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isUrm}
                onChange={(e) => setIsUrm(e.target.checked)}
                className="rounded border-border/20 text-primary focus:ring-primary/50"
              />
              URM
            </label>
            {isInternational && (
              <div>
                <label htmlFor="rec-citizenship" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                  Citizenship
                </label>
                <input
                  id="rec-citizenship"
                  type="text"
                  maxLength={3}
                  placeholder="e.g. IN, CN"
                  value={citizenship}
                  onChange={(e) => setCitizenship(e.target.value.toUpperCase())}
                  className="w-24 px-3 py-2 border border-border/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            )}
          </div>

          {/* Row 4: Budget Slider */}
          <div className="mb-5">
            <label htmlFor="rec-budget" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">
              Max Annual Budget: ${(budgetMax / 1000).toFixed(0)}k USD
            </label>
            <input
              id="rec-budget"
              type="range"
              min={30000}
              max={250000}
              step={5000}
              value={budgetMax}
              onChange={(e) => setBudgetMax(+e.target.value)}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>$30k</span>
              <span>$250k</span>
            </div>
          </div>

          {/* Row 5: Preferred Countries */}
          <div className="mb-5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
              Preferred Countries
            </span>
            <PillSelect
              options={COUNTRIES.map((c) => ({ value: c.code, label: c.label }))}
              selected={preferredCountries}
              onToggle={toggleCountry}
            />
            {preferredCountries.length === 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">Select at least one country, or leave blank for all.</p>
            )}
          </div>

          {/* Row 6: Priorities */}
          <div className="mb-6">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
              What Matters Most
            </span>
            <PillSelect
              options={PRIORITIES}
              selected={priorities}
              onToggle={togglePriority}
            />
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full md:w-auto px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing {preferredCountries.length > 0 ? "schools" : "894 schools"}...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Get Recommendations
              </>
            )}
          </button>

          {error && (
            <p className="text-sm text-red-500 mt-3">{error}</p>
          )}
        </div>

        {/* ── Results ──────────────────────────────────────────── */}
        <AnimatePresence>
          {results && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {/* Profile Summary */}
              <div className="editorial-card p-5 mb-6">
                <p className="text-sm text-foreground">
                  <span className="font-semibold">Profile Assessment:</span>{" "}
                  {results.profile_summary}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Evaluated {results.total_evaluated} schools
                  {preferredCountries.length > 0 && `, filtered to ${preferredCountries.length} countr${preferredCountries.length === 1 ? "y" : "ies"}`}.
                </p>
              </div>

              {/* 3-Column Results */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <TierColumn tier="reach" schools={results.reach} />
                <TierColumn tier="target" schools={results.target} />
                <TierColumn tier="safety" schools={results.safety} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
