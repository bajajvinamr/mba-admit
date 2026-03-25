import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { checkoutSchema } from "@/lib/schemas";

// ── Rate Limiter (in-memory, per-IP, sliding window) ────────────────────────
// Prevents checkout session spam. In production, replace with Redis-backed.
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 checkout sessions per minute per IP
const ipRequestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (ipRequestLog.get(ip) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) return true;
  timestamps.push(now);
  ipRequestLog.set(ip, timestamps);
  // Periodic cleanup to prevent memory leak
  if (ipRequestLog.size > 10_000) {
    for (const [key, times] of ipRequestLog.entries()) {
      if (times.every((t) => now - t > RATE_LIMIT_WINDOW_MS)) {
        ipRequestLog.delete(key);
      }
    }
  }
  return false;
}

// Lazy-initialized - avoids build-time module-load errors when env vars aren't set
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key && process.env.NODE_ENV === "production") {
      throw new Error("STRIPE_SECRET_KEY is required in production");
    }
    _stripe = new Stripe(key || "sk_test_placeholder");
  }
  return _stripe;
}

// ── Stripe Price IDs ─────────────────────────────────────────────────────────
// Set these in .env.local. When missing, we fall back to ad-hoc price_data
// so the checkout flow works in development without pre-created Stripe products.

const PRICE_IDS: Record<string, { monthly?: string; annual?: string }> = {
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    annual: process.env.STRIPE_PRICE_PRO_ANNUAL,
  },
  premium: {
    monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
    annual: process.env.STRIPE_PRICE_PREMIUM_ANNUAL,
  },
  consultant: {
    monthly: process.env.STRIPE_PRICE_CONSULTANT_MONTHLY,
    annual: process.env.STRIPE_PRICE_CONSULTANT_ANNUAL,
  },
};

// Fallback prices when no Stripe Price IDs are configured (dev mode)
const PLAN_PRICES: Record<string, { monthly: number; annual: number; name: string }> = {
  pro:        { monthly: 2900,  annual: 19900,  name: "AdmitCompass Pro" },
  premium:    { monthly: 9900,  annual: 59900,  name: "AdmitCompass Premium" },
  consultant: { monthly: 24900, annual: 199900, name: "AdmitCompass Consultant" },
};

export async function POST(req: NextRequest) {
  // Rate limit by IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a minute." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  try {
    const body = await req.json();
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    // ── Subscription checkout: ?plan=pro|premium ──────────────────────────
    if (body.plan) {
      const parsed = checkoutSchema.safeParse(body);
      if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => i.message).join(", ");
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      const { plan: planId, billing } = parsed.data;
      const priceId = PRICE_IDS[planId]?.[billing];

      // Build line items - use pre-created Price if available, else ad-hoc
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = priceId
        ? [{ price: priceId, quantity: 1 }]
        : [{
            price_data: {
              currency: "usd",
              product_data: {
                name: PLAN_PRICES[planId].name,
                description: `${billing === "annual" ? "Annual" : "Monthly"} subscription`,
              },
              unit_amount: PLAN_PRICES[planId][billing],
              recurring: {
                interval: billing === "annual" ? "year" : "month",
              },
            },
            quantity: 1,
          }];

      const checkoutSession = await getStripe().checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: lineItems,
        metadata: {
          plan: planId,
          billing,
        },
        success_url: `${baseUrl}/success?plan=${planId}&stripe_session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/pricing`,
        allow_promotion_codes: true,
      });

      return NextResponse.json({ url: checkoutSession.url });
    }

    // ── One-time consulting call checkout: ?sessionId=... ─────────────────
    const { sessionId } = body;

    const checkoutSession = await getStripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: "1-Hour Profile Evaluation & Strategy Call",
              description: "Deep-dive consultation with an M7/IIM mentor",
            },
            unit_amount: 100000, // ₹1,000 in paise
          },
          quantity: 1,
        },
      ],
      metadata: {
        app_session_id: sessionId || "",
      },
      success_url: `${baseUrl}/success?stripe_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create checkout session";
    console.error("Stripe checkout error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
