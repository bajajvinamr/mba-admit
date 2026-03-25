/**
 * PostHog analytics - lazy initialization with graceful degradation.
 *
 * If NEXT_PUBLIC_POSTHOG_KEY is not set, all calls are no-ops.
 * PostHog is only loaded client-side (dynamic import avoids SSR issues).
 */

import type { PostHog } from "posthog-js";

let posthogInstance: PostHog | null = null;
let initPromise: Promise<PostHog | null> | null = null;

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

/**
 * Lazily initializes the PostHog client.
 * Returns null if the key is missing or we're on the server.
 */
export function getPostHog(): Promise<PostHog | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (posthogInstance) return Promise.resolve(posthogInstance);
  if (!POSTHOG_KEY) return Promise.resolve(null);

  if (!initPromise) {
    initPromise = import("posthog-js").then((mod) => {
      const ph = mod.default;
      ph.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        capture_pageview: false, // We handle pageviews manually
        capture_pageleave: true,
        persistence: "localStorage+cookie",
        loaded: (posthog) => {
          // Opt out of autocapture in dev for cleaner data
          if (process.env.NODE_ENV !== "production") {
            posthog.opt_out_capturing();
          }
        },
      });
      posthogInstance = ph;
      return ph;
    }).catch((err) => {
      console.warn("[PostHog] Failed to initialize:", err);
      initPromise = null;
      return null;
    });
  }

  return initPromise;
}

/**
 * Capture a PostHog event (fire-and-forget).
 * Safe to call without awaiting - no-ops if PostHog is unavailable.
 */
export function captureEvent(
  event: string,
  properties?: Record<string, unknown>,
): void {
  if (!POSTHOG_KEY || typeof window === "undefined") return;
  getPostHog().then((ph) => ph?.capture(event, properties));
}

/**
 * Identify a user in PostHog.
 */
export function identifyUser(
  userId: string,
  traits?: Record<string, unknown>,
): void {
  if (!POSTHOG_KEY || typeof window === "undefined") return;
  getPostHog().then((ph) => ph?.identify(userId, traits));
}

/**
 * Reset PostHog identity (on logout).
 */
export function resetUser(): void {
  if (!POSTHOG_KEY || typeof window === "undefined") return;
  getPostHog().then((ph) => ph?.reset());
}
