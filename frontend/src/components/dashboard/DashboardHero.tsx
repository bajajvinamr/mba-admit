"use client";

import Link from "next/link";
import { Search, PenTool, Mic, Calendar, ArrowRight } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

type StatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: number;
};

type DashboardHeroProps = {
  schoolsTracked?: number;
  essaysDrafted?: number;
  interviewsDone?: number;
  daysToDeadline?: number | null;
  recommendation?: string;
  recommendationHref?: string;
};

// ── StatCard ───────────────────────────────────────────────────────────────

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-col gap-3">
        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        <span className="text-2xl font-display font-bold text-foreground tabular-nums">
          {value}
        </span>
        <span className="text-sm text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}

// ── DashboardHero (now DashboardHeader) ───────────────────────────────────

export function DashboardHero({
  schoolsTracked = 0,
  essaysDrafted = 0,
  interviewsDone = 0,
  daysToDeadline = null,
  recommendation,
  recommendationHref = "/onboarding",
}: DashboardHeroProps) {
  return (
    <section className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Welcome back
        </h1>
        <p className="text-muted-foreground mt-1">
          {recommendation || "Track schools, draft essays, and prepare for interviews."}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Search className="size-4" />}
          label="Schools tracked"
          value={schoolsTracked}
        />
        <StatCard
          icon={<PenTool className="size-4" />}
          label="Essays drafted"
          value={essaysDrafted}
        />
        <StatCard
          icon={<Mic className="size-4" />}
          label="Interviews done"
          value={interviewsDone}
        />
        <StatCard
          icon={<Calendar className="size-4" />}
          label="Days to deadline"
          value={daysToDeadline ?? 0}
        />
      </div>

      {recommendationHref && (
        <Link
          href={recommendationHref}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Take action <ArrowRight className="size-4" />
        </Link>
      )}
    </section>
  );
}
