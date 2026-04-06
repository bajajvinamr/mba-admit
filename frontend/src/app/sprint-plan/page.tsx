"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, CheckCircle2, Circle, Clock, Plus, X,
  ArrowRight, Calendar, Zap, Info, ChevronDown, Sparkles,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/cn";

// ── Types ───────────────────────────────────────────────────────────────────

interface SchoolInput {
  id: string;
  school_id: string;
  round: string;
  deadline: string;
  essays_done: number;
  essays_total: number;
  resume_done: boolean;
  recs_requested: number;
  recs_needed: number;
  test_submitted: boolean;
}

interface Milestone {
  task: string;
  date: string;
  days_from_now: number;
  done: boolean;
}

interface SchoolPlan {
  school_id: string;
  school_name: string;
  round: string | null;
  deadline: string;
  days_remaining: number;
  days_needed: number;
  days_slack: number;
  status: string;
  completion_pct: number;
  essays: { done: number; total: number; remaining: number; days_needed: number };
  milestones: Milestone[];
  error?: string;
}

interface Nudge {
  severity: string;
  school_id: string | null;
  message: string;
}

interface SprintResponse {
  plans: SchoolPlan[];
  nudges: Nudge[];
  summary: {
    total_schools: number;
    critical: number;
    behind: number;
    on_track: number;
    total_essays_remaining: number;
    nearest_deadline: string | null;
    avg_completion_pct: number;
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  past_due: { label: "Past Due", color: "bg-red-100 text-red-700 border-red-200", icon: <AlertTriangle size={12} /> },
  critical: { label: "Critical", color: "bg-red-50 text-red-600 border-red-200", icon: <AlertTriangle size={12} /> },
  behind: { label: "Behind", color: "bg-amber-50 text-amber-700 border-amber-200", icon: <Clock size={12} /> },
  tight: { label: "Tight", color: "bg-amber-50 text-amber-600 border-amber-200", icon: <Clock size={12} /> },
  on_track: { label: "On Track", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 size={12} /> },
  ahead: { label: "Ahead", color: "bg-emerald-50 text-emerald-600 border-emerald-200", icon: <Sparkles size={12} /> },
};

const NUDGE_STYLES: Record<string, string> = {
  critical: "bg-red-50 border-red-200 text-red-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  action: "bg-primary/5 border-primary/20 text-foreground",
  info: "bg-muted border-border text-muted-foreground",
  positive: "bg-emerald-50 border-emerald-200 text-emerald-800",
};

function createEmptySchool(): SchoolInput {
  return {
    id: crypto.randomUUID(),
    school_id: "",
    round: "",
    deadline: "",
    essays_done: 0,
    essays_total: 2,
    resume_done: false,
    recs_requested: 0,
    recs_needed: 2,
    test_submitted: false,
  };
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function SprintPlanPage() {
  const { profile } = useProfile();
  const [schools, setSchools] = useState<SchoolInput[]>([createEmptySchool()]);
  const [result, setResult] = useState<SprintResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  const addSchool = () => setSchools((s) => [...s, createEmptySchool()]);
  const removeSchool = (id: string) => setSchools((s) => s.filter((x) => x.id !== id));
  const updateSchool = (id: string, field: keyof SchoolInput, value: unknown) => {
    setSchools((s) => s.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  };

  const generatePlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        schools: schools
          .filter((s) => s.school_id)
          .map((s) => ({
            school_id: s.school_id,
            round: s.round || null,
            deadline: s.deadline || null,
            essays_done: s.essays_done,
            essays_total: s.essays_total || null,
            resume_done: s.resume_done,
            recs_requested: s.recs_requested,
            recs_needed: s.recs_needed,
            test_submitted: s.test_submitted,
          })),
      };
      const data = await apiFetch<SprintResponse>("/api/planner/sprint", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setResult(data);
      if (data.plans.length > 0) setExpandedPlan(data.plans[0].school_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  }, [schools]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Smart Sprint Planner
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Add your schools and deadlines. We&apos;ll build a personalized week-by-week
            action plan and tell you exactly where you stand.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* School Inputs */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Your Schools</h2>
          {schools.map((school, i) => (
            <div key={school.id} className="bg-card border border-border/60 rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  School {i + 1}
                </span>
                {schools.length > 1 && (
                  <button onClick={() => removeSchool(school.id)} className="text-muted-foreground/40 hover:text-destructive transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-muted-foreground mb-1">School ID</label>
                  <input
                    type="text"
                    placeholder="hbs, chicago_booth..."
                    value={school.school_id}
                    onChange={(e) => updateSchool(school.id, "school_id", e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Round</label>
                  <select
                    value={school.round}
                    onChange={(e) => updateSchool(school.id, "round", e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Auto</option>
                    <option value="R1">R1</option>
                    <option value="R2">R2</option>
                    <option value="R3">R3</option>
                    <option value="ED">Early Decision</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Deadline</label>
                  <input
                    type="date"
                    value={school.deadline}
                    onChange={(e) => updateSchool(school.id, "deadline", e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Essays Done / Total</label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      min={0}
                      value={school.essays_done}
                      onChange={(e) => updateSchool(school.id, "essays_done", parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-2 text-sm bg-background border border-border rounded-md text-center"
                    />
                    <span className="text-muted-foreground self-center">/</span>
                    <input
                      type="number"
                      min={1}
                      value={school.essays_total}
                      onChange={(e) => updateSchool(school.id, "essays_total", parseInt(e.target.value) || 1)}
                      className="w-full px-2 py-2 text-sm bg-background border border-border rounded-md text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Progress toggles */}
              <div className="flex flex-wrap gap-3 mt-3">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={school.resume_done}
                    onChange={(e) => updateSchool(school.id, "resume_done", e.target.checked)}
                    className="rounded border-border"
                  />
                  Resume done
                </label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={school.test_submitted}
                    onChange={(e) => updateSchool(school.id, "test_submitted", e.target.checked)}
                    className="rounded border-border"
                  />
                  GMAT/GRE sent
                </label>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  Recs:
                  <input
                    type="number"
                    min={0}
                    max={5}
                    value={school.recs_requested}
                    onChange={(e) => updateSchool(school.id, "recs_requested", parseInt(e.target.value) || 0)}
                    className="w-10 px-1 py-0.5 text-center bg-background border border-border rounded text-xs"
                  />
                  / {school.recs_needed}
                </div>
              </div>
            </div>
          ))}

          <div className="flex gap-3">
            <button
              onClick={addSchool}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus size={14} /> Add School
            </button>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={generatePlan}
          disabled={loading || !schools.some((s) => s.school_id)}
          className="w-full sm:w-auto bg-foreground text-background font-medium px-8 py-3 rounded-lg hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Zap size={15} /> Generate My Sprint Plan
            </>
          )}
        </button>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-card border border-border/60 rounded-lg p-4 text-center">
                <p className="text-2xl font-semibold text-foreground">{result.summary.total_essays_remaining}</p>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground/50 mt-0.5">Essays Left</p>
              </div>
              <div className="bg-card border border-border/60 rounded-lg p-4 text-center">
                <p className="text-2xl font-semibold text-foreground">{result.summary.avg_completion_pct}%</p>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground/50 mt-0.5">Avg Complete</p>
              </div>
              <div className="bg-card border border-border/60 rounded-lg p-4 text-center">
                <p className={cn("text-2xl font-semibold", result.summary.critical > 0 ? "text-red-600" : "text-emerald-600")}>
                  {result.summary.critical > 0 ? result.summary.critical : result.summary.on_track}
                </p>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground/50 mt-0.5">
                  {result.summary.critical > 0 ? "Critical" : "On Track"}
                </p>
              </div>
              <div className="bg-card border border-border/60 rounded-lg p-4 text-center">
                <p className="text-2xl font-semibold text-foreground">
                  {result.summary.nearest_deadline
                    ? Math.ceil((new Date(result.summary.nearest_deadline).getTime() - Date.now()) / 86400000)
                    : "—"}
                </p>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground/50 mt-0.5">Days to Next</p>
              </div>
            </div>

            {/* Nudges */}
            {result.nudges.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Action Items</h3>
                {result.nudges.map((nudge, i) => (
                  <div
                    key={i}
                    className={cn("text-sm px-4 py-3 rounded-lg border", NUDGE_STYLES[nudge.severity] ?? NUDGE_STYLES.info)}
                  >
                    {nudge.message}
                  </div>
                ))}
              </div>
            )}

            {/* Per-School Plans */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">School-by-School Plan</h3>
              {result.plans.map((plan) => {
                const config = STATUS_CONFIG[plan.status] ?? STATUS_CONFIG.on_track;
                const isExpanded = expandedPlan === plan.school_id;

                return (
                  <div key={plan.school_id} className="bg-card border border-border/60 rounded-lg overflow-hidden">
                    {/* Header */}
                    <button
                      onClick={() => setExpandedPlan(isExpanded ? null : plan.school_id)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-medium text-foreground truncate">{plan.school_name}</span>
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1", config.color)}>
                          {config.icon} {config.label}
                        </span>
                        {plan.round && (
                          <span className="text-xs text-muted-foreground">{plan.round}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-xs text-muted-foreground tabular-nums">{plan.days_remaining}d left</span>
                        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${plan.completion_pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{plan.completion_pct}%</span>
                        <ChevronDown size={14} className={cn("text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                      </div>
                    </button>

                    {/* Expanded: Milestones */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 border-t border-border/30">
                            {/* Stats row */}
                            <div className="flex gap-6 py-3 text-xs text-muted-foreground">
                              <span>Deadline: <strong className="text-foreground">{plan.deadline}</strong></span>
                              <span>Essays: <strong className="text-foreground">{plan.essays.done}/{plan.essays.total}</strong></span>
                              <span>Days needed: <strong className="text-foreground">{plan.days_needed}</strong></span>
                              <span>Slack: <strong className={plan.days_slack < 0 ? "text-red-600" : "text-emerald-600"}>{plan.days_slack}d</strong></span>
                            </div>

                            {/* Milestones */}
                            <div className="space-y-2 mt-2">
                              {plan.milestones.map((m, i) => (
                                <div key={i} className="flex items-start gap-3">
                                  <div className="mt-0.5">
                                    {m.done ? (
                                      <CheckCircle2 size={14} className="text-emerald-500" />
                                    ) : m.days_from_now < 0 ? (
                                      <AlertTriangle size={14} className="text-red-500" />
                                    ) : (
                                      <Circle size={14} className="text-muted-foreground/30" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={cn("text-sm", m.done ? "text-muted-foreground line-through" : "text-foreground")}>
                                      {m.task}
                                    </p>
                                  </div>
                                  <span className={cn(
                                    "text-xs tabular-nums shrink-0",
                                    m.days_from_now < 0 ? "text-red-500" : m.days_from_now < 7 ? "text-amber-600" : "text-muted-foreground/50"
                                  )}>
                                    {m.days_from_now < 0 ? `${Math.abs(m.days_from_now)}d overdue` : `${m.days_from_now}d`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
