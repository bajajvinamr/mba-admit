"use client";

import { useState, useEffect, useMemo } from"react";
import { motion } from"framer-motion";
import {
 MapPin, Plus, X, Home, UtensilsCrossed, Bus, ShoppingBag,
 ArrowDown, ArrowUp, TrendingDown, TrendingUp,
} from"lucide-react";
import { apiFetch } from"@/lib/api";
import { useSchoolNames } from"@/hooks/useSchoolNames";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

/* ── Types ─────────────────────────────────────────────────────────── */

type MonthlyCosts = {
 rent: number;
 food: number;
 transport: number;
 misc: number;
 total: number;
};

type Comparison = {
 school_id: string;
 school_name: string;
 location: string;
 monthly: MonthlyCosts;
 annual_total: number;
 program_years: number;
};

type CostResponse = {
 comparisons: Comparison[];
 cheapest: string;
 most_expensive: string;
};

/* ── Helpers ───────────────────────────────────────────────────────── */

const COST_CATEGORIES = [
 { key:"rent"as const, label:"Rent", color:"bg-amber-500", icon: Home },
 { key:"food"as const, label:"Food", color:"bg-emerald-500", icon: UtensilsCrossed },
 { key:"transport"as const, label:"Transport", color:"bg-sky-500", icon: Bus },
 { key:"misc"as const, label:"Misc", color:"bg-violet-500", icon: ShoppingBag },
];

