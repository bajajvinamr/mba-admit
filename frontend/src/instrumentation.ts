/**
 * Next.js instrumentation hook.
 *
 * This file is automatically loaded by Next.js and is used to initialize
 * Sentry on both server and edge runtimes.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = async (
  ...args: [
    error: { digest: string } & Error,
    request: {
      path: string;
      method: string;
      headers: Record<string, string>;
    },
    context: {
      routerKind: "Pages Router" | "App Router";
      routePath: string;
      routeType: "render" | "route" | "middleware";
      renderType?: "server-side" | "static" | "dynamic";
      revalidateReason?: "on-demand" | "stale" | "after";
      renderSource?: "react-server-components" | "react-server-components-payload" | "server-rendering";
    },
  ]
) => {
  // Dynamic import to avoid issues when Sentry is not configured
  try {
    const Sentry = await import("@sentry/nextjs");
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      return Sentry.captureRequestError(...args);
    }
  } catch {
    // Sentry not available, skip
  }
};
