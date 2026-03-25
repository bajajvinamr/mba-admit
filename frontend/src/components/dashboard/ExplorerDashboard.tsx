"use client";

import Link from "next/link";
import {
  TrendingUp,
  ArrowRight,
  DollarSign,
  Users,
  Briefcase,
  GraduationCap,
  Globe,
  Zap,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

type ExplorerDashboardProps = {
  className?: string;
};

// ── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  value,
  label,
  icon: Icon,
}: {
  value: string;
  label: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <Icon className="size-5 text-muted-foreground mb-3" />
      <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

// ── Unlock Card ────────────────────────────────────────────────────────────

function UnlockCard({
  title,
  description,
  href,
  icon: Icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-foreground/20 hover:shadow-sm"
    >
      <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="size-5 text-[#b8860b]" />
      </div>
      <h3 className="font-semibold text-foreground text-sm">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{description}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#b8860b] group-hover:underline">
        Explore <ArrowRight className="size-3" />
      </span>
    </Link>
  );
}

// ── Tier Card ──────────────────────────────────────────────────────────────

function TierCard({
  tier,
  schools,
  avgSalary,
  avgTuition,
}: {
  tier: string;
  schools: string;
  avgSalary: string;
  avgTuition: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{tier}</p>
      <p className="text-sm text-foreground mt-2">{schools}</p>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>Salary: {avgSalary}</span>
        <span>Tuition: {avgTuition}</span>
      </div>
    </div>
  );
}

// ── ExplorerDashboard ──────────────────────────────────────────────────────

export function ExplorerDashboard({ className = "" }: ExplorerDashboardProps) {
  return (
    <div className={`space-y-8 ${className}`}>
      {/* Hero Card — "Should I MBA?" */}
      <div className="rounded-xl border-2 border-[#b8860b]/30 bg-primary/5 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground tracking-tight">
              Should I MBA?
            </h2>
            <p className="text-muted-foreground mt-2 max-w-lg leading-relaxed">
              Model your 10-year career trajectory with and without an MBA. See the real financial impact before committing.
            </p>
            <Link
              href="/career-simulator"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              <TrendingUp className="size-4" />
              Launch Career Simulator
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="hidden sm:block rounded-full bg-primary/10 p-4">
            <Zap className="size-8 text-[#b8860b]" />
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} value="$50K+" label="Avg salary increase" />
        <StatCard icon={TrendingUp} value="2.5x" label="Avg 10-year ROI" />
        <StatCard icon={Briefcase} value="87%" label="Career switchers" />
        <StatCard icon={Users} value="15K+" label="Alumni network size" />
      </div>

      {/* "What MBA Unlocks" Grid */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">What an MBA Unlocks</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <UnlockCard
            icon={Briefcase}
            title="Career Switch"
            description="87% of MBA grads switch industries or functions. The MBA is the most effective career pivot credential."
            href="/career-switcher"
          />
          <UnlockCard
            icon={DollarSign}
            title="Salary Jump"
            description="Average starting salary of $165K at M7 programs. Median 10-year ROI exceeds 200% at top schools."
            href="/career-simulator"
          />
          <UnlockCard
            icon={Users}
            title="Network Effect"
            description="Access to 15,000+ alumni globally. The MBA network compounds in value over your entire career."
            href="/alumni"
          />
        </div>
      </div>

      {/* Featured School Comparison by Tier */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Schools by Tier</h3>
          <Link
            href="/schools"
            className="text-sm text-[#b8860b] font-medium hover:underline inline-flex items-center gap-1"
          >
            View all <ArrowRight className="size-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TierCard
            tier="M7 — Elite"
            schools="HBS, GSB, Wharton, Booth, Kellogg, CBS, Sloan"
            avgSalary="$175K"
            avgTuition="$160K"
          />
          <TierCard
            tier="T15 — Top"
            schools="Haas, Stern, Ross, Tuck, Darden, Fuqua, Yale SOM"
            avgSalary="$155K"
            avgTuition="$140K"
          />
          <TierCard
            tier="T25 — Strong"
            schools="Anderson, Tepper, McCombs, Kenan-Flagler, Marshall"
            avgSalary="$140K"
            avgTuition="$120K"
          />
        </div>
      </div>
    </div>
  );
}
