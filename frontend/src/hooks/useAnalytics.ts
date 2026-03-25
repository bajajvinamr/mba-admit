"use client";

import { useCallback } from "react";
import { captureEvent, identifyUser, resetUser } from "@/lib/posthog";
import { track as trackInternal } from "@/lib/analytics";

/**
 * Analytics hook that sends events to both the internal analytics
 * pipeline and PostHog (when configured).
 *
 * Usage:
 *   const { track } = useAnalytics();
 *   track("school_viewed", { school_id: "hbs" });
 */

type EventProperties = Record<string, string | number | boolean | null>;

// Pre-defined event names for type safety
export type AnalyticsEvent =
  | "onboarding_completed"
  | "school_viewed"
  | "essay_started"
  | "interview_completed"
  | "subscription_started"
  | (string & {}); // Allow arbitrary strings too

export function useAnalytics() {
  const track = useCallback(
    (event: AnalyticsEvent, properties: EventProperties = {}) => {
      // Send to internal analytics pipeline
      trackInternal(event, properties);
      // Send to PostHog (no-ops if not configured)
      captureEvent(event, properties);
    },
    [],
  );

  const identify = useCallback(
    (userId: string, traits?: Record<string, unknown>) => {
      identifyUser(userId, traits);
    },
    [],
  );

  const reset = useCallback(() => {
    resetUser();
  }, []);

  return { track, identify, reset } as const;
}
