"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { getPostHog } from "@/lib/posthog";

// ── Tier definitions ────────────────────────────────────────────────────────

type TierId = "free" | "pro" | "premium" | "consultant";
type BillingInterval = "monthly" | "annual";

type Tier = {
  id: TierId;
  name: string;
  monthly: number;
  annual: number;
  annualSavings: string; // e.g. "43%"
  description: string;
  cta: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
};

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    monthly: 0,
    annual: 0,
    annualSavings: "",
    description: "Explore the platform. No credit card required.",
    cta: "Current Plan",
    features: [
      "School directory (840+ programs)",
      "Real outcome data (12K decisions)",
      "3 odds calculations / day",
      "1 essay evaluation / month",
      "3 mock interviews / month",
      "Application status board",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 29,
    annual: 199,
    annualSavings: "43%",
    description: "Everything you need to apply confidently.",
    cta: "Upgrade to Pro",
    features: [
      "Everything in Free",
      "10 essay evaluations / month",
      "20 mock interviews / month",
      "Unlimited odds calculations",
      "5 school comparisons / month",
      "10 resume reviews / month",
      "Priority support",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    monthly: 99,
    annual: 599,
    annualSavings: "50%",
    description: "Replace your admissions consultant entirely.",
    cta: "Upgrade to Premium",
    highlighted: true,
    badge: "Most Popular",
    features: [
      "Everything in Pro",
      "Unlimited AI tool usage",
      "Monthly 1:1 strategy call",
      "Priority 24h essay reviews",
      "Scholarship negotiation assistant",
      "Networking outreach templates",
      "Waitlist strategy sessions",
    ],
  },
  {
    id: "consultant",
    name: "Consultant",
    monthly: 249,
    annual: 1999,
    annualSavings: "33%",
    description: "White-glove service with dedicated mentor support.",
    cta: "Upgrade to Consultant",
    features: [
      "Everything in Premium",
      "Dedicated admissions mentor",
      "Weekly strategy calls",
      "Application portfolio review",
      "School-specific essay coaching",
      "Interview prep with mock panels",
      "Scholarship strategy session",
      "Direct mentor messaging",
    ],
  },
];

// ── Checkout helper ─────────────────────────────────────────────────────────

async function handleCheckout(
  tier: TierId,
  interval: BillingInterval,
  onError: (msg: string) => void,
) {
  try {
    const res = await fetch("/api/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier, interval, userId: "anonymous" }),
    });

    const data: { url?: string; error?: string } = await res.json();

    if (!res.ok || !data.url) {
      console.error("Checkout error:", data.error);
      onError(data.error || "Could not start checkout. Please try again.");
      return;
    }

    track("checkout_started", { tier, interval });
    window.location.href = data.url;
  } catch (err) {
    console.error("Failed to start checkout:", err);
    onError("Network error. Please check your connection and try again.");
  }
}

