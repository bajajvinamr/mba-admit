"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/cn";

const PlannerPanel = dynamic(
  () => import("@/app/gmat-planner/GmatPlannerContent"),
  { loading: () => <TabSkeleton /> },
);
const PredictorPanel = dynamic(
  () => import("@/app/gmat-targets/GmatTargetsContent"),
  { loading: () => <TabSkeleton /> },
);
const BreakdownPanel = dynamic(
  () => import("@/app/gmat-targets/GmatTargetsContent"),
  { loading: () => <TabSkeleton /> },
);
const ComparisonPanel = dynamic(
  () => import("@/app/score-convert/ScoreConvertContent"),
  { loading: () => <TabSkeleton /> },
);
const ConverterPanel = dynamic(
  () => import("@/app/score-convert/ScoreConvertContent"),
  { loading: () => <TabSkeleton /> },
);

function TabSkeleton() {
  return (
    <div className="space-y-4 py-6">
      <div className="h-8 w-64 bg-muted rounded animate-pulse" />
      <div className="h-48 bg-muted rounded-lg animate-pulse" />
    </div>
  );
}

const TABS = [
  { id: "planner", label: "Planner" },
  { id: "predictor", label: "Predictor" },
  { id: "breakdown", label: "Score Breakdown" },
  { id: "comparison", label: "GMAT vs GRE" },
  { id: "converter", label: "Converter" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function TestPrepContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(
    TABS.find((t) => t.id === tabParam)?.id ?? "planner"
  );

  useEffect(() => {
    if (tabParam && TABS.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    router.replace(`/test-prep?tab=${tab}`, { scroll: false });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold text-foreground mb-1">
          Test Prep
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          GMAT/GRE planning, score prediction, and conversion tools.
        </p>

        {/* Tab bar */}
        <div className="border-b border-border mb-6">
          <nav className="-mb-px flex gap-6 overflow-x-auto" aria-label="Test prep tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "whitespace-nowrap pb-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab panels */}
        {activeTab === "planner" && <PlannerPanel />}
        {activeTab === "predictor" && <PredictorPanel />}
        {activeTab === "breakdown" && <BreakdownPanel />}
        {activeTab === "comparison" && <ComparisonPanel />}
        {activeTab === "converter" && <ConverterPanel />}
      </div>
    </div>
  );
}

export default function TestPrepPage() {
  return (
    <Suspense fallback={<TabSkeleton />}>
      <TestPrepContent />
    </Suspense>
  );
}
