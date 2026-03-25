"use client";

import { useState, useEffect, useCallback, useMemo } from"react";
import { motion, AnimatePresence } from"framer-motion";
import {
 CheckCircle2, Circle, ChevronDown, ChevronRight, Clock,
 FileText, GraduationCap, MessageSquare, Filter, Search,
 AlertTriangle, Calendar, ArrowRight,
} from"lucide-react";
import Link from"next/link";
import { apiFetch } from"@/lib/api";
import { useSchoolNames } from"@/hooks/useSchoolNames";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import { EmailCapture } from"@/components/EmailCapture";

/* ── Types ─────────────────────────────────────────────────────────── */

type ChecklistItem = {
 id: string;
 label: string;
 detail: string;
 category: string;
 required: boolean;
};

type Deadline = {
 round: string;
 deadline: string;
 decision: string;
};

type ChecklistData = {
 school_id: string;
 school_name: string;
 total_items: number;
 categories: Record<string, number>;
 checklist: ChecklistItem[];
 deadlines: Deadline[];
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
 requirements: <GraduationCap size={16} />,
 essays: <FileText size={16} />,
 questions: <MessageSquare size={16} />,
 deadlines: <Calendar size={16} />,
};

const STORAGE_KEY = (id: string) => `admitcompass_checklist_${id}`;

/* ── Page ──────────────────────────────────────────────────────────── */

