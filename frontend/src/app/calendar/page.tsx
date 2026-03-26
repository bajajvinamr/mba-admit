"use client";

import { useState, useEffect, useMemo } from"react";
import { motion, AnimatePresence } from"framer-motion";
import {
 Calendar, Clock, GraduationCap, Filter, ChevronDown,
 ArrowRight, AlertCircle, CheckCircle2, X,
} from"lucide-react";
import Link from"next/link";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

/* ── Types ─────────────────────────────────────────────────────────── */

type CalEvent = {
 school_id: string;
 school_name: string;
 round: string;
 type:"deadline"|"decision";
 date: string;
 label: string;
};

type CalResponse = {
 events: CalEvent[];
 months: Record<string, CalEvent[]>;
 school_count: number;
 total_events: number;
};

type School = { id: string; name: string };

const SCHOOL_COLORS = [
"bg-blue-500","bg-emerald-500","bg-purple-500","bg-amber-500",
"bg-rose-500","bg-cyan-500","bg-indigo-500","bg-pink-500",
"bg-teal-500","bg-orange-500",
];

const TOP_SCHOOLS = [
 { id:"hbs", name:"HBS"},
 { id:"gsb", name:"Stanford"},
 { id:"wharton", name:"Wharton"},
 { id:"booth", name:"Booth"},
 { id:"kellogg", name:"Kellogg"},
 { id:"sloan", name:"Sloan"},
 { id:"cbs", name:"Columbia"},
 { id:"tuck", name:"Tuck"},
 { id:"haas", name:"Haas"},
 { id:"ross", name:"Ross"},
];

