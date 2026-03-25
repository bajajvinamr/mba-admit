"use client";

import { Scale, Clock, AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";

/* ── Types ─────────────────────────────────────────────────────────── */

type AdmitPreview = {
  schoolName: string;
  score: number;
};

type WaitlistPreview = {
  schoolName: string;
};

type Props = {
  admits?: AdmitPreview[];
  waitlisted?: WaitlistPreview[];
  nearestDeadline?: { schoolName: string; date: string } | null;
};

/* ── Helpers ──────────────────────────────────────────────────────── */

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/* ── Component ────────────────────────────────────────────────────── */

export default function DeciderDashboard({
  admits = [],
  waitlisted = [],
  nearestDeadline = null,
}: Props) {
  return (
    <div className="editorial-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Scale size={16} className="text-primary" />
          Decision Matrix
        </h3>
        <Link
          href="/decide"
          className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
        >
          Full View <ArrowRight size={12} />
        </Link>
      </div>

      {/* Top Admits Preview */}
      {admits.length > 0 ? (
        <div className="space-y-2">
          {admits.slice(0, 3).map((a, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <span className="text-sm text-foreground/70">{a.schoolName}</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-foreground/5 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${a.score}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-foreground w-8 text-right">
                  {a.score}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-foreground/40">
          Add admitted schools in the Decision Matrix to see your comparison.
        </p>
      )}

      {/* Waitlist Status */}
      {waitlisted.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
          <AlertTriangle size={14} className="text-amber-500 shrink-0" />
          <span className="text-xs text-foreground/60">
            {waitlisted.length} school{waitlisted.length > 1 ? "s" : ""} waitlisted:{" "}
            {waitlisted.map((w) => w.schoolName).join(", ")}
          </span>
        </div>
      )}

      {/* Nearest Deadline */}
      {nearestDeadline && (
        <div className="flex items-center gap-2 p-2 bg-foreground/[0.02] rounded-lg">
          <Clock size={14} className="text-primary shrink-0" />
          <span className="text-xs text-foreground/60">
            {nearestDeadline.schoolName} deposit:{" "}
            <strong>
              {daysUntil(nearestDeadline.date) > 0
                ? `${daysUntil(nearestDeadline.date)} days`
                : "Past due"}
            </strong>
          </span>
        </div>
      )}

      {/* CTA */}
      <Link
        href="/decide"
        className="block text-center py-2 bg-primary/10 text-primary text-sm font-medium rounded-lg hover:bg-primary/20 transition-colors"
      >
        Open Decision Matrix
      </Link>
    </div>
  );
}
