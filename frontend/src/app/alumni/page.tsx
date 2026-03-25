"use client";

import { useState } from"react";
import { motion, AnimatePresence } from"framer-motion";
import { Users, Building2, Star, X } from"lucide-react";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import { EmailCapture } from"@/components/EmailCapture";

/* ── Types ─────────────────────────────────────────────────────────── */

type AlumniSchool = {
 school_id: string;
 school_name: string;
 total_alumni: number;
 industries: Record<string, number>;
 top_companies: string[];
 notable_alumni: string[];
};

type AlumniResponse = { schools: AlumniSchool[]; school_count: number };

/* ── School Options ───────────────────────────────────────────────── */

const SCHOOL_OPTIONS = [
 { id:"hbs", label:"Harvard Business School"},
 { id:"gsb", label:"Stanford GSB"},
 { id:"wharton", label:"Wharton"},
 { id:"booth", label:"Chicago Booth"},
 { id:"kellogg", label:"Kellogg"},
 { id:"cbs", label:"Columbia Business School"},
 { id:"sloan", label:"MIT Sloan"},
 { id:"tuck", label:"Tuck"},
 { id:"haas", label:"Berkeley Haas"},
 { id:"ross", label:"Michigan Ross"},
 { id:"fuqua", label:"Duke Fuqua"},
 { id:"darden", label:"UVA Darden"},
 { id:"stern", label:"NYU Stern"},
 { id:"yale_som", label:"Yale SOM"},
 { id:"anderson", label:"UCLA Anderson"},
] as const;

const PRESETS: { label: string; ids: string[] }[] = [
 { label:"M7", ids: ["hbs","gsb","wharton","booth","kellogg","cbs","sloan"].slice(0, 4) },
 { label:"Tech-Focused", ids: ["gsb","sloan","haas","anderson"] },
 { label:"Finance-Focused", ids: ["wharton","cbs","booth","stern"] },
 { label:"Consulting", ids: ["kellogg","tuck","darden","ross"] },
];

const MAX_SCHOOLS = 4;

const INDUSTRY_COLORS: Record<string, string> = {
 Consulting:"bg-blue-500",
 Finance:"bg-emerald-500",
 Tech:"bg-violet-500",
"PE/VC":"bg-amber-500",
 Entrepreneurship:"bg-rose-500",
 Healthcare:"bg-teal-500",
"CPG/Marketing":"bg-orange-400",
 CPG:"bg-orange-400",
"Media/Entertainment":"bg-pink-400",
 Entertainment:"bg-pink-400",
"Real Estate":"bg-cyan-500",
"Social Impact":"bg-lime-500",
 Nonprofit:"bg-lime-500",
 Manufacturing:"bg-stone-400",
 Energy:"bg-yellow-500",
 Other:"bg-foreground/20",
};

