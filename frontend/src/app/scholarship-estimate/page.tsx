"use client";

import { useState, useMemo } from"react";
import { motion, AnimatePresence } from"framer-motion";
import {
 DollarSign, Plus, X,
 Search, AlertTriangle,
} from"lucide-react";
import Link from"next/link";
import { apiFetch } from"@/lib/api";
import { useSchoolNames } from"@/hooks/useSchoolNames";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import { EmailCapture } from"@/components/EmailCapture";
import { useUsage } from"@/hooks/useUsage";
import { UsageGate } from"@/components/UsageGate";
import { EmptyState } from"@/components/EmptyState";

/* ── Types ─────────────────────────────────────────────────────────── */

type SchoolEstimate = {
 school_id: string;
 school_name: string;
 estimated_award: number;
 probability_pct: number;
 total_tuition: number;
 net_cost: number;
 school_data: {
 avg_award: number;
 pct_receiving: number;
 merit_based: boolean;
 need_based: boolean;
 full_tuition_pct: number;
 };
};

type EstimateResponse = {
 estimates: SchoolEstimate[];
 total_schools: number;
 total_potential_savings: number;
 best_opportunity: {
 school_id: string;
 school_name: string;
 estimated_award: number;
 } | null;
};

const M7_IDS = ["hbs","gsb","wharton","booth","kellogg","cbs","sloan"];
const T15_IDS = [...M7_IDS,"tuck","haas","ross","fuqua","darden","stern","yale_som","anderson"];

function formatUSD(n: number) {
 return "$"+ n.toLocaleString("en-US");
}

