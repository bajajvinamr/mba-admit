"use client";

import { useState, useEffect } from"react";
import { motion } from"framer-motion";
import {
 Clock, CheckCircle2, Circle, ArrowRight, Plus, X,
 GraduationCap, FileText, Mic, Send, Trophy, Calendar,
 ChevronRight, AlertTriangle,
} from"lucide-react";
import Link from"next/link";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

/* ── Types ─────────────────────────────────────────────────────────── */

type TimelineStep = {
 id: string;
 label: string;
 status:"done"|"active"|"upcoming";
 date?: string;
 note?: string;
};

type SchoolTimeline = {
 school: string;
 round: string;
 steps: TimelineStep[];
};

const STORAGE_KEY ="admitcompass_timelines";

const DEFAULT_STEPS: Omit<TimelineStep,"status">[] = [
 { id:"research", label:"Research School"},
 { id:"profile", label:"Complete Profile Report"},
 { id:"essays", label:"Draft Essays"},
 { id:"resume", label:"Refine Resume"},
 { id:"recs", label:"Secure Recommendations"},
 { id:"review", label:"Final Review"},
 { id:"submit", label:"Submit Application"},
 { id:"interview", label:"Interview Prep"},
 { id:"decision", label:"Decision"},
];

const STEP_LINKS: Record<string, { href: string; label: string }> = {
 research: { href:"/schools", label:"Browse Schools"},
 profile: { href:"/profile-report", label:"Get Report"},
 essays: { href:"/essay-drafts", label:"Essay Drafts"},
 resume: { href:"/roaster", label:"Resume Roaster"},
 recs: { href:"/recommenders", label:"Rec Strategy"},
 review: { href:"/checklist", label:"App Checklist"},
 interview: { href:"/interview", label:"Mock Interview"},
};

const STEP_ICONS: Record<string, React.ReactNode> = {
 research: <GraduationCap size={16} />,
 profile: <GraduationCap size={16} />,
 essays: <FileText size={16} />,
 resume: <FileText size={16} />,
 recs: <Mic size={16} />,
 review: <CheckCircle2 size={16} />,
 submit: <Send size={16} />,
 interview: <Mic size={16} />,
 decision: <Trophy size={16} />,
};

/* ── Page ──────────────────────────────────────────────────────────── */

