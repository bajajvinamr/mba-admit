import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Lazy-initialized at first request - avoids build-time module-load errors
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
function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("STRIPE_WEBHOOK_SECRET is required in production");
  }
  return secret;
}

// ── Event handlers ───────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const plan = session.metadata?.plan;
  const billing = session.metadata?.billing;

  // ── Subscription checkout (Pro/Premium) ──────────────────────────────────
  if (plan && (plan === "pro" || plan === "premium")) {
    const customerId = typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;
    const subscriptionId = typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
    const email = session.customer_details?.email || session.customer_email;

    console.log(
      `[Stripe] Subscription activated: plan=${plan}, billing=${billing}, ` +
      `customer=${customerId}, subscription=${subscriptionId}, email=${email}`
    );

    // TODO: When Supabase is integrated (Phase 1), persist subscription:
    // await db.users.updateSubscription({
    //   email,
    //   stripeCustomerId: customerId,
    //   stripeSubscriptionId: subscriptionId,
    //   tier: plan,
    //   billing,
    //   status: "active",
    // });

    return;
  }

  // ── One-time consulting call checkout ────────────────────────────────────
  const appSessionId = session.metadata?.app_session_id;
  if (appSessionId && session.payment_intent) {
    try {
      const { API_BASE } = await import("@/lib/api");
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent.id;

      await fetch(`${API_BASE}/api/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: appSessionId,
          stripe_payment_intent_id: paymentIntentId,
        }),
      });
    } catch (err) {
      console.error("[Stripe] Failed to unlock session after payment:", err);
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const status = subscription.status;
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;

  console.log(
    `[Stripe] Subscription updated: customer=${customerId}, status=${status}`
  );

  // TODO: When Supabase is integrated, update subscription status:
  // await db.users.updateSubscriptionStatus({
  //   stripeCustomerId: customerId,
  //   status: status === "active" ? "active" : status === "past_due" ? "past_due" : "canceled",
  // });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;

  console.log(`[Stripe] Subscription canceled: customer=${customerId}`);

  // TODO: When Supabase is integrated, downgrade user to free:
  // await db.users.downgradeToFree({ stripeCustomerId: customerId });
}

// ── Webhook entry point ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  const secret = getWebhookSecret();
  if (!sig || !secret) {
    return NextResponse.json(
      { error: "Missing stripe-signature header or webhook secret" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Stripe] Webhook signature verification failed:", message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  // Route events to handlers
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    case "invoice.payment_failed":
      // Payment failed on renewal - log for monitoring
      console.warn("[Stripe] Invoice payment failed:", (event.data.object as Stripe.Invoice).id);
      break;

    default:
      // Unhandled event type - log but return 200 so Stripe doesn't retry
      console.log(`[Stripe] Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
