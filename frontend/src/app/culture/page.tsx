"use client";

import { useState } from"react";
import { motion, AnimatePresence } from"framer-motion";
import { Heart, ArrowRight } from"lucide-react";
import Link from"next/link";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import { EmailCapture } from"@/components/EmailCapture";

/* ── Types ─────────────────────────────────────────────────────────── */

type CultureMatch = {
 school_id: string;
 school_name: string;
 match_pct: number;
 top_traits: string[];
 weak_traits: string[];
};

type CultureResponse = { matches: CultureMatch[] };

/* ── Trait Config ──────────────────────────────────────────────────── */

const TRAITS = [
 { key:"collaboration", label:"Collaboration"},
 { key:"entrepreneurship", label:"Entrepreneurship"},
 { key:"global", label:"Global Focus"},
 { key:"social_impact", label:"Social Impact"},
 { key:"innovation", label:"Innovation"},
 { key:"networking", label:"Networking"},
 { key:"case_method", label:"Case Method"},
 { key:"diversity", label:"Diversity"},
] as const;

function pctColor(pct: number) {
 if (pct >= 85) return "text-emerald-600";
 if (pct >= 70) return "text-amber-600";
 return "text-red-600";
}

function traitLabel(key: string) {
 return TRAITS.find((t) => t.key === key)?.label ?? key.replace(/_/g,"");
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function CultureMatcherPage() {
 const [priorities, setPriorities] = useState<Record<string, number>>(
 Object.fromEntries(TRAITS.map((t) => [t.key, 3])),
 );
 const [results, setResults] = useState<CultureMatch[]>([]);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState("");

 const updatePriority = (key: string, val: number) =>
 setPriorities((p) => ({ ...p, [key]: val }));

 const findMatches = async () => {
 setLoading(true);
 setError("");
 try {
 const res = await apiFetch<CultureResponse>("/api/schools/culture-match", {
 method:"POST",
 body: JSON.stringify({ priorities }),
 });
 setResults(res.matches);
 } catch {
 setError("Failed to find matches. Please try again.");
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
 School Culture Matcher
 </h1>
 <p className="text-white/70 text-lg">
 Rate what matters to you and discover which MBA programs align with your values.
 </p>
 </div>
 </section>

 <div className="max-w-3xl mx-auto px-6 py-10">
 {/* Sliders */}
 <div className="editorial-card p-6 mb-8">
 <h2 className="font-semibold text-foreground mb-5">Your Culture Priorities</h2>
 <div className="space-y-5">
 {TRAITS.map((t) => (
 <div key={t.key}>
 <div className="flex items-center justify-between mb-1">
 <label className="text-sm font-medium text-foreground">{t.label}</label>
 <span className="text-xs font-bold text-foreground/40 w-6 text-right">
 {priorities[t.key]}
 </span>
 </div>
 <input
 type="range"
 min={1}
 max={5}
 step={1}
 value={priorities[t.key]}
 onChange={(e) => updatePriority(t.key, +e.target.value)}
 className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-foreground/10"
 />
 <div className="flex justify-between text-[10px] text-foreground/30 mt-0.5">
 <span>Low</span>
 <span>High</span>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* CTA */}
 <button
 onClick={findMatches}
 disabled={loading}
 className="w-full py-3 bg-primary text-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-40 transition-all mb-8 flex items-center justify-center gap-2"
 >
 {loading ?"Matching...":"Find My Match"}
 {!loading && <ArrowRight size={16} />}
 </button>

 {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

 {/* Results */}
 <div className="space-y-4">
 <AnimatePresence>
 {results.map((r, i) => (
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
 <span className={`text-3xl font-bold ${pctColor(r.match_pct)}`}>
 {r.match_pct}%
 </span>
 </div>

 {/* Match bar */}
 <div className="bg-foreground/5 rounded-full h-2 overflow-hidden mb-4">
 <motion.div
 className="h-full rounded-full bg-primary"
 initial={{ width: 0 }}
 animate={{ width: `${r.match_pct}%` }}
 transition={{ duration: 0.5, delay: i * 0.05 }}
 />
 </div>

 {/* Trait badges */}
 <div className="flex flex-wrap gap-2">
 {r.top_traits.map((t) => (
 <span
 key={t}
 className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700"
 >
 {traitLabel(t)}
 </span>
 ))}
 {r.weak_traits.map((t) => (
 <span
 key={t}
 className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-foreground/5 text-foreground/40"
 >
 {traitLabel(t)}
 </span>
 ))}
 </div>
 </div>
 </motion.div>
 ))}
 </AnimatePresence>
 </div>

 {results.length === 0 && !loading && (
 <div className="text-center py-16 text-foreground/30">
 <Heart size={48} className="mx-auto mb-4 opacity-30"/>
 <p>Adjust your priorities and hit Find My Match</p>
 </div>
 )}

 <EmailCapture variant="contextual"source="culture"/>
 <ToolCrossLinks current="/culture"/>
 </div>
 </main>
 );
}
