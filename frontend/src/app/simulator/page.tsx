"use client";

import { useState, useEffect } from"react";
import { motion, AnimatePresence } from"framer-motion";
import {
 Dices, Plus, X, Search, FileText,
 TrendingUp, AlertTriangle, Target,
} from"lucide-react";
import Link from"next/link";
import { apiFetch } from"@/lib/api";
import { track } from"@/lib/analytics";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import { useUsage } from"@/hooks/useUsage";
import { UsageGate } from"@/components/UsageGate";
import { EmptyState } from"@/components/EmptyState";

/* ── Types ─────────────────────────────────────────────────────────── */

type SimResultRaw = {
 school_id: string;
 school_name: string;
 admit_probability: number;
 outcome: string;
 outcome_label: string;
 simulations_run: number;
 percentiles: { p10: number; p25: number; p50: number; p75: number; p90: number };
 factors: { gmat_strength: number; gpa_strength: number; profile_strength: number };
 school_stats: { gmat_avg: number; acceptance_rate: number };
};

type SimResult = {
 school_id: string;
 school_name: string;
 probability_pct: number;
 confidence_interval: [number, number];
 verdict:"Reach"|"Target"|"Safety";
 simulations: { accepted: number; rejected: number };
 ml_probability_pct?: number | null;
};

type SimResponse = { results: SimResultRaw[] };

function mapResult(r: SimResultRaw): SimResult {
 const verdict: SimResult["verdict"] =
   r.outcome === "likely" ? "Safety"
   : r.outcome === "competitive" ? "Target"
   : "Reach";
 const n = r.simulations_run || 10000;
 const accepted = Math.round(n * r.admit_probability / 100);
 return {
   school_id: r.school_id,
   school_name: r.school_name,
   probability_pct: r.admit_probability,
   confidence_interval: [
     Math.max(0, Math.round(r.percentiles.p25 * 100)),
     Math.min(100, Math.round(r.percentiles.p75 * 100)),
   ],
   verdict,
   simulations: { accepted, rejected: n - accepted },
 };
}

type School = { id: string; name: string };

/* ── Presets ───────────────────────────────────────────────────────── */

const M7 = ["hbs","gsb","wharton","booth","kellogg","cbs","sloan"];
const T15 = [...M7,"tuck","haas","ross","fuqua","darden","stern","yale-som","johnson"];

/* ── Helpers ──────────────────────────────────────────────────────── */

function probColor(p: number) {
 if (p >= 60) return "text-emerald-600";
 if (p >= 30) return "text-amber-600";
 return "text-red-600";
}

function probBg(p: number) {
 if (p >= 60) return "bg-emerald-500";
 if (p >= 30) return "bg-amber-500";
 return "bg-red-500";
}

