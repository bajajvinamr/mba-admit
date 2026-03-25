"use client";

import { useState, useMemo } from"react";
import { motion, AnimatePresence } from"framer-motion";
import {
 GraduationCap, Briefcase, Users, Heart, Globe,
 Gauge, Lightbulb, ArrowRight, ChevronDown,
} from"lucide-react";
import { apiFetch } from"@/lib/api";
import { useSchoolNames } from"@/hooks/useSchoolNames";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import { EmailCapture } from"@/components/EmailCapture";
import { useUsage } from"@/hooks/useUsage";
import { UsageGate } from"@/components/UsageGate";

/* ── Types ─────────────────────────────────────────────────────────── */

type Dimension = {
 name: string;
 score: number;
 max: number;
 tips: string[];
};

type SchoolComparison = {
 school_id: string;
 school_name: string;
 gmat_avg?: number;
 gmat_diff?: number;
 gmat_assessment?: string;
 gpa_avg?: number;
 gpa_diff?: number;
 gpa_assessment?: string;
};

type StrengthResult = {
 dimensions: Dimension[];
 overall_score: number;
 overall_label: string;
 school_comparison?: SchoolComparison;
};

const DIMENSION_META: Record<string, { icon: React.ReactNode; color: string }> = {
 Academics: { icon: <GraduationCap size={14} />, color:"bg-blue-500"},
 Professional: { icon: <Briefcase size={14} />, color:"bg-emerald-500"},
 Leadership: { icon: <Users size={14} />, color:"bg-purple-500"},
 Extracurriculars: { icon: <Heart size={14} />, color:"bg-amber-500"},
 Diversity: { icon: <Globe size={14} />, color:"bg-rose-500"},
};

function overallColor(s: number) {
 if (s >= 75) return "text-emerald-600";
 if (s >= 50) return "text-amber-600";
 return "text-red-600";
}

