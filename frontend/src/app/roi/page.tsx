"use client";

import { useState, useEffect } from"react";
import { motion, AnimatePresence } from"framer-motion";
import {
 DollarSign, TrendingUp, Clock, GraduationCap,
 Plus, X, ArrowRight, Calculator, CheckCircle2,
} from"lucide-react";
import Link from"next/link";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import { EmailCapture } from"@/components/EmailCapture";
import { useUsage } from"@/hooks/useUsage";
import { UsageGate } from"@/components/UsageGate";

type RoiResult = {
 school_id: string;
 school_name: string;
 tuition_total: number;
 opportunity_cost: number;
 total_investment: number;
 post_mba_salary: number;
 salary_increase: number;
 roi_pct: number;
 net_gain_10yr: number;
 breakeven_year: number | null;
 assumptions: string;
};

type School = { id: string; name: string };

export default function RoiPage() {
 const usage = useUsage("roi_calculator");
 const [schools, setSchools] = useState<School[]>([]);
 const [selected, setSelected] = useState<string[]>([]);
 const [salary, setSalary] = useState<number>(80000);
 const [results, setResults] = useState<RoiResult[]>([]);
 const [loading, setLoading] = useState(false);
 const [showPicker, setShowPicker] = useState(false);
 const [search, setSearch] = useState("");
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 apiFetch<School[]>("/api/schools")
 .then((r) => {
   const list = Array.isArray(r) ? r : (r as unknown as { schools: School[] }).schools || [];
   setSchools(list.filter((s) => s.name && s.id.length <= 20).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 80));
 })
 .catch(() => setError("Failed to load school list. Please refresh."));
 }, []);

 useEffect(() => {
 if (selected.length === 0 || salary <= 0) return;
 let cancelled = false;
 setLoading(true);
 setError(null);

 const promises = selected.map((id) =>
 apiFetch<RoiResult>(`/api/schools/${id}/roi?current_salary=${salary}&years=10`).catch(() => null)
 );
 Promise.all(promises).then((res) => {
 if (cancelled) return;
 const sorted = res.filter(Boolean).sort((a, b) => (b!.roi_pct || 0) - (a!.roi_pct || 0)) as RoiResult[];
 setResults(sorted);
 if (sorted.length > 0) {
 usage.recordUse();
 } else if (selected.length > 0) {
 setError("Couldn't calculate ROI for the selected schools. Try different schools.");
 }
 setLoading(false);
 });

 return () => { cancelled = true; };
 }, [selected, salary]);

 const addSchool = (id: string) => {
 if (!selected.includes(id) && selected.length < 8) {
 setSelected((p) => [...p, id]);
 }
 setSearch("");
 setShowPicker(false);
 };

 const filtered = schools.filter(
 (s) => !selected.includes(s.id) && s.name.toLowerCase().includes(search.toLowerCase())
 );

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-4xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 MBA ROI Calculator
 </h1>
 <p className="text-white/70 text-lg">
 Is the MBA worth it? Compare 10-year ROI across schools.
 </p>
 </div>
 </section>

 <div className="max-w-4xl mx-auto px-6 py-10">
 {/* Inputs */}
 <div className="editorial-card p-6 mb-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 block mb-2">Current Annual Salary</label>
 <div className="relative">
 <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30"/>
 <input type="number" value={salary} onChange={(e) => setSalary(+e.target.value)}
 className="w-full pl-9 pr-4 py-3 border border-border/10 rounded-lg text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"/>
 </div>
 </div>
 <div>
 <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 block mb-2">Schools to Compare</label>
 <div className="flex flex-wrap gap-1.5 mb-2">
 {selected.map((id) => {
 const s = schools.find((x) => x.id === id);
 return (
 <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-foreground text-white text-xs rounded-full">
 {s?.name?.split("").slice(0, 2).join("") || id}
 <button onClick={() => setSelected((p) => p.filter((x) => x !== id))}><X size={10} /></button>
 </span>
 );
 })}
 <button onClick={() => setShowPicker(!showPicker)}
 className="px-2 py-1 border border-border/10 text-xs rounded-full text-foreground/40 hover:border-border/30">
 <Plus size={10} />
 </button>
 </div>
 {showPicker && (
 <div>
 <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
 className="w-full px-3 py-1.5 border border-border/10 rounded text-xs mb-1" autoFocus />
 <div className="max-h-32 overflow-y-auto border border-border/5 rounded">
 {filtered.slice(0, 10).map((s) => (
 <button key={s.id} onClick={() => addSchool(s.id)}
 className="w-full text-left px-3 py-1.5 text-xs hover:bg-primary/5 border-b border-border/5">{s.name}</button>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>
 </div>

 {error && (
 <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg text-sm mb-6 flex justify-between items-center">
 <span>{error}</span>
 <button onClick={() => setError(null)} className="ml-4 text-red-600 font-bold">&times;</button>
 </div>
 )}

 {loading && (
 <div className="text-center py-8">
 <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"/>
 </div>
 )}

 {/* Results */}
 {results.length > 0 && !loading && (
 <UsageGate feature="roi_calculator">
 <div className="space-y-4">
 {results.map((r, i) => (
 <motion.div
 key={r.school_id}
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i * 0.05 }}
 className="editorial-card overflow-hidden"
 >
 <div className="p-6">
 <div className="flex items-center justify-between mb-4">
 <Link href={`/school/${r.school_id}`} className="font-semibold text-foreground hover:text-primary transition-colors">
 {r.school_name}
 </Link>
 <span className={`text-3xl font-bold ${r.roi_pct > 0 ?"text-emerald-600":"text-red-600"}`}>
 {r.roi_pct > 0 ?"+":""}{r.roi_pct}%
 </span>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
 <div>
 <p className="text-xs text-foreground/40">Total Investment</p>
 <p className="text-lg font-bold text-foreground">${(r.total_investment / 1000).toFixed(0)}k</p>
 </div>
 <div>
 <p className="text-xs text-foreground/40">Post-MBA Salary</p>
 <p className="text-lg font-bold text-foreground">${(r.post_mba_salary / 1000).toFixed(0)}k</p>
 </div>
 <div>
 <p className="text-xs text-foreground/40">10-Year Net Gain</p>
 <p className={`text-lg font-bold ${r.net_gain_10yr > 0 ?"text-emerald-600":"text-red-600"}`}>
 ${(r.net_gain_10yr / 1000).toFixed(0)}k
 </p>
 </div>
 <div>
 <p className="text-xs text-foreground/40">Breakeven</p>
 <p className="text-lg font-bold text-foreground">
 {r.breakeven_year ? `Year ${r.breakeven_year}` :"N/A"}
 </p>
 </div>
 </div>

 <p className="text-[10px] text-foreground/20 mt-3">{r.assumptions}</p>
 </div>
 </motion.div>
 ))}
 </div>
 </UsageGate>
 )}

 {results.length === 0 && !loading && (
 <div className="editorial-card text-center py-16">
 {selected.length === 0 ? (
 <>
 <TrendingUp size={48} className="mx-auto mb-4 text-foreground/30"/>
 <p className="text-foreground/30 text-lg">Select schools above to compare ROI</p>
 </>
 ) : (
 <>
 <Calculator size={48} className="mx-auto mb-4 text-foreground/30"/>
 <p className="text-foreground/30">No ROI data available for selected schools</p>
 </>
 )}
 </div>
 )}

 <EmailCapture variant="contextual"source="roi"/>
 <ToolCrossLinks current="/roi"/>
 </div>
 </main>
 );
}
