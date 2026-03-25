/**
 * Sentry error tracking utilities.
 *
 * Provides a thin wrapper around @sentry/nextjs for use in components
 * and services. Sentry SDK is initialized in sentry.client.config.ts
 * and sentry.server.config.ts at the project root.
 *
 * If NEXT_PUBLIC_SENTRY_DSN is not set, all calls are no-ops.
 */

import * as Sentry from "@sentry/nextjs";

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";

/**
 * Whether Sentry is configured (DSN is present).
 */
export const isSentryEnabled = Boolean(DSN);

/**
 * Capture an exception in Sentry.
 * No-ops if DSN is not configured.
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!isSentryEnabled) {
    console.error("[Sentry disabled] Error:", error);
    return;
  }
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message in Sentry.
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
): void {
  if (!isSentryEnabled) {
    console.log(`[Sentry disabled] ${level}: ${message}`);
    return;
  }
  Sentry.captureMessage(message, level);
}

/**
 * Set the current user context in Sentry.
 */
export function setUser(user: { id: string; email?: string } | null): void {
  if (!isSentryEnabled) return;
  Sentry.setUser(user);
}

/**
 * Add breadcrumb for debugging context.
 */
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
  if (!isSentryEnabled) return;
  Sentry.addBreadcrumb(breadcrumb);
}

// Re-export ErrorBoundary from Sentry for use in components
export { ErrorBoundary as SentryErrorBoundary } from "@sentry/nextjs";
