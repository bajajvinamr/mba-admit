"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/cn";

const RoiPanel = dynamic(
  () => import("@/app/roi/RoiContent"),
  { loading: () => <TabSkeleton /> },
);
const SalaryPanel = dynamic(
  () => import("@/app/salary/SalaryContent"),
  { loading: () => <TabSkeleton /> },
);
const ScholarshipsPanel = dynamic(
  () => import("@/app/scholarships/ScholarshipsContent"),
  { loading: () => <TabSkeleton /> },
);
const FeesPanel = dynamic(
  () => import("@/app/fee-calculator/FeeCalcContent"),
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
  { id: "roi", label: "ROI Calculator" },
  { id: "salary", label: "Salary Data" },
  { id: "scholarships", label: "Scholarships & Aid" },
  { id: "fees", label: "Fees & Budget" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function FinancesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(
    TABS.find((t) => t.id === tabParam)?.id ?? "roi"
  );

  useEffect(() => {
    if (tabParam && TABS.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    router.replace(`/finances?tab=${tab}`, { scroll: false });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold text-foreground mb-1">
          Financial Planning
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          ROI analysis, salary data, scholarships, and fee planning for your MBA.
        </p>

        {/* Tab bar */}
        <div className="border-b border-border mb-6">
          <nav className="-mb-px flex gap-6 overflow-x-auto" aria-label="Finance tabs">
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
        {activeTab === "roi" && <RoiPanel />}
        {activeTab === "salary" && <SalaryPanel />}
        {activeTab === "scholarships" && <ScholarshipsPanel />}
        {activeTab === "fees" && <FeesPanel />}
      </div>
    </div>
  );
}

export default function FinancesPage() {
  return (
    <Suspense fallback={<TabSkeleton />}>
      <FinancesContent />
    </Suspense>
  );
}
