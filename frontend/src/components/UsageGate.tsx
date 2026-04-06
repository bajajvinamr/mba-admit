"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Lock, Zap, ArrowRight } from "lucide-react";
import { useUsage, type FeatureKey, type Tier } from "@/hooks/useUsage";
import { track } from "@/lib/analytics";

// ── Feature-specific paywall copy ───────────────────────────────────────────
// Contextual messaging >> generic - users see what they'll miss, not just a wall.

const FEATURE_COPY: Partial<Record<FeatureKey, { hook: string; value: string }>> = {
  odds_calculator: { hook: "You've checked your odds — now unlock unlimited runs", value: "Track changes as your profile improves" },
  essay_evaluator: { hook: "Your essay feedback is ready to apply", value: "Get unlimited evaluations as you revise" },
  resume_roaster: { hook: "You've seen the brutal truth about your resume", value: "Polish every bullet with unlimited roasts" },
  storyteller: { hook: "Your narrative brainstorm is just the beginning", value: "Explore unlimited story angles" },
  goal_sculptor: { hook: "Your career narrative has been drafted", value: "Refine goals for every school on your list" },
  interview_simulator: { hook: "You've practiced — now master every question type", value: "Unlimited mock interviews with AI feedback" },
  profile_report: { hook: "Your strengths and gaps have been mapped", value: "Run unlimited reports as you improve" },
  rec_strategy: { hook: "Your recommender strategy is set", value: "Plan recs for every school you're targeting" },
  school_compare: { hook: "You've compared schools side-by-side", value: "Compare unlimited school combinations" },
  networking_outreach: { hook: "Your outreach plan is drafted", value: "Build networking plans for every target school" },
  fit_score: { hook: "You've seen your school fit score", value: "Score every school on your list" },
  scholarship_estimate: { hook: "Your scholarship odds have been estimated", value: "Run estimates for every school you're applying to" },
  strength_finder: { hook: "Your application strength has been measured", value: "Track your score as you strengthen weak areas" },
  salary_explorer: { hook: "You've explored post-MBA salary data", value: "Compare salaries across every role and school" },
  alumni_interview: { hook: "Your interview prep guide is ready", value: "Prepare for every school's unique interview style" },
  loi_builder: { hook: "Your letter of intent has been drafted", value: "Generate LOIs for every school on your list" },
  waitlist_strategy: { hook: "Your waitlist action plan is ready", value: "Generate strategies for every school you're waitlisted at" },
  roi_calculator: { hook: "You've seen the 10-year return analysis", value: "Compare ROI across every school combination" },
  scholarship_negotiator: { hook: "Your negotiation strategy has been drafted", value: "Run unlimited negotiation strategies as offers come in" },
  peer_comparison: { hook: "You've seen how you stack up against peers", value: "Compare your profile across unlimited dimensions" },
  strategy_ai: { hook: "Your personalized strategy has been generated", value: "Get unlimited AI-powered application strategies" },
  recommender_briefing: { hook: "Your AI recommender briefing is ready", value: "Generate personalized briefings for every recommender and school" },
  narrative_arc: { hook: "Your narrative arc has been mapped — the consultant-level output", value: "Rebuild and refine your narrative for every application cycle" },
};

// ── Default free trial counts per feature ─────────────────────────────────

const DEFAULT_FREE_TRIAL: Partial<Record<FeatureKey, number>> = {
  odds_calculator: 2,
  essay_evaluator: 1,
  interview_simulator: 1,
  strategy_ai: 1,
  recommender_briefing: 2,
  roi_calculator: 2,
  school_compare: 2,
  peer_comparison: 2,
};

// ── Upgrade copy builder ────────────────────────────────────────────────────

type UpgradeCopy = { headline: string; subtext: string; cta: string; price: string };

function getUpgradeCopy(tier: Tier, feature: FeatureKey): UpgradeCopy {
  const featureCopy = FEATURE_COPY[feature];

  if (tier === "pro") {
    return {
      headline: featureCopy?.hook ?? "You've hit the Pro limit",
      subtext: "Go Premium for unlimited everything plus a 60-min consulting call.",
      cta: "Go Premium",
      price: "$79/mo",
    };
  }

  // Free → Pro (most common conversion path)
  return {
    headline: featureCopy?.hook ?? "You've used your free runs",
    subtext: featureCopy?.value
      ? `${featureCopy.value}. Most applicants upgrade here.`
      : "Upgrade to Pro for unlimited access to all AI tools. Most applicants choose this.",
    cta: "Upgrade to Pro",
    price: "$29/mo",
  };
}

// ── Component ───────────────────────────────────────────────────────────────

type UsageGateProps = {
  feature: FeatureKey;
  children: React.ReactNode;
  /** Show remaining count badge above the tool */
  showBadge?: boolean;
  /** Number of free uses before gating (default comes from DEFAULT_FREE_TRIAL or 1) */
  freeTrialCount?: number;
};

