"use client";

import { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  Plus,
  ArrowRight,
  MapPin,
  ChevronDown,
  RefreshCw,
  Menu,
  Search,
  Calculator,
  DollarSign,
  Globe,
  BarChart3,
  Scale,
  ListChecks,
  Sparkles,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { track } from "@/lib/analytics";
import { useProfile } from "@/hooks/useProfile";
import { useOnboardingStore, type Archetype } from "@/stores/onboarding";
import { JOURNEY_STAGES, type JourneyStage } from "@/lib/constants";
import { cn } from "@/lib/cn";

import { Sidebar } from "@/components/layout/Sidebar";
import { JourneyProgress } from "@/components/dashboard/JourneyProgress";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { NextStepCard } from "@/components/dashboard/NextStepCard";
import { DeadlineWidget, type DeadlineItem } from "@/components/dashboard/DeadlineWidget";
import { StageToolGrid } from "@/components/dashboard/StageToolGrid";

// Lazy-load the portfolio board to avoid loading dnd-kit for non-applicant archetypes
const PortfolioPage = dynamic(() => import("@/app/portfolio/page"), {
  loading: () => (
    <div className="h-96 bg-muted rounded-lg animate-pulse" />
  ),
});

// ── Types ────────────────────────────────────────────────────────────────────

type ProfileFit = {
  gmat_percentile: number;
  gpa_percentile: number;
  yoe_percentile: number;
  verdict: string;
};

type NextAction = {
  label: string;
  href: string;
  urgency: "low" | "medium" | "high";
};

type Deadline = {
  school_id: string;
  school_name: string;
  round: string;
  deadline: string;
  decision: string;
  days_left: number;
  status: string;
};

type EnrichedSchool = {
  id: string;
  school_id: string;
  round: string | null;
  status: string;
  notes: string | null;
  priority: number;
  name: string;
  location: string;
  gmat_avg: number | null;
  acceptance_rate: number | null;
  essay_count: number;
  total_decisions: number;
  admit_rate_real: number | null;
  next_deadline: Deadline | null;
  profile_fit: ProfileFit | null;
  next_action: NextAction;
};

type DashboardData = {
  total_schools: number;
  status_breakdown: Record<string, number>;
  schools: EnrichedSchool[];
  upcoming_deadlines: Deadline[];
};

// ── Dashboard data hook ──────────────────────────────────────────────────────

function useDashboardData(profile: { gmat?: number; gpa?: number; yoe?: number }) {
  const params = new URLSearchParams();
  if (profile.gmat) params.set("gmat", String(profile.gmat));
  if (profile.gpa) params.set("gpa", String(profile.gpa));
  if (profile.yoe) params.set("yoe", String(profile.yoe));
  const qs = params.toString() ? `?${params.toString()}` : "";

  return useQuery<DashboardData>({
    queryKey: ["dashboard", profile.gmat, profile.gpa, profile.yoe],
    queryFn: () => apiFetch<DashboardData>(`/api/user/dashboard${qs}`),
    staleTime: 3 * 60 * 1000,
    retry: 1,
  });
}

// ── Archetype Labels ─────────────────────────────────────────────────────────

const ARCHETYPE_LABELS: Record<Archetype, string> = {
  explorer: "Explorer",
  compass: "Compass",
  listbuilder: "List Builder",
  strategist: "Strategist",
  writer: "Writer",
  performer: "Performer",
  decider: "Decider",
};

const ALL_ARCHETYPES: Archetype[] = [
  "explorer",
  "compass",
  "listbuilder",
  "strategist",
  "writer",
  "performer",
  "decider",
];

// ── Derive journey stage ─────────────────────────────────────────────────────

function deriveJourneyStage(
  archetype: Archetype,
  schools: EnrichedSchool[],
  totalSchools: number
): JourneyStage {
  switch (archetype) {
    case "explorer":
      return "explore";
    case "compass":
      return "explore";
    case "listbuilder":
      return "prepare";
    case "strategist":
    case "writer":
      return "write";
    case "performer":
      return "practice";
    case "decider":
      return "decide";
    default: {
      if (totalSchools === 0) return "explore";
      const statuses = new Set(schools.map((s) => s.status));
      if (statuses.has("decision")) return "decide";
      if (statuses.has("interview")) return "practice";
      if (statuses.has("submitted")) return "write";
      if (statuses.has("preparing")) return "prepare";
      return "explore";
    }
  }
}

// ── Animation variants ──────────────────────────────────────────────────────

const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

// ── Mini-Card (reused from old dashboard) ────────────────────────────────────

function SchoolMiniCard({ school }: { school: EnrichedSchool }) {
  return (
    <Link
      href={`/school/${school.school_id}`}
      className="group flex-shrink-0 w-56 bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-all"
    >
      <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
        {school.name}
      </h4>
      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
        <MapPin className="size-3" /> {school.location || "Location TBD"}
      </p>
      <div className="flex items-center gap-3 mt-3">
        {school.gmat_avg && (
          <div className="text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest">GMAT</p>
            <p className="text-sm font-bold font-display tabular-nums text-foreground">
              {school.gmat_avg}
            </p>
          </div>
        )}
        {school.acceptance_rate && (
          <div className="text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Accept</p>
            <p className="text-sm font-bold font-display tabular-nums text-foreground">
              {school.acceptance_rate}%
            </p>
          </div>
        )}
      </div>
      {school.next_deadline && (
        <div
          className={cn(
            "mt-3 text-[10px] font-bold px-2 py-1 rounded inline-block",
            school.next_deadline.days_left <= 14
              ? "bg-destructive/10 text-destructive"
              : school.next_deadline.days_left <= 30
                ? "bg-warning/10 text-warning"
                : "bg-success/10 text-success"
          )}
        >
          {school.next_deadline.days_left}d to {school.next_deadline.round}
        </div>
      )}
    </Link>
  );
}

// ── Archetype View Switcher ──────────────────────────────────────────────────

function ArchetypeSwitcher({
  current,
  onChange,
}: {
  current: Archetype;
  onChange: (a: Archetype) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md border border-border bg-card transition-colors"
      >
        {ARCHETYPE_LABELS[current]}
        <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
            {ALL_ARCHETYPES.map((a) => (
              <button
                key={a}
                onClick={() => {
                  onChange(a);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 text-xs font-medium transition-colors",
                  a === current
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted"
                )}
              >
                {ARCHETYPE_LABELS[a]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Archetype 1: Explorer Layout ─────────────────────────────────────────────

function ExplorerDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Should I get an MBA?
        </h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Explore whether an MBA is the right investment for your career goals.
          Use our tools to compare ROI, simulate career outcomes, and understand
          what top programs look for.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/roi"
          className="group flex flex-col bg-card border border-border rounded-lg p-5 hover:shadow-sm transition-all"
        >
          <div className="flex size-10 items-center justify-center rounded-lg mb-3 bg-amber-50 text-amber-600">
            <DollarSign className="size-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
            ROI Calculator
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Compare tuition, expected salary, and payback period
          </p>
        </Link>

        <Link
          href="/career-simulator"
          className="group flex flex-col bg-card border border-border rounded-lg p-5 hover:shadow-sm transition-all"
        >
          <div className="flex size-10 items-center justify-center rounded-lg mb-3 bg-blue-50 text-blue-600">
            <BarChart3 className="size-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
            Career Simulator
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Model your post-MBA career trajectory and earnings
          </p>
        </Link>

        <Link
          href="/schools"
          className="group flex flex-col bg-card border border-border rounded-lg p-5 hover:shadow-sm transition-all"
        >
          <div className="flex size-10 items-center justify-center rounded-lg mb-3 bg-emerald-50 text-emerald-600">
            <Search className="size-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
            Explore Schools
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Browse 800+ programs and filter by your preferences
          </p>
        </Link>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-sm font-bold text-foreground mb-2">
          Not sure where to start?
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Take our fit quiz to understand what programs match your profile, or
          check out the salary database to see if the numbers make sense.
        </p>
        <div className="flex gap-3">
          <Link
            href="/fit-score"
            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Take Fit Quiz
          </Link>
          <Link
            href="/salary-database"
            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Salary Database
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Archetype 2: Compass Layout ──────────────────────────────────────────────

function CompassDashboard() {
  const countries = [
    { name: "United States", flag: "US", schoolCount: 200, slug: "us" },
    { name: "United Kingdom", flag: "UK", schoolCount: 35, slug: "uk" },
    { name: "Canada", flag: "CA", schoolCount: 25, slug: "ca" },
    { name: "Europe", flag: "EU", schoolCount: 60, slug: "eu" },
    { name: "Asia", flag: "AS", schoolCount: 40, slug: "asia" },
    { name: "India", flag: "IN", schoolCount: 30, slug: "india" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Find your ideal MBA destination
        </h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Explore programs by country and region. Each destination offers unique
          career outcomes, visa paths, and cultural experiences.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {countries.map((c) => (
          <Link
            key={c.slug}
            href={`/schools?country=${c.slug}`}
            className="group bg-card border border-border rounded-lg p-5 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Globe className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {c.name}
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  {c.schoolCount}+ programs
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-sm font-bold text-foreground mb-3">
          Popular paths
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "US M7 + T15", desc: "The classic prestige path", href: "/schools?tier=m7,t15" },
            { label: "UK Top Schools", desc: "LBS, Oxford, Cambridge", href: "/schools?country=uk" },
            { label: "Canada Programs", desc: "Rotman, Ivey, and more", href: "/schools?country=ca" },
          ].map((path) => (
            <Link
              key={path.href}
              href={path.href}
              className="text-sm p-3 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <span className="font-semibold text-foreground">{path.label}</span>
              <p className="text-xs text-muted-foreground mt-0.5">{path.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Archetype 3: List Builder Layout ─────────────────────────────────────────

function ListBuilderDashboard({
  schools,
}: {
  schools: EnrichedSchool[];
}) {
  // Classify schools by fit
  const reach = schools.filter(
    (s) => s.profile_fit && s.profile_fit.verdict === "reach"
  );
  const target = schools.filter(
    (s) => s.profile_fit && s.profile_fit.verdict === "target"
  );
  const safety = schools.filter(
    (s) => s.profile_fit && s.profile_fit.verdict === "safety"
  );
  const unclassified = schools.filter((s) => !s.profile_fit?.verdict);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Build your school list
        </h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Use fit scores to build a balanced list of reach, target, and safety schools.
        </p>
      </div>

      {/* Embedded search link */}
      <Link
        href="/schools"
        className="flex items-center gap-3 bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-all"
      >
        <Search className="size-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Search schools to add to your list...
        </span>
      </Link>

      {/* Classification columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Reach", items: reach, color: "border-red-200 bg-red-50/30" },
          { label: "Target", items: target, color: "border-amber-200 bg-amber-50/30" },
          { label: "Safety", items: safety, color: "border-emerald-200 bg-emerald-50/30" },
        ].map((tier) => (
          <div key={tier.label} className={cn("rounded-lg border p-4", tier.color)}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              {tier.label} ({tier.items.length})
            </h3>
            <div className="space-y-2">
              {tier.items.map((s) => (
                <Link
                  key={s.id}
                  href={`/school/${s.school_id}`}
                  className="block bg-white rounded-md border border-border p-3 hover:shadow-sm transition-all"
                >
                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                  <p className="text-[10px] text-muted-foreground">{s.location}</p>
                </Link>
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

      {unclassified.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Unclassified ({unclassified.length})
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Complete your profile to get fit scores for these schools.
          </p>
          <div className="flex flex-wrap gap-2">
            {unclassified.map((s) => (
              <Link
                key={s.id}
                href={`/school/${s.school_id}`}
                className="text-xs bg-muted px-3 py-1.5 rounded-full hover:bg-muted/80 transition-colors"
              >
                {s.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Link
          href="/fit-score"
          className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <Calculator className="size-3.5" />
          Update Fit Scores
        </Link>
      </div>
    </div>
  );
}

// ── Archetype 4-6: Strategist/Writer/Performer ──────────────────────────────

function ApplicantDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Your Application Portfolio
        </h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Track every application across its lifecycle. Drag cards between columns
          as you progress.
        </p>
      </div>
      <PortfolioPage />
    </div>
  );
}

// ── Archetype 7: Decider Layout ──────────────────────────────────────────────

function DeciderDashboard({
  schools,
}: {
  schools: EnrichedSchool[];
}) {
  const admitted = schools.filter(
    (s) => s.status === "decision" || s.status === "decided"
  );
  const waitlisted = schools.filter(
    (s) => s.status === "waitlisted"
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Make your decision
        </h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Compare your admits side-by-side and track waitlist updates.
        </p>
      </div>

      {/* Decision matrix link */}
      <Link
        href="/compare"
        className="flex items-center gap-4 bg-card border border-border rounded-lg p-5 hover:shadow-sm transition-all"
      >
        <div className="flex size-12 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <Scale className="size-6" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Decision Matrix</h3>
          <p className="text-xs text-muted-foreground">
            Compare offers across ROI, career outcomes, location, and more
          </p>
        </div>
        <ArrowRight className="size-4 text-muted-foreground ml-auto" />
      </Link>

      {/* Admits grid */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Admits ({admitted.length})
        </h3>
        {admitted.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {admitted.map((s) => (
              <Link
                key={s.id}
                href={`/school/${s.school_id}`}
                className="bg-card border border-emerald-200 rounded-lg p-4 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{s.name}</h4>
                    <p className="text-[10px] text-muted-foreground">{s.location}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    Admitted
                  </span>
                </div>
                {s.gmat_avg && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Avg GMAT: {s.gmat_avg}
                  </p>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No admits tracked yet. Add your admissions results in the portfolio.
          </p>
        )}
      </div>

      {/* Waitlist tracker */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Waitlist Tracker ({waitlisted.length})
        </h3>
        {waitlisted.length > 0 ? (
          <div className="space-y-2">
            {waitlisted.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between bg-card border border-amber-200 rounded-lg p-3"
              >
                <div>
                  <h4 className="text-sm font-medium text-foreground">{s.name}</h4>
                  <p className="text-[10px] text-muted-foreground">{s.location}</p>
                </div>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  Waitlisted
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No waitlists being tracked.</p>
        )}
      </div>

      <div className="flex gap-4">
        <Link
          href="/salary-database"
          className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <ListChecks className="size-3.5" />
          Salary Data
        </Link>
        <Link
          href="/cost-of-living"
          className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <MapPin className="size-3.5" />
          Cost of Living
        </Link>
      </div>
    </div>
  );
}

// ── Main Dashboard Component ────────────────────────────────────────────────

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { profile: savedProfile } = useProfile();
  const storeArchetype = useOnboardingStore((s) => s.archetype);
  const onboardingCompleted = useOnboardingStore((s) => s.completed);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [archetypeOverride, setArchetypeOverride] = useState<Archetype | null>(null);

  const archetype = archetypeOverride ?? storeArchetype;

  // Legacy redirect
  const schoolId = searchParams.get("school_id");
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (schoolId) {
      router.replace(`/school/${schoolId}?session_id=${sessionId || ""}`);
    }
  }, [schoolId, sessionId, router]);

  const profileQuery = useMemo(
    () => ({
      gmat: savedProfile.gmat ?? undefined,
      gpa: savedProfile.gpa ?? undefined,
      yoe: savedProfile.yoe ?? undefined,
    }),
    [savedProfile.gmat, savedProfile.gpa, savedProfile.yoe]
  );

  const { data, isLoading, error, refetch } = useDashboardData(profileQuery);

  useEffect(() => {
    if (data) {
      track("dashboard_viewed", {
        archetype,
        has_profile: !!(profileQuery.gmat || profileQuery.gpa || profileQuery.yoe),
        total_schools: data.total_schools,
      });
    }
  }, [data, archetype, profileQuery.gmat, profileQuery.gpa, profileQuery.yoe]);

  const schools = data?.schools ?? [];
  const deadlines = data?.upcoming_deadlines ?? [];
  const totalSchools = data?.total_schools ?? 0;

  const journeyStage = useMemo(
    () => deriveJourneyStage(archetype, schools, totalSchools),
    [archetype, schools, totalSchools]
  );

  const [activeStage, setActiveStage] = useState<JourneyStage | null>(null);
  const displayStage = activeStage ?? journeyStage;

  const handleStageSelect = useCallback((stage: JourneyStage) => {
    setActiveStage(stage);
    setMobileSidebarOpen(false);
  }, []);

  // Map deadlines
  const deadlineItems: DeadlineItem[] = useMemo(
    () =>
      deadlines.map((dl) => ({
        school_id: dl.school_id,
        school_name: dl.school_name,
        round: dl.round,
        deadline: dl.deadline,
        days_left: dl.days_left,
      })),
    [deadlines]
  );

  const hasEssays = schools.some((s) => s.status === "submitted" || s.essay_count > 0);
  const hasInterviewPrep = schools.some((s) => s.status === "interview");
  const nextDeadline = deadlines.length > 0 ? deadlines[0] : null;

  // Redirect spinner for legacy
  if (schoolId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="size-10 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
          <div className="h-12 bg-muted rounded-lg animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-48 bg-muted rounded-lg animate-pulse" />
            <div className="h-48 bg-muted rounded-lg animate-pulse" />
          </div>
          <div className="h-32 bg-muted rounded-lg animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-36 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state (no data at all)
  if (error && !data) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
          <JourneyProgress currentStage={displayStage} />
          <motion.div
            className="bg-card border border-border/10 rounded-lg p-8 text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-xl font-display font-bold text-foreground mb-2">
              Welcome to AdmitIQ
            </h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Start by exploring schools or complete the onboarding quiz for
              personalized recommendations.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/onboarding"
                className="px-5 py-2.5 bg-primary text-foreground text-sm font-semibold rounded-md hover:bg-primary/90 transition-colors"
              >
                Take the Quiz
              </Link>
              <Link
                href="/schools"
                className="px-5 py-2.5 border border-border/20 text-foreground text-sm font-medium rounded-md hover:bg-foreground/5 transition-colors"
              >
                Browse Schools
              </Link>
            </div>
          </motion.div>
          <StageToolGrid stage={displayStage} />
        </div>
      </div>
    );
  }

  // ── Render archetype-specific content ──────────────────────────────────────

  function renderArchetypeContent() {
    switch (archetype) {
      case "explorer":
        return <ExplorerDashboard />;
      case "compass":
        return <CompassDashboard />;
      case "listbuilder":
        return <ListBuilderDashboard schools={schools} />;
      case "strategist":
      case "writer":
      case "performer":
        return <ApplicantDashboard />;
      case "decider":
        return <DeciderDashboard schools={schools} />;
      default:
        return <ExplorerDashboard />;
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <Sidebar
        currentStage={displayStage}
        onStageSelect={handleStageSelect}
        mobileOpen={mobileSidebarOpen}
        onMobileOpenChange={setMobileSidebarOpen}
      />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Stale data banner */}
        {error && data && (
          <div
            role="alert"
            className="bg-destructive/5 border-b border-destructive/20 text-destructive px-6 py-3 text-sm text-center flex items-center justify-center gap-3"
          >
            <span>Unable to refresh dashboard data.</span>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-1 text-xs font-bold underline hover:no-underline"
            >
              <RefreshCw className="size-3" /> Retry
            </button>
          </div>
        )}

        <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
          {/* Mobile sidebar trigger + archetype switcher */}
          <div className="flex items-center justify-between">
            <div className="lg:hidden">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Menu className="size-4" />
                <span className="font-medium">Journey Nav</span>
              </button>
            </div>
            <div className="ml-auto">
              <ArchetypeSwitcher
                current={archetype}
                onChange={setArchetypeOverride}
              />
            </div>
          </div>

          {/* Journey Progress */}
          <section>
            <JourneyProgress currentStage={displayStage} />
          </section>

          {/* Hero stats (shown for all archetypes) */}
          <section>
            <DashboardHero
              schoolsTracked={totalSchools}
              essaysDrafted={schools.filter((s) => s.essay_count > 0).length}
              interviewsDone={schools.filter((s) => s.status === "interview").length}
              daysToDeadline={nextDeadline?.days_left ?? null}
              recommendation={
                nextDeadline
                  ? `${nextDeadline.school_name} ${nextDeadline.round} deadline is in ${nextDeadline.days_left} days.`
                  : hasEssays
                    ? "Continue refining your essays with the AI essay coach."
                    : "Complete your profile to get personalized school recommendations."
              }
              recommendationHref={
                nextDeadline
                  ? `/school/${nextDeadline.school_id}`
                  : hasEssays
                    ? "/essay-coach"
                    : "/onboarding"
              }
            />
          </section>

          {/* Archetype-specific content */}
          <motion.section
            key={archetype}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderArchetypeContent()}
          </motion.section>

          {/* Deadlines + Next Step (shared across all archetypes) */}
          <motion.section
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <motion.div variants={fadeInUp}>
              <NextStepCard
                journeyStage={displayStage}
                trackedSchoolCount={totalSchools}
                nextDeadlineDays={nextDeadline?.days_left ?? null}
                nextDeadlineSchool={nextDeadline?.school_name ?? null}
                hasEssays={hasEssays}
                hasInterviewPrep={hasInterviewPrep}
              />
            </motion.div>
            <motion.div variants={fadeInUp}>
              <DeadlineWidget deadlines={deadlineItems} />
            </motion.div>
          </motion.section>

          {/* Tracked Schools (horizontal scroll) */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Tracked Schools
              </h2>
              <Link
                href="/schools"
                className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                <Plus className="size-3" /> Add More
              </Link>
            </div>

            {schools.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin scrollbar-thumb-border">
                {schools.map((school) => (
                  <SchoolMiniCard key={school.id} school={school} />
                ))}
                <Link
                  href="/schools"
                  className="flex-shrink-0 w-56 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-all min-h-[120px]"
                >
                  <Plus className="size-5 mb-1" />
                  <span className="text-xs font-medium">Add School</span>
                </Link>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg p-8 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  You haven&apos;t tracked any schools yet.
                </p>
                <Link
                  href="/schools"
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  Browse Schools <ArrowRight className="size-4" />
                </Link>
              </div>
            )}
          </motion.section>

          {/* Stage tools */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {JOURNEY_STAGES.find((s) => s.id === displayStage)?.label ?? "Explore"} Tools
              </h2>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                {JOURNEY_STAGES.map((stage) => (
                  <button
                    key={stage.id}
                    onClick={() => handleStageSelect(stage.id)}
                    className={cn(
                      "px-2 py-1 rounded-full font-medium transition-colors",
                      displayStage === stage.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted text-muted-foreground/60"
                    )}
                  >
                    {stage.label}
                  </button>
                ))}
              </div>
            </div>
            <StageToolGrid stage={displayStage} />
          </motion.section>
        </main>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="size-10 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
