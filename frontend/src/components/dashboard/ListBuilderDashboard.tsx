"use client";

import Link from "next/link";
import {
  Search,
  Calculator,
  ArrowRight,
  Target,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/cn";

// ── Types ──────────────────────────────────────────────────────────────────

type SchoolPreview = {
  id: string;
  school_id: string;
  name: string;
  location: string;
  gmat_avg: number | null;
  acceptance_rate: number | null;
  profile_fit: { verdict: string } | null;
};

type ListBuilderDashboardProps = {
  schools?: SchoolPreview[];
  className?: string;
};

// ── Column Card ────────────────────────────────────────────────────────────

function SchoolSlot({ school }: { school: SchoolPreview }) {
  return (
    <Link
      href={`/school/${school.school_id}`}
      className="block bg-white rounded-md border border-border p-3 hover:shadow-sm transition-all"
    >
      <p className="text-sm font-medium text-foreground">{school.name}</p>
      <p className="text-[10px] text-muted-foreground">{school.location}</p>
      {school.gmat_avg && (
        <p className="text-xs text-muted-foreground mt-1">
          Avg GMAT: {school.gmat_avg}
        </p>
      )}
    </Link>
  );
}

// ── ListBuilderDashboard ───────────────────────────────────────────────────

export function ListBuilderDashboard({
  schools = [],
  className = "",
}: ListBuilderDashboardProps) {
  const reach = schools.filter(
    (s) => s.profile_fit && s.profile_fit.verdict === "reach"
  );
  const target = schools.filter(
    (s) => s.profile_fit && s.profile_fit.verdict === "target"
  );
  const safety = schools.filter(
    (s) => s.profile_fit && s.profile_fit.verdict === "safety"
  );
  const totalMatched = target.length;

  const tiers = [
    {
      label: "Reach",
      items: reach,
      color: "border-red-200 bg-red-50/30",
      icon: TrendingUp,
      iconColor: "text-red-500",
    },
    {
      label: "Target",
      items: target,
      color: "border-amber-200 bg-amber-50/30",
      icon: Target,
      iconColor: "text-amber-500",
    },
    {
      label: "Safety",
      items: safety,
      color: "border-emerald-200 bg-emerald-50/30",
      icon: ShieldCheck,
      iconColor: "text-emerald-500",
    },
  ];

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Fit Score Summary */}
      <div className="rounded-xl border-2 border-[#b8860b]/30 bg-primary/5 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground tracking-tight">
              {totalMatched > 0
                ? `You match ${totalMatched} school${totalMatched > 1 ? "s" : ""} at Target level`
                : "Build your balanced school list"}
            </h2>
            <p className="text-muted-foreground mt-2 max-w-lg leading-relaxed">
              {totalMatched > 0
                ? "Your profile fits these programs well. Keep adding reach and safety schools for a balanced portfolio."
                : "Complete your profile to get fit scores, then categorize schools into reach, target, and safety tiers."}
            </p>
            <div className="flex items-center gap-3 mt-4">
              <Link
                href="/simulator"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                <Calculator className="size-4" />
                Calculate Odds
              </Link>
              <Link
                href="/fit-score"
                className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Update Profile
              </Link>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-center">
            {tiers.map((t) => (
              <div key={t.label}>
                <p className="text-2xl font-bold text-foreground tabular-nums">
                  {t.items.length}
                </p>
                <p className="text-xs text-muted-foreground">{t.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reach / Target / Safety Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((tier) => (
          <div
            key={tier.label}
            className={cn("rounded-lg border p-4", tier.color)}
          >
            <div className="flex items-center gap-2 mb-3">
              <tier.icon className={cn("size-4", tier.iconColor)} />
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {tier.label} ({tier.items.length})
              </h3>
            </div>
            <div className="space-y-2">
              {tier.items.map((s) => (
                <SchoolSlot key={s.id} school={s} />
              ))}
              {tier.items.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No schools yet
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* School Discovery Shortcuts */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-semibold text-foreground mb-4">
          Discover more schools
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/schools"
            className="group flex items-center gap-3 rounded-lg border border-border p-4 hover:shadow-sm transition-all"
          >
            <Search className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
            <div>
              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                Browse All Schools
              </p>
              <p className="text-xs text-muted-foreground">
                800+ programs with filters
              </p>
            </div>
          </Link>
          <Link
            href="/schools?tier=m7,t15"
            className="group flex items-center gap-3 rounded-lg border border-border p-4 hover:shadow-sm transition-all"
          >
            <TrendingUp className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
            <div>
              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                Top 15 Programs
              </p>
              <p className="text-xs text-muted-foreground">
                M7 and T15 schools
              </p>
            </div>
          </Link>
          <Link
            href="/schools?fit=high"
            className="group flex items-center gap-3 rounded-lg border border-border p-4 hover:shadow-sm transition-all"
          >
            <Target className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
            <div>
              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                Best Fit for You
              </p>
              <p className="text-xs text-muted-foreground">
                Profile-based matches
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
