"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Calendar, Clock, GraduationCap, AlertCircle, ArrowRight, ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { ToolCrossLinks } from "@/components/ToolCrossLinks";
import { EmailCapture } from "@/components/EmailCapture";

/* ── Types ─────────────────────────────────────────────────────────── */

type CalEvent = {
  school_id: string;
  school_name: string;
  round: string;
  type: "deadline" | "decision";
  date: string;
  label: string;
};

type CalResponse = {
  events: CalEvent[];
  months: Record<string, CalEvent[]>;
  school_count: number;
  total_events: number;
};

/* ── Helpers ───────────────────────────────────────────────────────── */

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function urgencyClass(days: number): string {
  if (days < 0) return "text-foreground/30";
  if (days <= 7) return "text-red-400";
  if (days <= 30) return "text-amber-400";
  return "text-emerald-400";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function UpcomingDeadlinesPage() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    apiFetch<CalResponse>("/api/calendar")
      .then((data) => {
        setEvents(data.events);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load deadlines");
      })
      .finally(() => setLoading(false));
  }, []);

  // Only show deadline-type events, sorted by date
  const deadlines = useMemo(() => {
    const filtered = events
      .filter((e) => e.type === "deadline")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (!showPast) {
      return filtered.filter((e) => daysUntil(e.date) >= -1);
    }
    return filtered;
  }, [events, showPast]);

  const upcomingCount = deadlines.filter((e) => daysUntil(e.date) >= 0).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Calendar size={16} />
            Upcoming Deadlines
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            MBA Application Deadlines
          </h1>
          <p className="mt-3 text-lg text-foreground/60">
            {upcomingCount > 0
              ? `${upcomingCount} upcoming deadline${upcomingCount !== 1 ? "s" : ""} across top programs`
              : "Track every round deadline at a glance"}
          </p>
        </motion.div>

        {/* Controls */}
        <div className="mb-6 flex items-center justify-between">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground/60">
            <input
              type="checkbox"
              checked={showPast}
              onChange={(e) => setShowPast(e.target.checked)}
              className="rounded border-border/50 bg-background"
            />
            Show past deadlines
          </label>
          <Link
            href="/calendar"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Full calendar view <ArrowRight size={14} />
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl border border-border/30 bg-card" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center">
            <AlertCircle size={24} className="mx-auto mb-2 text-red-400" />
            <p className="text-red-400">{error}</p>
          </div>
        ) : deadlines.length === 0 ? (
          <div className="rounded-xl border border-border/30 bg-card p-12 text-center">
            <Calendar size={32} className="mx-auto mb-3 text-foreground/30" />
            <p className="text-foreground/50">No upcoming deadlines found.</p>
            <Link href="/calendar" className="mt-2 inline-block text-sm text-primary underline">
              View full calendar
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {deadlines.map((event, i) => {
              const days = daysUntil(event.date);
              const isPast = days < 0;
              return (
                <motion.div
                  key={`${event.school_id}-${event.round}-${event.date}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  className={`flex items-center gap-4 rounded-xl border border-border/50 bg-card px-5 py-3.5 transition-colors hover:border-primary/20 ${isPast ? "opacity-50" : ""}`}
                >
                  {/* Days counter */}
                  <div className={`w-16 text-center font-mono text-sm font-bold ${urgencyClass(days)}`}>
                    {isPast ? "Past" : days === 0 ? "Today" : `${days}d`}
                  </div>

                  {/* School + Round */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <GraduationCap size={14} className="shrink-0 text-primary" />
                      <span className="truncate font-medium text-sm">{event.school_name}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-foreground/50">{event.label}</p>
                  </div>

                  {/* Round badge */}
                  <span className="hidden sm:inline-block rounded-full bg-foreground/5 px-2.5 py-0.5 text-xs text-foreground/60">
                    {event.round}
                  </span>

                  {/* Date */}
                  <div className="hidden sm:block text-right text-xs text-foreground/50 w-28">
                    {formatDate(event.date)}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Cross-links & CTA */}
        <div className="mt-16 space-y-8">
          <ToolCrossLinks current="/upcoming-deadlines" />
          <EmailCapture source="upcoming-deadlines" />
        </div>
      </div>
    </div>
  );
}