export default function ChecklistPage() {
 const { schools: rawSchools, error: schoolsError } = useSchoolNames();
 const schools = useMemo(
 () => rawSchools.filter((s) => s.name).sort((a, b) => a.name.localeCompare(b.name)),
 [rawSchools],
 );
 const [schoolId, setSchoolId] = useState("");
 const [data, setData] = useState<ChecklistData | null>(null);
 const [loading, setLoading] = useState(false);
 const [checked, setChecked] = useState<Set<string>>(new Set());
 const [filter, setFilter] = useState("all");
 const [expanded, setExpanded] = useState<Set<string>>(new Set());
 const [error, setError] = useState<string | null>(null);

 /* Fetch checklist */
 const fetchChecklist = useCallback(async (id: string) => {
 if (!id) return;
 setLoading(true);
 try {
 setError(null);
 const res = await apiFetch<ChecklistData>(`/api/schools/${id}/checklist`);
 setData(res);
 const saved = localStorage.getItem(STORAGE_KEY(id));
 setChecked(saved ? new Set(JSON.parse(saved)) : new Set());
 } catch {
 setData(null);
 setError("Could not load checklist for this school. Try a different program.");
 } finally {
 setLoading(false);
 }
 }, []);

 useEffect(() => {
 if (schoolId) fetchChecklist(schoolId);
 }, [schoolId, fetchChecklist]);

 /* Toggle check */
 const toggle = (itemId: string) => {
 setChecked((prev) => {
 const next = new Set(prev);
 next.has(itemId) ? next.delete(itemId) : next.add(itemId);
 if (schoolId) localStorage.setItem(STORAGE_KEY(schoolId), JSON.stringify([...next]));
 return next;
 });
 };

 const toggleExpand = (itemId: string) => {
 setExpanded((prev) => {
 const next = new Set(prev);
 next.has(itemId) ? next.delete(itemId) : next.add(itemId);
 return next;
 });
 };

 const filtered = data?.checklist.filter((i) => filter ==="all" || i.category === filter) ?? [];
 const progress = data ? Math.round((checked.size / data.total_items) * 100) : 0;

 return (
 <main className="min-h-screen bg-background">
 {/* Header */}
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-3xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Application Checklist
 </h1>
 <p className="text-white/70 text-lg">
 Track every requirement, essay, and deadline - never miss a step.
 </p>
 </div>
 </section>

 <div className="max-w-3xl mx-auto px-6 py-10">
 {/* School Selector */}
 <div className="editorial-card p-6 mb-8">
 <label className="block text-sm font-medium text-foreground/60 mb-2">Select School</label>
 {schoolsError && <p className="text-red-500 text-xs mb-1">{schoolsError}</p>}
 <select
 value={schoolId}
 onChange={(e) => setSchoolId(e.target.value)}
 className="w-full border border-border/10 rounded-lg px-4 py-3 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
 >
 <option value="">Choose a school...</option>
 {schools.map((s) => (
 <option key={s.id} value={s.id}>{s.name}</option>
 ))}
 </select>
 </div>

 {error && (
 <div role="alert" className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg text-sm mb-6 flex justify-between items-center">
 <span>{error}</span>
 <button onClick={() => setError(null)} className="ml-4 text-red-600 font-bold">&times;</button>
 </div>
 )}

 {loading && (
 <div className="text-center py-16 text-foreground/40">
 <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"/>
 Loading checklist...
 </div>
 )}

 {data && !loading && (
 <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
 {/* Progress */}
 <div className="editorial-card p-6 mb-6">
 <div className="flex items-center justify-between mb-3">
 <h2 className="font-semibold text-foreground">{data.school_name}</h2>
 <span className="text-sm font-medium text-foreground/60">
 {checked.size}/{data.total_items} complete
 </span>
 </div>
 <div className="w-full bg-foreground/5 rounded-full h-3 overflow-hidden">
 <motion.div
 className={`h-full rounded-full ${progress === 100 ?"bg-emerald-500":"bg-primary"}`}
 initial={{ width: 0 }}
 animate={{ width: `${progress}%` }}
 transition={{ duration: 0.5 }}
 />
 </div>
 <p className="text-xs text-foreground/40 mt-2">
 {progress === 100 ?"All items complete! You're ready to submit.": `${progress}% complete`}
 </p>
 </div>

 {/* Category Filters */}
 <div className="flex gap-2 mb-6 flex-wrap">
 {["all", ...Object.keys(data.categories)].map((cat) => (
 <button
 key={cat}
 onClick={() => setFilter(cat)}
 className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
 filter === cat
 ?"bg-foreground text-white"
 :"bg-card text-foreground/60 hover:bg-foreground/5 border border-border/10"
 }`}
 >
 {cat ==="all" ?"All": cat.charAt(0).toUpperCase() + cat.slice(1)}
 {cat !=="all" && (
 <span className="ml-1.5 text-xs opacity-60">({data.categories[cat]})</span>
 )}
 </button>
 ))}
 </div>

 {/* Checklist Items */}
 <div className="space-y-2 mb-8">
 <AnimatePresence mode="popLayout">
 {filtered.map((item) => (
 <motion.div
 key={item.id}
 layout
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -8 }}
 className="editorial-card overflow-hidden"
 >
 <div className="flex items-start gap-3 p-4">
 <button
 onClick={() => toggle(item.id)}
 className="mt-0.5 flex-shrink-0"
 >
 {checked.has(item.id) ? (
 <CheckCircle2 size={22} className="text-emerald-500"/>
 ) : (
 <Circle size={22} className="text-foreground/20 hover:text-foreground/40"/>
 )}
 </button>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <span
 className={`font-medium text-sm ${
 checked.has(item.id) ?"line-through text-foreground/30":"text-foreground"
 }`}
 >
 {item.label}
 </span>
 {item.required && (
 <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded font-medium">
 Required
 </span>
 )}
 <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">
 {item.category}
 </span>
 </div>
 {item.detail && (
 <button
 onClick={() => toggleExpand(item.id)}
 className="text-xs text-foreground/40 hover:text-foreground/60 mt-1 flex items-center gap-1"
 >
 {expanded.has(item.id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
 Details
 </button>
 )}
 <AnimatePresence>
 {expanded.has(item.id) && item.detail && (
 <motion.p
 initial={{ height: 0, opacity: 0 }}
 animate={{ height:"auto", opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 className="text-xs text-foreground/50 mt-2 leading-relaxed overflow-hidden"
 >
 {item.detail}
 </motion.p>
 )}
 </AnimatePresence>
 </div>
 </div>
 </motion.div>
 ))}
 </AnimatePresence>
 </div>

 {/* Deadlines */}
 {data.deadlines.length > 0 && (
 <div className="editorial-card p-6">
 <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
 <Clock size={18} className="text-primary"/> Deadlines
 </h3>
 <div className="space-y-3">
 {data.deadlines.map((d) => (
 <div key={d.round} className="flex items-center justify-between py-2 border-b border-border/5 last:border-0">
 <span className="font-medium text-sm text-foreground">{d.round}</span>
 <div className="text-right text-xs">
 <span className="text-red-600 font-medium">{d.deadline}</span>
 <span className="text-foreground/40 ml-3">Decision: {d.decision}</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* CTA */}
 <div className="mt-8 text-center">
 <Link
 href={`/school/${schoolId}`}
 className="inline-flex items-center gap-2 text-primary hover:text-primary/80 text-sm font-medium"
 >
 View full school profile <ArrowRight size={14} />
 </Link>
 </div>
 </motion.div>
 )}

 {!data && !loading && !schoolId && (
 <div className="text-center py-20 text-foreground/30">
 <CheckCircle2 size={48} className="mx-auto mb-4 opacity-30"/>
 <p>Select a school to see your application checklist</p>
 </div>
 )}

 <EmailCapture variant="contextual"source="checklist"/>
 <ToolCrossLinks current="/checklist"/>
 </div>
 </main>
 );
}