function daysUntil(dateStr: string): number {
 const d = new Date(dateStr);
 const now = new Date();
 return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatMonth(key: string): string {
 const [y, m] = key.split("-");
 const d = new Date(parseInt(y), parseInt(m) - 1);
 return d.toLocaleDateString("en-US", { month:"long", year:"numeric"});
}

function formatDate(dateStr: string): string {
 return new Date(dateStr).toLocaleDateString("en-US", {
 month:"short", day:"numeric", year:"numeric",
 });
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function CalendarPage() {
 const [selected, setSelected] = useState<Set<string>>(new Set(["hbs","gsb","wharton"]));
 const [data, setData] = useState<CalResponse | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [typeFilter, setTypeFilter] = useState<"all"|"deadline"|"decision">("all");

 const schoolColorMap = useMemo(() => {
 const map: Record<string, string> = {};
 [...selected].forEach((id, i) => {
 map[id] = SCHOOL_COLORS[i % SCHOOL_COLORS.length];
 });
 return map;
 }, [selected]);

 useEffect(() => {
 if (selected.size === 0) {
 setData(null);
 setLoading(false);
 return;
 }
 setLoading(true);
 setError(null);
 const ids = [...selected].join(",");
 apiFetch<CalResponse>(`/api/schools/deadlines/calendar?school_ids=${ids}`)
 .then(setData)
 .catch(() => { setData(null); setError("Failed to load calendar data. Please try again."); })
 .finally(() => setLoading(false));
 }, [selected]);

 const toggleSchool = (id: string) => {
 setSelected((prev) => {
 const next = new Set(prev);
 next.has(id) ? next.delete(id) : next.add(id);
 return next;
 });
 };

 const sortedMonths = data
 ? Object.keys(data.months).sort()
 : [];

 const filteredEvents = (events: CalEvent[]) =>
 typeFilter ==="all" ? events : events.filter((e) => e.type === typeFilter);

 return (
 <main className="min-h-screen bg-background">
 {/* Header */}
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-4xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Deadline Calendar
 </h1>
 <p className="text-white/70 text-lg">
 Every round, every deadline, every decision date - at a glance.
 </p>
 </div>
 </section>

 <div className="max-w-4xl mx-auto px-6 py-10">
 {/* School Pills */}
 <div className="editorial-card p-6 mb-8">
 <p className="text-sm font-medium text-muted-foreground mb-3">Filter by school</p>
 <div className="flex flex-wrap gap-2">
 {TOP_SCHOOLS.map((s) => (
 <button
 key={s.id}
 onClick={() => toggleSchool(s.id)}
 className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
 selected.has(s.id)
 ?"bg-foreground text-white"
 :"bg-card text-muted-foreground border border-border/10 hover:border-border/30"
 }`}
 >
 {s.name}
 </button>
 ))}
 </div>

 {/* Type filter */}
 <div className="flex gap-2 mt-4 pt-4 border-t border-border/5">
 {(["all","deadline","decision"] as const).map((t) => (
 <button
 key={t}
 onClick={() => setTypeFilter(t)}
 className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
 typeFilter === t
 ?"bg-primary/10 text-primary"
 :"text-muted-foreground hover:text-muted-foreground"
 }`}
 >
 {t ==="all" ?"All Events": t ==="deadline" ?"Deadlines":"Decisions"}
 </button>
 ))}
 </div>
 </div>

 {error && (
 <div role="alert" className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg text-sm mb-4">
 {error}
 </div>
 )}

 {loading && (
 <div className="text-center py-16 text-muted-foreground">
 <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"/>
 Loading calendar...
 </div>
 )}

 {data && !loading && sortedMonths.length > 0 && (
 <div className="space-y-8">
 {sortedMonths.map((monthKey) => {
 const events = filteredEvents(data.months[monthKey]);
 if (events.length === 0) return null;
 return (
 <motion.div
 key={monthKey}
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 >
 <h2 className="heading-serif text-xl font-[family-name:var(--font-heading)] text-foreground mb-4">
 {formatMonth(monthKey)}
 </h2>
 <div className="space-y-2">
 {events
 .sort((a, b) => a.date.localeCompare(b.date))
 .map((ev, i) => {
 const days = daysUntil(ev.date);
 const isPast = days < 0;
 const isUrgent = days >= 0 && days <= 14;
 return (
 <motion.div
 key={`${ev.school_id}-${ev.round}-${ev.type}-${i}`}
 initial={{ opacity: 0, x: -8 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: i * 0.03 }}
 className={`editorial-card p-4 flex items-center gap-4 ${isPast ?"opacity-40":""}`}
 >
 {/* Color dot */}
 <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
 ev.type ==="deadline" ?"bg-red-500":"bg-emerald-500"
 }`} />

 {/* School color bar */}
 <div className={`w-1 h-10 rounded-full flex-shrink-0 ${
 schoolColorMap[ev.school_id] ||"bg-gray-400"
 }`} />

 {/* Content */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <Link
 href={`/school/${ev.school_id}`}
 className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
 >
 {ev.school_name}
 </Link>
 <span className="text-xs text-muted-foreground">{ev.round}</span>
 </div>
 <p className="text-xs text-muted-foreground mt-0.5">{ev.label}</p>
 </div>

 {/* Date */}
 <div className="text-right flex-shrink-0">
 <p className="text-sm font-medium text-foreground">{formatDate(ev.date)}</p>
 {!isPast && (
 <span className={`text-xs font-medium ${
 isUrgent ?"text-red-600":"text-muted-foreground"
 }`}>
 {days === 0 ?"Today!": `${days}d away`}
 </span>
 )}
 {isPast && (
 <span className="text-xs text-muted-foreground">Passed</span>
 )}
 </div>
 </motion.div>
 );
 })}
 </div>
 </motion.div>
 );
 })}
 </div>
 )}

 {data && !loading && sortedMonths.length === 0 && (
 <div className="text-center py-16 text-muted-foreground">
 <Calendar size={48} className="mx-auto mb-4 opacity-30"/>
 <p>No events found for selected filters</p>
 </div>
 )}

 {!loading && selected.size === 0 && (
 <div className="text-center py-16 text-muted-foreground">
 <Calendar size={48} className="mx-auto mb-4 opacity-30"/>
 <p>Select schools above to see their deadlines</p>
 </div>
 )}

 {/* Legend */}
 {data && !loading && sortedMonths.length > 0 && (
 <div className="mt-8 editorial-card p-4 flex items-center gap-6 text-xs text-muted-foreground">
 <div className="flex items-center gap-2">
 <div className="w-3 h-3 rounded-full bg-red-500"/>
 Application Deadline
 </div>
 <div className="flex items-center gap-2">
 <div className="w-3 h-3 rounded-full bg-emerald-500"/>
 Decision Release
 </div>
 </div>
 )}

 <ToolCrossLinks current="/calendar"/>
 </div>
 </main>
 );
}
