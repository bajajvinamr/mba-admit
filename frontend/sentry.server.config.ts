/**
 * Sentry server-side configuration.
 *
 * This file configures the Sentry SDK for the Node.js server runtime.
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

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Only send errors in production
    enabled: process.env.NODE_ENV === "production",
  });
}
