"use client";

import { useState, useEffect } from"react";
import { motion, AnimatePresence } from"framer-motion";
import {
 Plus, GraduationCap, Calendar, FileText, ChevronRight,
 Trash2, Search, LayoutGrid, List, CheckCircle2, Clock,
 AlertCircle,
} from"lucide-react";
import Link from"next/link";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import { EmailCapture } from"@/components/EmailCapture";
import { apiFetch } from"@/lib/api";

type UserSchool = {
 id: string;
 school_id: string;
 round: string | null;
 status: string;
 notes: string | null;
 priority: number;
};

type Deadline = { round: string; deadline: string; decision?: string };

type SchoolInfo = {
 id: string;
 name: string;
 location: string;
 gmat_avg: number;
 acceptance_rate: number;
 essay_count?: number;
 admission_deadlines?: Deadline[];
};

function getNextDeadline(deadlines: Deadline[] | undefined): { deadline: Deadline; daysLeft: number } | null {
 if (!deadlines || deadlines.length === 0) return null;
 const now = new Date();
 for (const dl of deadlines) {
 try {
 const parsed = new Date(dl.deadline +"1"); //"September 2025"→"September 2025 1"
 if (parsed >= now) {
 const daysLeft = Math.ceil((parsed.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
 return { deadline: dl, daysLeft };
 }
 } catch {
 continue;
 }
 }
 return null;
}

const STATUS_COLUMNS = ["researching","preparing","submitted","interview","decision"] as const;
type Status = (typeof STATUS_COLUMNS)[number];

const STATUS_LABELS: Record<Status, string> = {
 researching:"Researching",
 preparing:"Preparing",
 submitted:"Submitted",
 interview:"Interview",
 decision:"Decision",
};

const STATUS_COLORS: Record<Status, string> = {
 researching:"bg-muted text-muted-foreground border-border",
 preparing:"bg-amber-50 text-amber-700 border-amber-200",
 submitted:"bg-blue-50 text-blue-700 border-blue-200",
 interview:"bg-purple-50 text-purple-700 border-purple-200",
 decision:"bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function MySchoolsPage() {
 const [schools, setSchools] = useState<UserSchool[]>([]);
 const [allSchools, setAllSchools] = useState<SchoolInfo[]>([]);
 const [loading, setLoading] = useState(true);
 const [view, setView] = useState<"kanban"|"list">("kanban");
 const [showAddModal, setShowAddModal] = useState(false);
 const [search, setSearch] = useState("");
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 Promise.all([
 apiFetch<UserSchool[]>("/api/user/schools"),
 apiFetch<SchoolInfo[]>("/api/schools"),
 ])
 .then(([userSchools, schoolList]) => {
 setSchools(userSchools);
 setAllSchools(schoolList);
 })
 .catch((e) => { console.error(e); setError("Failed to load data. Please try again."); })
 .finally(() => setLoading(false));
 }, []);

 const addSchool = async (schoolId: string, round?: string) => {
 try {
 setError(null);
 const entry = await apiFetch<UserSchool>("/api/user/schools", {
 method:"POST",
 body: JSON.stringify({ school_id: schoolId, round }),
 });
 setSchools((prev) => [...prev, entry]);
 setShowAddModal(false);
 } catch (e) {
 console.error(e);
 setError("Failed to add school. Please try again.");
 }
 };

 const updateStatus = async (entryId: string, status: string) => {
 try {
 setError(null);
 const updated = await apiFetch<UserSchool>(`/api/user/schools/${entryId}`, {
 method:"PUT",
 body: JSON.stringify({ status }),
 });
 setSchools((prev) => prev.map((s) => (s.id === entryId ? updated : s)));
 } catch (e) {
 console.error(e);
 setError("Failed to update status. Please try again.");
 }
 };

 const removeSchool = async (entryId: string) => {
 if (!confirm("Remove this school from your tracker?")) return;
 try {
 setError(null);
 await apiFetch(`/api/user/schools/${entryId}`, { method:"DELETE"});
 setSchools((prev) => prev.filter((s) => s.id !== entryId));
 } catch (e) {
 console.error(e);
 setError("Failed to remove school. Please try again.");
 }
 };

 const getSchoolInfo = (schoolId: string) =>
 allSchools.find((s) => s.id === schoolId);

 if (loading) {
 return (
 <div className="min-h-screen flex items-center justify-center">
 <div className="w-10 h-10 border-4 border-border/5 border-t-jet rounded-full animate-spin"/>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-background">
 {/* Header */}
 <header className="bg-card border-b border-border/5 pb-10 px-8">
 <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-end gap-6">
 <div>
 <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary mb-3">
 <span className="w-2 h-2 bg-primary rounded-full"/> Application Tracker
 </div>
 <h1 className="heading-serif text-4xl md:text-5xl text-foreground">My Schools</h1>
 <p className="text-muted-foreground/50 mt-2">
 {schools.length} school{schools.length !== 1 &&"s"} in your portfolio
 </p>
 </div>

 <div className="flex items-center gap-3">
 <div className="flex bg-background p-1 rounded-lg border border-border/5">
 <button
 onClick={() => setView("kanban")}
 className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-all ${view ==="kanban" ?"bg-card text-foreground":"text-muted-foreground/40"}`}
 >
 <LayoutGrid size={14} /> Board
 </button>
 <button
 onClick={() => setView("list")}
 className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-all ${view ==="list" ?"bg-card text-foreground":"text-muted-foreground/40"}`}
 >
 <List size={14} /> List
 </button>
 </div>
 <button
 onClick={() => setShowAddModal(true)}
 className="bg-foreground text-white px-4 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-foreground/80 transition-colors"
 >
 <Plus size={14} /> Add School
 </button>
 </div>
 </div>
 </header>

 <main className="max-w-7xl mx-auto px-8 py-10">
 {error && (
 <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg text-sm mb-6">
 {error}
 <button onClick={() => setError(null)} className="ml-4 text-red-600 font-bold">&times;</button>
 </div>
 )}

 {schools.length === 0 ? (
 <div className="max-w-lg mx-auto text-center py-16">
 <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
 <GraduationCap size={36} className="text-primary"/>
 </div>
 <h2 className="heading-serif text-2xl text-foreground mb-2">Build your application portfolio</h2>
 <p className="text-muted-foreground/50 mb-8">Add target schools and track your progress from research to decision day.</p>
 <div className="flex flex-col sm:flex-row gap-3 justify-center">
 <button
 onClick={() => setShowAddModal(true)}
 className="bg-foreground text-white px-6 py-3 font-bold hover:bg-foreground/80 transition-colors flex items-center justify-center gap-2"
 >
 <Plus size={16} /> Add Your First School
 </button>
 <Link
 href="/schools"
 className="border border-border/10 text-foreground px-6 py-3 font-bold hover:border-border/30 transition-colors flex items-center justify-center gap-2"
 >
 <Search size={16} /> Browse Directory
 </Link>
 </div>
 <div className="mt-10 grid grid-cols-3 gap-4 text-left">
 <div className="p-4 bg-card border border-border/5 rounded-lg">
 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 mb-1">Step 1</p>
 <p className="text-xs text-muted-foreground/60">Add 3-5 target schools</p>
 </div>
 <div className="p-4 bg-card border border-border/5 rounded-lg">
 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 mb-1">Step 2</p>
 <p className="text-xs text-muted-foreground/60">Move them through stages</p>
 </div>
 <div className="p-4 bg-card border border-border/5 rounded-lg">
 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 mb-1">Step 3</p>
 <p className="text-xs text-muted-foreground/60">Track deadlines &amp; essays</p>
 </div>
 </div>
 </div>
 ) : view ==="kanban" ? (
 <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
 {STATUS_COLUMNS.map((col) => {
 const items = schools.filter((s) => s.status === col);
 return (
 <div key={col} className="space-y-3">
 <div className="flex justify-between items-center mb-2">
 <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/30 flex items-center gap-2">
 {STATUS_LABELS[col]}{""}
 <span className="bg-foreground/5 px-2 py-0.5 rounded-full text-[9px]">{items.length}</span>
 </h3>
 </div>
 <div className="min-h-[200px] space-y-3">
 <AnimatePresence>
 {items.map((entry) => {
 const info = getSchoolInfo(entry.school_id);
 return (
 <motion.div
 key={entry.id}
 layoutId={entry.id}
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 className="bg-card p-4 border border-border/5 rounded-lg group hover:border-border/20 hover: transition-all"
 >
 <div className="flex justify-between items-start mb-2">
 <Link href={`/school/${entry.school_id}`} className="font-bold text-sm text-foreground leading-tight hover:text-primary transition-colors block">
 {info?.name || entry.school_id}
 </Link>
 <button
 onClick={() => removeSchool(entry.id)}
 aria-label={`Remove ${info?.name || "school"} from tracker`}
 className="md:opacity-0 md:group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"
 >
 <Trash2 size={12} />
 </button>
 </div>
 {info && (
 <p className="text-[10px] text-muted-foreground/40 mb-2">
 {info.location} &middot; {info.gmat_avg} GMAT avg
 </p>
 )}
 {(() => {
 const next = info ? getNextDeadline(info.admission_deadlines) : null;
 return next ? (
 <div className="flex items-center gap-1.5 mb-1">
 <Calendar size={9} className="text-muted-foreground/30"/>
 <span className="text-[9px] text-muted-foreground/40">{next.deadline.round}</span>
 <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${next.daysLeft <= 14 ?"bg-red-100 text-red-700": next.daysLeft <= 30 ?"bg-amber-100 text-amber-700":"bg-emerald-100 text-emerald-700"}`}>
 {next.daysLeft}d
 </span>
 </div>
 ) : entry.round ? (
 <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 font-bold uppercase tracking-widest">
 {entry.round}
 </span>
 ) : null;
 })()}
 {/* Move buttons - always visible on mobile, hover on desktop */}
 <div className="mt-3 pt-2 border-t border-border/5 flex gap-1 flex-wrap">
 {STATUS_COLUMNS.filter((s) => s !== col).map((target) => (
 <button
 key={target}
 onClick={() => updateStatus(entry.id, target)}
 className={`text-[8px] uppercase font-bold tracking-widest px-2 py-0.5 rounded border ${STATUS_COLORS[target]} md:opacity-0 md:group-hover:opacity-100 transition-all`}
 >
 {STATUS_LABELS[target]}
 </button>
 ))}
 </div>
 </motion.div>
 );
 })}
 </AnimatePresence>
 </div>
 </div>
 );
 })}
 </div>
 ) : (
 <div className="space-y-3">
 {schools.map((entry) => {
 const info = getSchoolInfo(entry.school_id);
 return (
 <div
 key={entry.id}
 className="bg-card p-5 border border-border/5 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4 group"
 >
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center text-foreground font-bold text-sm">
 {(info?.name || entry.school_id).charAt(0)}
 </div>
 <div>
 <h4 className="font-bold text-foreground">{info?.name || entry.school_id}</h4>
 <p className="text-xs text-muted-foreground/40">
 {info?.location} {entry.round && `· ${entry.round}`}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-4">
 <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${STATUS_COLORS[entry.status as Status] || STATUS_COLORS.researching}`}>
 {STATUS_LABELS[entry.status as Status] || entry.status}
 </span>
 <Link
 href={`/school/${entry.school_id}`}
 className="text-xs font-bold text-primary hover:text-foreground flex items-center gap-1"
 >
 Open <ChevronRight size={12} />
 </Link>
 <button
 onClick={() => removeSchool(entry.id)}
 className="md:opacity-0 md:group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"
 >
 <Trash2 size={14} />
 </button>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </main>

 {/* Add School Modal */}
 <AnimatePresence>
 {showAddModal && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 bg-foreground/50 z-50 flex items-center justify-center p-4"
 onClick={() => setShowAddModal(false)}
 onKeyDown={(e) => { if (e.key === "Escape") setShowAddModal(false); }}
 aria-hidden="true"
 >
 <motion.div
 role="dialog"
 aria-modal="true"
 aria-label="Add school to tracker"
 initial={{ scale: 0.95 }}
 animate={{ scale: 1 }}
 exit={{ scale: 0.95 }}
 className="bg-card max-w-lg w-full max-h-[70vh] overflow-hidden flex flex-col"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="p-6 border-b border-border/5">
 <h2 className="heading-serif text-2xl text-foreground mb-3">Add School</h2>
 <div className="relative">
 <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/30"/>
 <input
 type="text"
 placeholder="Search schools..."
 aria-label="Search schools by name"
 className="w-full pl-10 pr-4 py-3 border border-border/10 focus:border-border focus:outline-none text-sm"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 autoFocus
 />
 </div>
 </div>
 <div className="overflow-y-auto flex-1 p-4 space-y-2">
 {allSchools
 .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
 .filter((s) => !schools.some((us) => us.school_id === s.id))
 .slice(0, 20)
 .map((s) => (
 <button
 key={s.id}
 onClick={() => addSchool(s.id)}
 className="w-full text-left p-3 border border-border/5 hover:border-primary hover:bg-primary/5 transition-all flex justify-between items-center group"
 >
 <div>
 <p className="font-bold text-sm text-foreground">{s.name}</p>
 <p className="text-[10px] text-muted-foreground/40">
 {s.location} &middot; {s.gmat_avg} GMAT &middot; {s.acceptance_rate}% acceptance
 </p>
 </div>
 <Plus size={16} className="text-muted-foreground/20 group-hover:text-primary transition-colors"/>
 </button>
 ))}
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 <div className="max-w-5xl mx-auto px-6 pb-12">
 <EmailCapture variant="contextual"source="my-schools"/>
 <ToolCrossLinks current="/my-schools"/>
 </div>
 </div>
 );
}
