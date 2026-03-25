import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// ── Lazy-init Stripe (avoids build-time errors when env vars aren't set) ────

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key && process.env.NODE_ENV === "production") {
      throw new Error("STRIPE_SECRET_KEY is required in production");
    }
    _stripe = new Stripe(key || "sk_test_placeholder", {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    });
  }
  return _stripe;
}

// ── Tier → Stripe Price ID mapping ──────────────────────────────────────────

type PaidTier = "pro" | "premium" | "consultant";
type BillingInterval = "monthly" | "annual";

// Monthly price IDs
const TIER_PRICE_MONTHLY_ENV: Record<PaidTier, string> = {
  pro: "STRIPE_PRO_PRICE_ID",
  premium: "STRIPE_PREMIUM_PRICE_ID",
  consultant: "STRIPE_CONSULTANT_PRICE_ID",
};

// Annual price IDs
const TIER_PRICE_ANNUAL_ENV: Record<PaidTier, string> = {
  pro: "STRIPE_PRO_ANNUAL_PRICE_ID",
  premium: "STRIPE_PREMIUM_ANNUAL_PRICE_ID",
  consultant: "STRIPE_CONSULTANT_ANNUAL_PRICE_ID",
};

// Fallback prices (in cents) when no Stripe Price IDs are configured
const TIER_FALLBACK: Record<PaidTier, {
  monthly: { amount: number; name: string };
  annual: { amount: number; name: string };
}> = {
  pro: {
    monthly: { amount: 2900, name: "AdmitIQ Pro (Monthly)" },
    annual: { amount: 19900, name: "AdmitIQ Pro (Annual)" },
  },
  premium: {
    monthly: { amount: 9900, name: "AdmitIQ Premium (Monthly)" },
    annual: { amount: 59900, name: "AdmitIQ Premium (Annual)" },
  },
  consultant: {
    monthly: { amount: 24900, name: "AdmitIQ Consultant (Monthly)" },
    annual: { amount: 199900, name: "AdmitIQ Consultant (Annual)" },
  },
};

const VALID_TIERS = new Set<string>(["pro", "premium", "consultant"]);
const VALID_INTERVALS = new Set<string>(["monthly", "annual"]);

// ── POST handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { tier, interval, userId } = body as {
      tier?: string;
      interval?: string;
      userId?: string;
    };

    if (!tier || !VALID_TIERS.has(tier)) {
      return NextResponse.json(
        { error: "Invalid tier. Must be one of: pro, premium, consultant" },
        { status: 400 },
      );
    }

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const billingInterval: BillingInterval =
      interval && VALID_INTERVALS.has(interval)
        ? (interval as BillingInterval)
        : "monthly";

    const paidTier = tier as PaidTier;

    // Look up Stripe Price ID from env
    const envMap =
      billingInterval === "annual"
        ? TIER_PRICE_ANNUAL_ENV
        : TIER_PRICE_MONTHLY_ENV;
    const priceId = process.env[envMap[paidTier]];

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    // Build line items — use pre-created Stripe Price if available, else ad-hoc
    const fallback = TIER_FALLBACK[paidTier][billingInterval];
    const stripeInterval = billingInterval === "annual" ? "year" : "month";

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = priceId
      ? [{ price: priceId, quantity: 1 }]
      : [
          {
            price_data: {
              currency: "usd",
              product_data: { name: fallback.name },
              unit_amount: fallback.amount,
              recurring: { interval: stripeInterval },
            },
            quantity: 1,
          },
        ];

    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: lineItems,
      metadata: { tier: paidTier, interval: billingInterval, userId },
      success_url: `${baseUrl}/dashboard?subscription=success`,
      cancel_url: `${baseUrl}/pricing`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create checkout session";
    console.error("[Stripe] create-checkout error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
