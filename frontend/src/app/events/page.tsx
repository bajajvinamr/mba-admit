"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Calendar, Globe, MapPin, Monitor, Filter, List, Grid3X3,
  ExternalLink, Download, School,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { ToolCrossLinks } from "@/components/ToolCrossLinks";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { track } from "@/lib/analytics";

/* ── Types ─────────────────────────────────────────────────────────── */

type SchoolEvent = {
  id: string;
  school_slug: string;
  school_name: string;
  name: string;
  date: string;
  time: string;
  format: string;
  url: string;
  description: string;
  event_type: string;
  duration_minutes: number;
};

type EventsResponse = {
  events: SchoolEvent[];
  total: number;
  filters: {
    event_types: string[];
    formats: string[];
    schools: string[];
  };
};

/* ── Constants ─────────────────────────────────────────────────────── */

const TYPE_LABELS: Record<string, string> = {
  info_session: "Info Session",
  campus_visit: "Campus Visit",
  webinar: "Webinar",
  workshop: "Workshop",
  student_panel: "Student Panel",
  regional_meetup: "Regional Meetup",
};

const FORMAT_ICONS: Record<string, typeof Globe> = {
  virtual: Monitor,
  in_person: MapPin,
  hybrid: Globe,
};

const FORMAT_COLORS: Record<string, string> = {
  virtual: "bg-blue-50 text-blue-600",
  in_person: "bg-emerald-50 text-emerald-700",
  hybrid: "bg-purple-50 text-purple-600",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/* ── ICS Generator ─────────────────────────────────────────────────── */

function generateICS(event: SchoolEvent): string {
  const dateStr = event.date.replace(/-/g, "");
  const timeStr = event.time.replace(/:/g, "") + "00";
  const dtStart = `${dateStr}T${timeStr}`;

  // Calculate end time
  const startDate = new Date(`${event.date}T${event.time}:00`);
  const endDate = new Date(startDate.getTime() + event.duration_minutes * 60 * 1000);
  const dtEnd = endDate.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MBA Admissions AI//Events//EN",
    "BEGIN:VEVENT",
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${event.name}`,
    `DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`,
    `URL:${event.url}`,
    `LOCATION:${event.format === "virtual" ? "Virtual" : event.school_name}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function downloadICS(event: SchoolEvent) {
  const icsContent = generateICS(event);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${event.school_slug}-${event.event_type}-${event.date}.ics`;
  link.click();
  URL.revokeObjectURL(url);
  track("event_added_to_calendar", { event_id: event.id, school: event.school_slug });
}

/* ── Component ─────────────────────────────────────────────────────── */

export default function EventsPage() {
  const [data, setData] = useState<EventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [mySchoolsOnly, setMySchoolsOnly] = useState(false);

  useEffect(() => {
    apiFetch<EventsResponse>("/api/events?limit=200")
      .then(setData)
      .catch(() => setError("Failed to load events. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.events.filter((e) => {
      if (typeFilter !== "all" && e.event_type !== typeFilter) return false;
      if (formatFilter !== "all" && e.format !== formatFilter) return false;
      if (schoolFilter !== "all" && e.school_slug !== schoolFilter) return false;
      return true;
    });
  }, [data, typeFilter, formatFilter, schoolFilter]);

  // Calendar data
  const calendarData = useMemo(() => {
    const [year, month] = currentMonth.split("-").map(Number);
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthEvents = filtered.filter(e => e.date.startsWith(currentMonth));

    const eventsByDay: Record<number, SchoolEvent[]> = {};
    for (const event of monthEvents) {
      const day = parseInt(event.date.split("-")[2]);
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(event);
    }

    return { year, month, firstDay, daysInMonth, eventsByDay, monthEvents };
  }, [currentMonth, filtered]);

  const navigateMonth = (delta: number) => {
    const [year, month] = currentMonth.split("-").map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    setCurrentMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6">
        <Breadcrumb items={[{ label: "School Events" }]} />
      </div>

      <section className="bg-foreground text-white py-14 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
            School Events
          </h1>
          <p className="text-white/70 text-lg">
            Info sessions, campus visits, webinars, and student panels across T25 programs.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {error && (
          <div className="editorial-card p-4 mb-6 border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        {loading && (
          <div className="text-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        )}

        {data && (
          <>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 mb-8">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-muted-foreground" />
                <select
                  value={schoolFilter}
                  onChange={(e) => setSchoolFilter(e.target.value)}
                  className="px-3 py-1.5 border border-border/10 rounded text-sm bg-card"
                >
                  <option value="all">All Schools</option>
                  {(data.filters.schools || []).map((s) => (
                    <option key={s} value={s}>{s.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-1.5 border border-border/10 rounded text-sm bg-card"
              >
                <option value="all">All Types</option>
                {(data.filters.event_types || []).map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>
                ))}
              </select>
              <select
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value)}
                className="px-3 py-1.5 border border-border/10 rounded text-sm bg-card"
              >
                <option value="all">All Formats</option>
                <option value="virtual">Virtual</option>
                <option value="in_person">In Person</option>
              </select>

              <div className="flex-1" />

              <span className="text-xs text-muted-foreground">{filtered.length} events</span>

              {/* View toggle */}
              <div className="flex gap-1 p-1 bg-foreground/5 rounded-lg">
                <button
                  onClick={() => setViewMode("calendar")}
                  className={`p-1.5 rounded ${viewMode === "calendar" ? "bg-white shadow-sm" : "text-muted-foreground"}`}
                  title="Calendar view"
                >
                  <Grid3X3 size={16} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded ${viewMode === "list" ? "bg-white shadow-sm" : "text-muted-foreground"}`}
                  title="List view"
                >
                  <List size={16} />
                </button>
              </div>
            </div>

            {/* Calendar View */}
            {viewMode === "calendar" && (
              <div className="editorial-card p-6">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-6">
                  <button onClick={() => navigateMonth(-1)} className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground">
                    &larr; Prev
                  </button>
                  <h2 className="heading-serif text-xl font-[family-name:var(--font-heading)] text-foreground">
                    {MONTHS[calendarData.month - 1]} {calendarData.year}
                  </h2>
                  <button onClick={() => navigateMonth(1)} className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground">
                    Next &rarr;
                  </button>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                    <div key={day} className="text-center text-[10px] uppercase tracking-widest text-muted-foreground/50 font-bold py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells for days before the 1st */}
                  {Array.from({ length: calendarData.firstDay }, (_, i) => (
                    <div key={`empty-${i}`} className="min-h-[80px] p-1" />
                  ))}

                  {/* Day cells */}
                  {Array.from({ length: calendarData.daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const dayEvents = calendarData.eventsByDay[day] || [];
                    const today = new Date();
                    const isToday =
                      today.getFullYear() === calendarData.year &&
                      today.getMonth() + 1 === calendarData.month &&
                      today.getDate() === day;

                    return (
                      <div
                        key={day}
                        className={`min-h-[80px] p-1 border rounded-lg ${
                          isToday ? "border-foreground bg-foreground/5" : "border-border/10"
                        }`}
                      >
                        <p className={`text-xs font-bold mb-1 ${isToday ? "text-foreground" : "text-muted-foreground/50"}`}>
                          {day}
                        </p>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 3).map((event, j) => (
                            <div
                              key={j}
                              className={`text-[9px] px-1 py-0.5 rounded truncate font-medium ${
                                FORMAT_COLORS[event.format] || "bg-foreground/5 text-muted-foreground"
                              }`}
                              title={`${event.school_name}: ${event.name}`}
                            >
                              {event.school_slug.toUpperCase()}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <p className="text-[9px] text-muted-foreground">+{dayEvents.length - 3} more</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* List View */}
            {viewMode === "list" && (
              <div className="space-y-4">
                {filtered.length === 0 ? (
                  <div className="text-center py-16">
                    <Calendar size={40} className="mx-auto mb-4 text-muted-foreground/30" />
                    <p className="text-muted-foreground">No events match your filters.</p>
                  </div>
                ) : (
                  filtered.map((event) => {
                    const FormatIcon = FORMAT_ICONS[event.format] || Globe;
                    return (
                      <div key={event.id} className="editorial-card p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <School size={14} className="text-primary shrink-0" />
                              <span className="text-[10px] text-primary font-bold uppercase">{event.school_name}</span>
                            </div>
                            <p className="font-medium text-foreground text-sm mb-1">{event.name}</p>
                            <p className="text-xs text-muted-foreground mb-3">{event.description}</p>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar size={12} />
                                {new Date(event.date + "T00:00:00").toLocaleDateString("en-US", {
                                  month: "short", day: "numeric", year: "numeric",
                                })}
                                {" "}at {event.time}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${FORMAT_COLORS[event.format] || "bg-foreground/5 text-muted-foreground"}`}>
                                <FormatIcon size={10} className="inline mr-0.5" />
                                {event.format === "in_person" ? "In Person" : event.format === "virtual" ? "Virtual" : "Hybrid"}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 bg-foreground/5 rounded-full text-muted-foreground font-bold">
                                {TYPE_LABELS[event.event_type] || event.event_type}
                              </span>
                              <span className="text-[10px] text-muted-foreground">{event.duration_minutes} min</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 shrink-0">
                            <a
                              href={event.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary font-bold hover:text-primary/80"
                            >
                              Register <ExternalLink size={10} />
                            </a>
                            <button
                              onClick={() => downloadICS(event)}
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <Download size={10} /> .ics
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}

        <div className="mt-10">
          <ToolCrossLinks current="/events" />
        </div>
      </div>
    </main>
  );
}
