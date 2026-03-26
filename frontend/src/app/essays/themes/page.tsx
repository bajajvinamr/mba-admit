"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, Plus, Trash2, AlertTriangle, CheckCircle2,
  Lightbulb, FileText, Grid3X3, Search,
} from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { ToolCrossLinks } from "@/components/ToolCrossLinks";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

/* ── Types ─────────────────────────────────────────────────────────── */

type EssayInput = { school: string; prompt: string; content: string };

type ThemeOverlap = {
  theme: string;
  schools: string[];
  suggestion: string;
};

type ThemeGap = {
  theme: string;
  description: string;
};

type AnalysisResult = {
  matrix: Record<string, Record<string, { evidence: string }>>;
  overlaps: ThemeOverlap[];
  gaps: ThemeGap[];
};

const EMPTY_ESSAY: EssayInput = { school: "", prompt: "", content: "" };

const THEME_COLORS: Record<string, string> = {
  Leadership: "bg-amber-500",
  "Innovation & Entrepreneurship": "bg-violet-500",
  "Social Impact": "bg-emerald-500",
  "Global Perspective": "bg-sky-500",
  "Analytical Rigor": "bg-indigo-500",
  "Personal Growth & Resilience": "bg-rose-500",
  "Collaboration & Teamwork": "bg-teal-500",
  "Vision & Ambition": "bg-primary",
  "Diversity & Inclusion": "bg-pink-500",
  "Ethical Decision-Making": "bg-orange-500",
};

