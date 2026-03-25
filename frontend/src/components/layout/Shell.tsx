"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import type { JourneyStage } from "@/lib/constants";

interface ShellProps extends React.ComponentPropsWithRef<"div"> {
  currentStage?: JourneyStage;
  onStageSelect?: (stage: JourneyStage) => void;
  user?: {
    name?: string;
    email?: string;
    avatarUrl?: string;
    initials?: string;
  };
  onSignOut?: () => void;
}

const Shell = React.forwardRef<HTMLDivElement, ShellProps>(
  (
    {
      className,
      children,
      currentStage = "explore",
      onStageSelect,
      user,
      onSignOut,
      ...props
    },
    ref
  ) => {
    const [mobileOpen, setMobileOpen] = React.useState(false);

    return (
      <div
        ref={ref}
        className={cn("grid min-h-dvh lg:grid-cols-[16rem_1fr]", className)}
        {...props}
      >
        {/* Sidebar */}
        <Sidebar
          currentStage={currentStage}
          onStageSelect={onStageSelect}
          mobileOpen={mobileOpen}
          onMobileOpenChange={setMobileOpen}
        />

        {/* Main column */}
        <div className="flex flex-col">
          <TopNav
            onMobileMenuToggle={() => setMobileOpen((prev) => !prev)}
            user={user}
            onSignOut={onSignOut}
          />

          <main className="flex-1">
            <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    );
  }
);

Shell.displayName = "Shell";

export { Shell };
export type { ShellProps };
