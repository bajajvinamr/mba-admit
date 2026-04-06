"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  AlertTriangle,
  Target,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  Info,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { ToolCrossLinks } from "@/components/ToolCrossLinks";

/* ── Types ─────────────────────────────────────────────────────────── */

interface SchoolResult {
  school_id: string;
  school_name: string;
  probability_pct: number | null;
  category: "reach" | "target" | "safety" | "unknown";
  scholarship_rate: number | null;
}

interface BalanceSummary {
  reaches: number;
  targets: number;
  safeties: number;
}

interface SuggestedSchool {
  school_id: string;
  school_name: string;
  probability_pct: number | null;
  reason: string;
}

interface SuggestedRemoval {
  school_id: string;
  reason: string;
}

interface ListHealthResponse {
  health_score: number;
  grade: string;
  balance: BalanceSummary;
  schools: SchoolResult[];
  recommendations: string[];
  suggested_adds: SuggestedSchool[];
  suggested_removes: SuggestedRemoval[];
}

/* ── Helpers ───────────────────────────────────────────────────────── */

function gradeColor(grade: string): string {
  switch (grade) {
    case "A":
      return "bg-emerald-500 text-white";
    case "B":
      return "bg-emerald-400 text-white";
    case "C":
      return "bg-amber-500 text-white";
    case "D":
      return "bg-orange-500 text-white";
    case "F":
      return "bg-red-500 text-white";
    default:
      return "bg-muted-foreground text-white";
  }
}

function gradeBorderColor(grade: string): string {
  switch (grade) {
    case "A":
      return "border-emerald-500/30";
    case "B":
      return "border-emerald-400/30";
    case "C":
      return "border-amber-500/30";
    case "D":
      return "border-orange-500/30";
    case "F":
      return "border-red-500/30";
    default:
      return "border-border";
  }
}

function categoryStyle(cat: string): { bg: string; text: string; icon: typeof Target } {
  switch (cat) {
    case "reach":
      return { bg: "bg-red-50", text: "text-red-700", icon: TrendingUp };
    case "target":
      return { bg: "bg-amber-50", text: "text-amber-700", icon: Target };
    case "safety":
      return { bg: "bg-emerald-50", text: "text-emerald-700", icon: ShieldCheck };
    default:
      return { bg: "bg-gray-50", text: "text-gray-500", icon: Info };
  }
}

function probColor(p: number | null): string {
  if (p === null) return "text-muted-foreground";
  if (p >= 60) return "text-emerald-600";
  if (p >= 25) return "text-amber-600";
  return "text-red-600";
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: "easeOut" },
  }),
};

/* ── Page ──────────────────────────────────────────────────────────── */