export default function TimelinePage() {
 const [timelines, setTimelines] = useState<SchoolTimeline[]>([]);
 const [showNew, setShowNew] = useState(false);
 const [newSchool, setNewSchool] = useState("");
 const [newRound, setNewRound] = useState("R1");

 useEffect(() => {
 const raw = localStorage.getItem(STORAGE_KEY);
 if (raw) setTimelines(JSON.parse(raw));
 }, []);

 const persist = (t: SchoolTimeline[]) => {
 setTimelines(t);
 localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
 };

 const addTimeline = () => {
 if (!newSchool.trim()) return;
 const tl: SchoolTimeline = {
 school: newSchool.trim(),
 round: newRound,
 steps: DEFAULT_STEPS.map((s, i) => ({
 ...s,
 status: i === 0 ?"active":"upcoming",
 })),
 };
 persist([...timelines, tl]);
 setNewSchool("");
 setShowNew(false);
 };

 const removeTimeline = (idx: number) => {
 persist(timelines.filter((_, i) => i !== idx));
 };

 const toggleStep = (tlIdx: number, stepIdx: number) => {
 const updated = [...timelines];
 const steps = [...updated[tlIdx].steps];
 const current = steps[stepIdx];

 if (current.status ==="upcoming") {
 steps[stepIdx] = { ...current, status:"active"};
 } else if (current.status ==="active") {
 steps[stepIdx] = { ...current, status:"done", date: new Date().toISOString().split("T")[0] };
 // Auto-advance next step
 if (stepIdx + 1 < steps.length && steps[stepIdx + 1].status ==="upcoming") {
 steps[stepIdx + 1] = { ...steps[stepIdx + 1], status:"active"};
 }
 } else {
 steps[stepIdx] = { ...current, status:"active", date: undefined };
 }

 updated[tlIdx] = { ...updated[tlIdx], steps };
 persist(updated);
 };

 const completedPct = (steps: TimelineStep[]) =>
 Math.round((steps.filter((s) => s.status ==="done").length / steps.length) * 100);

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-4xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Application Timeline
 </h1>
 <p className="text-white/70 text-lg">
 Track your journey from research to decision - one step at a time.
 </p>
 </div>
 </section>

 <div className="max-w-4xl mx-auto px-6 py-10">
 <div className="flex items-center justify-between mb-8">
 <p className="text-sm text-muted-foreground">
 {timelines.length} school{timelines.length !== 1 ?"s":""} tracked
 </p>
 <button onClick={() => setShowNew(!showNew)}
 className="flex items-center gap-1.5 px-4 py-2 bg-foreground text-white text-sm font-medium rounded-lg hover:bg-foreground/80">
 <Plus size={14} /> Add School
 </button>
 </div>

 {showNew && (
 <div className="editorial-card p-6 mb-8">
 <div className="flex gap-3">
 <input type="text" placeholder="School name"
 value={newSchool} onChange={(e) => setNewSchool(e.target.value)}
 className="flex-1 px-3 py-2 border border-border/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"/>
 <select value={newRound} onChange={(e) => setNewRound(e.target.value)}
 className="px-3 py-2 border border-border/10 rounded text-sm">
 {["R1","R2","R3","ED","Rolling"].map((r) => (
 <option key={r} value={r}>{r}</option>
 ))}
 </select>
 <button onClick={addTimeline}
 className="px-4 py-2 bg-primary text-foreground text-sm font-semibold rounded hover:bg-primary/90">
 Add
 </button>
 </div>
 </div>
 )}

 {/* Timelines */}
 <div className="space-y-8">
 {timelines.map((tl, tlIdx) => {
 const pct = completedPct(tl.steps);
 return (
 <motion.div
 key={`${tl.school}-${tlIdx}`}
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 className="editorial-card overflow-hidden"
 >
 {/* Header */}
 <div className="px-6 py-4 flex items-center justify-between border-b border-border/5">
 <div>
 <h3 className="font-semibold text-foreground">{tl.school}</h3>
 <span className="text-xs text-primary font-medium">{tl.round}</span>
 </div>
 <div className="flex items-center gap-3">
 <span className={`text-sm font-bold ${pct === 100 ?"text-emerald-600":"text-muted-foreground"}`}>
 {pct}%
 </span>
 <button onClick={() => removeTimeline(tlIdx)}
 className="text-muted-foreground hover:text-red-500 transition-colors">
 <X size={16} />
 </button>
 </div>
 </div>

 {/* Progress bar */}
 <div className="w-full bg-foreground/5 h-1">
 <motion.div
 className={`h-full ${pct === 100 ?"bg-emerald-500":"bg-primary"}`}
 animate={{ width: `${pct}%` }}
 transition={{ duration: 0.3 }}
 />
 </div>

 {/* Steps */}
 <div className="p-6">
 <div className="relative">
 {/* Vertical line */}
 <div className="absolute left-[15px] top-2 bottom-2 w-px bg-foreground/10"/>

 <div className="space-y-4">
 {tl.steps.map((step, sIdx) => {
 const link = STEP_LINKS[step.id];
 return (
 <div key={step.id} className="flex items-start gap-4 relative">
 <button
 onClick={() => toggleStep(tlIdx, sIdx)}
 className="relative z-10 flex-shrink-0 mt-0.5"
 >
 {step.status ==="done" ? (
 <CheckCircle2 size={18} className="text-emerald-500"/>
 ) : step.status ==="active" ? (
 <div className="w-[18px] h-[18px] rounded-full border-2 border-primary bg-primary/20"/>
 ) : (
 <Circle size={18} className="text-muted-foreground"/>
 )}
 </button>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <span className={`text-sm ${
 step.status ==="done" ?"text-muted-foreground line-through":
 step.status ==="active" ?"text-foreground font-medium":
"text-muted-foreground"
 }`}>
 {step.label}
 </span>
 {step.date && (
 <span className="text-[10px] text-muted-foreground">{step.date}</span>
 )}
 </div>
 {step.status ==="active" && link && (
 <Link href={link.href}
 className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 mt-1">
 {link.label} <ArrowRight size={10} />
 </Link>
 )}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 </motion.div>
 );
 })}
 </div>

 {timelines.length === 0 && (
 <div className="text-center py-20 text-muted-foreground">
 <Calendar size={48} className="mx-auto mb-4 opacity-30"/>
 <p className="text-sm mb-4">Track your application journey step by step</p>
 <button onClick={() => setShowNew(true)}
 className="text-sm text-primary hover:text-primary/80 font-medium">
 Add your first school
 </button>
 </div>
 )}

 <ToolCrossLinks current="/timeline"/>
 </div>
 </main>
 );
}
