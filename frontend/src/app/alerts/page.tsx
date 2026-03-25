"use client";

import { useState, useEffect, useMemo } from"react";
import { motion, AnimatePresence } from"framer-motion";
import {
 Bell, BellOff, Clock, GraduationCap, Calendar,
 Plus, X, Check, AlertTriangle, ArrowRight, Trash2,
} from"lucide-react";
import Link from"next/link";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

/* ── Types ─────────────────────────────────────────────────────────── */

type Alert = {
 id: string;
 school_id: string;
 school_name: string;
 round: string;
 deadline: string;
 remind_days_before: number;
 enabled: boolean;
 created_at: string;
};

type CalEvent = {
 school_id: string;
 school_name: string;
 round: string;
 type: string;
 date: string;
 label: string;
};

type CalResponse = {
 events: CalEvent[];
};

const STORAGE_KEY ="admitcompass_alerts";
const REMIND_OPTIONS = [1, 3, 7, 14, 30];

function daysUntil(dateStr: string): number {
 return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function AlertsPage() {
 const [alerts, setAlerts] = useState<Alert[]>([]);
 const [events, setEvents] = useState<CalEvent[]>([]);
 const [showAdd, setShowAdd] = useState(false);
 const [fetchError, setFetchError] = useState<string | null>(null);

 useEffect(() => {
 const raw = localStorage.getItem(STORAGE_KEY);
 if (raw) setAlerts(JSON.parse(raw));
 apiFetch<CalResponse>("/api/schools/deadlines/calendar")
 .then((r) => setEvents(r.events.filter((e) => e.type ==="deadline")))
 .catch(() => setFetchError("Failed to load deadlines. Please refresh."));
 }, []);

 const persist = (a: Alert[]) => {
 setAlerts(a);
 localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
 };

 const addAlert = (ev: CalEvent) => {
 if (alerts.some((a) => a.school_id === ev.school_id && a.round === ev.round)) return;
 const alert: Alert = {
 id: `${ev.school_id}-${ev.round}-${Date.now()}`,
 school_id: ev.school_id,
 school_name: ev.school_name,
 round: ev.round,
 deadline: ev.date,
 remind_days_before: 7,
 enabled: true,
 created_at: new Date().toISOString(),
 };
 persist([...alerts, alert]);
 setShowAdd(false);
 };

 const toggleAlert = (id: string) => {
 persist(alerts.map((a) => a.id === id ? { ...a, enabled: !a.enabled } : a));
 };

 const removeAlert = (id: string) => {
 persist(alerts.filter((a) => a.id !== id));
 };

 const updateReminder = (id: string, days: number) => {
 persist(alerts.map((a) => a.id === id ? { ...a, remind_days_before: days } : a));
 };

 const upcoming = alerts
 .filter((a) => a.enabled)
 .map((a) => ({ ...a, daysLeft: daysUntil(a.deadline) }))
 .filter((a) => a.daysLeft >= 0)
 .sort((a, b) => a.daysLeft - b.daysLeft);

 const triggeredAlerts = upcoming.filter((a) => a.daysLeft <= a.remind_days_before);

 const availableEvents = events.filter(
 (ev) => !alerts.some((a) => a.school_id === ev.school_id && a.round === ev.round) &&
 daysUntil(ev.date) > 0
 );

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-3xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Deadline Alerts
 </h1>
 <p className="text-white/70 text-lg">
 Never miss a deadline. Set reminders for every round you're targeting.
 </p>
 </div>
 </section>

 <div className="max-w-3xl mx-auto px-6 py-10">
 {fetchError && (
 <div className="editorial-card p-4 mb-6 border-red-200 bg-red-50 text-red-700 text-sm">{fetchError}</div>
 )}
 {/* Triggered alerts banner */}
 {triggeredAlerts.length > 0 && (
 <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
 <div className="flex items-center gap-2 mb-2">
 <AlertTriangle size={16} className="text-red-600"/>
 <p className="text-sm font-semibold text-red-700">Deadlines Approaching</p>
 </div>
 <div className="space-y-1">
 {triggeredAlerts.map((a) => (
 <p key={a.id} className="text-xs text-red-600">
 {a.school_name} {a.round} - {a.daysLeft === 0 ?"TODAY!": `${a.daysLeft} days left`}
 </p>
 ))}
 </div>
 </div>
 )}

 <div className="flex items-center justify-between mb-6">
 <p className="text-sm text-muted-foreground">{alerts.length} alert{alerts.length !== 1 ?"s":""} set</p>
 <button onClick={() => setShowAdd(!showAdd)}
 className="flex items-center gap-1.5 px-4 py-2 bg-foreground text-white text-sm font-medium rounded-lg hover:bg-foreground/80">
 <Plus size={14} /> Add Alert
 </button>
 </div>

 {/* Add from calendar events */}
 <AnimatePresence>
 {showAdd && (
 <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height:"auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
 <div className="editorial-card p-6">
 <p className="text-sm font-medium text-foreground mb-3">Select a deadline to track</p>
 <div className="max-h-60 overflow-y-auto space-y-1">
 {availableEvents.length === 0 && <p className="text-xs text-muted-foreground">No upcoming deadlines available</p>}
 {availableEvents.slice(0, 30).map((ev, i) => (
 <button
 key={`${ev.school_id}-${ev.round}-${i}`}
 onClick={() => addAlert(ev)}
 className="w-full text-left px-3 py-2 rounded hover:bg-primary/5 flex items-center justify-between border-b border-border/5 last:border-0"
 >
 <div>
 <span className="text-sm font-medium text-foreground">{ev.school_name}</span>
 <span className="text-xs text-muted-foreground ml-2">{ev.round}</span>
 </div>
 <span className="text-xs text-muted-foreground">{new Date(ev.date).toLocaleDateString()}</span>
 </button>
 ))}
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Alert list */}
 <div className="space-y-3">
 {alerts.map((a) => {
 const days = daysUntil(a.deadline);
 const isPast = days < 0;
 return (
 <motion.div
 key={a.id}
 layout
 className={`editorial-card p-4 flex items-center gap-4 ${!a.enabled ?"opacity-40":""} ${isPast ?"opacity-30":""}`}
 >
 <button onClick={() => toggleAlert(a.id)} className="flex-shrink-0">
 {a.enabled ? (
 <Bell size={18} className="text-primary"/>
 ) : (
 <BellOff size={18} className="text-muted-foreground"/>
 )}
 </button>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <Link href={`/school/${a.school_id}`} className="text-sm font-semibold text-foreground hover:text-primary">
 {a.school_name}
 </Link>
 <span className="text-xs text-muted-foreground">{a.round}</span>
 </div>
 <p className="text-xs text-muted-foreground mt-0.5">
 {new Date(a.deadline).toLocaleDateString()} ·
 {isPast ?"Passed": ` ${days}d left`}
 </p>
 </div>
 <select
 value={a.remind_days_before}
 onChange={(e) => updateReminder(a.id, +e.target.value)}
 className="text-xs border border-border/10 rounded px-2 py-1"
 >
 {REMIND_OPTIONS.map((d) => (
 <option key={d} value={d}>{d}d before</option>
 ))}
 </select>
 <button onClick={() => removeAlert(a.id)} className="text-muted-foreground hover:text-red-500">
 <Trash2 size={14} />
 </button>
 </motion.div>
 );
 })}
 </div>

 {alerts.length === 0 && !showAdd && (
 <div className="text-center py-20 text-muted-foreground">
 <Bell size={48} className="mx-auto mb-4 opacity-30"/>
 <p className="text-sm mb-4">Set alerts for upcoming deadlines</p>
 <Link href="/calendar" className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 justify-center">
 View Deadline Calendar <ArrowRight size={12} />
 </Link>
 </div>
 )}

 <ToolCrossLinks current="/alerts"/>
 </div>
 </main>
 );
}