function probColor(p: number) {
 if (p >= 60) return "text-emerald-600";
 if (p >= 40) return "text-amber-600";
 return "text-red-600";
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function ScholarshipEstimatePage() {
 const { schools: rawSchools, error: schoolsError } = useSchoolNames();
 const schools = useMemo(
 () => rawSchools.filter((s) => s.name).sort((a, b) => a.name.localeCompare(b.name)),
 [rawSchools],
 );
 const [selected, setSelected] = useState<string[]>([]);
 const [search, setSearch] = useState("");
 const [showPicker, setShowPicker] = useState(false);

 const [gmat, setGmat] = useState(700);
 const [gpa, setGpa] = useState(3.5);
 const [workYears, setWorkYears] = useState(4);
 const [isUrm, setIsUrm] = useState(false);
 const [isInternational, setIsInternational] = useState(false);
 const [financialNeed, setFinancialNeed] = useState(false);

 const [results, setResults] = useState<EstimateResponse | null>(null);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState("");
 const usage = useUsage("scholarship_estimate");
 const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

 const validateInputs = (): boolean => {
 const errors: Record<string, string> = {};
 if (gmat < 200 || gmat > 800) errors.gmat ="GMAT must be 200-800";
 if (gpa < 0 || gpa > 4.0) errors.gpa ="GPA must be 0-4.0";
 if (workYears < 0 || workYears > 30) errors.workYears ="Work years must be 0-30";
 setValidationErrors(errors);
 return Object.keys(errors).length === 0;
 };

 const addSchool = (id: string) => {
 if (!selected.includes(id) && selected.length < 15) {
 setSelected((p) => [...p, id]);
 }
 setSearch("");
 setShowPicker(false);
 };

 const removeSchool = (id: string) => setSelected((p) => p.filter((s) => s !== id));

 const applyPreset = (ids: string[]) => {
 setSelected(ids);
 };

 const estimate = async () => {
 if (!validateInputs()) return;
 setLoading(true);
 setError("");
 try {
 const res = await apiFetch<EstimateResponse>("/api/scholarship-estimate", {
 method:"POST",
 body: JSON.stringify({
 gmat,
 gpa,
 work_years: workYears,
 school_ids: selected,
 is_urm: isUrm,
 is_international: isInternational,
 financial_need: financialNeed,
 }),
 });
 setResults(res);
 usage.recordUse();
 } catch {
 setError("Failed to estimate scholarships. Please try again.");
 } finally {
 setLoading(false);
 }
 };

 const filtered = schools.filter(
 (s) => !selected.includes(s.id) && s.name.toLowerCase().includes(search.toLowerCase()),
 );

 return (
 <main className="min-h-screen bg-background">
 {/* Hero */}
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-3xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Scholarship Estimator
 </h1>
 <p className="text-white/70 text-lg">
 Estimate your scholarship probability and award amount across top MBA programs.
 </p>
 </div>
 </section>

 <div className="max-w-3xl mx-auto px-6 py-10">
 {/* Profile Inputs */}
 <div className="editorial-card p-6 mb-6">
 <h2 className="font-semibold text-foreground mb-4">Your Profile</h2>
 <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
 <div>
 <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">GMAT</label>
 <input
 type="number" min={200} max={800}
 value={gmat}
 onChange={(e) => { setGmat(+e.target.value || 700); setValidationErrors((v) => { const { gmat: _, ...rest } = v; return rest; }); }}
 className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${validationErrors.gmat ?"border-red-400":"border-border/10"}`}
 />
 {validationErrors.gmat ? (
 <span className="text-[10px] text-red-500 mt-0.5 block">{validationErrors.gmat}</span>
 ) : (
 <span className="text-[10px] text-muted-foreground mt-0.5 block">200 - 800</span>
 )}
 </div>
 <div>
 <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">GPA</label>
 <input
 type="number" step="0.1" min={0} max={4.0}
 value={gpa}
 onChange={(e) => { setGpa(+e.target.value || 3.5); setValidationErrors((v) => { const { gpa: _, ...rest } = v; return rest; }); }}
 className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${validationErrors.gpa ?"border-red-400":"border-border/10"}`}
 />
 {validationErrors.gpa ? (
 <span className="text-[10px] text-red-500 mt-0.5 block">{validationErrors.gpa}</span>
 ) : (
 <span className="text-[10px] text-muted-foreground mt-0.5 block">0.0 - 4.0</span>
 )}
 </div>
 <div>
 <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Work Years</label>
 <input
 type="number" min={0} max={30}
 value={workYears}
 onChange={(e) => { setWorkYears(+e.target.value || 0); setValidationErrors((v) => { const { workYears: _, ...rest } = v; return rest; }); }}
 className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${validationErrors.workYears ?"border-red-400":"border-border/10"}`}
 />
 {validationErrors.workYears ? (
 <span className="text-[10px] text-red-500 mt-0.5 block">{validationErrors.workYears}</span>
 ) : (
 <span className="text-[10px] text-muted-foreground mt-0.5 block">0 - 30</span>
 )}
 </div>
 </div>
 <div className="flex flex-wrap gap-4">
 <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
 <input
 type="checkbox"
 checked={isUrm}
 onChange={(e) => setIsUrm(e.target.checked)}
 className="rounded border-border/20 text-primary focus:ring-primary/50"
 />
 Underrepresented Minority
 </label>
 <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
 <input
 type="checkbox"
 checked={isInternational}
 onChange={(e) => setIsInternational(e.target.checked)}
 className="rounded border-border/20 text-primary focus:ring-primary/50"
 />
 International
 </label>
 <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
 <input
 type="checkbox"
 checked={financialNeed}
 onChange={(e) => setFinancialNeed(e.target.checked)}
 className="rounded border-border/20 text-primary focus:ring-primary/50"
 />
 Financial Need
 </label>
 </div>
 </div>

 {/* School Selection */}
 <div className="editorial-card p-6 mb-6">
 {schoolsError && <p className="text-red-500 text-xs mb-2">{schoolsError}</p>}
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
 onClick={() => applyPreset(M7_IDS)}
 className="text-xs px-3 py-1 border border-primary/30 text-primary rounded-full hover:bg-primary/5 transition-colors"
 >
 M7
 </button>
 <button
 onClick={() => applyPreset(T15_IDS)}
 className="text-xs px-3 py-1 border border-primary/30 text-primary rounded-full hover:bg-primary/5 transition-colors"
 >
 T15
 </button>
 {selected.length > 0 && (
 <button
 onClick={() => setSelected([])}
 className="text-xs px-3 py-1 border border-border/10 text-muted-foreground rounded-full hover:bg-foreground/5 transition-colors"
 >
 Clear
 </button>
 )}
 </div>

 {showPicker && (
 <div className="mb-4">
 <div className="relative">
 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
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
 {schools.length === 0 ? (
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

 <div className="flex flex-wrap gap-2">
 {selected.map((id) => {
 const s = schools.find((x) => x.id === id);
 return (
 <span
 key={id}
 className="inline-flex items-center gap-1 px-3 py-1.5 bg-foreground text-white text-sm rounded-full"
 >
 {s?.name || id}
 <button onClick={() => removeSchool(id)} aria-label={`Remove ${s?.name || id}`} className="hover:text-red-300 transition-colors">
 <X size={12} />
 </button>
 </span>
 );
 })}
 {selected.length === 0 && (
 <p className="text-sm text-muted-foreground">No schools selected - defaults to M7</p>
 )}
 </div>
 </div>

 {/* Estimate Button */}
 <button
 onClick={estimate}
 disabled={loading || selected.length === 0}
 aria-busy={loading}
 className="w-full py-3 bg-primary text-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all mb-8 flex items-center justify-center gap-2"
 >
 {loading ? (
 <>
 <motion.div
 animate={{ rotate: 360 }}
 transition={{ repeat: Infinity, duration: 1, ease:"linear"}}
 >
 <DollarSign size={18} />
 </motion.div>
 Estimating scholarships...
 </>
 ) : (
 <>
 <DollarSign size={18} />
 Estimate Scholarships
 </>
 )}
 </button>

 {error && (
 <div className="editorial-card p-4 mb-6 border-red-200 bg-red-50 flex items-start gap-3" role="alert">
 <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5"/>
 <div>
 <p className="text-sm font-medium text-red-700">{error}</p>
 <button
 onClick={() => setError("")}
 className="text-xs text-red-500 hover:text-red-700 mt-1 underline"
 >
 Dismiss
 </button>
 </div>
 </div>
 )}

 {/* Summary */}
 <UsageGate feature="scholarship_estimate">
 {results && results.estimates.length > 0 && (
 <motion.div
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 className="editorial-card p-6 mb-8"
 >
 <h2 className="font-semibold text-foreground mb-4">Summary</h2>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="bg-primary/5 rounded-lg p-4">
 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
 Total Potential Savings
 </p>
 <p className="text-3xl font-bold text-primary">
 {formatUSD(results.total_potential_savings)}
 </p>
 <p className="text-xs text-muted-foreground mt-1">across {results.total_schools} schools</p>
 </div>
 {results.best_opportunity && (
 <div className="bg-emerald-50 rounded-lg p-4">
 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
 Best Opportunity
 </p>
 <p className="text-lg font-semibold text-foreground">
 {results.best_opportunity.school_name}
 </p>
 <p className="text-2xl font-bold text-emerald-600">
 {formatUSD(results.best_opportunity.estimated_award)}
 </p>
 </div>
 )}
 </div>
 </motion.div>
 )}

 {/* Per-school Results */}
 <div className="space-y-4">
 <AnimatePresence>
 {results?.estimates.map((r, i) => (
 <motion.div
 key={r.school_id}
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i * 0.05 }}
 className="editorial-card overflow-hidden"
 >
 <div className="p-6">
 <div className="flex items-center justify-between mb-3">
 <Link
 href={`/school/${r.school_id}`}
 className="font-semibold text-foreground hover:text-primary transition-colors"
 >
 {r.school_name}
 </Link>
 <span className="text-3xl font-bold text-primary">
 {formatUSD(r.estimated_award)}
 </span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
 <div>
 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
 Probability
 </p>
 <p className={`text-xl font-bold ${probColor(r.probability_pct ?? 0)}`}>
 {r.probability_pct != null ? `${r.probability_pct}%` :"\u2014"}
 </p>
 </div>
 <div>
 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
 Total Tuition
 </p>
 <p className="text-lg font-semibold text-muted-foreground">
 {r.total_tuition != null ? formatUSD(r.total_tuition) :"\u2014"}
 </p>
 </div>
 <div>
 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
 Net Cost
 </p>
 <p className="text-lg font-semibold text-foreground">
 {r.net_cost != null ? formatUSD(r.net_cost) :"\u2014"}
 </p>
 </div>
 </div>

 {/* Award context bar */}
 <div className="mb-3">
 <div className="flex flex-wrap justify-between text-[10px] text-muted-foreground mb-1 gap-1">
 <span>Estimated vs. Avg Award ({r.school_data?.avg_award != null ? formatUSD(r.school_data.avg_award) :"\u2014"})</span>
 <span>{r.total_tuition ? Math.round((r.estimated_award / r.total_tuition) * 100) : 0}% of tuition</span>
 </div>
 <div className="w-full bg-foreground/5 rounded-full h-2 overflow-hidden">
 <motion.div
 className="h-full rounded-full bg-primary"
 initial={{ width: 0 }}
 animate={{ width: `${r.total_tuition ? Math.min((r.estimated_award / r.total_tuition) * 100, 100) : 0}%` }}
 transition={{ duration: 0.6, delay: i * 0.05 }}
 />
 </div>
 </div>

 {/* Tags */}
 <div className="flex flex-wrap gap-1.5">
 {r.school_data?.merit_based && (
 <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
 Merit-based
 </span>
 )}
 {r.school_data?.need_based && (
 <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full">
 Need-based
 </span>
 )}
 <span className="text-[10px] px-2 py-0.5 bg-foreground/5 text-muted-foreground rounded-full">
 {r.school_data?.pct_receiving ??"\u2014"}% receive aid
 </span>
 <span className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full">
 {r.school_data?.full_tuition_pct ??"\u2014"}% get full tuition
 </span>
 </div>
 </div>
 </motion.div>
 ))}
 </AnimatePresence>
 </div>

 </UsageGate>

 {!results && !loading && (
 <EmptyState
 icon={DollarSign}
 title="No scholarship estimates yet"
 description="Fill in your profile, select target schools, and estimate your scholarship potential."
 />
 )}

 <EmailCapture variant="contextual"source="scholarship-estimate"/>
 <ToolCrossLinks current="/scholarship-estimate"/>
 </div>
 </main>
 );
}