function getThemeColor(theme: string): string {
  return THEME_COLORS[theme] || "bg-foreground/30";
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function EssayThemesPage() {
  const [essays, setEssays] = useState<EssayInput[]>([{ ...EMPTY_ESSAY }]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAdd = essays.length < 8;
  const canAnalyze = essays.some((e) => e.content.trim().split(/\s+/).length >= 100);

  function updateEssay(idx: number, field: keyof EssayInput, value: string) {
    setEssays((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));
  }

  function addEssay() {
    if (canAdd) setEssays((prev) => [...prev, { ...EMPTY_ESSAY }]);
  }

  function removeEssay(idx: number) {
    if (essays.length > 1) setEssays((prev) => prev.filter((_, i) => i !== idx));
  }

  async function analyze() {
    setLoading(true);
    setError(null);
    try {
      const payload = essays
        .filter((e) => e.content.trim().split(/\s+/).length >= 100)
        .map((e) => ({
          school: e.school || `School ${essays.indexOf(e) + 1}`,
          prompt: e.prompt,
          content: e.content,
        }));

      const res = await apiFetch<AnalysisResult>("/api/essays/analyze-themes", {
        method: "POST",
        body: JSON.stringify({ essays: payload }),
        timeoutMs: 60_000,
      });
      setResult(res);
    } catch {
      setError("Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const themes = result ? Object.keys(result.matrix) : [];
  const schools = result
    ? Array.from(new Set(themes.flatMap((t) => Object.keys(result.matrix[t]))))
    : [];

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6">
        <Breadcrumb items={[
          { label: "Essays", href: "/essays/examples" },
          { label: "Themes" },
        ]} />
      </div>
      {/* Hero */}
      <section className="bg-foreground text-white py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
            Cross-Essay Theme Tracker
          </h1>
          <p className="text-white/70 text-lg">
            Analyze themes across all your MBA essays. Spot overlaps, find gaps, and
            diversify your narrative portfolio.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Essay Inputs */}
        <div className="space-y-6 mb-8">
          {essays.map((essay, idx) => (
            <div key={idx} className="editorial-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <FileText size={16} />
                  Essay {idx + 1}
                </h3>
                {essays.length > 1 && (
                  <button
                    onClick={() => removeEssay(idx)}
                    className="text-muted-foreground hover:text-red-500 transition-colors"
                    aria-label="Remove essay"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-2 mb-3">
                <input
                  type="text"
                  placeholder="School name (e.g. HBS, Wharton)"
                  value={essay.school}
                  onChange={(e) => updateEssay(idx, "school", e.target.value)}
                  className="w-full px-4 py-2 border border-border/10 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 bg-card placeholder:text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder="Essay prompt (optional)"
                  value={essay.prompt}
                  onChange={(e) => updateEssay(idx, "prompt", e.target.value)}
                  className="w-full px-4 py-2 border border-border/10 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 bg-card placeholder:text-muted-foreground"
                />
              </div>
              <textarea
                placeholder="Paste your essay text here (minimum 100 words)..."
                value={essay.content}
                onChange={(e) => updateEssay(idx, "content", e.target.value)}
                className="w-full min-h-[180px] p-4 text-foreground text-[15px] leading-relaxed bg-card border border-border/10 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
              />
              {essay.content.trim() && (
                <p className="text-xs text-muted-foreground mt-2">
                  {essay.content.trim().split(/\s+/).length} words
                  {essay.content.trim().split(/\s+/).length < 100 && (
                    <span className="text-amber-500 ml-2">(need at least 100)</span>
                  )}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Add / Analyze buttons */}
        <div className="flex items-center gap-3 mb-10">
          {canAdd && (
            <button
              onClick={addEssay}
              className="flex items-center gap-2 px-4 py-2.5 border border-border/10 rounded-lg text-sm font-medium text-muted-foreground hover:border-border/30 transition-colors bg-card"
            >
              <Plus size={16} /> Add School Essay
            </button>
          )}
          <button
            onClick={analyze}
            disabled={!canAnalyze || loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Sparkles size={16} />
            {loading ? "Analyzing..." : "Analyze Themes"}
          </button>
        </div>

        {error && (
          <div className="editorial-card p-4 mb-8 border-red-200 bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* ── Results ─────────────────────────────────────────────────── */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Theme x School Matrix */}
            <div className="editorial-card p-6">
              <h2 className="heading-serif text-2xl mb-6 font-[family-name:var(--font-heading)] text-foreground flex items-center gap-2">
                <Grid3X3 size={22} className="text-primary" />
                Theme x School Matrix
              </h2>
              {themes.length > 0 && schools.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Theme</th>
                        {schools.map((s) => (
                          <th key={s} className="text-center py-2 px-3 text-muted-foreground font-medium min-w-[100px]">
                            {s}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {themes.map((theme) => {
                        const schoolCount = Object.keys(result.matrix[theme]).length;
                        return (
                          <tr key={theme} className="border-t border-border/5">
                            <td className="py-3 pr-4 font-medium text-foreground">
                              <span className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${getThemeColor(theme)}`} />
                                {theme}
                              </span>
                            </td>
                            {schools.map((school) => {
                              const cell = result.matrix[theme]?.[school];
                              const intensity = cell
                                ? schoolCount >= 3
                                  ? "bg-amber-100 dark:bg-amber-900/30"
                                  : "bg-emerald-100 dark:bg-emerald-900/30"
                                : "";
                              return (
                                <td key={school} className={`py-3 px-3 text-center ${intensity} rounded`}>
                                  {cell ? (
                                    <span
                                      className="text-xs text-muted-foreground cursor-help"
                                      title={cell.evidence}
                                    >
                                      {cell.evidence.length > 60
                                        ? cell.evidence.slice(0, 60) + "..."
                                        : cell.evidence}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">--</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No themes detected.</p>
              )}
            </div>

            {/* Overlap Warnings */}
            {result.overlaps.length > 0 && (
              <div className="space-y-4">
                <h2 className="heading-serif text-2xl font-[family-name:var(--font-heading)] text-foreground flex items-center gap-2">
                  <AlertTriangle size={22} className="text-amber-500" />
                  Overlap Warnings
                </h2>
                {result.overlaps.map((overlap, idx) => (
                  <motion.div
                    key={idx}
                    className="editorial-card p-5 border-l-4 border-amber-400"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getThemeColor(overlap.theme)} text-white`}>
                        {overlap.theme}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        appears in {overlap.schools.length} essays
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Schools: {overlap.schools.join(", ")}
                    </p>
                    <p className="text-sm text-muted-foreground italic">
                      {overlap.suggestion}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Gap Analysis */}
            {result.gaps.length > 0 && (
              <div className="editorial-card p-6">
                <h2 className="heading-serif text-xl mb-4 font-[family-name:var(--font-heading)] text-foreground flex items-center gap-2">
                  <Lightbulb size={20} className="text-primary" />
                  Gap Analysis
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  None of your essays cover these important themes. Consider weaving them in:
                </p>
                <div className="space-y-3">
                  {result.gaps.map((gap) => (
                    <div
                      key={gap.theme}
                      className="flex items-start gap-3 p-3 bg-foreground/[0.02] rounded-lg"
                    >
                      <Search size={16} className="text-primary mt-0.5 shrink-0" />
                      <div>
                        <span className="text-sm font-semibold text-foreground">{gap.theme}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">{gap.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Overlaps / No Gaps */}
            {result.overlaps.length === 0 && result.gaps.length === 0 && (
              <div className="editorial-card p-6 border-l-4 border-emerald-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-emerald-500" />
                  <p className="text-sm font-medium text-foreground">
                    Excellent! Your essays show good thematic diversity with no major overlaps or gaps.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}

        <ToolCrossLinks current="/essays/themes" />
      </div>
    </main>
  );
}
