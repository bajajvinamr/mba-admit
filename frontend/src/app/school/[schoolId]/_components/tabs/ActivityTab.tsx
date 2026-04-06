"use client";

import { useState, useEffect } from "react";
import {
  Calendar, MessageSquare, FileCheck, AlertCircle, Loader2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

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

type Props = {
  schoolId: string;
};

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

export function ActivityTab({ schoolId }: Props) {
  const [events, setEvents] = useState<CycleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState("All");

  useEffect(() => {
    const url = selectedRound === "All"
      ? `/api/cycle/${schoolId}`
      : `/api/cycle/${schoolId}/${selectedRound}`;

    setLoading(true);
    apiFetch<{ events: CycleEvent[] }>(url)
      .then(data => setEvents(data.events))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [schoolId, selectedRound]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="heading-serif text-2xl font-[family-name:var(--font-heading)]">
          Admissions Activity
        </h2>
        <div className="flex gap-1 p-1 bg-foreground/5 rounded-lg">
          {["All", "R1", "R2", "ED"].map(round => (
            <button
              key={round}
              onClick={() => setSelectedRound(round)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                selectedRound === round
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {round}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <Loader2 size={24} className="animate-spin text-muted-foreground mx-auto" />
        </div>
      ) : events.length === 0 ? (
        <div className="py-12 text-center">
          <Calendar size={32} className="mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm">No activity data available for this school.</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border/20" />
          <div className="space-y-4">
            {events.map((event, i) => {
              const Icon = EVENT_ICONS[event.type] || Calendar;
              const colorClass = EVENT_COLORS[event.type] || "bg-foreground/5 text-muted-foreground";

              return (
                <div key={i} className="relative flex gap-4 pl-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${colorClass}`}>
                    <Icon size={14} />
                  </div>
                  <div className="editorial-card p-4 flex-1">
                    <p className="text-sm font-medium text-foreground">{event.description}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-muted-foreground">{formatDate(event.date)}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-foreground/5 text-muted-foreground">{event.round}</span>
                      {event.confidence === "estimated" && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">Est.</span>
                      )}
                    </div>
                    {event.aggregate_data && (
                      <div className="mt-2 flex gap-2">
                        {Object.entries(event.aggregate_data.results).map(([result, count]) => (
                          <span key={result} className={`text-[10px] px-2 py-0.5 rounded-full ${
                            result === "admitted" ? "bg-emerald-100 text-emerald-700" :
                            result === "rejected" ? "bg-red-100 text-red-700" :
                            "bg-amber-100 text-amber-700"
                          }`}>
                            {count} {result}
                          </span>
                        ))}
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
  );
}
