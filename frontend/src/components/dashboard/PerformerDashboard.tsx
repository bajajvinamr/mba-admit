"use client";

import Link from "next/link";
import {
  Mic,
  ArrowRight,
  Play,
  Calendar,
  TrendingUp,
  BookOpen,
  Video,
} from "lucide-react";
import { cn } from "@/lib/cn";

// ── Types ──────────────────────────────────────────────────────────────────

type InterviewDate = {
  school_id: string;
  school_name: string;
  date: string;
  format: string; // "Video", "In-person", "Phone"
  days_until: number;
};

type MockScore = {
  date: string;
  score: number; // 0-100
};

type PerformerDashboardProps = {
  upcomingInterviews?: InterviewDate[];
  recentScores?: MockScore[];
  className?: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ── PerformerDashboard ─────────────────────────────────────────────────────

export function PerformerDashboard({
  upcomingInterviews = [],
  recentScores = [],
  className = "",
}: PerformerDashboardProps) {
  const avgScore =
    recentScores.length > 0
      ? Math.round(
          recentScores.reduce((sum, s) => sum + s.score, 0) /
            recentScores.length
        )
      : null;

  const scoreTrend =
    recentScores.length >= 2
      ? recentScores[recentScores.length - 1].score -
        recentScores[recentScores.length - 2].score
      : 0;

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">
            Interview Prep
          </h2>
          <p className="text-muted-foreground mt-1">
            {upcomingInterviews.length > 0
              ? `${upcomingInterviews.length} upcoming interview${upcomingInterviews.length > 1 ? "s" : ""}`
              : "Practice mock interviews and track your progress"}
          </p>
        </div>
        <Link
          href="/interview"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          <Mic className="size-4" />
          Start Mock Interview
        </Link>
      </div>

      {/* Upcoming Interviews */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Upcoming Interviews
        </h3>
        {upcomingInterviews.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingInterviews.map((interview) => (
              <div
                key={`${interview.school_id}-${interview.date}`}
                className="rounded-lg border border-border bg-card p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      {interview.school_name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(interview.date)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                      interview.days_until <= 3
                        ? "bg-destructive/10 text-destructive"
                        : interview.days_until <= 7
                          ? "bg-amber-50 text-amber-600"
                          : "bg-emerald-50 text-emerald-600"
                    )}
                  >
                    {interview.days_until}d
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                  <Video className="size-3" />
                  <span>{interview.format}</span>
                </div>
                <Link
                  href={`/interview?school=${interview.school_id}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  <Play className="size-3" />
                  Quick-launch mock
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <Calendar className="size-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No upcoming interviews scheduled. Practice with mock interviews to prepare.
            </p>
          </div>
        )}
      </div>

      {/* Score Trends + Quick Launch */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Interview Score Trends */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="size-4 text-muted-foreground" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Score Trends (Last 5)
            </h3>
          </div>
          {recentScores.length > 0 ? (
            <>
              <div className="flex items-end gap-3 mb-4">
                <p className="text-3xl font-bold text-foreground tabular-nums">
                  {avgScore}
                </p>
                <div className="pb-1">
                  <p className="text-xs text-muted-foreground">avg score</p>
                  {scoreTrend !== 0 && (
                    <p
                      className={cn(
                        "text-xs font-medium",
                        scoreTrend > 0
                          ? "text-emerald-500"
                          : "text-red-500"
                      )}
                    >
                      {scoreTrend > 0 ? "+" : ""}
                      {scoreTrend} last session
                    </p>
                  )}
                </div>
              </div>
              {/* Simple bar chart */}
              <div className="flex items-end gap-2 h-20">
                {recentScores.slice(-5).map((s, i) => (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className={cn(
                        "w-full rounded-t transition-all",
                        s.score >= 80
                          ? "bg-emerald-400"
                          : s.score >= 60
                            ? "bg-primary"
                            : "bg-amber-400"
                      )}
                      style={{ height: `${s.score}%` }}
                    />
                    <span className="text-[9px] text-muted-foreground tabular-nums">
                      {s.score}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Complete mock interviews to see your score trends.
            </p>
          )}
        </div>

        {/* School Interview Guides */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="size-4 text-muted-foreground" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Interview Guides
            </h3>
          </div>
          <div className="space-y-2">
            {(upcomingInterviews.length > 0
              ? upcomingInterviews
              : [
                  { school_id: "hbs", school_name: "Harvard Business School" },
                  { school_id: "gsb", school_name: "Stanford GSB" },
                  { school_id: "wharton", school_name: "Wharton" },
                ]
            )
              .slice(0, 5)
              .map((s) => (
                <Link
                  key={s.school_id}
                  href={`/school/${s.school_id}/interview-guide`}
                  className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted transition-colors group"
                >
                  <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                    {s.school_name}
                  </span>
                  <ArrowRight className="size-3 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              ))}
          </div>
          <Link
            href="/interview"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Browse all guides <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
