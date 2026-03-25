"use client";

import Link from "next/link";
import { MapPin, Users, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SchoolSearchResult } from "@/components/search/SchoolCard";

// ── Props ───────────────────────────────────────────────────────────────────

export interface SchoolCard3DProps {
  id: string;
  name: string;
  location?: string;
  gmat_avg?: number | null;
  acceptance_rate?: number | null;
  class_size?: number | null;
  tier?: string;
  format?: string;
}

type SchoolCard3DInternalProps = {
  school: SchoolSearchResult;
  className?: string;
  fitScore?: number | null;
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatStat(value: number | null | undefined, suffix = ""): string {
  if (value == null) return "\u2014";
  return `${value}${suffix}`;
}

function tierBadgeClass(tier: string | null | undefined): string {
  if (!tier) return "";
  switch (tier) {
    case "M7":
      return "border-primary text-primary";
    case "T15":
      return "border-indigo-400 text-indigo-400";
    case "T25":
      return "border-violet-400 text-violet-400";
    default:
      return "border-border text-muted-foreground";
  }
}

// ── Component (accepts SchoolSearchResult for backward compat) ──────────────

export function SchoolCard3D({ school, className, fitScore }: SchoolCard3DInternalProps) {
  const tier = school.tier;
  const format = school.program_format ?? (school.formats?.[0] || null);

  return (
    <div className={className}>
      <Link
        href={`/school/${school.id}`}
        className="block"
      >
        <div
          className={cn(
            "rounded-lg border border-border bg-card p-5 cursor-pointer",
            "transition-colors duration-150",
            "hover:bg-accent/50 hover:border-primary/20",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          )}
        >
          {/* Top badges: tier + format */}
          <div className="flex items-center gap-2 mb-3">
            {tier && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
                  tierBadgeClass(tier),
                )}
              >
                {tier}
              </span>
            )}
            {format && (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider border border-border text-muted-foreground">
                {format}
              </span>
            )}
            {/* Fit score badge (top-right) */}
            {fitScore != null && (
              <span className="ml-auto inline-flex items-center justify-center size-8 rounded-full border border-primary/30 bg-primary/10 text-xs font-bold text-primary">
                {fitScore}
              </span>
            )}
          </div>

          {/* School name */}
          <h3 className="text-base font-semibold text-foreground line-clamp-2 mb-1">
            {school.name}
          </h3>

          {/* Location */}
          <p className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{school.location || "Location TBD"}</span>
          </p>

          {/* Bottom stat badges row */}
          <div className="flex items-stretch">
            <StatBadge
              icon={<GraduationCap className="size-3" />}
              label="GMAT"
              value={formatStat(school.gmat_avg)}
            />
            <div className="w-px bg-border" />
            <StatBadge
              label="Accept"
              value={formatStat(school.acceptance_rate, "%")}
            />
            <div className="w-px bg-border" />
            <StatBadge
              icon={<Users className="size-3" />}
              label="Class"
              value={formatStat(school.class_size)}
            />
          </div>
        </div>
      </Link>
    </div>
  );
}

// ── Stat Badge ──────────────────────────────────────────────────────────────

function StatBadge({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex-1 text-center px-2 py-2">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5 flex items-center justify-center gap-0.5">
        {icon}
        {label}
      </p>
      <p className="text-sm font-semibold text-foreground tabular-nums">{value}</p>
    </div>
  );
}

// ── Skeleton ────────────────────────────────────────────────────────────────

export function SchoolCard3DSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-5 animate-pulse">
      <div className="flex gap-2 mb-3">
        <div className="h-5 w-10 bg-muted rounded-full" />
        <div className="h-5 w-16 bg-muted rounded-full" />
      </div>
      <div className="h-5 w-3/4 bg-muted rounded mb-2" />
      <div className="h-4 w-1/2 bg-muted/50 rounded mb-4" />
      <div className="flex gap-2">
        <div className="flex-1 h-12 bg-muted/50 rounded" />
        <div className="flex-1 h-12 bg-muted/50 rounded" />
        <div className="flex-1 h-12 bg-muted/50 rounded" />
      </div>
    </div>
  );
}
