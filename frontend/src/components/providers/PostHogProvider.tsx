"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getPostHog, captureEvent } from "@/lib/posthog";

/**
 * Inner component that uses useSearchParams (requires Suspense boundary).
 */
function PostHogPageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize PostHog on mount
  useEffect(() => {
    getPostHog();
  }, []);

  // Track page views on route changes
  useEffect(() => {
    if (!pathname) return;
    const url = searchParams?.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;
    captureEvent("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

/**
 * PostHog analytics provider.
 *
 * - Initializes PostHog on mount (lazy, client-side only)
 * - Tracks page views on route changes
 * - No-ops gracefully if NEXT_PUBLIC_POSTHOG_KEY is not set
 * - Wrapped in Suspense to avoid SSR bailout with useSearchParams
 */
export function PostHogProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageTracker />
      </Suspense>
      {children}
    </>
  );
}
