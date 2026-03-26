"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/cn";

// Lazy-load each tab panel from its existing sub-route
const DraftsPanel = dynamic(
  () => import("@/app/essay-drafts/EssayDraftsContent"),
  { loading: () => <TabSkeleton /> },
);
const CoachPanel = dynamic(() => import("@/app/essays/coach/page"), {
  loading: () => <TabSkeleton />,
});
const EvaluatorPanel = dynamic(
  () => import("@/app/evaluator/EvaluatorContent"),
  { loading: () => <TabSkeleton /> },
);
const ExamplesPanel = dynamic(() => import("@/app/essays/examples/page"), {
  loading: () => <TabSkeleton />,
});
const ThemesPanel = dynamic(() => import("@/app/essays/themes/page"), {
  loading: () => <TabSkeleton />,
});
const PromptsPanel = dynamic(
  () => import("@/app/essay-prompts/EssayPromptsContent"),
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
  { id: "drafts", label: "My Drafts" },
  { id: "coach", label: "Coach" },
  { id: "evaluator", label: "Evaluator" },
  { id: "examples", label: "Examples" },
  { id: "themes", label: "Themes" },
  { id: "prompts", label: "Prompts" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function EssaysContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(
    TABS.find((t) => t.id === tabParam)?.id ?? "drafts"
  );

  useEffect(() => {
    if (tabParam && TABS.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    router.replace(`/essays?tab=${tab}`, { scroll: false });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold text-foreground mb-1">
          Essay Workspace
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Draft, refine, and perfect your MBA essays in one place.
        </p>

        {/* Tab bar */}
        <div className="border-b border-border mb-6">
          <nav className="-mb-px flex gap-6 overflow-x-auto" aria-label="Essay tabs">
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
        {activeTab === "drafts" && <DraftsPanel />}
        {activeTab === "coach" && <CoachPanel />}
        {activeTab === "evaluator" && <EvaluatorPanel />}
        {activeTab === "examples" && <ExamplesPanel />}
        {activeTab === "themes" && <ThemesPanel />}
        {activeTab === "prompts" && <PromptsPanel />}
      </div>
    </div>
  );
}

export default function EssaysPage() {
  return (
    <Suspense fallback={<TabSkeleton />}>
      <EssaysContent />
    </Suspense>
  );
}
