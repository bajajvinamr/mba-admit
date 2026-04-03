"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, List, ChevronLeft, ChevronRight, Clock, Bell,
  GraduationCap, Filter, X, AlertCircle, CheckCircle2, Search,
} from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { ToolCrossLinks } from "@/components/ToolCrossLinks";

/* ── Types ─────────────────────────────────────────────────────────── */

type DeadlineEntry = {
  school_id: string;
  school_name: string;
  round: string;
  deadline_date: string;
  deadline_display: string;
  decision_date: string | null;
  decision_display: string | null;
  days_remaining: number;
  urgency: "overdue" | "urgent" | "soon" | "upcoming" | "future";
};

type DeadlineResponse = {
  deadlines: DeadlineEntry[];
  total: number;
  school_count: number;
};

type CalendarResponse = {
  by_date: Record<string, DeadlineEntry[]>;
  by_month: Record<string, DeadlineEntry[]>;
  total: number;
};

type ViewMode = "calendar" | "list";

/* ── Constants ─────────────────────────────────────────────────────── */

const URGENCY_CONFIG = {
  overdue:   { label: "Overdue",  bg: "bg-muted",       text: "text-muted-foreground", dot: "bg-muted-foreground/40", border: "border-border" },
  urgent:    { label: "< 7 days", bg: "bg-red-50",      text: "text-red-700",          dot: "bg-red-500",             border: "border-red-200" },
  soon:      { label: "7-30 days",bg: "bg-amber-50",    text: "text-amber-700",        dot: "bg-amber-500",           border: "border-amber-200" },
  upcoming:  { label: "30-90 days",bg: "bg-emerald-50", text: "text-emerald-700",      dot: "bg-emerald-500",         border: "border-emerald-200" },
  future:    { label: "90+ days", bg: "bg-blue-50",     text: "text-blue-700",         dot: "bg-blue-500",            border: "border-blue-200" },
} as const;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/* ── Helpers ───────────────────────────────────────────────────────── */

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDaysRemaining(days: number): string {
  if (days < 0) return `${Math.abs(days)}d ago`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days}d left`;
}

function getCalendarDotColor(urgency: string): string {
  switch (urgency) {
    case "overdue": return "bg-muted-foreground/40";
    case "urgent": return "bg-red-500";
    case "soon": return "bg-amber-500";
    case "upcoming": return "bg-emerald-500";
    case "future": return "bg-blue-500";
    default: return "bg-muted-foreground/30";
  }
}

/* ── Page Component ────────────────────────────────────────────────── */

export default function DeadlinesPage() {
  const [view, setView] = useState<ViewMode>("calendar");
  const [deadlines, setDeadlines] = useState<DeadlineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calendar state
  const now = useMemo(() => new Date(), []);
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Filters
  const [urgencyFilter, setUrgencyFilter] = useState<string | null>(null);
  const [roundFilter, setRoundFilter] = useState<string | null>(null);
  const [schoolFilter, setSchoolFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Subscribe state
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [subEmail, setSubEmail] = useState("");
  const [subStatus, setSubStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  // ── Fetch data ─────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch<DeadlineResponse>("/api/deadlines?include_all=true")
      .then((res) => setDeadlines(res.deadlines))
      .catch(() => setError("Failed to load deadlines. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  // ── Derived data ───────────────────────────────────────────────────

  const uniqueSchools = useMemo(() => {
    const map = new Map<string, string>();
    deadlines.forEach((d) => map.set(d.school_id, d.school_name));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [deadlines]);

  const uniqueRounds = useMemo(() => {
    const set = new Set<string>();
    deadlines.forEach((d) => { if (d.round) set.add(d.round); });
    return Array.from(set).sort();
  }, [deadlines]);

  const filtered = useMemo(() => {
    return deadlines.filter((d) => {
      if (urgencyFilter && d.urgency !== urgencyFilter) return false;
      if (roundFilter && d.round !== roundFilter) return false;
      if (schoolFilter && d.school_id !== schoolFilter) return false;
      return true;
    });
  }, [deadlines, urgencyFilter, roundFilter, schoolFilter]);

  // Group by month for list view
  const groupedByMonth = useMemo(() => {
    const groups: Record<string, DeadlineEntry[]> = {};
    filtered.forEach((d) => {
      const key = d.deadline_date.slice(0, 7); // YYYY-MM
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  // Deadlines indexed by date for calendar view
  const deadlinesByDate = useMemo(() => {
    const map: Record<string, DeadlineEntry[]> = {};
    filtered.forEach((d) => {
      if (!map[d.deadline_date]) map[d.deadline_date] = [];
      map[d.deadline_date].push(d);
    });
    return map;
  }, [filtered]);

  // ── Calendar navigation ────────────────────────────────────────────

  const prevMonth = useCallback(() => {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
    setSelectedDate(null);
  }, [calMonth]);

  const nextMonth = useCallback(() => {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
    setSelectedDate(null);
  }, [calMonth]);

  const goToToday = useCallback(() => {
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth());
    setSelectedDate(null);
  }, [now]);

  // ── Subscribe handler ──────────────────────────────────────────────

  const handleSubscribe = async () => {
    if (!subEmail.includes("@")) return;
    setSubStatus("loading");
    try {
      await apiFetch("/api/deadlines/subscribe", {
        method: "POST",
        body: JSON.stringify({ email: subEmail }),
      });
      setSubStatus("success");
    } catch {
      setSubStatus("error");
    }
  };

  // ── Calendar grid ──────────────────────────────────────────────────

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfWeek(calYear, calMonth);
  const calMonthStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}`;

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [firstDay, daysInMonth]);

  const selectedDateDeadlines = selectedDate ? (deadlinesByDate[selectedDate] || []) : [];
  const hasActiveFilters = urgencyFilter || roundFilter || schoolFilter;

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <section className="bg-foreground text-white py-16 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
            Deadline & Round Tracker
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Every application deadline at a glance. Never miss a round.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Controls bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          {/* View toggle */}
          <div className="flex items-center gap-2 bg-card border border-border/10 rounded-lg p-1">
            <button
              onClick={() => setView("calendar")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                view === "calendar"
                  ? "bg-foreground text-white"
                  : "text-foreground/50 hover:text-foreground/70"
              }`}
            >
              <Calendar size={16} />
              Calendar
            </button>
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                view === "list"
                  ? "bg-foreground text-white"
                  : "text-foreground/50 hover:text-foreground/70"
              }`}
            >
              <List size={16} />
              List
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                hasActiveFilters
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "border-border/10 text-foreground/50 hover:text-foreground/70"
              }`}
            >
              <Filter size={16} />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-primary" />
              )}
            </button>

            {/* Subscribe CTA */}
            <button
              onClick={() => setShowSubscribe(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
            >
              <Bell size={16} />
              Reminders
            </button>
          </div>
        </div>

        {/* Filter panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="editorial-card p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-foreground/60">Filter deadlines</p>
                  {hasActiveFilters && (
                    <button
                      onClick={() => { setUrgencyFilter(null); setRoundFilter(null); setSchoolFilter(null); }}
                      className="text-xs text-primary hover:text-primary/80 font-medium"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Urgency filter */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider mb-2">Urgency</p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(URGENCY_CONFIG) as Array<keyof typeof URGENCY_CONFIG>).map((key) => (
                      <button
                        key={key}
                        onClick={() => setUrgencyFilter(urgencyFilter === key ? null : key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          urgencyFilter === key
                            ? `${URGENCY_CONFIG[key].bg} ${URGENCY_CONFIG[key].text} ${URGENCY_CONFIG[key].border} border`
                            : "bg-card text-foreground/50 border border-border/10 hover:border-border/30"
                        }`}
                      >
                        <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${URGENCY_CONFIG[key].dot}`} />
                        {URGENCY_CONFIG[key].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Round filter */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider mb-2">Round</p>
                  <div className="flex flex-wrap gap-2">
                    {uniqueRounds.map((r) => (
                      <button
                        key={r}
                        onClick={() => setRoundFilter(roundFilter === r ? null : r)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          roundFilter === r
                            ? "bg-foreground text-white"
                            : "bg-card text-foreground/50 border border-border/10 hover:border-border/30"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* School filter */}
                <div>
                  <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider mb-2">School</p>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {uniqueSchools.map(([id, name]) => (
                      <button
                        key={id}
                        onClick={() => setSchoolFilter(schoolFilter === id ? null : id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          schoolFilter === id
                            ? "bg-foreground text-white"
                            : "bg-card text-foreground/50 border border-border/10 hover:border-border/30"
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subscribe modal */}
        <AnimatePresence>
          {showSubscribe && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={() => setShowSubscribe(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-card rounded-xl p-8 max-w-md w-full shadow-xl border border-border/10"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-foreground">Deadline Reminders</h3>
                  <button onClick={() => setShowSubscribe(false)} className="text-foreground/30 hover:text-foreground/60">
                    <X size={20} />
                  </button>
                </div>

                {subStatus === "success" ? (
                  <div className="text-center py-4">
                    <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-3" />
                    <p className="font-medium text-foreground">Subscribed!</p>
                    <p className="text-sm text-foreground/50 mt-1">
                      We will send you reminders before your deadlines.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-foreground/60 mb-6">
                      Get email reminders 30 days, 7 days, and 1 day before each deadline
                      for your tracked schools.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={subEmail}
                        onChange={(e) => setSubEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="flex-1 px-4 py-2.5 rounded-lg border border-border/20 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        onKeyDown={(e) => e.key === "Enter" && handleSubscribe()}
                      />
                      <button
                        onClick={handleSubscribe}
                        disabled={subStatus === "loading" || !subEmail.includes("@")}
                        className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
                      >
                        {subStatus === "loading" ? "..." : "Subscribe"}
                      </button>
                    </div>
                    {subStatus === "error" && (
                      <p className="text-sm text-red-500 mt-2">Something went wrong. Please try again.</p>
                    )}
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg text-sm mb-6 flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-16 text-foreground/40">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            Loading deadlines...
          </div>
        )}

        {/* ── Calendar View ───────────────────────────────────────────── */}
        {!loading && !error && view === "calendar" && (
          <div>
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={prevMonth}
                className="p-2 rounded-lg border border-border/10 text-foreground/50 hover:text-foreground/80 hover:border-border/30 transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="text-center">
                <h2 className="text-xl font-semibold text-foreground">
                  {MONTH_NAMES[calMonth]} {calYear}
                </h2>
                <button
                  onClick={goToToday}
                  className="text-xs text-primary hover:text-primary/80 font-medium mt-1"
                >
                  Go to today
                </button>
              </div>
              <button
                onClick={nextMonth}
                className="p-2 rounded-lg border border-border/10 text-foreground/50 hover:text-foreground/80 hover:border-border/30 transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 mb-6 text-xs text-foreground/50">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> &lt; 7 days</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> 7-30 days</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> 30+ days</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40" /> Passed</span>
            </div>

            {/* Calendar grid */}
            <div className="editorial-card overflow-hidden">
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-border/10">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="py-3 text-center text-xs font-medium text-foreground/40 uppercase tracking-wider">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="min-h-[80px] border-b border-r border-border/5 bg-muted/30" />;
                  }

                  const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const dayDeadlines = deadlinesByDate[dateStr] || [];
                  const isToday = dateStr === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
                  const isSelected = dateStr === selectedDate;
                  const hasDeadlines = dayDeadlines.length > 0;

                  return (
                    <button
                      key={dateStr}
                      onClick={() => hasDeadlines ? setSelectedDate(isSelected ? null : dateStr) : undefined}
                      className={`min-h-[80px] p-2 border-b border-r border-border/5 text-left transition-all relative ${
                        isSelected
                          ? "bg-primary/5 ring-2 ring-primary/20 ring-inset"
                          : hasDeadlines
                            ? "hover:bg-accent/50 cursor-pointer"
                            : ""
                      }`}
                    >
                      <span
                        className={`text-sm font-medium ${
                          isToday
                            ? "bg-foreground text-white w-7 h-7 rounded-full flex items-center justify-center"
                            : "text-foreground/70"
                        }`}
                      >
                        {day}
                      </span>
                      {hasDeadlines && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {dayDeadlines.slice(0, 3).map((dl, i) => (
                            <span
                              key={i}
                              className={`w-2 h-2 rounded-full ${getCalendarDotColor(dl.urgency)}`}
                              title={`${dl.school_name} - ${dl.round}`}
                            />
                          ))}
                          {dayDeadlines.length > 3 && (
                            <span className="text-[10px] text-foreground/40 leading-none">
                              +{dayDeadlines.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected date detail panel */}
            <AnimatePresence>
              {selectedDate && selectedDateDeadlines.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mt-6"
                >
                  <div className="editorial-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-foreground">
                        {formatDate(selectedDate)} &mdash; {selectedDateDeadlines.length} deadline{selectedDateDeadlines.length > 1 ? "s" : ""}
                      </h3>
                      <button
                        onClick={() => setSelectedDate(null)}
                        className="text-foreground/30 hover:text-foreground/60"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="space-y-3">
                      {selectedDateDeadlines.map((dl, i) => (
                        <div
                          key={i}
                          className={`flex items-center justify-between p-4 rounded-lg border ${URGENCY_CONFIG[dl.urgency].border} ${URGENCY_CONFIG[dl.urgency].bg}`}
                        >
                          <div className="flex items-center gap-3">
                            <GraduationCap size={18} className={URGENCY_CONFIG[dl.urgency].text} />
                            <div>
                              <Link
                                href={`/school/${dl.school_id}`}
                                className="font-medium text-foreground hover:text-primary transition-colors"
                              >
                                {dl.school_name}
                              </Link>
                              <p className="text-xs text-foreground/50">{dl.round}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-sm font-medium ${URGENCY_CONFIG[dl.urgency].text}`}>
                              {formatDaysRemaining(dl.days_remaining)}
                            </span>
                            {dl.decision_date && (
                              <p className="text-xs text-foreground/40 mt-0.5">
                                Decision: {formatDate(dl.decision_date)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── List View ───────────────────────────────────────────────── */}
        {!loading && !error && view === "list" && (
          <div className="space-y-10">
            {groupedByMonth.length === 0 && (
              <div className="text-center py-16 text-foreground/40">
                <Calendar size={48} className="mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No deadlines found</p>
                <p className="text-sm mt-2">
                  {hasActiveFilters
                    ? "Try adjusting your filters."
                    : "Add schools to your tracker to see their deadlines here."}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={() => { setUrgencyFilter(null); setRoundFilter(null); setSchoolFilter(null); }}
                    className="mt-4 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {groupedByMonth.map(([monthKey, monthDeadlines]) => {
              const [y, m] = monthKey.split("-");
              const monthLabel = `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;

              return (
                <motion.div
                  key={monthKey}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h2 className="heading-serif text-xl font-[family-name:var(--font-heading)] text-foreground mb-4">
                    {monthLabel}
                  </h2>
                  <div className="space-y-2">
                    {monthDeadlines
                      .sort((a, b) => a.deadline_date.localeCompare(b.deadline_date))
                      .map((dl, i) => (
                        <div
                          key={`${dl.school_id}-${dl.round}-${i}`}
                          className={`editorial-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 justify-between border-l-4 ${URGENCY_CONFIG[dl.urgency].border}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <GraduationCap size={18} className="text-foreground/40 shrink-0" />
                            <div className="min-w-0">
                              <Link
                                href={`/school/${dl.school_id}`}
                                className="font-medium text-foreground hover:text-primary transition-colors truncate block"
                              >
                                {dl.school_name}
                              </Link>
                              <p className="text-xs text-foreground/50">{dl.round}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 sm:gap-6 text-right shrink-0 ml-8 sm:ml-0">
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {formatDate(dl.deadline_date)}
                              </p>
                              {dl.decision_date && (
                                <p className="text-xs text-foreground/40">
                                  Decision: {formatDate(dl.decision_date)}
                                </p>
                              )}
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${URGENCY_CONFIG[dl.urgency].bg} ${URGENCY_CONFIG[dl.urgency].text} border ${URGENCY_CONFIG[dl.urgency].border}`}
                            >
                              <Clock size={12} />
                              {formatDaysRemaining(dl.days_remaining)}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Stats footer */}
        {!loading && !error && filtered.length > 0 && (
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: "Total Deadlines",
                value: filtered.length,
              },
              {
                label: "Urgent",
                value: filtered.filter((d) => d.urgency === "urgent" || d.urgency === "overdue").length,
                color: "text-red-600",
              },
              {
                label: "Coming Soon",
                value: filtered.filter((d) => d.urgency === "soon").length,
                color: "text-amber-600",
              },
              {
                label: "Schools",
                value: new Set(filtered.map((d) => d.school_id)).size,
              },
            ].map((stat, i) => (
              <div key={i} className="editorial-card p-4 text-center">
                <p className={`text-2xl font-bold ${stat.color || "text-foreground"}`}>
                  {stat.value}
                </p>
                <p className="text-xs text-foreground/40 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Cross-links */}
        <div className="mt-12">
          <ToolCrossLinks current="/deadlines" count={4} />
        </div>
      </div>
    </main>
  );
}