function verdictStyle(v: string) {
 if (v ==="Safety") return "bg-emerald-100 text-emerald-700";
 if (v ==="Target") return "bg-amber-100 text-amber-700";
 return "bg-red-100 text-red-700";
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function SimulatorPage() {
 const usage = useUsage("odds_calculator");

 /* School list */
 const [schools, setSchools] = useState<School[]>([]);
 const [selected, setSelected] = useState<string[]>([]);
 const [search, setSearch] = useState("");
 const [showPicker, setShowPicker] = useState(false);

 /* Profile inputs */
 const [gmatVersion, setGmatVersion] = useState<"focus" | "classic">("focus");
 const [gmat, setGmat] = useState(655); // GMAT Focus default
 const [gpa, setGpa] = useState(3.5);
 const [workYears, setWorkYears] = useState(4);
 const [isUrm, setIsUrm] = useState(false);
 const [isInternational, setIsInternational] = useState(false);
 const [isMilitary, setIsMilitary] = useState(false);
 const [hasNonprofit, setHasNonprofit] = useState(false);

 /* Results */
 const [results, setResults] = useState<SimResult[]>([]);
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

 /* Validate inputs before submission */
 const validateInputs = (): boolean => {
 const errors: Record<string, string> = {};
 if (gmatVersion === "focus") {
   if (gmat < 205 || gmat > 805) errors.gmat = "GMAT Focus must be 205-805";
 } else {
   if (gmat < 200 || gmat > 800) errors.gmat = "GMAT Classic must be 200-800";
 }
 if (gpa < 0 || gpa > 4.0) errors.gpa ="GPA must be 0-4.0";
 if (workYears < 0 || workYears > 30) errors.workYears ="Work years must be 0-30";
 setValidationErrors(errors);
 return Object.keys(errors).length === 0;
 };

 /* School management */
 const addSchool = (id: string) => {
 if (!selected.includes(id) && selected.length < 8) {
 setSelected((p) => [...p, id]);
 }
 setSearch("");
 setShowPicker(false);
 };

 const removeSchool = (id: string) => setSelected((p) => p.filter((s) => s !== id));

 const applyPreset = (ids: string[]) => {
 setSelected(ids.slice(0, 8));
 };

 /* Run simulation */
 const runSimulation = async () => {
 if (!validateInputs()) return;
 setLoading(true);
 setError("");
 try {
 // Normalize GMAT Focus to Classic scale for backend (Focus 205-805 maps to Classic 200-800)
 const normalizedGmat = gmatVersion === "focus" ? Math.round((gmat - 205) / 600 * 600 + 200) : gmat;
 const body = {
 gmat: normalizedGmat,
 gpa,
 work_exp_years: workYears,
 school_ids: selected,
 undergrad_tier: undefined,
 industry: isMilitary ? "military" : undefined,
 intl_experience: isInternational,
 community_service: hasNonprofit,
 };
 const res = await apiFetch<SimResponse>("/api/admit-simulator", {
 method:"POST",
 body: JSON.stringify(body),
 });

 // Also fetch ML predictions for schools that have models
 let mlPredictions: Record<string, number> = {};
 try {
   const mlRes = await apiFetch<{ predictions: Array<{ school_id: string; probability_pct: number | null }> }>("/api/ml/predict", {
     method: "POST",
     body: JSON.stringify({ school_ids: selected, gmat: normalizedGmat, gpa, yoe: workYears, app_round: "R2" }),
   });
   for (const p of mlRes.predictions) {
     if (p.probability_pct !== null) mlPredictions[p.school_id] = p.probability_pct;
   }
 } catch { /* ML predictions are optional enhancement */ }

 const sorted = res.results.map((r) => {
   const mapped = mapResult(r);
   const mlProb = mlPredictions[r.school_id];
   return { ...mapped, ml_probability_pct: mlProb ?? null };
 }).sort((a, b) => b.probability_pct - a.probability_pct);
 setResults(sorted);
 usage.recordUse();
 track("simulation_completed", {
 schools_count: selected.length,
 gmat,
 gpa,
 work_years: workYears,
 top_school: sorted[0]?.school_name ||"",
 top_probability: sorted[0]?.probability_pct || 0,
 avg_probability: Math.round(sorted.reduce((sum, r) => sum + r.probability_pct, 0) / sorted.length),
 });
 } catch {
 setError("Simulation failed. Check your GMAT (200-800) and GPA (0-4.0), then try again.");
 } finally {
 setLoading(false);
 }
 };

 const filtered = schools.filter(
 (s) => !selected.includes(s.id) && s.name.toLowerCase().includes(search.toLowerCase()),
 );

 return (
 <main className="min-h-screen bg-background">
 {/* ── Hero ─────────────────────────────────────────────────── */}
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-3xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Admit Probability Simulator
 </h1>
 <p className="text-white/70 text-lg">
 Powered by ML models trained on 67,000+ real admissions decisions across 50 schools.
 </p>
 </div>
 </section>

 <div className="max-w-3xl mx-auto px-6 py-10">
 {/* ── Profile Inputs ─────────────────────────────────────── */}
 <div className="editorial-card p-6 mb-6">
 <h2 className="font-semibold text-foreground mb-4">Your Profile</h2>
 <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
 <div>
 <label htmlFor="sim-gmat" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">GMAT Score</label>
 <div className="flex gap-1 mb-1">
   <button type="button" onClick={() => { setGmatVersion("focus"); setGmat(655); }} className={`text-[9px] px-2 py-0.5 rounded-full border transition-colors ${gmatVersion === "focus" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>Focus (205-805)</button>
   <button type="button" onClick={() => { setGmatVersion("classic"); setGmat(700); }} className={`text-[9px] px-2 py-0.5 rounded-full border transition-colors ${gmatVersion === "classic" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>Classic (200-800)</button>
 </div>
 <input
 id="sim-gmat"
 type="number" min={gmatVersion === "focus" ? 205 : 200} max={gmatVersion === "focus" ? 805 : 800} value={gmat}
 onChange={(e) => { setGmat(+e.target.value || (gmatVersion === "focus" ? 655 : 700)); setValidationErrors((v) => { const { gmat: _, ...rest } = v; return rest; }); }}
 aria-describedby="sim-gmat-range"
 className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${validationErrors.gmat ? "border-red-400" : "border-border/10"}`}
 />
 {validationErrors.gmat ? (
 <span className="text-[10px] text-red-500 mt-0.5 block">{validationErrors.gmat}</span>
 ) : (
 <span id="sim-gmat-range" className="text-[10px] text-muted-foreground mt-0.5 block">{gmatVersion === "focus" ? "205 - 805" : "200 - 800"}</span>
 )}
 </div>
 <div>
 <label htmlFor="sim-gpa" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">GPA</label>
 <input
 id="sim-gpa"
 type="number" step="0.1" min={0} max={4.0} value={gpa}
 onChange={(e) => { setGpa(+e.target.value || 3.5); setValidationErrors((v) => { const { gpa: _, ...rest } = v; return rest; }); }}
 aria-describedby="sim-gpa-range"
 className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${validationErrors.gpa ?"border-red-400":"border-border/10"}`}
 />
 {validationErrors.gpa ? (
 <span className="text-[10px] text-red-500 mt-0.5 block">{validationErrors.gpa}</span>
 ) : (
 <span id="sim-gpa-range" className="text-[10px] text-muted-foreground mt-0.5 block">0.0 - 4.0</span>
 )}
 </div>
 <div>
 <label htmlFor="sim-yoe" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Work Years</label>
 <input
 id="sim-yoe"
 type="number" min={0} max={30} value={workYears}
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

 {/* Checkboxes */}
 <div className="flex flex-wrap gap-4">
 {[
 { label:"URM", checked: isUrm, set: setIsUrm },
 { label:"International", checked: isInternational, set: setIsInternational },
 { label:"Military", checked: isMilitary, set: setIsMilitary },
 { label:"Nonprofit", checked: hasNonprofit, set: setHasNonprofit },
 ].map((cb) => (
 <label key={cb.label} className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
 <input
 type="checkbox" checked={cb.checked}
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
 M7
 </button>
 <button
 onClick={() => applyPreset(T15)}
 className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-border/10 hover:bg-primary/10 text-muted-foreground hover:text-foreground transition-colors"
 >
 T15
 </button>
 </div>

 {/* Picker dropdown */}
 {showPicker && (
 <div className="mb-4">
 <div className="relative">
 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
 <input
 type="text" autoFocus placeholder="Search schools..."
 value={search} onChange={(e) => setSearch(e.target.value)}
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
 key={s.id} onClick={() => addSchool(s.id)}
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
 <p className="text-sm text-muted-foreground">No schools selected - use presets or add manually (max 8)</p>
 )}
 </div>
 </div>

 {/* ── Run Button ─────────────────────────────────────────── */}
 <button
 onClick={runSimulation} disabled={loading || selected.length === 0}
 aria-busy={loading}
 className="w-full py-3 bg-primary text-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all mb-8 flex items-center justify-center gap-2"
 >
 {loading ? (
 <>
 <motion.div
 animate={{ rotate: 360 }}
 transition={{ repeat: Infinity, duration: 1, ease:"linear"}}
 >
 <Dices size={18} />
 </motion.div>
 Running 100 simulations...
 </>
 ) : (
 <>
 <Dices size={18} />
 Run Simulation
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

 {/* ── Results (gated - users invest effort filling the form before seeing paywall) */}
 <UsageGate feature="odds_calculator">
 <div className="space-y-4" aria-live="polite" aria-label="Simulation results">
 <AnimatePresence>
 {results.map((r, i) => (
 <motion.div
 key={r.school_id}
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i * 0.06 }}
 className="editorial-card overflow-hidden"
 >
 <div className="p-6">
 {/* Header: school name + probability */}
 <div className="flex items-start justify-between mb-4">
 <div>
 <Link
 href={`/school/${r.school_id}`}
 className="font-semibold text-foreground hover:text-primary transition-colors"
 >
 {r.school_name}
 </Link>
 <div className="flex items-center gap-2 mt-1">
 <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${verdictStyle(r.verdict)}`}>
 {r.verdict}
 </span>
 <span className="text-xs text-muted-foreground">
 {r.simulations?.accepted ?? 0}/{(r.simulations?.accepted ?? 0) + (r.simulations?.rejected ?? 0)} accepted
 </span>
 </div>
 </div>
 <div className="text-right">
 <span className={`text-4xl font-bold ${probColor(r.probability_pct ?? 0)}`}>
 {r.probability_pct != null ? `${r.probability_pct}%` :"\u2014"}
 </span>
 {r.ml_probability_pct != null && (
 <div className="flex items-center justify-end gap-1 mt-1">
 <span className="text-[9px] px-1.5 py-0.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-full font-semibold">ML</span>
 <span className="text-sm font-semibold text-violet-600">{r.ml_probability_pct}%</span>
 </div>
 )}
 </div>
 </div>

 {/* Confidence interval bar */}
 <div className="mb-3">
 <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
 <span>Confidence Interval</span>
 <span>{r.confidence_interval?.[0] ?? 0}% &ndash; {r.confidence_interval?.[1] ?? 0}%</span>
 </div>
 <div className="relative h-3 bg-foreground/5 rounded-full overflow-hidden">
 {/* Full range background */}
 <div
 className={`absolute h-full rounded-full opacity-20 ${probBg(r.probability_pct ?? 0)}`}
 style={{
 left: `${r.confidence_interval?.[0] ?? 0}%`,
 width: `${(r.confidence_interval?.[1] ?? 0) - (r.confidence_interval?.[0] ?? 0)}%`,
 }}
 />
 {/* Point estimate marker */}
 <div
 className={`absolute h-full w-1 rounded-full ${probBg(r.probability_pct ?? 0)}`}
 style={{ left: `${r.probability_pct ?? 0}%` }}
 />
 </div>
 </div>

 {/* Simulation detail */}
 <div className="flex items-center gap-4 text-xs text-muted-foreground">
 <div className="flex items-center gap-1">
 <div className="w-2 h-2 rounded-full bg-emerald-500"/>
 {r.simulations?.accepted ?? 0} accepted
 </div>
 <div className="flex items-center gap-1">
 <div className="w-2 h-2 rounded-full bg-red-400"/>
 {r.simulations?.rejected ?? 0} rejected
 </div>
 <div className="ml-auto text-[10px] text-muted-foreground">
 100 simulation rounds
 </div>
 </div>
 </div>
 </motion.div>
 ))}
 </AnimatePresence>
 </div>

 {/* Empty state */}
 {results.length === 0 && !loading && (
 <EmptyState
 icon={Dices}
 title="No simulation results yet"
 description="Fill in your profile, select target schools, and run the simulation to see your admit probabilities."
 />
 )}

 {/* Post-result CTAs - drive conversion to next step */}
 {results.length > 0 && (
 <div className="mt-8 border-t border-border/5 pt-8">
 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 mb-4">What to Do Next</p>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
 {(() => {
 const safeties = results.filter((r) => r.verdict ==="Safety");
 const targets = results.filter((r) => r.verdict ==="Target");
 const reaches = results.filter((r) => r.verdict ==="Reach");

 return [
 {
 href: reaches.length > 0 ? `/school/${reaches[0].school_id}` :"/evaluator",
 label: reaches.length > 0 ? `Strengthen your ${reaches[0].school_name} app` :"Polish your essays",
 desc: reaches.length > 0 ?"A strong essay can move the needle at reach schools":"AI feedback to improve your application",
 icon: <FileText size={16} />,
 },
 {
 href:"/profile-report",
 label:"Get your full profile report",
 desc:"See strengths, gaps, and fit scores for all schools",
 icon: <TrendingUp size={16} />,
 },
 {
 href: targets.length > 0 ? `/school/${targets[0].school_id}` : safeties.length > 0 ? `/school/${safeties[0].school_id}` :"/schools",
 label: targets.length > 0 ? `Explore ${targets[0].school_name}` :"Browse more programs",
 desc:"Essay prompts, deadlines, and class profile",
 icon: <Target size={16} />,
 },
 ];
 })().map((cta) => (
 <Link
 key={cta.href}
 href={cta.href}
 className="editorial-card group hover:border-primary/30 transition-all flex items-start gap-3"
 >
 <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary/20 transition-colors">
 {cta.icon}
 </div>
 <div>
 <p className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">{cta.label}</p>
 <p className="text-[10px] text-muted-foreground/40 mt-0.5">{cta.desc}</p>
 </div>
 </Link>
 ))}
 </div>

 {/* Email capture - highest engagement moment */}
 </div>
 )}

 </UsageGate>

 {/* ── Cross Links ────────────────────────────────────────── */}
 <ToolCrossLinks current="/simulator"/>
 </div>
 </main>
 );
}
