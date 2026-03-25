/** Journey stages for the onboarding + dashboard flow */
export const JOURNEY_STAGES = [
  { id: "explore", label: "Explore", icon: "Search", description: "Research schools and programs" },
  { id: "prepare", label: "Prepare", icon: "BookOpen", description: "GMAT prep, timeline, recommenders" },
  { id: "write", label: "Write", icon: "PenTool", description: "Essays, applications, supplements" },
  { id: "practice", label: "Practice", icon: "Mic", description: "Interview prep and mock sessions" },
  { id: "decide", label: "Decide", icon: "Scale", description: "Compare offers and choose" },
  { id: "engage", label: "Engage", icon: "Users", description: "Connect with admitted community" },
] as const;

export type JourneyStage = (typeof JOURNEY_STAGES)[number]["id"];

/** Tier limits for usage gating */
export const TIER_LIMITS = {
  free: {
    trackedSchools: 3,
    interviewsPerMonth: 5,
    essayDrafts: 2,
    aiRequests: 20,
  },
  pro: {
    trackedSchools: Infinity,
    interviewsPerMonth: 50,
    essayDrafts: Infinity,
    aiRequests: 500,
  },
  premium: {
    trackedSchools: Infinity,
    interviewsPerMonth: Infinity,
    essayDrafts: Infinity,
    aiRequests: Infinity,
  },
  consultant: {
    trackedSchools: Infinity,
    interviewsPerMonth: Infinity,
    essayDrafts: Infinity,
    aiRequests: Infinity,
  },
} as const;

export type Tier = keyof typeof TIER_LIMITS;

/** School ranking tiers */
export const SCHOOL_TIERS = {
  M7: ["hbs", "gsb", "wharton", "booth", "kellogg", "columbia", "sloan"],
  T15: ["tuck", "haas", "ross", "fuqua", "darden", "stern", "yale", "johnson"],
  T25: ["anderson", "tepper", "mccombs", "kenan_flagler", "georgetown", "olin", "marshall", "kelley", "mendoza", "foster"],
} as const;
