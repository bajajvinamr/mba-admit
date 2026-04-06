"use client";

import { useState, useEffect, useCallback } from "react";

// ── Tier definitions ────────────────────────────────────────────────────────
// Matches revenue strategy: Free (hook) / Pro $29 / Premium $79

export type Tier = "free" | "pro" | "premium";

export type FeatureKey =
  | "odds_calculator"
  | "essay_evaluator"
  | "resume_roaster"
  | "storyteller"
  | "goal_sculptor"
  | "interview_simulator"
  | "profile_report"
  | "rec_strategy"
  | "school_compare"
  | "networking_outreach"
  | "fit_score"
  | "scholarship_estimate"
  | "strength_finder"
  | "salary_explorer"
  | "alumni_interview"
  | "loi_builder"
  | "waitlist_strategy"
  | "roi_calculator"
  | "scholarship_negotiator"
  | "peer_comparison"
  | "strategy_ai"
  | "recommender_briefing"
  | "narrative_arc";

type FeatureLimit = {
  free: number;       // uses per day (or per month for some)
  pro: number;
  premium: number;    // -1 = unlimited
  period: "day" | "month";
  label: string;      // human-readable name
};

// Revenue strategy limits from docs/plans/2026-03-17-revenue-strategy.md
const FEATURE_LIMITS: Record<FeatureKey, FeatureLimit> = {
  odds_calculator:     { free: 3,  pro: -1, premium: -1, period: "day",   label: "Odds Calculator" },
  essay_evaluator:     { free: 1,  pro: 10, premium: -1, period: "month", label: "Essay Evaluator" },
  resume_roaster:      { free: 1,  pro: 10, premium: -1, period: "month", label: "Resume Roaster" },
  storyteller:         { free: 1,  pro: 5,  premium: -1, period: "month", label: "Storyteller" },
  goal_sculptor:       { free: 1,  pro: 5,  premium: -1, period: "month", label: "Goal Sculptor" },
  interview_simulator: { free: 3,  pro: 20, premium: -1, period: "month", label: "Interview Simulator" },
  profile_report:      { free: 1,  pro: -1, premium: -1, period: "month", label: "Profile Report" },
  rec_strategy:        { free: 1,  pro: -1, premium: -1, period: "month", label: "Rec Strategy" },
  school_compare:      { free: 2,  pro: 5,  premium: -1, period: "month", label: "School Compare" },
  networking_outreach: { free: 1,  pro: 10, premium: -1, period: "month", label: "Networking Hub" },
  fit_score:           { free: 2,  pro: -1, premium: -1, period: "month", label: "Fit Score" },
  scholarship_estimate:{ free: 1,  pro: 5,  premium: -1, period: "month", label: "Scholarship Estimator" },
  strength_finder:     { free: 1,  pro: 5,  premium: -1, period: "month", label: "Strength Finder" },
  salary_explorer:     { free: 2,  pro: -1, premium: -1, period: "month", label: "Salary Explorer" },
  alumni_interview:    { free: 2,  pro: 10, premium: -1, period: "month", label: "Alumni Interview Prep" },
  loi_builder:         { free: 1,  pro: 5,  premium: -1, period: "month", label: "LOI Builder" },
  waitlist_strategy:   { free: 1,  pro: 5,  premium: -1, period: "month", label: "Waitlist Strategy" },
  roi_calculator:      { free: 2,  pro: -1, premium: -1, period: "month", label: "ROI Calculator" },
  scholarship_negotiator: { free: 1, pro: 5, premium: -1, period: "month", label: "Scholarship Negotiator" },
  peer_comparison:        { free: 3, pro: -1, premium: -1, period: "day",   label: "Peer Comparison" },
  strategy_ai:            { free: 1, pro: 5,  premium: -1, period: "month", label: "AI Profile Strategist" },
  recommender_briefing:   { free: 2, pro: 20, premium: -1, period: "month", label: "AI Recommender Briefing" },
  narrative_arc:          { free: 1, pro: 5,  premium: -1, period: "month", label: "Narrative Arc Builder" },
};

// ── Storage helpers ─────────────────────────────────────────────────────────

const STORAGE_KEY = "ac_usage";
const TIER_KEY = "ac_tier";

type UsageStore = Record<string, { count: number; resetAt: number }>;

function getStore(): UsageStore {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveStore(store: UsageStore) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function getResetTimestamp(period: "day" | "month"): number {
  const now = new Date();
  if (period === "day") {
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return tomorrow.getTime();
  }
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.getTime();
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useUsage(feature: FeatureKey) {
  const [usageCount, setUsageCount] = useState(0);
  const [tier, setTier] = useState<Tier>("free");

  // Load on mount
  useEffect(() => {
    const savedTier = localStorage.getItem(TIER_KEY) as Tier | null;
    if (savedTier && ["free", "pro", "premium"].includes(savedTier)) {
      setTier(savedTier);
    }

    const store = getStore();
    const entry = store[feature];
    if (entry && Date.now() < entry.resetAt) {
      setUsageCount(entry.count);
    } else if (entry) {
      // Reset expired
      delete store[feature];
      saveStore(store);
      setUsageCount(0);
    }
  }, [feature]);

  const limits = FEATURE_LIMITS[feature];
  const currentLimit = limits[tier];
  const isUnlimited = currentLimit === -1;
  const remaining = isUnlimited ? Infinity : Math.max(0, currentLimit - usageCount);
  const isAtLimit = !isUnlimited && usageCount >= currentLimit;

  const recordUse = useCallback(() => {
    const store = getStore();
    const entry = store[feature];
    const now = Date.now();

    if (entry && now < entry.resetAt) {
      entry.count += 1;
      setUsageCount(entry.count);
    } else {
      store[feature] = { count: 1, resetAt: getResetTimestamp(limits.period) };
      setUsageCount(1);
    }
    saveStore(store);
  }, [feature, limits.period]);

  const upgradeNeeded: Tier | null = isAtLimit
    ? tier === "free"
      ? "pro"
      : tier === "pro"
        ? "premium"
        : null
    : null;

  return {
    usageCount,
    remaining,
    isAtLimit,
    isUnlimited,
    limit: currentLimit,
    period: limits.period,
    featureLabel: limits.label,
    tier,
    upgradeNeeded,
    recordUse,
  };
}

export { FEATURE_LIMITS };