function StackedBar({ monthly, maxTotal }: { monthly: MonthlyCosts; maxTotal: number }) {
 const widthPct = (v: number) => `${(v / maxTotal) * 100}%`;
 return (
 <div className="flex h-5 rounded-full overflow-hidden bg-foreground/5 w-full">
 {COST_CATEGORIES.map((cat) => (
 <div
 key={cat.key}
 className={`${cat.color} transition-all duration-500`}
 style={{ width: widthPct(monthly[cat.key]) }}
 title={`${cat.label}: $${monthly[cat.key].toLocaleString()}`}
 />
 ))}
 </div>
 );
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function CostOfLivingPage() {
 const { schools: rawSchools, error: schoolsError } = useSchoolNames();
 const schools = useMemo(
 () => rawSchools.filter((s) => s.name).sort((a, b) => a.name.localeCompare(b.name)),
 [rawSchools],
 );
 const [selected, setSelected] = useState<string[]>([]);
 const [search, setSearch] = useState("");
 const [showPicker, setShowPicker] = useState(false);
 const [result, setResult] = useState<CostResponse | null>(null);
 const [loading, setLoading] = useState(false);

 const addSchool = (id: string) => {
 if (!selected.includes(id) && selected.length < 5) {
 setSelected((p) => [...p, id]);
 }
 setSearch("");
 setShowPicker(false);
 };

 const removeSchool = (id: string) => {
 setSelected((p) => p.filter((s) => s !== id));
 setResult(null);
 };

 const fetchComparison = async (ids: string[]) => {
 if (ids.length === 0) return;
 setLoading(true);
 try {
 const res = await apiFetch<CostResponse>(
 `/api/cost-of-living?school_ids=${ids.join(",")}`,
 );
 setResult(res);
 } catch {
 setResult(null);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 if (selected.length > 0) fetchComparison(selected);
 else setResult(null);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [selected]);

 const filtered = schools.filter(
 (s) =>
 !selected.includes(s.id) &&
 s.name.toLowerCase().includes(search.toLowerCase()),
 );

 const QUICK_PICKS = [
 { label:"M7", ids: ["hbs","gsb","wharton","booth","kellogg"] },
 { label:"T15", ids: ["hbs","gsb","wharton","booth","kellogg"] },
 { label:"Custom", ids: [] },
 ];

 const maxTotal = result
 ? Math.max(...result.comparisons.map((c) => c.monthly.total))
 : 0;

 return (
 <main className="min-h-screen bg-background">
 {/* Hero */}
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-3xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Cost of Living Comparison
 </h1>
 <p className="text-white/70 text-lg">
 See what life actually costs in each MBA city. Side by side.
 </p>
 </div>
 </section>

 <div className="max-w-3xl mx-auto px-6 py-10">
 {/* Quick Picks */}
 <div className="flex gap-2 mb-6">
 {QUICK_PICKS.map((qp) => (
 <button
 key={qp.label}
 onClick={() => {
 if (qp.ids.length > 0) setSelected(qp.ids);
 else {
 setSelected([]);
 setShowPicker(true);
 }
 }}
 className="px-4 py-2 text-sm font-medium bg-card border border-border/10 rounded-full hover:border-border/30 transition-colors"
 >
 {qp.label}
 </button>
 ))}
 </div>

 {/* School Picker */}
 <div className="editorial-card p-6 mb-6">
 {schoolsError && <p className="text-red-500 text-xs mb-2">{schoolsError}</p>}
 <div className="flex items-center justify-between mb-3">
 <h2 className="font-semibold text-foreground">
 Your Schools{""}
 <span className="text-xs text-muted-foreground font-normal">
 (max 5)
 </span>
 </h2>
 <button
 onClick={() => setShowPicker(!showPicker)}
 disabled={selected.length >= 5}
 className="text-xs px-3 py-1.5 bg-foreground text-white rounded-full hover:bg-foreground/80 flex items-center gap-1 disabled:opacity-30"
 >
 <Plus size={12} /> Add
 </button>
 </div>

 {showPicker && (
 <div className="mb-4">
 <input
 type="text"
 autoFocus
 placeholder="Search schools..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full px-3 py-2 border border-border/10 rounded text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
 />
 <div className="max-h-40 overflow-y-auto border border-border/5 rounded">
 {filtered.slice(0, 15).map((s) => (
 <button
 key={s.id}
 onClick={() => addSchool(s.id)}
 className="w-full text-left px-3 py-2 text-sm hover:bg-primary/5 border-b border-border/5 last:border-0"
 >
 {s.name}
 </button>
 ))}
 </div>
 </div>
 )}

 <div className="flex flex-wrap gap-2">
 {selected.map((id) => {
 const s = schools.find((x) => x.id === id);
 return (
 <span
 key={id}
 className="inline-flex items-center gap-1 px-3 py-1.5 bg-foreground text-white text-xs rounded-full"
 >
 {s?.name || id}
 <button onClick={() => removeSchool(id)}>
 <X size={12} />
 </button>
 </span>
 );
 })}
 {selected.length === 0 && (
 <p className="text-sm text-muted-foreground">
 Pick schools or use a quick preset above
 </p>
 )}
 </div>
 </div>

 {/* Loading */}
 {loading && (
 <div className="text-center py-8">
 <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"/>
 </div>
 )}

 {/* Results */}
 {result && !loading && (
 <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
 {/* Legend */}
 <div className="flex gap-4 mb-6 justify-center">
 {COST_CATEGORIES.map((cat) => (
 <div key={cat.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
 <span className={`w-2.5 h-2.5 rounded-full ${cat.color}`} />
 {cat.label}
 </div>
 ))}
 </div>

 {/* Per-school cards */}
 <div className="space-y-4 mb-8">
 {result.comparisons.map((c, i) => {
 const isCheapest = c.school_id === result.cheapest;
 const isMostExpensive = c.school_id === result.most_expensive;
 const programTotal = c.monthly.total * 12 * c.program_years;

 return (
 <motion.div
 key={c.school_id}
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i * 0.05 }}
 className="editorial-card p-6"
 >
 <div className="flex items-start justify-between mb-3">
 <div>
 <h3 className="font-semibold text-foreground text-lg">
 {c.school_name}
 </h3>
 <p className="text-xs text-muted-foreground flex items-center gap-1">
 <MapPin size={10} /> {c.location}
 </p>
 </div>
 <div className="flex gap-1.5">
 {isCheapest && result.comparisons.length > 1 && (
 <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">
 <TrendingDown size={10} /> Cheapest
 </span>
 )}
 {isMostExpensive && result.comparisons.length > 1 && (
 <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 px-2 py-1 rounded-full">
 <TrendingUp size={10} /> Priciest
 </span>
 )}
 </div>
 </div>

 {/* Stacked bar */}
 <StackedBar monthly={c.monthly} maxTotal={maxTotal} />

 {/* Breakdown grid */}
 <div className="grid grid-cols-4 gap-3 mt-4">
 {COST_CATEGORIES.map((cat) => {
 const Icon = cat.icon;
 return (
 <div key={cat.key} className="text-center">
 <Icon size={14} className="mx-auto mb-1 text-muted-foreground"/>
 <p className="text-xs text-muted-foreground">{cat.label}</p>
 <p className="text-sm font-bold text-foreground">
 ${c.monthly[cat.key].toLocaleString()}
 </p>
 </div>
 );
 })}
 </div>

 {/* Summary row */}
 <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/5">
 <div>
 <p className="text-xs text-muted-foreground">Monthly Total</p>
 <p className="text-xl font-bold text-foreground heading-serif font-[family-name:var(--font-heading)]">
 ${c.monthly.total.toLocaleString()}
 </p>
 </div>
 <div className="text-right">
 <p className="text-xs text-muted-foreground">
 {c.program_years}-Year Program Cost
 </p>
 <p className="text-lg font-bold text-foreground">
 ${programTotal.toLocaleString()}
 </p>
 </div>
 </div>
 </motion.div>
 );
 })}
 </div>

 {/* Bar chart comparing totals */}
 {result.comparisons.length > 1 && (
 <div className="editorial-card p-6 mb-8">
 <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
 Monthly Total Comparison
 </h3>
 <div className="space-y-3">
 {result.comparisons
 .slice()
 .sort((a, b) => b.monthly.total - a.monthly.total)
 .map((c) => {
 const pct = (c.monthly.total / maxTotal) * 100;
 const isCheapest = c.school_id === result.cheapest;
 const isMostExpensive = c.school_id === result.most_expensive;
 return (
 <div key={c.school_id}>
 <div className="flex items-center justify-between text-sm mb-1">
 <span className="font-medium text-foreground truncate mr-2">
 {c.school_name}
 {isCheapest && (
 <ArrowDown
 size={12}
 className="inline ml-1 text-emerald-500"
 />
 )}
 {isMostExpensive && (
 <ArrowUp
 size={12}
 className="inline ml-1 text-amber-500"
 />
 )}
 </span>
 <span className="font-bold text-foreground">
 ${c.monthly.total.toLocaleString()}
 </span>
 </div>
 <div className="h-3 rounded-full bg-foreground/5 overflow-hidden">
 <motion.div
 className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600"
 initial={{ width: 0 }}
 animate={{ width: `${pct}%` }}
 transition={{ duration: 0.6, delay: 0.1 }}
 />
 </div>
 </div>
 );
 })}
 </div>
 </div>
 )}

 <ToolCrossLinks current="/cost-of-living"/>
 </motion.div>
 )}

 {/* Empty state */}
 {!result && !loading && selected.length === 0 && (
 <div className="text-center py-16 text-muted-foreground">
 <MapPin size={48} className="mx-auto mb-4 opacity-30"/>
 <p>Add schools to compare cost of living</p>
 </div>
 )}
 </div>
 </main>
 );
}
