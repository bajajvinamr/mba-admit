import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Security headers middleware - applied to every response.
 *
 * Why middleware instead of next.config headers?
 * Next.js App Router streams responses, so config-based headers
 * only apply to static assets. Middleware intercepts ALL routes.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // ── Content Security Policy ────────────────────────────────────────────────
  // Strict but functional. Allows:
  //   - Self-hosted scripts + inline (needed for Next.js hydration)
  //   - Google Analytics / Fonts
  //   - Stripe.js for payment
  //   - API backend for data fetching
  const apiOrigin = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.googletagmanager.com`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com`,
    `img-src 'self' data: blob: https:`,
    `connect-src 'self' ${apiOrigin} https://api.stripe.com https://www.google-analytics.com https://vitals.vercel-insights.com`,
    `frame-src 'self' https://js.stripe.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  // ── Transport Security ─────────────────────────────────────────────────────
  // max-age=1yr, includeSubDomains, preload-ready
  response.headers.set(
    "Strict-Transport-Security",
    " max-age=31536000; includeSubDomains; preload",
  );

  // ── Clickjacking Protection ────────────────────────────────────────────────
  response.headers.set("X-Frame-Options", "DENY");

  // ── MIME-sniffing Protection ───────────────────────────────────────────────
  response.headers.set("X-Content-Type-Options", "nosniff");

  // ── Referrer Policy ────────────────────────────────────────────────────────
  // Send origin only on cross-origin requests, full referrer on same-origin
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // ── Permissions Policy ─────────────────────────────────────────────────────
  // Disable browser features we don't use
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );

  // ── XSS Protection (legacy browsers) ──────────────────────────────────────
  response.headers.set("X-XSS-Protection", "1; mode=block");

  return response;
}

// Apply to all routes except static assets and API internals
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
