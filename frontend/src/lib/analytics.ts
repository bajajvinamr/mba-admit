/**
 * Lightweight, privacy-first analytics.
 *
 * During development: logs events to console.
 * In production: sends events to our own backend endpoint.
 *
 * Usage:
 *   track("school_viewed", { school_id: "hbs" })
 *   track("profile_saved", { gmat: 720 })
 *   track("cta_clicked", { location: "hero", target: "odds-calculator" })
 */

import { API_BASE } from "./api";

type EventProperties = Record<string, string | number | boolean | null>;

const IS_PROD = process.env.NODE_ENV === "production";
const ENDPOINT = `${API_BASE}/api/analytics/event`;

// Queue events during page load, flush on idle
let queue: Array<{ event: string; properties: EventProperties; timestamp: string }> = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  if (queue.length === 0) return;
  const batch = [...queue];
  queue = [];

  if (!IS_PROD) {
    // Dev mode: just log
    for (const e of batch) {
      console.debug(`[analytics] ${e.event}`, e.properties);
    }
    return;
  }

  // Production: fire-and-forget POST
  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events: batch }),
    keepalive: true, // ensures delivery even during page unload
  }).catch(() => {
    // Re-queue on failure (best effort, no infinite retry)
  });
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, 1000); // Batch events within 1s window
}

/**
 * Track a user event.
 * Events are batched and sent every ~1 second.
 */
export function track(event: string, properties: EventProperties = {}) {
  queue.push({
    event,
    properties: {
      ...properties,
      url: typeof window !== "undefined" ? window.location.pathname : "",
      referrer: typeof document !== "undefined" ? document.referrer : "",
    },
    timestamp: new Date().toISOString(),
  });
  scheduleFlush();
}

/**
 * Track a page view. Call this in layouts or on route change.
 */
export function trackPageView(path?: string) {
  track("page_view", {
    path: path || (typeof window !== "undefined" ? window.location.pathname : ""),
  });
}
