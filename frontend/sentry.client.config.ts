/**
 * Sentry client-side configuration.
 *
 * This file configures the Sentry SDK for the browser.
 * It is automatically loaded by @sentry/nextjs via the Next.js instrumentation hook.
 *
 * Gracefully no-ops if NEXT_PUBLIC_SENTRY_DSN is not set.
 */

import * as Sentry from "@sentry/nextjs";

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.NODE_ENV,

    // Performance monitoring - sample 10% of transactions in production
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Session replay - capture 1% of sessions, 100% of error sessions
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,

    // Only send errors in production
    enabled: process.env.NODE_ENV === "production",

    // Filter out noisy errors
    ignoreErrors: [
      "ResizeObserver loop",
      "Non-Error promise rejection",
      "Loading chunk",
      "ChunkLoadError",
    ],

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}
