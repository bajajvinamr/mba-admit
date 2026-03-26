"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  Circle,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/cn";

// Lazy-load portfolio board to avoid loading dnd-kit eagerly
const PortfolioPage = dynamic(() => import("@/app/portfolio/page"), {
  loading: () => (
    <div className="h-96 bg-muted rounded-lg animate-pulse" />
  ),
});

// ── Types ──────────────────────────────────────────────────────────────────

type DeadlinePreview = {
  school_id: string;
  school_name: string;
  round: string;
  deadline: string;
  days_left: number;
};

type SchoolProgress = {
  school_id: string;
  name: string;
  status: string;
  essay_count: number;
  total_decisions: number;
};

type StrategistDashboardProps = {
  deadlines?: DeadlinePreview[];
  schools?: SchoolProgress[];
  className?: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────

function getCompletionPct(school: SchoolProgress): number {
  const steps = 4; // profile, essays, LORs, submitted
  let done = 1; // profile assumed done
  if (school.essay_count > 0) done += 1;
  if (school.status === "submitted" || school.status === "interview" || school.status === "decision") done += 2;
  else if (school.status === "preparing") done += 0;
  return Math.round((done / steps) * 100);
}

function deriveNextAction(school: SchoolProgress): { label: string; href: string } {
  switch (school.status) {
    case "preparing":
      return { label: "Start essays", href: `/essays?school=${school.school_id}` };
    case "submitted":
      return { label: "Prep interview", href: `/interview?school=${school.school_id}` };
    case "interview":
      return { label: "Track decision", href: `/school/${school.school_id}` };
    default:
      return { label: "View details", href: `/school/${school.school_id}` };
  }
}

// ── StrategistDashboard ────────────────────────────────────────────────────

export function StrategistDashboard({
  deadlines = [],
  schools = [],
  className = "",
}: StrategistDashboardProps) {
  // Next action recommendation
  const urgentSchool = schools.find((s) => s.status === "preparing") ?? schools[0];
  const nextAction = urgentSchool ? deriveNextAction(urgentSchool) : null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Next Action Recommendation */}
      {nextAction && urgentSchool && (
        <Link
          href={nextAction.href}
          className="flex items-center gap-4 rounded-xl border-2 border-[#b8860b]/30 bg-primary/5 p-5 hover:shadow-sm transition-all"
        >
          <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <ArrowRight className="size-5 text-[#b8860b]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Recommended next step
            </p>
            <p className="text-sm font-semibold text-foreground mt-0.5">
              {nextAction.label} for {urgentSchool.name}
            </p>
          </div>
          <ArrowRight className="size-4 text-muted-foreground shrink-0" />
        </Link>
      )}

      {/* Main content: Portfolio Board + Deadline Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Portfolio Board (Kanban) — THIS IS the dashboard */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Application Portfolio
          </h2>
          <PortfolioPage />
        </div>

        {/* Deadline Sidebar */}
        <div className="space-y-6">
          {/* Deadline Calendar Widget */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="size-4 text-muted-foreground" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Upcoming Deadlines
              </h3>
            </div>
            {deadlines.length > 0 ? (
              <div className="space-y-3">
                {deadlines.slice(0, 5).map((dl) => (
                  <Link
                    key={`${dl.school_id}-${dl.round}`}
                    href={`/school/${dl.school_id}`}
                    className="block group"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {dl.school_name}
                      </p>
                      <span
                        className={cn(
                          "text-xs font-bold tabular-nums ml-2 shrink-0",
                          dl.days_left <= 7
                            ? "text-destructive"
                            : dl.days_left <= 30
                              ? "text-amber-500"
                              : "text-emerald-500"
                        )}
                      >
                        {dl.days_left}d
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {dl.round} — {dl.deadline}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No deadlines tracked yet.
              </p>
            )}
            <Link
              href="/upcoming-deadlines"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              View all deadlines <ArrowRight className="size-3" />
            </Link>
          </div>

          {/* Per-School Completion Progress */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Completion Progress
            </h3>
            {schools.length > 0 ? (
              <div className="space-y-3">
                {schools.slice(0, 6).map((s) => {
                  const pct = getCompletionPct(s);
                  return (
                    <Link
                      key={s.school_id}
                      href={`/school/${s.school_id}`}
                      className="block group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {s.name}
                        </p>
                        <span className="text-[10px] font-bold text-muted-foreground tabular-nums ml-2">
                          {pct}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            pct === 100
                              ? "bg-emerald-500"
                              : pct >= 50
                                ? "bg-primary"
                                : "bg-amber-400"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Track schools to see completion progress.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
