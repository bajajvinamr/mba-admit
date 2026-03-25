"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Plus, X, Search, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, Lightbulb, BarChart3,
} from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { track } from "@/lib/analytics";
import { ToolCrossLinks } from "@/components/ToolCrossLinks";
import { RadarChart } from "@/components/RadarChart";
import { useUsage } from "@/hooks/useUsage";
import { UsageGate } from "@/components/UsageGate";
import { EmptyState } from "@/components/EmptyState";

/* ── Types ─────────────────────────────────────────────────────────── */

type DimensionResult = {
  value: number;
  percentile: number;
  school_median?: number | null;
  school_avg?: number | null;
  comparison: string;
};

type SimilarProfiles = {
  admitted: number;
  rejected: number;
  waitlisted: number;
  total: number;
  admit_rate_for_profile: number;
};

type PeerComparisonResponse = {
  overall_percentile: number;
  dimensions: Record<string, DimensionResult>;
  strengths: string[];
  gaps: string[];
  similar_profiles: SimilarProfiles;
  recommendations: string[];
};

type School = { id: string; name: string };

/* ── Presets ───────────────────────────────────────────────────────── */

const M7 = ["hbs", "gsb", "wharton", "booth", "kellogg"];
const T15_SUBSET = ["tuck", "haas", "ross", "fuqua", "darden"];

/* ── Helpers ──────────────────────────────────────────────────────── */

function pctColor(p: number): string {
  if (p >= 65) return "text-emerald-600";
  if (p >= 45) return "text-amber-600";
  return "text-red-600";
}

function pctBg(p: number): string {
  if (p >= 65) return "bg-emerald-500";
  if (p >= 45) return "bg-amber-500";
  return "bg-red-500";
}