export function UsageGate({ feature, children, showBadge = true, freeTrialCount }: UsageGateProps) {
  const { usageCount, isAtLimit, remaining, isUnlimited, limit, period, featureLabel, upgradeNeeded, tier } = useUsage(feature);

  // Resolve the effective free trial count
  const effectiveFreeTrialCount = freeTrialCount ?? DEFAULT_FREE_TRIAL[feature] ?? 1;

  // Track paywall impressions (must be above early returns - React hooks rule)
  useEffect(() => {
    if (isAtLimit && upgradeNeeded) {
      track("paywall_shown", { feature, tier, upgrade_target: upgradeNeeded });
    }
  }, [isAtLimit, upgradeNeeded, feature, tier]);

  // Paid users: no gate (pass through)
  if (isUnlimited) return <>{children}</>;

  // Paid tier but not unlimited — still use standard limit logic
  if (tier !== "free") {
    // At limit - show upgrade wall
    if (isAtLimit && upgradeNeeded) {
      const copy = getUpgradeCopy(tier, feature);
      return (
        <div className="relative">
          <div className="blur-sm pointer-events-none select-none opacity-40" aria-hidden>
            {children}
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-10">
            <div className="max-w-md text-center px-8 py-10">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock size={24} className="text-primary" />
              </div>
              <h2 className="heading-serif text-xl text-foreground mb-2">{copy.headline}</h2>
              <p className="text-sm text-muted-foreground/50 mb-1">
                {featureLabel}: {limit} {period === "day" ? "daily" : "monthly"} uses on your current plan.
              </p>
              <p className="text-sm text-muted-foreground/40 mb-6">{copy.subtext}</p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 bg-foreground text-white px-6 py-3 font-bold text-sm hover:bg-foreground/80 transition-colors rounded-lg"
              >
                <Zap size={14} />
                {copy.cta} - {copy.price}
                <ArrowRight size={14} />
              </Link>
              <p className="text-[10px] text-muted-foreground/30 mt-3">
                Cancel anytime · No commitment · Instant access
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Under limit for paid tier
    return (
      <div>
        {showBadge && (
          <div className="flex items-center justify-end gap-2 mb-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              remaining <= 1
                ? "bg-amber-100 text-amber-600"
                : "bg-emerald-100 text-emerald-600"
            }`}>
              {remaining} of {limit} {period === "day" ? "daily" : "monthly"} uses left
            </span>
          </div>
        )}
        {children}
      </div>
    );
  }

  // ── Free tier logic with freeTrialCount ───────────────────────────────────

  // Free users with usageCount < freeTrialCount: show content (pass through)
  if (usageCount < effectiveFreeTrialCount) {
    const trialRemaining = effectiveFreeTrialCount - usageCount;
    const isLastFreeUse = trialRemaining === 1;

    return (
      <div>
        {showBadge && (
          <div className="flex items-center justify-end gap-2 mb-2">
            {isLastFreeUse && (
              <Link href="/pricing" className="text-[10px] font-medium text-primary hover:text-primary/80 transition-colors">
                Upgrade for unlimited
              </Link>
            )}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isLastFreeUse
                ? "bg-red-100 text-red-600 animate-pulse"
                : trialRemaining <= 3
                  ? "bg-amber-100 text-amber-600"
                  : "bg-emerald-100 text-emerald-600"
            }`}>
              {isLastFreeUse
                ? "Last free use!"
                : `${trialRemaining} free ${trialRemaining === 1 ? "use" : "uses"} left`}
            </span>
          </div>
        )}
        {children}
      </div>
    );
  }

  // Free users with usageCount >= freeTrialCount: show upgrade prompt
  const copy = getUpgradeCopy("free", feature);
  return (
    <div className="relative">
      {/* Blurred preview of the tool */}
      <div className="blur-sm pointer-events-none select-none opacity-40" aria-hidden>
        {children}
      </div>

      {/* Upgrade overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-10">
        <div className="max-w-md text-center px-8 py-10">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={24} className="text-primary" />
          </div>
          <h2 className="heading-serif text-xl text-foreground mb-2">
            You&apos;ve used your free {featureLabel.toLowerCase()}
          </h2>
          <p className="text-sm text-muted-foreground/50 mb-6">{copy.subtext}</p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 bg-foreground text-white px-6 py-3 font-bold text-sm hover:bg-foreground/80 transition-colors rounded-lg"
          >
            <Zap size={14} />
            {copy.cta} - {copy.price}
            <ArrowRight size={14} />
          </Link>
          <p className="text-[10px] text-muted-foreground/30 mt-3">
            Cancel anytime · No commitment · Instant access
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Inline usage indicator (for nav or tool headers) ────────────────────────

export function UsageBadge({ feature }: { feature: FeatureKey }) {
  const { remaining, isUnlimited, limit, period, isAtLimit } = useUsage(feature);

  if (isUnlimited) return null;

  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
      isAtLimit
        ? "bg-red-100 text-red-600"
        : remaining <= 1
          ? "bg-amber-100 text-amber-600"
          : "bg-foreground/5 text-muted-foreground/40"
    }`}>
      {isAtLimit ? "Limit reached" : `${remaining}/${limit} ${period === "day" ? "today" : "mo"}`}
    </span>
  );
}
