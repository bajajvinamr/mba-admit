"use client";

import { useState } from"react";
import { motion } from"framer-motion";
import {
 Sparkles, Plus, Trash2, AlertTriangle, CheckCircle2,
 Lightbulb, FileText,
} from"lucide-react";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import { EmailCapture } from"@/components/EmailCapture";

/* ── Types ─────────────────────────────────────────────────────────── */

type EssayInput = { title: string; content: string };

type PerEssayResult = {
 title: string;
 themes: Record<string, number>;
 dominant: string;
 word_count: number;
};

type AnalysisResult = {
 per_essay: PerEssayResult[];
 overall: Record<string, number>;
 dominant_themes: string[];
 gaps: string[];
 tips: string[];
};

const EMPTY_ESSAY: EssayInput = { title:"", content:""};

const THEME_COLORS: Record<string, string> = {
 Leadership:"bg-amber-500",
 Innovation:"bg-violet-500",
 Impact:"bg-emerald-500",
 Global:"bg-sky-500",
 Analytical:"bg-indigo-500",
 Growth:"bg-rose-500",
 Collaboration:"bg-teal-500",
 Vision:"bg-primary",
};

/* ── Page ──────────────────────────────────────────────────────────── */

export default function EssayThemesPage() {
 const [essays, setEssays] = useState<EssayInput[]>([{ ...EMPTY_ESSAY }]);
 const [result, setResult] = useState<AnalysisResult | null>(null);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const canAdd = essays.length < 4;
 const canAnalyze = essays.some((e) => e.content.trim().length > 0);

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
 .filter((e) => e.content.trim())
 .map((e) => ({ title: e.title || `Essay ${essays.indexOf(e) + 1}`, content: e.content }));
 const res = await apiFetch<AnalysisResult>("/api/essay/analyze-themes", {
 method:"POST",
 body: JSON.stringify({ essays: payload }),
 headers: {"Content-Type":"application/json"},
 });
 setResult(res);
 } catch {
 setError("Analysis failed - please try again.");
 } finally {
 setLoading(false);
 }
 }

 const sortedOverall = result
 ? Object.entries(result.overall).sort((a, b) => b[1] - a[1])
 : [];

 return (
 <main className="min-h-screen bg-background">
 {/* Hero */}
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-3xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Essay Theme Analyzer
 </h1>
 <p className="text-white/70 text-lg">
 Identify dominant themes, gaps, and balance across your MBA essays.
 </p>
 </div>
 </section>

 <div className="max-w-4xl mx-auto px-6 py-10">
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
 <input
 type="text"
 placeholder="Essay title (optional)"
 value={essay.title}
 onChange={(e) => updateEssay(idx,"title", e.target.value)}
 className="w-full px-4 py-2 mb-3 border border-border/10 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 bg-card placeholder:text-muted-foreground"
 />
 <textarea
 placeholder="Paste your essay text here..."
 value={essay.content}
 onChange={(e) => updateEssay(idx,"content", e.target.value)}
 className="w-full min-h-[180px] p-4 text-foreground text-[15px] leading-relaxed bg-card border border-border/10 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
 />
 {essay.content.trim() && (
 <p className="text-xs text-muted-foreground mt-2">
 {essay.content.trim().split(/\s+/).length} words
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
 <Plus size={16} /> Add Essay
 </button>
 )}
 <button
 onClick={analyze}
 disabled={!canAnalyze || loading}
 className="flex items-center gap-2 px-6 py-2.5 bg-primary text-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
 >
 <Sparkles size={16} />
 {loading ?"Analyzing...":"Analyze Themes"}
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
 {/* Overall Distribution */}
 <div className="editorial-card p-6">
 <h2 className="heading-serif text-2xl mb-6 font-[family-name:var(--font-heading)] text-foreground">
 Overall Theme Distribution
 </h2>
 <div className="space-y-3">
 {sortedOverall.map(([theme, pct]) => {
 const isDominant = result.dominant_themes.includes(theme);
 const isGap = result.gaps.includes(theme);
 return (
 <div key={theme}>
 <div className="flex items-center justify-between mb-1">
 <span
 className={`text-sm font-medium ${
 isDominant ?"text-primary": isGap ?"text-red-400":"text-muted-foreground"
 }`}
 >
 {theme}
 {isDominant && (
 <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
 Dominant
 </span>
 )}
 {isGap && (
 <span className="ml-2 text-xs bg-red-100 text-red-500 px-2 py-0.5 rounded-full">
 Gap
 </span>
 )}
 </span>
 <span className="text-sm font-semibold text-foreground">{pct}%</span>
 </div>
 <div className="w-full bg-foreground/5 rounded-full h-2.5 overflow-hidden">
 <motion.div
 className={`h-full rounded-full ${THEME_COLORS[theme] ||"bg-foreground/30"}`}
 initial={{ width: 0 }}
 animate={{ width: `${Math.max(pct, 1)}%` }}
 transition={{ duration: 0.5, delay: 0.1 }}
 />
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Per-Essay Breakdown */}
 <div>
 <h2 className="heading-serif text-2xl mb-4 font-[family-name:var(--font-heading)] text-foreground">
 Per-Essay Breakdown
 </h2>
 <div className="grid gap-4 md:grid-cols-2">
 {result.per_essay.map((essay, idx) => {
 const sorted = Object.entries(essay.themes).sort((a, b) => b[1] - a[1]);
 return (
 <motion.div
 key={idx}
 className="editorial-card p-5"
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: idx * 0.1 }}
 >
 <div className="flex items-start justify-between mb-3">
 <h3 className="text-sm font-semibold text-foreground">{essay.title}</h3>
 <span className="text-xs text-muted-foreground">{essay.word_count} words</span>
 </div>
 <p className="text-xs text-muted-foreground mb-3">
 Dominant:{""}
 <span className="font-semibold text-primary">{essay.dominant}</span>
 </p>
 <div className="space-y-2">
 {sorted.slice(0, 5).map(([theme, pct]) => (
 <div key={theme} className="flex items-center gap-2">
 <span className="text-xs text-muted-foreground w-24 shrink-0">{theme}</span>
 <div className="flex-1 bg-foreground/5 rounded-full h-1.5 overflow-hidden">
 <div
 className={`h-full rounded-full ${THEME_COLORS[theme] ||"bg-foreground/30"}`}
 style={{ width: `${Math.max(pct, 1)}%` }}
 />
 </div>
 <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
 </div>
 ))}
 </div>
 </motion.div>
 );
 })}
 </div>
 </div>

 {/* Gaps */}
 {result.gaps.length > 0 && (
 <div className="editorial-card p-6 border-l-4 border-amber-400">
 <h2 className="heading-serif text-xl mb-3 font-[family-name:var(--font-heading)] text-foreground flex items-center gap-2">
 <AlertTriangle size={20} className="text-amber-500"/>
 Thematic Gaps
 </h2>
 <p className="text-sm text-muted-foreground mb-3">
 These themes have little or no representation across your essays:
 </p>
 <div className="flex flex-wrap gap-2">
 {result.gaps.map((gap) => (
 <span
 key={gap}
 className="px-3 py-1.5 bg-amber-50 text-amber-700 text-sm font-medium rounded-lg border border-amber-200"
 >
 {gap}
 </span>
 ))}
 </div>
 </div>
 )}

 {/* Tips */}
 {result.tips.length > 0 && (
 <div className="editorial-card p-6">
 <h2 className="heading-serif text-xl mb-4 font-[family-name:var(--font-heading)] text-foreground flex items-center gap-2">
 <Lightbulb size={20} className="text-primary"/>
 Tips
 </h2>
 <ul className="space-y-2">
 {result.tips.map((tip, idx) => (
 <li
 key={idx}
 className="flex items-start gap-2 text-sm text-muted-foreground"
 >
 <CheckCircle2 size={16} className="text-primary mt-0.5 shrink-0"/>
 {tip}
 </li>
 ))}
 </ul>
 </div>
 )}
 </motion.div>
 )}

 <EmailCapture variant="contextual"source="essay-themes"/>
 <ToolCrossLinks current="/essay-themes"/>
 </div>
 </main>
 );
}
