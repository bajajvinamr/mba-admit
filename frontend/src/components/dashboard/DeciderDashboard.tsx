"use client";

import Link from "next/link";
import {
  Scale,
  Clock,
  AlertTriangle,
  ArrowRight,
  DollarSign,
  Briefcase,
  MapPin,
  Trophy,
  Star,
} from "lucide-react";
import { cn } from "@/lib/cn";

// ── Types ──────────────────────────────────────────────────────────────────

type AdmittedSchool = {
  school_id: string;
  name: string;
  location: string;
  gmat_avg: number | null;
  acceptance_rate: number | null;
  financial_aid?: string | null;
  avg_salary?: string | null;
  placement_rate?: string | null;
};

type WaitlistSchool = {
  school_id: string;
  name: string;
  strategy_tip?: string;
};

type DeciderDashboardProps = {
  admitted?: AdmittedSchool[];
  waitlisted?: WaitlistSchool[];
  depositDeadline?: { school_name: string; date: string } | null;
  topRecommendation?: string | null;
  className?: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ── DeciderDashboard ───────────────────────────────────────────────────────

export function DeciderDashboard({
  admitted = [],
  waitlisted = [],
  depositDeadline = null,
  topRecommendation = null,
  className = "",
}: DeciderDashboardProps) {
  const depositDays = depositDeadline ? daysUntil(depositDeadline.date) : null;

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Decision Matrix Summary */}
      <div className="rounded-xl border-2 border-[#b8860b]/30 bg-primary/5 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground tracking-tight">
              Make Your Decision
            </h2>
            <p className="text-muted-foreground mt-2 max-w-lg leading-relaxed">
              {topRecommendation ??
                (admitted.length > 0
                  ? `Compare your ${admitted.length} admit${admitted.length > 1 ? "s" : ""} side-by-side across ROI, career outcomes, and fit.`
                  : "Add your admitted schools to compare offers and make your final decision.")}
            </p>
            <Link
              href="/decide"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              <Scale className="size-4" />
              Open Decision Matrix
              <ArrowRight className="size-4" />
            </Link>
          </div>
          {depositDeadline && depositDays !== null && (
            <div className="hidden sm:block text-center shrink-0">
              <p
                className={cn(
                  "text-3xl font-bold tabular-nums",
                  depositDays <= 7
                    ? "text-destructive"
                    : depositDays <= 14
                      ? "text-amber-500"
                      : "text-foreground"
                )}
              >
                {depositDays > 0 ? depositDays : 0}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                days to deposit
              </p>
              <p className="text-[10px] text-muted-foreground">
                {depositDeadline.school_name}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Admitted School Cards */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Your Admits ({admitted.length})
        </h3>
        {admitted.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {admitted.map((school) => (
              <Link
                key={school.school_id}
                href={`/school/${school.school_id}`}
                className="group rounded-lg border border-emerald-200 bg-card p-5 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {school.name}
                    </h4>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="size-3" /> {school.location}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    Admitted
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {school.avg_salary && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <DollarSign className="size-3" />
                      <span>{school.avg_salary}</span>
                    </div>
                  )}
                  {school.placement_rate && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Briefcase className="size-3" />
                      <span>{school.placement_rate}</span>
                    </div>
                  )}
                  {school.financial_aid && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground col-span-2">
                      <Star className="size-3 text-amber-500" />
                      <span className="font-medium text-foreground">
                        {school.financial_aid}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <Trophy className="size-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No admits tracked yet. Update your application statuses to see them here.
            </p>
          </div>
        )}
      </div>

      {/* Bottom row: Waitlist + Scholarship Comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Waitlist Status Cards */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="size-4 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Waitlist Tracker ({waitlisted.length})
            </h3>
          </div>
          {waitlisted.length > 0 ? (
            <div className="space-y-3">
              {waitlisted.map((school) => (
                <div
                  key={school.school_id}
                  className="rounded-md border border-amber-200 bg-amber-50/30 p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">
                      {school.name}
                    </p>
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      Waitlisted
                    </span>
                  </div>
                  {school.strategy_tip && (
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      {school.strategy_tip}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No waitlists being tracked.
            </p>
          )}
          <Link
            href="/waitlist"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Waitlist strategies <ArrowRight className="size-3" />
          </Link>
        </div>

        {/* Scholarship Comparison */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="size-4 text-emerald-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Financial Comparison
            </h3>
          </div>
          {admitted.length > 0 ? (
            <div className="space-y-3">
              {admitted.map((school) => (
                <div
                  key={school.school_id}
                  className="flex items-center justify-between py-1.5"
                >
                  <p className="text-sm text-foreground truncate">
                    {school.name}
                  </p>
                  <p className="text-xs font-semibold text-foreground ml-2 shrink-0">
                    {school.financial_aid ?? "No data"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Add admitted schools to compare financial aid packages.
            </p>
          )}
          <Link
            href="/fee-tracker"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Fee comparison tool <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>

      {/* Deposit Deadline Countdown (if set, shown prominently on mobile too) */}
      {depositDeadline && depositDays !== null && (
        <div
          className={cn(
            "sm:hidden rounded-lg border p-5 text-center",
            depositDays <= 7
              ? "border-destructive/30 bg-destructive/5"
              : depositDays <= 14
                ? "border-amber-300 bg-amber-50/50"
                : "border-border bg-card"
          )}
        >
          <Clock className="size-5 text-muted-foreground mx-auto mb-2" />
          <p
            className={cn(
              "text-3xl font-bold tabular-nums",
              depositDays <= 7
                ? "text-destructive"
                : depositDays <= 14
                  ? "text-amber-500"
                  : "text-foreground"
            )}
          >
            {depositDays > 0 ? depositDays : 0}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            days to deposit — {depositDeadline.school_name}
          </p>
        </div>
      )}
    </div>
  );
}