function pctBgLight(p: number): string {
  if (p >= 65) return "bg-emerald-100 text-emerald-700";
  if (p >= 45) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

const INDUSTRY_OPTIONS = [
  "consulting", "finance", "tech", "healthcare", "military",
  "nonprofit", "energy", "manufacturing", "real_estate", "media",
  "entrepreneurship", "engineering", "government", "education", "other",
];

/* ── Page ──────────────────────────────────────────────────────────── */

export default function PeerComparisonPage() {
  const usage = useUsage("peer_comparison");

  /* School list */
  const [schools, setSchools] = useState<School[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  /* Profile inputs */
  const [gmatVersion, setGmatVersion] = useState<"focus" | "classic">("focus");
  const [gmat, setGmat] = useState(655);
  const [gpa, setGpa] = useState(3.5);
  const [workYears, setWorkYears] = useState(4);
  const [industry, setIndustry] = useState("consulting");
  const [isUrm, setIsUrm] = useState(false);
  const [isInternational, setIsInternational] = useState(false);

  /* Results */
  const [result, setResult] = useState<PeerComparisonResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [schoolsLoading, setSchoolsLoading] = useState(true);

  /* Validation */
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  /* Load school list */
  useEffect(() => {
    apiFetch<School[]>("/api/schools")
      .then((r) => {
        const list = (Array.isArray(r) ? r : [])
          .filter((s: School) => s.name && s.id.length <= 20)
          .sort((a: School, b: School) => a.name.localeCompare(b.name));
        setSchools(list);
      })
      .catch(() => setError("Failed to load school list. Please refresh the page."))
      .finally(() => setSchoolsLoading(false));
  }, []);

  /* Validate */
  const validateInputs = (): boolean => {
    const errors: Record<string, string> = {};
    if (gmatVersion === "focus") {
      if (gmat < 205 || gmat > 805) errors.gmat = "GMAT Focus must be 205-805";
    } else {
      if (gmat < 200 || gmat > 800) errors.gmat = "GMAT Classic must be 200-800";
    }
    if (gpa < 0 || gpa > 4.0) errors.gpa = "GPA must be 0-4.0";
    if (workYears < 0 || workYears > 30) errors.workYears = "Work years must be 0-30";
    if (selected.length === 0) errors.schools = "Select at least 1 school";
    if (selected.length > 5) errors.schools = "Maximum 5 schools";
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* School management */
  const addSchool = (id: string) => {
    if (!selected.includes(id) && selected.length < 5) {
      setSelected((p) => [...p, id]);
    }
    setSearch("");
    setShowPicker(false);
  };

  const removeSchool = (id: string) => setSelected((p) => p.filter((s) => s !== id));

  const applyPreset = (ids: string[]) => {
    setSelected(ids.slice(0, 5));
  };

  /* Run comparison */
  const runComparison = async () => {
    if (!validateInputs()) return;
    setLoading(true);
    setError("");
    try {
      const body = {
        gmat,
        gmat_version: gmatVersion,
        gpa,
        work_years: workYears,
        industry,
        is_urm: isUrm,
        is_international: isInternational,
        target_schools: selected,
      };
      const res = await apiFetch<PeerComparisonResponse>("/api/peer-comparison", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setResult(res);
      usage.recordUse();
      track("peer_comparison_completed", {
        schools_count: selected.length,
        gmat,
        gpa,
        work_years: workYears,
        overall_percentile: res.overall_percentile,
      });
    } catch {
      setError("Comparison failed. Please check your inputs and try again.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = schools.filter(
    (s) => !selected.includes(s.id) && s.name.toLowerCase().includes(search.toLowerCase()),
  );

  /* Build radar chart data */
  const radarData = result
    ? {
        user: [
          { label: "GMAT", value: result.dimensions.gmat?.percentile ?? 50, max: 100 },
          { label: "GPA", value: result.dimensions.gpa?.percentile ?? 50, max: 100 },
          { label: "Work Exp", value: result.dimensions.work_experience?.percentile ?? 50, max: 100 },
          { label: "Profile Fit", value: Math.min(99, result.overall_percentile + 5), max: 100 },
          { label: "Overall", value: result.overall_percentile, max: 100 },
        ],
        median: [
          { label: "GMAT", value: 50, max: 100 },
          { label: "GPA", value: 50, max: 100 },
          { label: "Work Exp", value: 50, max: 100 },
          { label: "Profile Fit", value: 50, max: 100 },
          { label: "Overall", value: 50, max: 100 },
        ],
      }
    : null;

  return (
    <main className="min-h-screen bg-background">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="bg-foreground text-white py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
            Peer Comparison
          </h1>
          <p className="text-white/70 text-lg">
            See where you stand against the admitted class at your target schools.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* ── Profile Inputs ─────────────────────────────────────── */}
        <div className="editorial-card p-6 mb-6">
          <h2 className="font-semibold text-foreground mb-4">Your Profile</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            {/* GMAT */}
            <div>
              <label htmlFor="pc-gmat" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">GMAT Score</label>
              <div className="flex gap-1 mb-1">
                <button
                  type="button"
                  onClick={() => { setGmatVersion("focus"); setGmat(655); }}
                  className={`text-[9px] px-2 py-0.5 rounded-full border transition-colors ${gmatVersion === "focus" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                >
                  Focus (205-805)
                </button>
                <button
                  type="button"
                  onClick={() => { setGmatVersion("classic"); setGmat(700); }}
                  className={`text-[9px] px-2 py-0.5 rounded-full border transition-colors ${gmatVersion === "classic" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                >
                  Classic (200-800)
                </button>
              </div>
              <input
                id="pc-gmat"
                type="number"
                min={gmatVersion === "focus" ? 205 : 200}
                max={gmatVersion === "focus" ? 805 : 800}
                value={gmat}
                onChange={(e) => {
                  setGmat(+e.target.value || (gmatVersion === "focus" ? 655 : 700));
                  setValidationErrors((v) => { const { gmat: _, ...rest } = v; return rest; });
                }}
                className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${validationErrors.gmat ? "border-red-400" : "border-border/10"}`}
              />
              {validationErrors.gmat ? (
                <span className="text-[10px] text-red-500 mt-0.5 block">{validationErrors.gmat}</span>
              ) : (
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  {gmatVersion === "focus" ? "205 - 805" : "200 - 800"}
                </span>
              )}
            </div>

            {/* GPA */}
            <div>
              <label htmlFor="pc-gpa" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">GPA</label>
              <input
                id="pc-gpa"
                type="number"
                step="0.1"
                min={0}
                max={4.0}
                value={gpa}
                onChange={(e) => {
                  setGpa(+e.target.value || 3.5);
                  setValidationErrors((v) => { const { gpa: _, ...rest } = v; return rest; });
                }}
                className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${validationErrors.gpa ? "border-red-400" : "border-border/10"}`}
              />
              {validationErrors.gpa ? (
                <span className="text-[10px] text-red-500 mt-0.5 block">{validationErrors.gpa}</span>
              ) : (
                <span className="text-[10px] text-muted-foreground mt-0.5 block">0.0 - 4.0</span>
              )}
            </div>

            {/* Work Years */}
            <div>
              <label htmlFor="pc-yoe" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Work Years</label>
              <input
                id="pc-yoe"
                type="number"
                min={0}
                max={30}
                value={workYears}
                onChange={(e) => {
                  setWorkYears(+e.target.value || 0);
                  setValidationErrors((v) => { const { workYears: _, ...rest } = v; return rest; });
                }}
                className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${validationErrors.workYears ? "border-red-400" : "border-border/10"}`}
              />
              {validationErrors.workYears ? (
                <span className="text-[10px] text-red-500 mt-0.5 block">{validationErrors.workYears}</span>
              ) : (
                <span className="text-[10px] text-muted-foreground mt-0.5 block">0 - 30</span>
              )}
            </div>
          </div>

          {/* Industry */}
          <div className="mb-4">
            <label htmlFor="pc-industry" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Industry</label>
            <select
              id="pc-industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full px-3 py-2 border border-border/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
            >
              {INDUSTRY_OPTIONS.map((ind) => (
                <option key={ind} value={ind}>
                  {ind.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          {/* Checkboxes */}
          <div className="flex flex-wrap gap-4">
            {[
              { label: "URM", checked: isUrm, set: setIsUrm },
              { label: "International", checked: isInternational, set: setIsInternational },
            ].map((cb) => (
              <label key={cb.label} className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={cb.checked}
                  onChange={(e) => cb.set(e.target.checked)}
                  className="rounded border-border/20 text-primary focus:ring-primary/50"
                />
                {cb.label}
              </label>
            ))}
          </div>
        </div>

        {/* ── School Selection ───────────────────────────────────── */}
        <div className="editorial-card p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Target Schools</h2>
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="text-xs px-3 py-1.5 bg-foreground text-white rounded-full hover:bg-foreground/80 flex items-center gap-1"
            >
              <Plus size={12} /> Add School
            </button>
          </div>

          {/* Presets */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => applyPreset(M7)}
              className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-border/10 hover:bg-primary/10 text-muted-foreground hover:text-foreground transition-colors"
            >
              M7 (5)
            </button>
            <button
              onClick={() => applyPreset(T15_SUBSET)}
              className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-border/10 hover:bg-primary/10 text-muted-foreground hover:text-foreground transition-colors"
            >
              T15
            </button>
          </div>

          {/* Picker dropdown */}
          {showPicker && (
            <div className="mb-4">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search schools..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-border/10 rounded text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="max-h-40 overflow-y-auto border border-border/5 rounded">
                {schoolsLoading ? (
                  <div className="p-3 space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-4 bg-foreground/5 rounded animate-pulse" style={{ width: `${70 + i * 5}%` }} />
                    ))}
                  </div>
                ) : (
                  <>
                    {filtered.slice(0, 15).map((s) => (
                      <button
                        key={s.id}
                        onClick={() => addSchool(s.id)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-primary/5 border-b border-border/5 last:border-0"
                      >
                        {s.name}
                      </button>
                    ))}
                    {filtered.length === 0 && (
                      <p className="px-3 py-2 text-sm text-muted-foreground">No schools found</p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Selected chips */}
          <div className="flex flex-wrap gap-2">
            {selected.map((id) => {
              const s = schools.find((x) => x.id === id);
              return (
                <span key={id} className="inline-flex items-center gap-1 px-3 py-1.5 bg-foreground text-white text-sm rounded-full">
                  {s?.name || id}
                  <button onClick={() => removeSchool(id)} aria-label={`Remove ${s?.name || id}`} className="hover:text-red-300 transition-colors">
                    <X size={12} />
                  </button>
                </span>
              );
            })}
            {selected.length === 0 && (
              <p className="text-sm text-muted-foreground">Select 1-5 schools to compare against (use presets or add manually)</p>
            )}
          </div>
          {validationErrors.schools && (
            <span className="text-[10px] text-red-500 mt-1 block">{validationErrors.schools}</span>
          )}
        </div>

        {/* ── Compare Button ──────────────────────────────────────── */}
        <button
          onClick={runComparison}
          disabled={loading || selected.length === 0}
          aria-busy={loading}
          className="w-full py-3 bg-primary text-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all mb-8 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <BarChart3 size={18} />
              </motion.div>
              Analyzing your profile...
            </>
          ) : (
            <>
              <BarChart3 size={18} />
              Compare
            </>
          )}
        </button>

        {error && (
          <div className="editorial-card p-4 mb-6 border-red-200 bg-red-50 flex items-start gap-3" role="alert">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700">{error}</p>
              <button onClick={() => setError("")} className="text-xs text-red-500 hover:text-red-700 mt-1 underline">
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* ── Results ─────────────────────────────────────────────── */}
        <UsageGate feature="peer_comparison">
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
                aria-live="polite"
              >
                {/* Hero Percentile */}
                <div className="editorial-card p-8 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    Your Overall Ranking
                  </p>
                  <p className={`text-6xl font-bold mb-2 ${pctColor(result.overall_percentile)}`}>
                    {result.overall_percentile}<span className="text-2xl">th</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    percentile of applicants at your target schools
                  </p>
                </div>

                {/* Radar Chart */}
                {radarData && (
                  <div className="editorial-card p-6">
                    <h3 className="font-semibold text-foreground mb-4 text-center">Profile vs. School Median</h3>
                    <RadarChart
                      series={[
                        { name: "Your Profile", data: radarData.user, color: "#2563eb" },
                        { name: "School Median", data: radarData.median, color: "#a3a3a3" },
                      ]}
                      size={320}
                    />
                    <div className="flex justify-center gap-6 mt-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="w-3 h-3 rounded-full bg-blue-600" />
                        Your Profile
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="w-3 h-3 rounded-full bg-neutral-400" />
                        School Median (50th)
                      </div>
                    </div>
                  </div>
                )}

                {/* Dimension Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* GMAT */}
                  {result.dimensions.gmat && (
                    <DimensionCard
                      label="GMAT"
                      value={String(result.dimensions.gmat.value)}
                      percentile={result.dimensions.gmat.percentile}
                      median={result.dimensions.gmat.school_median != null ? String(result.dimensions.gmat.school_median) : undefined}
                      comparison={result.dimensions.gmat.comparison}
                    />
                  )}
                  {/* GPA */}
                  {result.dimensions.gpa && (
                    <DimensionCard
                      label="GPA"
                      value={String(result.dimensions.gpa.value)}
                      percentile={result.dimensions.gpa.percentile}
                      median={result.dimensions.gpa.school_median != null ? String(result.dimensions.gpa.school_median) : undefined}
                      comparison={result.dimensions.gpa.comparison}
                    />
                  )}
                  {/* Work Experience */}
                  {result.dimensions.work_experience && (
                    <DimensionCard
                      label="Work Experience"
                      value={`${result.dimensions.work_experience.value} yrs`}
                      percentile={result.dimensions.work_experience.percentile}
                      median={result.dimensions.work_experience.school_avg != null ? `${result.dimensions.work_experience.school_avg} yrs` : undefined}
                      comparison={result.dimensions.work_experience.comparison}
                    />
                  )}
                </div>

                {/* Similar Profiles */}
                <div className="editorial-card p-6">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Users size={16} />
                    Similar Profiles
                  </h3>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">{result.similar_profiles.total}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
                    </div>
                    <div className="flex-1 h-6 rounded-full overflow-hidden flex bg-foreground/5">
                      {result.similar_profiles.admitted > 0 && (
                        <div
                          className="bg-emerald-500 h-full transition-all"
                          style={{ width: `${(result.similar_profiles.admitted / result.similar_profiles.total) * 100}%` }}
                          title={`${result.similar_profiles.admitted} admitted`}
                        />
                      )}
                      {result.similar_profiles.waitlisted > 0 && (
                        <div
                          className="bg-amber-400 h-full transition-all"
                          style={{ width: `${(result.similar_profiles.waitlisted / result.similar_profiles.total) * 100}%` }}
                          title={`${result.similar_profiles.waitlisted} waitlisted`}
                        />
                      )}
                      {result.similar_profiles.rejected > 0 && (
                        <div
                          className="bg-red-400 h-full transition-all"
                          style={{ width: `${(result.similar_profiles.rejected / result.similar_profiles.total) * 100}%` }}
                          title={`${result.similar_profiles.rejected} rejected`}
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />{result.similar_profiles.admitted} admitted</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />{result.similar_profiles.waitlisted} waitlisted</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />{result.similar_profiles.rejected} rejected</span>
                  </div>
                  <p className="text-sm text-foreground">
                    Of <strong>{result.similar_profiles.total}</strong> applicants with similar profiles,{" "}
                    <strong>{result.similar_profiles.admitted}</strong> were admitted (
                    <strong className={pctColor(result.similar_profiles.admit_rate_for_profile)}>
                      {result.similar_profiles.admit_rate_for_profile}%
                    </strong>
                    )
                  </p>
                </div>

                {/* Strengths & Gaps */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Strengths */}
                  {result.strengths.length > 0 && (
                    <div className="editorial-card p-6">
                      <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <CheckCircle size={16} className="text-emerald-600" />
                        Strengths
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {result.strengths.map((s, i) => (
                          <span key={i} className="inline-block px-3 py-1.5 text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Gaps */}
                  {result.gaps.length > 0 && (
                    <div className="editorial-card p-6">
                      <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <TrendingDown size={16} className="text-amber-600" />
                        Gaps
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {result.gaps.map((g, i) => (
                          <span key={i} className="inline-block px-3 py-1.5 text-xs rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Recommendations */}
                {result.recommendations.length > 0 && (
                  <div className="editorial-card p-6">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Lightbulb size={16} className="text-primary" />
                      Recommendations
                    </h3>
                    <div className="space-y-3">
                      {result.recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-foreground/[0.02] border border-border/5">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <p className="text-sm text-foreground/80">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Next Steps CTAs */}
                <div className="border-t border-border/5 pt-8">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 mb-4">What to Do Next</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Link href="/simulator" className="editorial-card group hover:border-primary/30 transition-all flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary/20 transition-colors">
                        <BarChart3 size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">Run Admit Simulation</p>
                        <p className="text-[10px] text-muted-foreground/40 mt-0.5">Monte Carlo probability analysis</p>
                      </div>
                    </Link>
                    <Link href="/evaluator" className="editorial-card group hover:border-primary/30 transition-all flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary/20 transition-colors">
                        <TrendingUp size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">Evaluate Your Essays</p>
                        <p className="text-[10px] text-muted-foreground/40 mt-0.5">AI feedback on your essay drafts</p>
                      </div>
                    </Link>
                    <Link href="/profile-report" className="editorial-card group hover:border-primary/30 transition-all flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary/20 transition-colors">
                        <Users size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">Full Profile Report</p>
                        <p className="text-[10px] text-muted-foreground/40 mt-0.5">Strengths, gaps, and fit scores</p>
                      </div>
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state */}
          {!result && !loading && (
            <EmptyState
              icon={Users}
              title="No comparison results yet"
              description="Fill in your profile, select target schools, and click Compare to see where you stand."
            />
          )}
        </UsageGate>

        {/* ── Cross Links ────────────────────────────────────────── */}
        <ToolCrossLinks current="/peer-compare" />
      </div>
    </main>
  );
}

/* ── Dimension Card Component ────────────────────────────────────── */

function DimensionCard({
  label,
  value,
  percentile,
  median,
  comparison,
}: {
  label: string;
  value: string;
  percentile: number;
  median?: string;
  comparison: string;
}) {
  return (
    <div className="editorial-card p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
      <div className="flex items-end justify-between mb-3">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        <span className={`text-sm font-semibold ${pctColor(percentile)}`}>{percentile}th pct</span>
      </div>
      {/* Percentile bar */}
      <div className="relative h-2 bg-foreground/5 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all ${pctBg(percentile)}`}
          style={{ width: `${percentile}%` }}
        />
        {/* 50th marker */}
        <div className="absolute top-0 left-1/2 w-px h-full bg-foreground/20" />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className={`px-2 py-0.5 rounded-full ${pctBgLight(percentile)}`}>{comparison}</span>
        {median && <span>Median: {median}</span>}
      </div>
    </div>
  );
}
