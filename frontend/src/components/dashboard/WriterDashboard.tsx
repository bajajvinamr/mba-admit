"use client";

import Link from "next/link";
import {
  PenTool,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/cn";

// ── Types ──────────────────────────────────────────────────────────────────

type EssayStatus = "not_started" | "drafting" | "reviewing" | "final";

type EssayPreview = {
  school_id: string;
  school_name: string;
  prompt_title: string;
  status: EssayStatus;
  word_count: number;
  word_limit: number;
};

type WriterDashboardProps = {
  essays?: EssayPreview[];
  nextEssayDeadline?: {
    school_name: string;
    days_left: number;
  } | null;
  themeHealth?: number; // 0-100, how consistent themes are across essays
  className?: string;
};

// ── Status Config ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  EssayStatus,
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  not_started: {
    label: "Not Started",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    icon: FileText,
  },
  drafting: {
    label: "Drafting",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    icon: PenTool,
  },
  reviewing: {
    label: "Reviewing",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    icon: AlertCircle,
  },
  final: {
    label: "Final",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    icon: CheckCircle2,
  },
};

// ── WriterDashboard ────────────────────────────────────────────────────────

export function WriterDashboard({
  essays = [],
  nextEssayDeadline = null,
  themeHealth = 0,
  className = "",
}: WriterDashboardProps) {
  const statusCounts = {
    not_started: essays.filter((e) => e.status === "not_started").length,
    drafting: essays.filter((e) => e.status === "drafting").length,
    reviewing: essays.filter((e) => e.status === "reviewing").length,
    final: essays.filter((e) => e.status === "final").length,
  };

  const totalEssays = essays.length;
  const completedEssays = statusCounts.final;

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">
            Essay Workspace
          </h2>
          <p className="text-muted-foreground mt-1">
            {totalEssays > 0
              ? `${completedEssays} of ${totalEssays} essays finalized`
              : "Start writing essays for your target schools"}
          </p>
        </div>
        <Link
          href="/essays"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          <PenTool className="size-4" />
          Open Essay Editor
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {/* Status Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(
          Object.entries(STATUS_CONFIG) as [EssayStatus, (typeof STATUS_CONFIG)[EssayStatus]][]
        ).map(([key, config]) => (
          <div
            key={key}
            className={cn(
              "rounded-lg border border-border p-4",
              statusCounts[key] > 0 ? config.bgColor : "bg-card"
            )}
          >
            <config.icon className={cn("size-4 mb-2", config.color)} />
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {statusCounts[key]}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {config.label}
            </p>
          </div>
        ))}
      </div>

      {/* Essay Progress Grid */}
      {essays.length > 0 ? (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">
            All Essays
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {essays.map((essay, idx) => {
              const config = STATUS_CONFIG[essay.status];
              const StatusIcon = config.icon;
              return (
                <Link
                  key={`${essay.school_id}-${idx}`}
                  href={`/essays?school=${essay.school_id}`}
                  className="group rounded-lg border border-border bg-card p-4 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {essay.school_name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {essay.prompt_title}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
                        config.bgColor,
                        config.color
                      )}
                    >
                      <StatusIcon className="size-3" />
                      {config.label}
                    </span>
                  </div>
                  {essay.word_limit > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                        <span>
                          {essay.word_count} / {essay.word_limit} words
                        </span>
                        <span>
                          {Math.round(
                            (essay.word_count / essay.word_limit) * 100
                          )}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{
                            width: `${Math.min(100, (essay.word_count / essay.word_limit) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <PenTool className="size-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            No essays tracked yet. Add schools to your list to see essay prompts.
          </p>
          <Link
            href="/essays"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Go to Essay Workspace <ArrowRight className="size-4" />
          </Link>
        </div>
      )}

      {/* Bottom row: Theme Health + Next Deadline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Cross-Essay Theme Health */}
        <Link
          href="/essays/themes"
          className="group rounded-lg border border-border bg-card p-5 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-2 mb-3">
            <Palette className="size-4 text-muted-foreground" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Theme Consistency
            </h3>
          </div>
          {themeHealth > 0 ? (
            <>
              <div className="flex items-end gap-2 mb-2">
                <p className="text-3xl font-bold text-foreground tabular-nums">
                  {themeHealth}%
                </p>
                <p className="text-xs text-muted-foreground pb-1">health score</p>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    themeHealth >= 70
                      ? "bg-emerald-500"
                      : themeHealth >= 40
                        ? "bg-amber-400"
                        : "bg-red-400"
                  )}
                  style={{ width: `${themeHealth}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {themeHealth >= 70
                  ? "Strong thematic consistency across essays"
                  : "Review themes to strengthen your narrative"}
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Write 2+ essays to see theme analysis
            </p>
          )}
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#b8860b] group-hover:underline">
            View themes <ArrowRight className="size-3" />
          </span>
        </Link>

        {/* Next Deadline Countdown */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="size-4 text-muted-foreground" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Next Essay Deadline
            </h3>
          </div>
          {nextEssayDeadline ? (
            <>
              <p
                className={cn(
                  "text-3xl font-bold tabular-nums",
                  nextEssayDeadline.days_left <= 7
                    ? "text-destructive"
                    : nextEssayDeadline.days_left <= 30
                      ? "text-amber-500"
                      : "text-foreground"
                )}
              >
                {nextEssayDeadline.days_left}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                days until {nextEssayDeadline.school_name}
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              No essay deadlines tracked
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
