import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), interest-cohort=()" },
];

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizeCss: true,
  },
  // Security headers for static assets (middleware covers dynamic routes)
  headers: async () => [
    {
      source: "/(.*)",
      headers: securityHeaders,
    },
  ],
};

const withMDX = createMDX({});

const sentryConfig = withSentryConfig(withMDX(nextConfig), {
  // Only upload source maps when DSN and auth token are configured
  silent: !process.env.SENTRY_AUTH_TOKEN,
  disableLogger: true,

  // Automatically tree-shake Sentry logger statements
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeReplayIframe: true,
    excludeReplayShadowDom: true,
  },

  // Source maps upload (requires SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT)
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },

  // Hide source maps from end users (moved into sourcemaps config)
  // hideSourceMaps is deprecated; use sourcemaps.deleteSourcemapsAfterUpload instead
});

export default sentryConfig;