function barColor(industry: string) {
 return INDUSTRY_COLORS[industry] ||"bg-foreground/20";
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function AlumniNetworkPage() {
 const [selected, setSelected] = useState<string[]>([]);
 const [results, setResults] = useState<AlumniSchool[]>([]);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState("");

 const toggle = (id: string) => {
 setSelected((prev) =>
 prev.includes(id) ? prev.filter((s) => s !== id) : prev.length < MAX_SCHOOLS ? [...prev, id] : prev,
 );
 };

 const applyPreset = (ids: string[]) => setSelected(ids.slice(0, MAX_SCHOOLS));

 const explore = async () => {
 if (!selected.length) return;
 setLoading(true);
 setError("");
 try {
 const res = await apiFetch<AlumniResponse>(
 `/api/schools/alumni-network?school_ids=${selected.join(",")}`,
 );
 setResults(res.schools);
 } catch {
 setError("Failed to load alumni data. Please try again.");
 } finally {
 setLoading(false);
 }
 };

 /* Collect all unique industries across results for comparison */
 const allIndustries = Array.from(
 new Set(results.flatMap((r) => Object.keys(r.industries))),
 ).sort((a, b) => {
 const maxA = Math.max(...results.map((r) => r.industries[a] ?? 0));
 const maxB = Math.max(...results.map((r) => r.industries[b] ?? 0));
 return maxB - maxA;
 });

 return (
 <main className="min-h-screen bg-background">
 {/* Hero */}
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-3xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Alumni Network Explorer
 </h1>
 <p className="text-white/70 text-lg">
 Compare alumni networks, industry placements, and notable graduates across top MBA programs.
 </p>
 </div>
 </section>

 <div className="max-w-4xl mx-auto px-6 py-10">
 {/* School Selector */}
 <div className="editorial-card p-6 mb-6">
 <h2 className="font-semibold text-foreground mb-4">Select Schools (max {MAX_SCHOOLS})</h2>

 {/* Quick Presets */}
 <div className="flex flex-wrap gap-2 mb-4">
 {PRESETS.map((p) => (
 <button
 key={p.label}
 onClick={() => applyPreset(p.ids)}
 className="px-3 py-1 text-xs font-medium rounded-full border border-border/10 hover:border-primary hover:text-primary transition-colors"
 >
 {p.label}
 </button>
 ))}
 </div>

 {/* School chips */}
 <div className="flex flex-wrap gap-2">
 {SCHOOL_OPTIONS.map((s) => {
 const active = selected.includes(s.id);
 const disabled = !active && selected.length >= MAX_SCHOOLS;
 return (
 <button
 key={s.id}
 onClick={() => toggle(s.id)}
 disabled={disabled}
 className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
 active
 ?"bg-primary text-foreground border-primary"
 : disabled
 ?"border-border/5 text-foreground/20 cursor-not-allowed"
 :"border-border/10 text-foreground/60 hover:border-border/30"
 }`}
 >
 {s.label}
 {active && <X size={10} className="inline ml-1 -mt-0.5"/>}
 </button>
 );
 })}
 </div>
 </div>

 {/* CTA */}
 <button
 onClick={explore}
 disabled={loading || !selected.length}
 className="w-full py-3 bg-primary text-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-40 transition-all mb-8 flex items-center justify-center gap-2"
 >
 {loading ?"Loading...": `Explore ${selected.length} Network${selected.length !== 1 ?"s":""}`}
 </button>

 {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

 {/* Per-School Cards */}
 <div className="space-y-6">
 <AnimatePresence>
 {results.map((school, i) => (
 <motion.div
 key={school.school_id}
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i * 0.08 }}
 className="editorial-card overflow-hidden"
 >
 <div className="p-6">
 {/* Header */}
 <div className="flex items-center justify-between mb-4">
 <h3 className="font-semibold text-foreground text-lg">{school.school_name}</h3>
 <div className="flex items-center gap-1.5 text-foreground/50">
 <Users size={14} />
 <span className="text-sm font-bold text-foreground">
 {school.total_alumni.toLocaleString()}
 </span>
 <span className="text-xs">alumni</span>
 </div>
 </div>

 {/* Industry Distribution */}
 <div className="mb-5">
 <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/30 mb-3">
 Industry Distribution
 </p>
 <div className="space-y-2">
 {Object.entries(school.industries)
 .sort(([, a], [, b]) => b - a)
 .map(([industry, pct]) => (
 <div key={industry} className="flex items-center gap-3">
 <span className="text-xs text-foreground/60 w-28 shrink-0 text-right">{industry}</span>
 <div className="flex-1 bg-foreground/5 rounded-full h-4 overflow-hidden">
 <motion.div
 className={`h-full rounded-full ${barColor(industry)}`}
 initial={{ width: 0 }}
 animate={{ width: `${pct}%` }}
 transition={{ duration: 0.6, delay: i * 0.08 }}
 />
 </div>
 <span className="text-xs font-bold text-foreground/50 w-8">{pct}%</span>
 </div>
 ))}
 </div>
 </div>

 {/* Top Companies */}
 <div className="mb-4">
 <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/30 mb-2 flex items-center gap-1">
 <Building2 size={10} /> Top Employers
 </p>
 <div className="flex flex-wrap gap-1.5">
 {school.top_companies.map((c) => (
 <span
 key={c}
 className="px-2.5 py-1 text-xs font-medium rounded-full bg-foreground/5 text-foreground/70"
 >
 {c}
 </span>
 ))}
 </div>
 </div>

 {/* Notable Alumni */}
 <div>
 <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/30 mb-2 flex items-center gap-1">
 <Star size={10} /> Notable Alumni
 </p>
 <div className="flex flex-wrap gap-1.5">
 {school.notable_alumni.map((a) => (
 <span
 key={a}
 className="px-2.5 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary"
 >
 {a}
 </span>
 ))}
 </div>
 </div>
 </div>
 </motion.div>
 ))}
 </AnimatePresence>
 </div>

 {/* Side-by-Side Industry Comparison (2+ schools) */}
 {results.length >= 2 && (
 <motion.div
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.3 }}
 className="editorial-card p-6 mt-8"
 >
 <h3 className="font-semibold text-foreground mb-5">Industry Comparison</h3>
 <div className="space-y-4">
 {allIndustries.map((industry) => (
 <div key={industry}>
 <p className="text-xs font-medium text-foreground/60 mb-1.5">{industry}</p>
 <div className="space-y-1">
 {results.map((school, idx) => {
 const pct = school.industries[industry] ?? 0;
 const colors = ["bg-primary","bg-violet-500","bg-emerald-500","bg-rose-500"];
 return (
 <div key={school.school_id} className="flex items-center gap-2">
 <span className="text-[10px] text-foreground/40 w-20 shrink-0 truncate text-right">
 {school.school_name.split("").slice(-1)[0]}
 </span>
 <div className="flex-1 bg-foreground/5 rounded-full h-3 overflow-hidden">
 <motion.div
 className={`h-full rounded-full ${colors[idx % colors.length]}`}
 initial={{ width: 0 }}
 animate={{ width: `${pct}%` }}
 transition={{ duration: 0.5 }}
 />
 </div>
 <span className="text-[10px] font-bold text-foreground/40 w-7">{pct}%</span>
 </div>
 );
 })}
 </div>
 </div>
 ))}
 </div>

 {/* Legend */}
 <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-border/5">
 {results.map((school, idx) => {
 const dotColors = ["bg-primary","bg-violet-500","bg-emerald-500","bg-rose-500"];
 return (
 <div key={school.school_id} className="flex items-center gap-1.5">
 <span className={`w-2.5 h-2.5 rounded-full ${dotColors[idx % dotColors.length]}`} />
 <span className="text-xs text-foreground/60">{school.school_name}</span>
 </div>
 );
 })}
 </div>
 </motion.div>
 )}

 {/* Empty state */}
 {results.length === 0 && !loading && (
 <div className="text-center py-16 text-foreground/30">
 <Users size={48} className="mx-auto mb-4 opacity-30"/>
 <p>Select schools above and hit Explore to compare alumni networks</p>
 </div>
 )}

 <EmailCapture variant="contextual"source="alumni"/>
 <ToolCrossLinks current="/alumni"/>
 </div>
 </main>
 );
}
