"use client";

import { useState, useEffect } from"react";
import { motion } from"framer-motion";
import {
 Clock, DollarSign, CheckCircle2, XCircle,
 User, GraduationCap, Building2, Laptop,
 Briefcase, Zap,
} from"lucide-react";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

type SchoolEntry = {
 school_id: string;
 school_name: string;
 program_name: string;
 duration: string;
 total_cost_estimate: number;
};

type ProgramFormat = {
 format: string;
 display_name: string;
 typical_duration: string;
 schools: SchoolEntry[];
 pros: string[];
 cons: string[];
 best_for: string;
 avg_cost: number;
};

type FormatsResponse = {
 formats: ProgramFormat[];
};

/* ------------------------------------------------------------------ */
/* Constants */
/* ------------------------------------------------------------------ */

const FORMAT_TABS: { key: string; label: string; icon: React.ReactNode }[] = [
 { key:"2_year", label:"2-Year", icon: <GraduationCap size={14} /> },
 { key:"1_year", label:"1-Year", icon: <Zap size={14} /> },
 { key:"accelerated", label:"Accelerated", icon: <Clock size={14} /> },
 { key:"part_time", label:"Part-Time", icon: <Briefcase size={14} /> },
 { key:"executive", label:"Executive", icon: <Building2 size={14} /> },
 { key:"online", label:"Online", icon: <Laptop size={14} /> },
];

/* ------------------------------------------------------------------ */
/* Component */
/* ------------------------------------------------------------------ */

export default function ProgramFormatsPage() {
 const [formats, setFormats] = useState<ProgramFormat[]>([]);
 const [activeTab, setActiveTab] = useState("2_year");
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 apiFetch<FormatsResponse>("/api/program-formats")
 .then((data) => setFormats(data.formats))
 .catch((err) => setError(err instanceof Error ? err.message :"Failed to load formats"))
 .finally(() => setLoading(false));
 }, []);

 const activeFormat = formats.find((f) => f.format === activeTab);

 const fmtCost = (n: number) =>
"$"+ n.toLocaleString("en-US", { maximumFractionDigits: 0 });

 return (
 <main className="min-h-screen bg-background">
 {/* Hero */}
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-4xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 MBA Program Formats
 </h1>
 <p className="text-white/70 text-lg">
 Compare 2-year, 1-year, accelerated, part-time, executive, and online MBA programs.
 </p>
 </div>
 </section>

 <div className="max-w-4xl mx-auto px-6 py-10">
 {/* Tabs */}
 <div className="flex flex-wrap gap-2 mb-8">
 {FORMAT_TABS.map((tab) => (
 <button
 key={tab.key}
 onClick={() => setActiveTab(tab.key)}
 className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
 activeTab === tab.key
 ?"bg-primary text-foreground"
 :"bg-card border border-border/10 text-foreground/60 hover:border-primary/30 hover:text-foreground"
 }`}
 >
 {tab.icon} {tab.label}
 </button>
 ))}
 </div>

 {loading && (
 <div className="editorial-card p-12 text-center text-foreground/40">Loading program formats...</div>
 )}

 {error && (
 <div className="editorial-card p-8 text-center text-red-600">{error}</div>
 )}

 {activeFormat && (
 <motion.div
 key={activeFormat.format}
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.25 }}
 >
 {/* Header Card */}
 <div className="editorial-card p-6 mb-6">
 <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
 <div>
 <h2 className="text-xl font-bold text-foreground heading-serif font-[family-name:var(--font-heading)]">
 {activeFormat.display_name}
 </h2>
 <p className="text-sm text-foreground/50 mt-1">
 Typical duration: {activeFormat.typical_duration}
 </p>
 </div>
 <div className="flex items-center gap-2 text-2xl font-bold text-foreground heading-serif font-[family-name:var(--font-heading)]">
 <DollarSign size={20} className="text-primary"/>
 {fmtCost(activeFormat.avg_cost)}
 <span className="text-xs font-normal text-foreground/40 ml-1">avg total</span>
 </div>
 </div>
 </div>

 {/* Best For Callout */}
 <div className="editorial-card p-5 mb-6 border-l-4 border-primary">
 <div className="flex items-start gap-3">
 <User size={16} className="text-primary mt-0.5 shrink-0"/>
 <div>
 <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/30 mb-1">Best For</p>
 <p className="text-sm text-foreground/70">{activeFormat.best_for}</p>
 </div>
 </div>
 </div>

 {/* Pros & Cons */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
 <div className="editorial-card p-5">
 <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-3">Pros</h3>
 <ul className="space-y-2">
 {activeFormat.pros.map((pro, i) => (
 <li key={i} className="flex items-start gap-2 text-sm text-foreground/70">
 <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0"/>
 {pro}
 </li>
 ))}
 </ul>
 </div>
 <div className="editorial-card p-5">
 <h3 className="text-xs font-bold uppercase tracking-widest text-red-500 mb-3">Cons</h3>
 <ul className="space-y-2">
 {activeFormat.cons.map((con, i) => (
 <li key={i} className="flex items-start gap-2 text-sm text-foreground/70">
 <XCircle size={14} className="text-red-400 mt-0.5 shrink-0"/>
 {con}
 </li>
 ))}
 </ul>
 </div>
 </div>

 {/* Schools Table */}
 <h2 className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-4">
 Programs
 </h2>
 <div className="editorial-card overflow-hidden">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-border/5 text-[10px] font-bold uppercase tracking-widest text-foreground/30">
 <th className="text-left px-4 py-3">Program</th>
 <th className="text-left px-4 py-3 hidden md:table-cell">School</th>
 <th className="text-right px-4 py-3">Duration</th>
 <th className="text-right px-4 py-3">Est. Cost</th>
 </tr>
 </thead>
 <tbody>
 {activeFormat.schools.map((school, i) => (
 <tr key={i} className="border-b border-border/5 last:border-0">
 <td className="px-4 py-3 font-medium text-foreground">{school.program_name}</td>
 <td className="px-4 py-3 text-foreground/50 hidden md:table-cell">{school.school_name}</td>
 <td className="px-4 py-3 text-right text-foreground/60">{school.duration}</td>
 <td className="px-4 py-3 text-right font-semibold text-foreground">
 {fmtCost(school.total_cost_estimate)}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </motion.div>
 )}

 <ToolCrossLinks current="/program-formats"/>
 </div>
 </main>
 );
}