// ── Component ───────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [loading, setLoading] = useState<TierId | null>(null);
  const [interval, setInterval] = useState<BillingInterval>("annual");
  const [checkoutError, setCheckoutError] = useState("");

  useEffect(() => {
    track("pricing_viewed", { source: typeof document !== "undefined" ? document.referrer : "" });

    // PostHog feature flag for A/B testing default interval
    getPostHog().then((ph) => {
      if (ph) {
        const flag = ph.getFeatureFlag("pricing_default_annual");
        if (flag === false) {
          setInterval("monthly");
        }
      }
    });
  }, []);

  const onUpgrade = async (tier: TierId) => {
    setCheckoutError("");
    setLoading(tier);
    await handleCheckout(tier, interval, setCheckoutError);
    setLoading(null);
  };

  const priceFor = (tier: Tier): number => {
    if (interval === "annual") return tier.annual;
    return tier.monthly;
  };

  const priceLabelFor = (tier: Tier): string => {
    if (tier.id === "free") return "$0";
    if (interval === "annual") return `$${tier.annual}`;
    return `$${tier.monthly}`;
  };

  const periodLabel = interval === "annual" ? "/year" : "/month";

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-foreground text-primary-foreground py-20 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="heading-serif text-4xl md:text-5xl mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-white/50 text-lg max-w-xl mx-auto mb-8">
            Free tools to explore. Pro tools to apply. Premium to replace your consultant.
          </p>

          {/* Monthly / Annual Toggle */}
          <div className="inline-flex items-center gap-3 bg-white/10 rounded-full p-1">
            <button
              onClick={() => {
                setInterval("monthly");
                track("pricing_interval_changed", { interval: "monthly" });
              }}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-bold transition-all",
                interval === "monthly"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-white/60 hover:text-white/80",
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => {
                setInterval("annual");
                track("pricing_interval_changed", { interval: "annual" });
              }}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2",
                interval === "annual"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-white/60 hover:text-white/80",
              )}
            >
              Annual
              {interval === "annual" && (
                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold uppercase">
                  Save up to 50%
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="max-w-5xl mx-auto px-8 -mt-12 pb-20">
        {checkoutError && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-6 flex items-center justify-between rounded">
            <span>{checkoutError}</span>
            <button onClick={() => setCheckoutError("")} className="ml-3 text-sm font-bold underline">Dismiss</button>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TIERS.map((tier) => (
            <Card
              key={tier.id}
              className={cn(
                "flex flex-col relative",
                tier.highlighted && "border-primary ring-2 ring-primary/20",
              )}
            >
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>{tier.name}</CardTitle>
                  {tier.badge && (
                    <Badge variant="default">{tier.badge}</Badge>
                  )}
                </div>
                <CardDescription>{tier.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex flex-col flex-1 gap-6">
                {/* Price */}
                <div>
                  <span className="heading-serif text-4xl text-foreground">
                    {priceLabelFor(tier)}
                  </span>
                  {priceFor(tier) > 0 && (
                    <span className="text-muted-foreground text-sm ml-1">
                      {periodLabel}
                    </span>
                  )}
                  {interval === "annual" && tier.annualSavings && tier.id !== "free" && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold uppercase">
                      Save {tier.annualSavings}
                    </span>
                  )}
                  {interval === "annual" && tier.id !== "free" && priceFor(tier) > 0 && (
                    <p className="text-xs text-muted-foreground/40 mt-1">
                      ${Math.round(tier.annual / 12)}/mo billed annually
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {tier.id === "free" ? (
                  <a href="/auth/signup" className="w-full">
                    <Button variant="outline" size="lg" className="w-full">
                      Get Started Free
                    </Button>
                  </a>
                ) : (
                  <Button
                    variant={tier.highlighted ? "default" : "outline"}
                    size="lg"
                    className="w-full"
                    disabled={loading === tier.id}
                    onClick={() => onUpgrade(tier.id)}
                  >
                    {loading === tier.id ? "Loading..." : tier.cta}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-8 pb-16">
        <h2 className="heading-serif text-2xl text-center mb-8">Frequently Asked Questions</h2>
        <div className="space-y-6">
          {[
            { q: "Can I change plans later?", a: "Yes. Upgrade or downgrade anytime from your account settings. Changes take effect on your next billing cycle." },
            { q: "What happens if I cancel?", a: "You keep access until the end of your current billing period. Your data (essays, tracked schools) is preserved if you resubscribe." },
            { q: "Is there a free trial for paid plans?", a: "All plans include a 7-day money-back guarantee. Try risk-free and get a full refund if it's not for you." },
            { q: "What counts as an AI tool use?", a: "Each essay evaluation, odds calculation, mock interview session, or resume review counts as one use. Browsing school data and the directory is always free." },
          ].map(({ q, a }) => (
            <div key={q} className="border-b border-border/10 pb-4">
              <h3 className="font-semibold text-sm text-foreground mb-1">{q}</h3>
              <p className="text-sm text-muted-foreground">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust badges */}
      <section className="max-w-3xl mx-auto px-8 pb-20">
        <div className="text-center">
          <p className="text-sm text-muted-foreground/40 mb-6">
            Cancel anytime. No lock-in. All plans include a 7-day money-back guarantee.
          </p>
          <div className="flex items-center justify-center gap-6 text-[10px] text-muted-foreground/30 uppercase tracking-widest font-bold">
            <span>256-bit SSL</span>
            <span>&middot;</span>
            <span>Stripe Payments</span>
            <span>&middot;</span>
            <span>GDPR Compliant</span>
          </div>
        </div>
      </section>
    </div>
  );
}
