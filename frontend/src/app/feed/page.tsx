"use client";

import { useState, useEffect } from "react";
import {
  Calendar, Bell, BellOff, ChevronRight, Clock,
  MessageSquare, AlertCircle, FileCheck, Loader2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { ToolCrossLinks } from "@/components/ToolCrossLinks";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { track } from "@/lib/analytics";

/* ── Types ─────────────────────────────────────────────────────────── */

type CycleEvent = {
  date: string;
  type: string;
  description: string;
  school_slug: string;
  school_name: string;
  round: string;
  source: string;
  confidence: string;
  aggregate_data?: {
    total_reports: number;
    results: Record<string, number>;
  };
};

type CycleSchool = {
  slug: string;
  name: string;
  event_count: number;
};

/* ── Constants ─────────────────────────────────────────────────────── */

const EVENT_ICONS: Record<string, typeof Calendar> = {
  deadline: AlertCircle,
  interview_invite: MessageSquare,
  decision: FileCheck,
  decision_wave: FileCheck,
};

const EVENT_COLORS: Record<string, string> = {
  deadline: "bg-red-100 text-red-600",
  interview_invite: "bg-blue-100 text-blue-600",
  decision: "bg-emerald-100 text-emerald-600",
  decision_wave: "bg-violet-100 text-violet-600",
};

const ROUND_TABS = ["All", "R1", "R2", "ED"] as const;

/* ── Component ─────────────────────────────────────────────────────── */

export default function CycleFeedPage() {
  const [schools, setSchools] = useState<CycleSchool[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [selectedRound, setSelectedRound] = useState<string>("All");
  const [events, setEvents] = useState<CycleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [subscribedSchools, setSubscribedSchools] = useState<Set<string>>(new Set());

  // Load available schools
  useEffect(() => {
    apiFetch<{ schools: CycleSchool[] }>("/api/cycle-feed/schools")
      .then(data => {
        setSchools(data.schools);
        if (data.schools.length > 0) {
          setSelectedSchool(data.schools[0].slug);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Load subscribed schools from localStorage
    try {
      const saved = localStorage.getItem("cycle_feed_subscriptions");
      if (saved) setSubscribedSchools(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

  // Load events when school changes
  useEffect(() => {
    if (!selectedSchool) return;
    setEventsLoading(true);

    const url = selectedRound === "All"
      ? `/api/cycle/${selectedSchool}`
      : `/api/cycle/${selectedSchool}/${selectedRound}`;

    apiFetch<{ events: CycleEvent[] }>(url)
      .then(data => setEvents(data.events))
      .catch(() => setEvents([]))
      .finally(() => setEventsLoading(false));

    track("cycle_feed_viewed", { school: selectedSchool, round: selectedRound });
  }, [selectedSchool, selectedRound]);

  const toggleSubscription = (slug: string) => {
    setSubscribedSchools(prev => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      localStorage.setItem("cycle_feed_subscriptions", JSON.stringify([...next]));
      track("cycle_feed_subscribed", { school: slug, subscribed: !prev.has(slug) });
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr + "T00:00:00");
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const getRelativeDate = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr + "T00:00:00");
    const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff > 0 && diff <= 30) return `In ${diff} days`;
    if (diff < 0 && diff >= -30) return `${Math.abs(diff)} days ago`;
    return "";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6">
        <Breadcrumb items={[{ label: "Cycle Feed" }]} />
      </div>

      {/* Hero */}
      <section className="bg-foreground text-white py-12 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="heading-serif text-4xl md:text-5xl mb-3 font-[family-name:var(--font-heading)]">
            Admissions Cycle Feed
          </h1>
          <p className="text-white/70 text-lg">
            Real-time activity stream for every school and round. Never miss a deadline or decision wave.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar: School List */}
          <aside className="w-full lg:w-72 shrink-0">
            <div className="editorial-card p-4 sticky top-20">
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground/50 font-bold mb-3 px-2">
                Schools
              </h3>
              <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                {schools.map(school => (
                  <button
                    key={school.slug}
                    onClick={() => setSelectedSchool(school.slug)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                      selectedSchool === school.slug
                        ? "bg-foreground text-white font-medium"
                        : "text-muted-foreground hover:bg-foreground/5"
                    }`}
                  >
                    <span className="truncate">{school.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] opacity-60">{school.event_count}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSubscription(school.slug); }}
                        className="p-0.5"
                        title={subscribedSchools.has(school.slug) ? "Unsubscribe" : "Subscribe"}
                      >
                        {subscribedSchools.has(school.slug)
                          ? <Bell size={12} className="text-primary" />
                          : <BellOff size={12} className="opacity-30" />
                        }
                      </button>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Main: Timeline */}
          <div className="flex-1 min-w-0">
            {/* Round Tabs */}
            <div className="flex gap-1 mb-6 p-1 bg-foreground/5 rounded-lg w-fit">
              {ROUND_TABS.map(round => (
                <button
                  key={round}
                  onClick={() => setSelectedRound(round)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    selectedRound === round
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {round}
                </button>
              ))}
            </div>

            {eventsLoading ? (
              <div className="py-16 text-center">
                <Loader2 size={24} className="animate-spin text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Loading cycle events...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="py-16 text-center">
                <Calendar size={40} className="mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground">No events found for this school/round combination.</p>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-px bg-border/20" />

                <div className="space-y-6">
                  {events.map((event, i) => {
                    const Icon = EVENT_ICONS[event.type] || Calendar;
                    const colorClass = EVENT_COLORS[event.type] || "bg-foreground/5 text-muted-foreground";
                    const relative = getRelativeDate(event.date);

                    return (
                      <div key={i} className="relative flex gap-4 pl-2">
                        {/* Timeline dot */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 ${colorClass}`}>
                          <Icon size={16} />
                        </div>

                        {/* Event card */}
                        <div className="editorial-card p-4 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">{event.description}</p>
                              <div className="flex items-center gap-3 mt-1.5">
                                <span className="text-xs text-muted-foreground">{formatDate(event.date)}</span>
                                {relative && (
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    relative === "Today" ? "bg-red-100 text-red-600" :
                                    relative === "Tomorrow" ? "bg-amber-100 text-amber-600" :
                                    "bg-foreground/5 text-muted-foreground"
                                  }`}>
                                    {relative}
                                  </span>
                                )}
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-foreground/5 text-muted-foreground">
                                  {event.round}
                                </span>
                              </div>
                            </div>
                            {event.confidence === "estimated" && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 shrink-0">
                                Estimated
                              </span>
                            )}
                          </div>

                          {/* Decision wave aggregate data */}
                          {event.aggregate_data && (
                            <div className="mt-3 pt-3 border-t border-border/10">
                              <div className="flex gap-3">
                                {Object.entries(event.aggregate_data.results).map(([result, count]) => (
                                  <span key={result} className={`text-xs px-2 py-1 rounded-full ${
                                    result === "admitted" ? "bg-emerald-100 text-emerald-700" :
                                    result === "rejected" ? "bg-red-100 text-red-700" :
                                    "bg-amber-100 text-amber-700"
                                  }`}>
                                    {count} {result}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-10">
          <ToolCrossLinks current="/feed" />
        </div>
      </div>
    </main>
  );
}
