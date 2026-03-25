/**
 * Sentry edge runtime configuration.
 *
 * This file configures the Sentry SDK for Next.js edge runtime (middleware, edge API routes).
 *
 * Gracefully no-ops if NEXT_PUBLIC_SENTRY_DSN is not set.
 */

import * as Sentry from "@sentry/nextjs";

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    enabled: process.env.NODE_ENV === "production",
  });
}
