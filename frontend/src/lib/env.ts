/**
 * Environment variable validation - imported once in root layout.
 *
 * Validates required env vars at startup so misconfigurations surface
 * immediately instead of failing silently at checkout/auth time.
 *
 * Pattern: "fail fast in production, warn in development"
 */

type EnvVar = {
  key: string;
  required: "production" | "always" | "optional";
  description: string;
};

const ENV_VARS: EnvVar[] = [
  // Auth
  { key: "NEXTAUTH_SECRET", required: "always", description: "JWT signing key for NextAuth" },
  { key: "NEXTAUTH_URL", required: "production", description: "Base URL for auth callbacks" },

  // API
  { key: "NEXT_PUBLIC_API_URL", required: "production", description: "Backend API base URL" },

  // Stripe
  { key: "STRIPE_SECRET_KEY", required: "production", description: "Stripe secret key for checkout" },
  { key: "STRIPE_WEBHOOK_SECRET", required: "production", description: "Stripe webhook signing secret" },

  // Google OAuth (optional - app works without it)
  { key: "GOOGLE_CLIENT_ID", required: "optional", description: "Google OAuth client ID" },
  { key: "GOOGLE_CLIENT_SECRET", required: "optional", description: "Google OAuth client secret" },

  // PostHog Analytics (optional - app works without it)
  { key: "NEXT_PUBLIC_POSTHOG_KEY", required: "optional", description: "PostHog project API key" },
  { key: "NEXT_PUBLIC_POSTHOG_HOST", required: "optional", description: "PostHog API host (defaults to https://us.i.posthog.com)" },

  // Sentry Error Tracking (optional - app works without it)
  { key: "NEXT_PUBLIC_SENTRY_DSN", required: "optional", description: "Sentry DSN for error tracking" },
  { key: "SENTRY_AUTH_TOKEN", required: "optional", description: "Sentry auth token for source map uploads" },
  { key: "SENTRY_ORG", required: "optional", description: "Sentry organization slug" },
  { key: "SENTRY_PROJECT", required: "optional", description: "Sentry project slug" },

  // Resend Email (optional - app works without it)
  { key: "RESEND_API_KEY", required: "optional", description: "Resend API key for transactional emails" },
  { key: "RESEND_FROM_EMAIL", required: "optional", description: "From address for emails (defaults to noreply@admitcompass.ai)" },
];

/**
 * Validates environment variables and logs warnings/errors.
 * Called once during app initialization (root layout).
 */
export function validateEnv(): void {
  // Skip during build phase - `next build` sets NODE_ENV=production but
  // doesn't have runtime env vars. Only validate when actually serving.
  const isBuilding = process.env.NEXT_PHASE === "phase-production-build";
  if (isBuilding) return;

  const isProd = process.env.NODE_ENV === "production";
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const { key, required, description } of ENV_VARS) {
    const value = process.env[key];
    if (!value) {
      if (required === "always") {
        missing.push(`  ✗ ${key} - ${description}`);
      } else if (required === "production" && isProd) {
        missing.push(`  ✗ ${key} - ${description}`);
      } else if (required === "production" && !isProd) {
        warnings.push(`  ⚠ ${key} - ${description} (will be required in production)`);
      }
    }
  }

  if (warnings.length > 0) {
    console.warn(
      `\n[ENV] Missing optional environment variables:\n${warnings.join("\n")}\n`,
    );
  }

  if (missing.length > 0) {
    const message = `\n[ENV] Missing required environment variables:\n${missing.join("\n")}\n`;
    if (isProd) {
      // In production, throw to prevent app from starting with broken config
      throw new Error(message);
    } else {
      console.error(message);
    }
  }
}