export default function ListCheckPage() {
  /* Inputs */
  const [schoolIds, setSchoolIds] = useState("");
  const [gmat, setGmat] = useState(700);
  const [gpa, setGpa] = useState(3.5);
  const [yoe, setYoe] = useState(4);
  const [appRound, setAppRound] = useState("R2");

  /* State */
  const [result, setResult] = useState<ListHealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* Submit */
  const analyze = async () => {
    const ids = schoolIds
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    if (ids.length === 0) {
      setError("Enter at least one school ID.");
      return;
    }
    if (ids.length > 15) {
      setError("Maximum 15 schools allowed.");
      return;
    }
    if (gmat < 200 || gmat > 800) {
      setError("GMAT must be between 200 and 800.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await apiFetch<ListHealthResponse>("/api/list-health/analyze", {
        method: "POST",
        body: JSON.stringify({
          school_ids: ids,
          gmat,
          gpa,
          yoe,
          app_round: appRound,
        }),
      });
      setResult(res);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Analysis failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  /* Derived */
  const reachSchools = result?.schools.filter((s) => s.category === "reach") ?? [];
  const targetSchools = result?.schools.filter((s) => s.category === "target") ?? [];
  const safetySchools = result?.schools.filter((s) => s.category === "safety") ?? [];
  const unknownSchools = result?.schools.filter((s) => s.category === "unknown") ?? [];

  return (
    <main className="min-h-screen bg-background">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="bg-foreground text-white py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
            School List Health Check
          </h1>
          <p className="text-white/70 text-lg">
            Find out if your list is balanced — powered by ML models trained on 67K+ decisions.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* ── Profile Inputs ───────────────────────────────────── */}
        <div className="editorial-card p-6 mb-6">
          <h2 className="font-semibold text-foreground mb-4">Your Profile</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label
                htmlFor="lc-gmat"
                className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1"
              >
                GMAT
              </label>
              <input
                id="lc-gmat"
                type="number"
                min={200}
                max={800}
                value={gmat}
                onChange={(e) => setGmat(+e.target.value || 700)}
                className="w-full px-3 py-2 border border-border/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <span className="text-[10px] text-muted-foreground mt-0.5 block">200 - 800</span>
            </div>
            <div>
              <label
                htmlFor="lc-gpa"
                className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1"
              >
                GPA
              </label>
              <input
                id="lc-gpa"
                type="number"
                step="0.1"
                min={0}
                max={4.0}
                value={gpa}
                onChange={(e) => setGpa(+e.target.value || 3.5)}
                className="w-full px-3 py-2 border border-border/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <span className="text-[10px] text-muted-foreground mt-0.5 block">0.0 - 4.0</span>
            </div>
            <div>
              <label
                htmlFor="lc-yoe"
                className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1"
              >
                Work Years
              </label>
              <input
                id="lc-yoe"
                type="number"
                min={0}
                max={30}
                value={yoe}
                onChange={(e) => setYoe(+e.target.value || 0)}
                className="w-full px-3 py-2 border border-border/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <span className="text-[10px] text-muted-foreground mt-0.5 block">0 - 30</span>
            </div>
            <div>
              <label
                htmlFor="lc-round"
                className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1"
              >
                Round
              </label>
              <select
                id="lc-round"
                value={appRound}
                onChange={(e) => setAppRound(e.target.value)}
                className="w-full px-3 py-2 border border-border/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
              >
                <option value="R1">Round 1</option>
                <option value="R2">Round 2</option>
                <option value="R3">Round 3</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── School Input ─────────────────────────────────────── */}
        <div className="editorial-card p-6 mb-6">
          <h2 className="font-semibold text-foreground mb-2">Your Schools</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Enter school IDs separated by commas (e.g., hbs, gsb, wharton, booth, ross, tuck)
          </p>
          <textarea
            value={schoolIds}
            onChange={(e) => setSchoolIds(e.target.value)}
            placeholder="hbs, gsb, wharton, booth, kellogg, ross"
            rows={3}
            className="w-full px-3 py-2 border border-border/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
        </div>

        {/* ── Submit ───────────────────────────────────────────── */}
        <button
          onClick={analyze}
          disabled={loading}
          className={cn(
            "w-full py-3 rounded-full font-semibold text-sm transition-all",
            loading
              ? "bg-muted-foreground/20 text-muted-foreground cursor-not-allowed"
              : "bg-foreground text-white hover:bg-foreground/80",
          )}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Analyzing...
            </span>
          ) : (
            "Analyze My List"
          )}
        </button>

        {/* ── Error ────────────────────────────────────────────── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Results ──────────────────────────────────────────── */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="mt-8 space-y-6"
            >
              {/* Grade Badge */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0}
                className={cn(
                  "editorial-card p-6 border-2 text-center",
                  gradeBorderColor(result.grade),
                )}
              >
                <div
                  className={cn(
                    "inline-flex items-center justify-center w-20 h-20 rounded-full text-4xl font-bold mb-3",
                    gradeColor(result.grade),
                  )}
                >
                  {result.grade}
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {result.health_score}/100
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  List Health Score
                </p>
              </motion.div>

              {/* Balance Visualization */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={1}
                className="grid grid-cols-3 gap-3"
              >
                {/* Reaches */}
                <div className="editorial-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                      <TrendingUp size={12} className="text-red-600" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Reaches
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-red-600 mb-2">
                    {result.balance.reaches}
                  </p>
                  <div className="space-y-1">
                    {reachSchools.map((s) => (
                      <div
                        key={s.school_id}
                        className="text-xs text-foreground/80 truncate"
                        title={s.school_name}
                      >
                        {s.school_name}
                        {s.probability_pct !== null && (
                          <span className="text-red-500 ml-1">
                            {s.probability_pct.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Targets */}
                <div className="editorial-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                      <Target size={12} className="text-amber-600" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Targets
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-amber-600 mb-2">
                    {result.balance.targets}
                  </p>
                  <div className="space-y-1">
                    {targetSchools.map((s) => (
                      <div
                        key={s.school_id}
                        className="text-xs text-foreground/80 truncate"
                        title={s.school_name}
                      >
                        {s.school_name}
                        {s.probability_pct !== null && (
                          <span className="text-amber-500 ml-1">
                            {s.probability_pct.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Safeties */}
                <div className="editorial-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                      <ShieldCheck size={12} className="text-emerald-600" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Safeties
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600 mb-2">
                    {result.balance.safeties}
                  </p>
                  <div className="space-y-1">
                    {safetySchools.map((s) => (
                      <div
                        key={s.school_id}
                        className="text-xs text-foreground/80 truncate"
                        title={s.school_name}
                      >
                        {s.school_name}
                        {s.probability_pct !== null && (
                          <span className="text-emerald-500 ml-1">
                            {s.probability_pct.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Unknown schools note */}
              {unknownSchools.length > 0 && (
                <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  custom={2}
                  className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-600"
                >
                  <span className="font-semibold">No prediction data:</span>{" "}
                  {unknownSchools.map((s) => s.school_name).join(", ")}
                </motion.div>
              )}

              {/* Per-School Table */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={2}
                className="editorial-card overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-border/10">
                  <h3 className="font-semibold text-sm text-foreground">
                    School Breakdown
                  </h3>
                </div>
                <div className="divide-y divide-border/5">
                  {result.schools.map((school, i) => {
                    const style = categoryStyle(school.category);
                    const Icon = style.icon;
                    return (
                      <motion.div
                        key={school.school_id}
                        variants={fadeUp}
                        initial="hidden"
                        animate="visible"
                        custom={i + 3}
                        className="flex items-center justify-between px-4 py-3 hover:bg-primary/[0.02] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={cn(
                              "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                              style.bg,
                            )}
                          >
                            <Icon size={13} className={style.text} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {school.school_name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {school.school_id}
                              {school.scholarship_rate !== null && (
                                <span className="ml-2">
                                  Scholarship rate: {school.scholarship_rate.toFixed(0)}%
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span
                            className={cn(
                              "text-sm font-bold tabular-nums",
                              probColor(school.probability_pct),
                            )}
                          >
                            {school.probability_pct !== null
                              ? `${school.probability_pct.toFixed(1)}%`
                              : "N/A"}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                              style.bg,
                              style.text,
                            )}
                          >
                            {school.category}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Recommendations */}
              {result.recommendations.length > 0 && (
                <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  custom={4}
                  className="space-y-2"
                >
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    Recommendations
                  </h3>
                  {result.recommendations.map((rec, i) => {
                    const isWarning =
                      rec.includes("reach-heavy") ||
                      rec.includes("high-risk") ||
                      rec.includes("dilutes") ||
                      rec.includes("no target") ||
                      rec.includes("reapplying");
                    const isPositive =
                      rec.includes("underselling") || rec.includes("ambitious");
                    return (
                      <motion.div
                        key={i}
                        variants={fadeUp}
                        initial="hidden"
                        animate="visible"
                        custom={i + 5}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border text-sm",
                          isWarning
                            ? "bg-amber-50 border-amber-200 text-amber-800"
                            : isPositive
                              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                              : "bg-blue-50 border-blue-200 text-blue-800",
                        )}
                      >
                        {isWarning ? (
                          <AlertTriangle
                            size={16}
                            className="flex-shrink-0 mt-0.5 text-amber-500"
                          />
                        ) : isPositive ? (
                          <CheckCircle2
                            size={16}
                            className="flex-shrink-0 mt-0.5 text-emerald-500"
                          />
                        ) : (
                          <Info
                            size={16}
                            className="flex-shrink-0 mt-0.5 text-blue-500"
                          />
                        )}
                        <span>{rec}</span>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}

              {/* Suggested Adds */}
              {result.suggested_adds.length > 0 && (
                <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  custom={6}
                  className="editorial-card p-4"
                >
                  <h3 className="flex items-center gap-2 font-semibold text-sm text-foreground mb-3">
                    <Plus size={14} className="text-emerald-600" />
                    Consider Adding
                  </h3>
                  <div className="space-y-2">
                    {result.suggested_adds.map((s) => (
                      <div
                        key={s.school_id}
                        className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 border border-emerald-100"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {s.school_name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {s.reason}
                          </p>
                        </div>
                        {s.probability_pct !== null && (
                          <span
                            className={cn(
                              "text-sm font-bold tabular-nums flex-shrink-0 ml-3",
                              probColor(s.probability_pct),
                            )}
                          >
                            {s.probability_pct.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Suggested Removes */}
              {result.suggested_removes.length > 0 && (
                <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  custom={7}
                  className="editorial-card p-4"
                >
                  <h3 className="flex items-center gap-2 font-semibold text-sm text-foreground mb-3">
                    <Minus size={14} className="text-red-600" />
                    Consider Removing
                  </h3>
                  <div className="space-y-2">
                    {result.suggested_removes.map((s) => (
                      <div
                        key={s.school_id}
                        className="flex items-center justify-between p-2 rounded-lg bg-red-50/50 border border-red-100"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {s.school_id}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {s.reason}
                          </p>
                        </div>
                        <TrendingDown
                          size={14}
                          className="text-red-400 flex-shrink-0 ml-3"
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Cross Links ──────────────────────────────────────── */}
        <ToolCrossLinks current="/list-check" />
      </div>
    </main>
  );
}
