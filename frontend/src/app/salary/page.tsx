"use client";

import { useState, useMemo } from"react";
import { motion } from"framer-motion";
import {
 DollarSign, TrendingUp, Briefcase, MapPin, GraduationCap, Lightbulb, ChevronDown,
} from"lucide-react";
import { apiFetch } from"@/lib/api";
import { useSchoolNames } from"@/hooks/useSchoolNames";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import { EmailCapture } from"@/components/EmailCapture";
import { useUsage } from"@/hooks/useUsage";
import { UsageGate } from"@/components/UsageGate";

type SalaryResult = {
 market_range: { p25: number; p50: number; p75: number };
 adjusted_range: { p25: number; p50: number; p75: number };
 signing_bonus: number;
 salary_increase_pct: number;
 total_comp_first_year: number;
 negotiation_tips: string[];
 school_premium: number | null;
};

const ROLES = [
 { value:"consulting", label:"Consulting"},
 { value:"finance", label:"Finance"},
 { value:"tech", label:"Tech"},
 { value:"general", label:"General Management"},
];

const LOCATIONS = [
"New York","San Francisco","Chicago","Boston","Los Angeles","Other",
];

function fmt(n: number) {
 return "$"+ n.toLocaleString("en-US");
}

export default function SalaryPage() {
 const [salary, setSalary] = useState(85000);
 const [role, setRole] = useState("consulting");
 const [schoolId, setSchoolId] = useState("");
 const [yearsExp, setYearsExp] = useState(5);
 const [location, setLocation] = useState("New York");
 const [result, setResult] = useState<SalaryResult | null>(null);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState("");
 const { schools: rawSchools, error: schoolsError } = useSchoolNames();
 const schools = useMemo(
 () => rawSchools.filter((s) => s.name).sort((a, b) => a.name.localeCompare(b.name)),
 [rawSchools],
 );
 const usage = useUsage("salary_explorer");

 const calculate = async () => {
 setLoading(true);
 setError("");
 try {
 const res = await apiFetch<SalaryResult>("/api/salary-negotiation", {
 method:"POST",
 body: JSON.stringify({
 current_salary: salary,
 target_role: role,
 school_id: schoolId || null,
 years_exp: yearsExp,
 location: location.toLowerCase(),
 }),
 });
 setResult(res);
 usage.recordUse();
 } catch (e: unknown) {
 setError(e instanceof Error ? e.message :"Something went wrong");
 } finally {
 setLoading(false);
 }
 };

 // Bar chart helpers
 const barMin = result ? result.adjusted_range.p25 * 0.85 : 0;
 const barMax = result ? result.adjusted_range.p75 * 1.1 : 1;
 const barSpan = barMax - barMin || 1;
 const pct = (v: number) => ((v - barMin) / barSpan) * 100;

 return (
 <main className="min-h-screen bg-background">
 {/* Hero */}
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-4xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Salary Negotiation Calculator
 </h1>
 <p className="text-white/70 text-lg">
 Know your worth. See post-MBA salary ranges by role, location, and school tier.
 </p>
 </div>
 </section>

 <div className="max-w-4xl mx-auto px-6 py-10">
 {/* Inputs */}
 <div className="editorial-card p-6 mb-8">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
 {/* Current Salary */}
 <div>
 <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 block mb-2">
 Current Salary
 </label>
 <div className="relative">
 <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30"/>
 <input
 type="number"
 value={salary}
 onChange={(e) => setSalary(+e.target.value)}
 className="w-full pl-9 pr-4 py-3 border border-border/10 rounded-lg text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
 />
 </div>
 </div>

 {/* Target Role */}
 <div>
 <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 block mb-2">
 Target Role
 </label>
 <div className="relative">
 <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30"/>
 <select
 value={role}
 onChange={(e) => setRole(e.target.value)}
 className="w-full pl-9 pr-8 py-3 border border-border/10 rounded-lg text-sm font-medium appearance-none bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
 >
 {ROLES.map((r) => (
 <option key={r.value} value={r.value}>{r.label}</option>
 ))}
 </select>
 <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/30 pointer-events-none"/>
 </div>
 </div>

 {/* Location */}
 <div>
 <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 block mb-2">
 Location
 </label>
 <div className="relative">
 <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30"/>
 <select
 value={location}
 onChange={(e) => setLocation(e.target.value)}
 className="w-full pl-9 pr-8 py-3 border border-border/10 rounded-lg text-sm font-medium appearance-none bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
 >
 {LOCATIONS.map((l) => (
 <option key={l} value={l}>{l}</option>
 ))}
 </select>
 <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/30 pointer-events-none"/>
 </div>
 </div>

 {/* Years of Experience */}
 <div>
 <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 block mb-2">
 Years of Experience
 </label>
 <input
 type="number"
 min={0}
 max={30}
 value={yearsExp}
 onChange={(e) => setYearsExp(+e.target.value)}
 className="w-full px-4 py-3 border border-border/10 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
 />
 </div>

 {/* School (optional) */}
 <div className="md:col-span-2">
 <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 block mb-2">
 MBA School <span className="text-foreground/20">(optional)</span>
 </label>
 {schoolsError && <p className="text-red-500 text-xs mb-1">{schoolsError}</p>}
 <div className="relative">
 <GraduationCap size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30"/>
 <select
 value={schoolId}
 onChange={(e) => setSchoolId(e.target.value)}
 className="w-full pl-9 pr-8 py-3 border border-border/10 rounded-lg text-sm font-medium appearance-none bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
 >
 <option value="">No school selected</option>
 {schools.map((s) => (
 <option key={s.id} value={s.id}>{s.name}</option>
 ))}
 </select>
 <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/30 pointer-events-none"/>
 </div>
 </div>
 </div>

 <button
 onClick={calculate}
 disabled={loading || salary <= 0}
 className="mt-6 w-full md:w-auto px-8 py-3 bg-foreground text-white font-bold text-sm uppercase tracking-widest rounded-lg hover:bg-foreground/90 disabled:opacity-40 transition-colors"
 >
 {loading ?"Calculating...":"Calculate"}
 </button>
 </div>

 {error && (
 <div className="editorial-card p-4 mb-6 border-red-200 bg-red-50 text-red-700 text-sm">
 {error}
 </div>
 )}

 {/* Results */}
 <UsageGate feature="salary_explorer">
 {result && !loading && (
 <motion.div
 initial={{ opacity: 0, y: 16 }}
 animate={{ opacity: 1, y: 0 }}
 className="space-y-6"
 >
 {/* Big numbers row */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="editorial-card p-6 text-center">
 <p className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-1">Salary Increase</p>
 <p className={`text-4xl font-bold ${result.salary_increase_pct >= 0 ?"text-emerald-600":"text-red-600"}`}>
 {result.salary_increase_pct > 0 ?"+":""}{result.salary_increase_pct}%
 </p>
 <p className="text-[10px] text-foreground/30 mt-1">vs. current salary</p>
 </div>
 <div className="editorial-card p-6 text-center">
 <p className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-1">First-Year Total Comp</p>
 <p className="text-4xl font-bold text-foreground">
 {fmt(result.total_comp_first_year)}
 </p>
 <p className="text-[10px] text-foreground/30 mt-1">base + signing bonus</p>
 </div>
 <div className="editorial-card p-6 text-center">
 <p className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-1">Signing Bonus</p>
 <p className="text-4xl font-bold text-foreground">
 {fmt(result.signing_bonus)}
 </p>
 <p className="text-[10px] text-foreground/30 mt-1">typical for {role}</p>
 </div>
 </div>

 {/* Salary range bar */}
 <div className="editorial-card p-6">
 <p className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-4">
 Market Salary Range (Location-Adjusted)
 </p>
 <div className="relative h-12 bg-foreground/5 rounded-lg overflow-hidden">
 {/* Range bar */}
 <div
 className="absolute top-2 bottom-2 bg-primary/30 rounded"
 style={{
 left: `${pct(result.adjusted_range.p25)}%`,
 width: `${pct(result.adjusted_range.p75) - pct(result.adjusted_range.p25)}%`,
 }}
 />
 {/* P50 line */}
 <div
 className="absolute top-1 bottom-1 w-0.5 bg-primary"
 style={{ left: `${pct(result.adjusted_range.p50)}%` }}
 />
 {/* Current salary marker */}
 {salary > 0 && salary >= barMin && salary <= barMax && (
 <div
 className="absolute top-0 bottom-0 w-0.5 bg-red-500"
 style={{ left: `${pct(salary)}%` }}
 >
 <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-red-500 whitespace-nowrap">
 You now
 </div>
 </div>
 )}
 </div>
 <div className="flex justify-between mt-2 text-[10px] text-foreground/40">
 <span>P25: {fmt(result.adjusted_range.p25)}</span>
 <span className="font-bold text-foreground/60">P50: {fmt(result.adjusted_range.p50)}</span>
 <span>P75: {fmt(result.adjusted_range.p75)}</span>
 </div>
 </div>

 {/* School Premium */}
 {result.school_premium !== null && result.school_premium > 0 && (
 <div className="editorial-card p-5 border-l-4 border-primary">
 <div className="flex items-start gap-3">
 <GraduationCap size={20} className="text-primary mt-0.5 shrink-0"/>
 <div>
 <p className="text-sm font-bold text-foreground">
 School Premium: +{(result.school_premium * 100).toFixed(0)}%
 </p>
 <p className="text-xs text-foreground/50 mt-1">
 {result.school_premium >= 0.05
 ?"M7 school graduates command a significant salary premium. Your adjusted range already reflects this."
 :"T15 school graduates earn above-market rates. Your adjusted range already includes this premium."}
 </p>
 </div>
 </div>
 </div>
 )}

 {/* Negotiation Tips */}
 <div className="editorial-card p-6">
 <div className="flex items-center gap-2 mb-4">
 <Lightbulb size={16} className="text-primary"/>
 <p className="text-xs font-bold uppercase tracking-widest text-foreground/40">
 Negotiation Tips
 </p>
 </div>
 <ul className="space-y-3">
 {result.negotiation_tips.map((tip, i) => (
 <li key={i} className="flex items-start gap-3">
 <span className="shrink-0 w-5 h-5 rounded-full bg-foreground text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
 {i + 1}
 </span>
 <p className="text-sm text-foreground/70 leading-relaxed">{tip}</p>
 </li>
 ))}
 </ul>
 </div>

 <EmailCapture variant="contextual"source="salary"/>
 <ToolCrossLinks current="/salary"count={6} />
 </motion.div>
 )}

 </UsageGate>

 {/* Empty state */}
 {!result && !loading && !error && (
 <div className="text-center py-16 text-foreground/20">
 <TrendingUp size={48} className="mx-auto mb-4 opacity-30"/>
 <p>Enter your details and hit Calculate to see your post-MBA salary range</p>
 </div>
 )}
 </div>
 </main>
 );
}
