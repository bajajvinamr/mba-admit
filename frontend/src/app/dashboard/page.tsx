"use client";

import { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Plus,
  ArrowRight,
  ChevronDown,
  RefreshCw,
  Menu,
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
import { StageToolGrid } from "@/components/dashboard/StageToolGrid";

// Archetype-specific dashboards
import { ExplorerDashboard } from "@/components/dashboard/ExplorerDashboard";
import { CompassDashboard } from "@/components/dashboard/CompassDashboard";
import { ListBuilderDashboard } from "@/components/dashboard/ListBuilderDashboard";
import { StrategistDashboard } from "@/components/dashboard/StrategistDashboard";
import { WriterDashboard } from "@/components/dashboard/WriterDashboard";
import { PerformerDashboard } from "@/components/dashboard/PerformerDashboard";
import { DeciderDashboard } from "@/components/dashboard/DeciderDashboard";

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

// ── Main Dashboard Component ────────────────────────────────────────────────

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { profile: savedProfile } = useProfile();
  const storeArchetype = useOnboardingStore((s) => s.archetype);
  const targetCountries = useOnboardingStore((s) => s.targetCountries);

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
        return <CompassDashboard targetCountries={targetCountries} />;

      case "listbuilder":
        return <ListBuilderDashboard schools={schools} />;

      case "strategist":
        return (
          <StrategistDashboard
            deadlines={deadlines.map((dl) => ({
              school_id: dl.school_id,
              school_name: dl.school_name,
              round: dl.round,
              deadline: dl.deadline,
              days_left: dl.days_left,
            }))}
            schools={schools.map((s) => ({
              school_id: s.school_id,
              name: s.name,
              status: s.status,
              essay_count: s.essay_count,
              total_decisions: s.total_decisions,
            }))}
          />
        );

      case "writer":
        return (
          <WriterDashboard
            essays={schools
              .filter((s) => s.essay_count > 0 || s.status === "preparing")
              .map((s) => ({
                school_id: s.school_id,
                school_name: s.name,
                prompt_title: `${s.essay_count} essay${s.essay_count !== 1 ? "s" : ""}`,
                status: (s.status === "submitted"
                  ? "final"
                  : s.essay_count > 0
                    ? "drafting"
                    : "not_started") as "not_started" | "drafting" | "reviewing" | "final",
                word_count: 0,
                word_limit: 0,
              }))}
            nextEssayDeadline={
              deadlines.length > 0
                ? {
                    school_name: deadlines[0].school_name,
                    days_left: deadlines[0].days_left,
                  }
                : null
            }
          />
        );

      case "performer":
        return (
          <PerformerDashboard
            upcomingInterviews={schools
              .filter((s) => s.status === "interview")
              .map((s) => ({
                school_id: s.school_id,
                school_name: s.name,
                date: s.next_deadline?.deadline ?? "",
                format: "Video",
                days_until: s.next_deadline?.days_left ?? 30,
              }))}
          />
        );

      case "decider":
        return (
          <DeciderDashboard
            admitted={schools
              .filter((s) => s.status === "decision" || s.status === "decided")
              .map((s) => ({
                school_id: s.school_id,
                name: s.name,
                location: s.location,
                gmat_avg: s.gmat_avg,
                acceptance_rate: s.acceptance_rate,
              }))}
            waitlisted={schools
              .filter((s) => s.status === "waitlisted")
              .map((s) => ({
                school_id: s.school_id,
                name: s.name,
                strategy_tip: "Send a letter of continued interest and share recent achievements.",
              }))}
            depositDeadline={
              deadlines.length > 0
                ? {
                    school_name: deadlines[0].school_name,
                    date: deadlines[0].deadline,
                  }
                : null
            }
          />
        );

      default:
        return <ExplorerDashboard />;
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <Sidebar
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

          {/* Archetype-specific content — THE dashboard */}
          <motion.section
            key={archetype}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderArchetypeContent()}
          </motion.section>

          {/* Stage tools */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
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