function overallBg(s: number) {
 if (s >= 75) return "bg-emerald-50 border-emerald-200";
 if (s >= 50) return "bg-amber-50 border-amber-200";
 return "bg-red-50 border-red-200";
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function StrengthMeterPage() {
 const { schools: rawSchools, error: schoolsError } = useSchoolNames();
 const schools = useMemo(
 () => rawSchools.filter((s) => s.name).sort((a, b) => a.name.localeCompare(b.name)),
 [rawSchools],
 );

 const [gmat, setGmat] = useState<number | undefined>();
 const [gpa, setGpa] = useState<number | undefined>();
 const [workYears, setWorkYears] = useState<number | undefined>();
 const [leadershipExamples, setLeadershipExamples] = useState<number | undefined>();
 const [extracurriculars, setExtracurriculars] = useState<number | undefined>();
 const [internationalExp, setInternationalExp] = useState(false);
 const [targetSchool, setTargetSchool] = useState("");

 const [result, setResult] = useState<StrengthResult | null>(null);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState("");
 const usage = useUsage("strength_finder");

 const calculate = async () => {
 setLoading(true);
 setError("");
 try {
 const body: Record<string, unknown> = {};
 if (gmat !== undefined) body.gmat = gmat;
 if (gpa !== undefined) body.gpa = gpa;
 if (workYears !== undefined) body.work_years = workYears;
 body.leadership_examples = leadershipExamples ?? 0;
 body.extracurriculars = extracurriculars ?? 0;
 body.international_exp = internationalExp;
 if (targetSchool) body.target_school_id = targetSchool;

 const res = await apiFetch<StrengthResult>("/api/application-strength", {
 method:"POST",
 body: JSON.stringify(body),
 });
 setResult(res);
 usage.recordUse();
 } catch {
 setError("Failed to calculate application strength. Please try again.");
 } finally {
 setLoading(false);
 }
 };

 return (
 <main className="min-h-screen bg-background">
 {/* Hero */}
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-3xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Application Strength Meter
 </h1>
 <p className="text-white/70 text-lg">
 Assess your MBA application across 5 key dimensions and get actionable tips.
 </p>
 </div>
 </section>

 <div className="max-w-3xl mx-auto px-6 py-10">
 {/* Form */}
 <div className="editorial-card p-6 mb-6">
 <h2 className="font-semibold text-foreground mb-4">Your Profile</h2>
 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
 <div>
 <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">GMAT</label>
 <input
 type="number"
 placeholder="740"
 value={gmat ??""}
 onChange={(e) => setGmat(e.target.value ? +e.target.value : undefined)}
 className="w-full px-3 py-2 border border-border/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
 />
 </div>
 <div>
 <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">GPA</label>
 <input
 type="number"
 step="0.1"
 placeholder="3.7"
 value={gpa ??""}
 onChange={(e) => setGpa(e.target.value ? +e.target.value : undefined)}
 className="w-full px-3 py-2 border border-border/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
 />
 </div>
 <div>
 <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Work Years</label>
 <input
 type="number"
 placeholder="4"
 value={workYears ??""}
 onChange={(e) => setWorkYears(e.target.value ? +e.target.value : undefined)}
 className="w-full px-3 py-2 border border-border/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
 />
 </div>
 <div>
 <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Leadership Examples</label>
 <input
 type="number"
 placeholder="3"
 value={leadershipExamples ??""}
 onChange={(e) => setLeadershipExamples(e.target.value ? +e.target.value : undefined)}
 className="w-full px-3 py-2 border border-border/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
 />
 </div>
 <div>
 <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Extracurriculars</label>
 <input
 type="number"
 placeholder="2"
 value={extracurriculars ??""}
 onChange={(e) => setExtracurriculars(e.target.value ? +e.target.value : undefined)}
 className="w-full px-3 py-2 border border-border/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
 />
 </div>
 <div className="flex items-end">
 <label className="flex items-center gap-2 cursor-pointer py-2">
 <input
 type="checkbox"
 checked={internationalExp}
 onChange={(e) => setInternationalExp(e.target.checked)}
 className="w-4 h-4 rounded border-border/20 text-primary focus:ring-primary/50"
 />
 <span className="text-sm text-muted-foreground">International experience</span>
 </label>
 </div>
 </div>
 </div>

 {/* School Selector */}
 <div className="editorial-card p-6 mb-6">
 <h2 className="font-semibold text-foreground mb-3">Target School (optional)</h2>
 {schoolsError && <p className="text-red-500 text-xs mb-2">{schoolsError}</p>}
 <div className="relative">
 <select
 value={targetSchool}
 onChange={(e) => setTargetSchool(e.target.value)}
 className="w-full px-3 py-2 border border-border/10 rounded text-sm appearance-none bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 pr-8"
 >
 <option value="">No school selected</option>
 {schools.map((s) => (
 <option key={s.id} value={s.id}>
 {s.name}
 </option>
 ))}
 </select>
 <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
 </div>
 </div>

 {/* Submit */}
 <button
 onClick={calculate}
 disabled={loading}
 className="w-full py-3 bg-primary text-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-40 transition-all mb-8"
 >
 {loading ?"Analyzing...":"Analyze Application Strength"}
 </button>

 {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

 {/* Results */}
 <UsageGate feature="strength_finder">
 {result && (
 <AnimatePresence>
 <motion.div
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 className="space-y-6"
 >
 {/* Overall Score */}
 <div className={`editorial-card p-8 text-center border ${overallBg(result.overall_score)}`}>
 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Overall Score</p>
 <p className={`text-6xl font-bold ${overallColor(result.overall_score)} font-[family-name:var(--font-heading)]`}>
 {result.overall_score}
 </p>
 <p className="text-lg font-semibold text-muted-foreground mt-1">{result.overall_label}</p>
 </div>

 {/* Dimension Bars */}
 <div className="editorial-card p-6">
 <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
 <Gauge size={16} /> Dimension Breakdown
 </h3>
 <div className="space-y-4">
 {result.dimensions.map((dim, i) => {
 const meta = DIMENSION_META[dim.name] || { icon: null, color:"bg-gray-400"};
 const pct = (dim.score / dim.max) * 100;
 return (
 <div key={dim.name}>
 <div className="flex items-center gap-2 mb-1">
 <div className="flex items-center gap-1 w-36 text-xs text-muted-foreground">
 {meta.icon} {dim.name}
 </div>
 <div className="flex-1 bg-foreground/5 rounded-full h-3 overflow-hidden">
 <motion.div
 className={`h-full rounded-full ${meta.color}`}
 initial={{ width: 0 }}
 animate={{ width: `${pct}%` }}
 transition={{ duration: 0.6, delay: i * 0.08 }}
 />
 </div>
 <span className="text-xs font-medium text-muted-foreground w-12 text-right">
 {dim.score}/{dim.max}
 </span>
 </div>
 {dim.tips.length > 0 && (
 <div className="ml-[152px] mt-1 space-y-0.5">
 {dim.tips.map((tip, j) => (
 <p key={j} className="text-[11px] text-muted-foreground flex items-start gap-1">
 <Lightbulb size={10} className="mt-0.5 shrink-0 text-primary"/>
 {tip}
 </p>
 ))}
 </div>
 )}
 </div>
 );
 })}
 </div>
 </div>

 {/* School Comparison */}
 {result.school_comparison && (
 <div className="editorial-card p-6">
 <h3 className="font-semibold text-foreground mb-4">
 vs. {result.school_comparison.school_name}
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {result.school_comparison.gmat_avg != null && (
 <div className="bg-foreground/[0.02] rounded-lg p-4">
 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">GMAT</p>
 <p className="text-sm text-muted-foreground">
 School avg: <span className="font-semibold text-foreground">{result.school_comparison.gmat_avg}</span>
 </p>
 {result.school_comparison.gmat_diff != null && (
 <p className={`text-sm font-medium mt-1 ${
 result.school_comparison.gmat_diff >= 0 ?"text-emerald-600":"text-red-600"
 }`}>
 {result.school_comparison.gmat_diff >= 0 ?"+":""}
 {result.school_comparison.gmat_diff} &mdash; {result.school_comparison.gmat_assessment}
 </p>
 )}
 </div>
 )}
 {result.school_comparison.gpa_avg != null && (
 <div className="bg-foreground/[0.02] rounded-lg p-4">
 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">GPA</p>
 <p className="text-sm text-muted-foreground">
 School avg: <span className="font-semibold text-foreground">{result.school_comparison.gpa_avg}</span>
 </p>
 {result.school_comparison.gpa_diff != null && (
 <p className={`text-sm font-medium mt-1 ${
 result.school_comparison.gpa_diff >= 0 ?"text-emerald-600":"text-red-600"
 }`}>
 {result.school_comparison.gpa_diff >= 0 ?"+":""}
 {result.school_comparison.gpa_diff} &mdash; {result.school_comparison.gpa_assessment}
 </p>
 )}
 </div>
 )}
 </div>
 </div>
 )}
 </motion.div>
 </AnimatePresence>
 )}

 </UsageGate>

 {/* Empty state */}
 {!result && !loading && (
 <div className="text-center py-16 text-muted-foreground">
 <Gauge size={48} className="mx-auto mb-4 opacity-30"/>
 <p>Enter your profile details and hit Analyze</p>
 </div>
 )}

 <EmailCapture variant="contextual"source="strength"/>
 <ToolCrossLinks current="/strength"/>
 </div>
 </main>
 );
}
