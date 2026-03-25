import { MetadataRoute } from "next";
import guideMeta from "@/content/guides/meta.json";
import { API_BASE } from "@/lib/api";

const SITE = "https://admitcompass.ai";

const TOP_100 = new Set([
  "hbs", "gsb", "wharton", "booth", "kellogg", "cbs", "sloan",
  "tuck", "haas", "ross", "fuqua", "darden", "stern", "yale_som", "anderson",
  "tepper", "mccombs", "kenan_flagler", "johnson", "marshall", "mcdonough",
  "goizueta", "kelley", "mendoza", "jones", "olin", "foster", "owen",
  "scheller", "fisher", "broad", "smith", "questrom", "warrington",
  "insead", "lbs", "iese", "ie_business", "hec_paris", "esade",
  "judge", "said", "imperial", "sda_bocconi", "mannheim", "esmt",
  "st_gallen", "imds", "rsm", "copenhagen",
  "ceibs", "nus", "nanyang", "hkust", "hku", "cuhk",
  "isb", "iima", "iimb", "iimc", "iimi", "iimk", "iiml",
  "fms", "xlri", "mdi", "spjimr", "jbims", "iift",
  "mbs", "rotman", "ivey", "sauder", "desautels", "schulich",
  "kaist", "fudan", "peking_gsm", "sjtu_antai", "tsinghua_sem",
  "babson_olin", "smurfit", "warwick", "cranfield",
  "insead_ad", "keio", "waseda", "hitotsubashi",
  "aalto", "ssc_stockholm", "nhh", "essec", "emlyon", "edhec",
  "fgv", "egade", "incae", "gibs",
  "agsm", "monash",
]);

const REGION_SLUGS = [
  "north-america",
  "europe",
  "asia-pacific",
  "latin-america",
  "africa",
];

interface GeoMeta {
  countries: { slug: string; count: number }[];
  cities: { slug: string; count: number }[];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // ── Static pages ──────────────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE}/schools`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/decisions`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/compare`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/profile-report`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/evaluator`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/interview`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/roaster`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/scholarships`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/storyteller`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/goals`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/recommenders`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/outreach`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/waitlist`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/guide`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/dashboard`, lastModified: now, changeFrequency: "daily", priority: 0.4 },
    { url: `${SITE}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    // Batch 1+2+3 tools
    { url: `${SITE}/rankings`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/tools`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/calendar`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/checklist`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/essay-length-optimizer`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/fit-score`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    // /fees consolidated → /fee-calculator
    { url: `${SITE}/essay-prompts`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/score-convert`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/roi`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/essay-drafts`, lastModified: now, changeFrequency: "daily", priority: 0.4 },
    { url: `${SITE}/timeline`, lastModified: now, changeFrequency: "daily", priority: 0.4 },
    { url: `${SITE}/alerts`, lastModified: now, changeFrequency: "daily", priority: 0.4 },
    { url: `${SITE}/interview/questions`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/class-profile`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/gmat-targets`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // /radar consolidated → /compare
    // /tracker consolidated → /my-schools
    { url: `${SITE}/strength`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/cost-of-living`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/essay-themes`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/simulator`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/culture`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/salary`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/visa`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/fee-waivers`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/alumni`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/scholarship-estimate`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/plan`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/resume-keywords`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/gmat-planner`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    // /peer-compare consolidated → /compare
    { url: `${SITE}/visit-planner`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/budget`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/diversity`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // Batch 9
    { url: `${SITE}/rec-tracker`, lastModified: now, changeFrequency: "daily", priority: 0.5 },
    { url: `${SITE}/events`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // interview-bank consolidated into /interview/questions (already listed above)
    { url: `${SITE}/careers`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // app-checklist consolidated into /checklist (already listed above)
    // Batch 10
    { url: `${SITE}/exchange-programs`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/specialty-rankings`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/fee-calculator`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/loi-builder`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/community`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    // Batch 11
    // /salary-database consolidated → /salary
    { url: `${SITE}/admission-trends`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/word-bank`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/culture-quiz`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/reapplicant`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    // Batch 12
    { url: `${SITE}/glossary`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    // /countdown consolidated → /timeline
    { url: `${SITE}/gmat-predictor`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/program-formats`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/myths`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    // Batch 13
    { url: `${SITE}/podcasts`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/campus-life`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/school-news`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/essay-templates`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // /timeline-viz consolidated → /timeline
    // Batch 14
    { url: `${SITE}/dual-degrees`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/class-size`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    // /gmat-vs-gre consolidated → /score-convert
    { url: `${SITE}/reading-list`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/scholarship-tips`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    // Batch 15
    // /fee-tracker consolidated → /my-schools
    { url: `${SITE}/post-mba-locations`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/concentrations`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // /pre-mba-checklist consolidated → /checklist
    // /admit-rate-calc consolidated → /simulator
    // Batch 16
    // /networking-guide consolidated → /outreach
    { url: `${SITE}/salary-negotiation`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/study-group`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/alumni-interview`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/acceptance-history`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // Batch 17
    // /app-dashboard consolidated → /dashboard
    // /waitlist-guide consolidated → /waitlist
    { url: `${SITE}/international-guide`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/day-in-life`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    // /employment-reports consolidated → /careers
    // Batch 18
    // /mba-glossary-quiz consolidated → /glossary
    { url: `${SITE}/career-switcher`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // /essay-word-frequency consolidated → /evaluator
    // /school-culture-map consolidated → /culture
    // /recommendation-letter-tips consolidated → /recommenders
    // Batch 19
    // /mba-myths-quiz consolidated → /myths
    // /school-visit-checklist consolidated → /visit-planner
    // /essay-tone-checker consolidated → /evaluator
    { url: `${SITE}/financial-aid-comparison`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    // /mba-roi-by-industry consolidated → /roi
    // Batch 20
    // /application-timeline-builder consolidated → /timeline
    // /gmat-score-breakdown consolidated → /gmat-targets
    // /mba-networking-tracker consolidated → /outreach
    // /essay-length-optimizer already listed in Batch 1+2+3
    { url: `${SITE}/round-strategy`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // Previously unlisted
    { url: `${SITE}/my-schools`, lastModified: now, changeFrequency: "daily", priority: 0.5 },
    // Program landing pages
    { url: `${SITE}/programs`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/programs/mba`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/programs/mim`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/programs/emba`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/programs/cat`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    // Info pages
    { url: `${SITE}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    // Phase 2 Sprint 3
    { url: `${SITE}/career-simulator`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/compare-countries`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/portfolio`, lastModified: now, changeFrequency: "daily", priority: 0.5 },
    { url: `${SITE}/essays/themes`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/decide`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
  ];

  // ── Dynamic school pages (with TOP_100 priority boost) ────────────────
  let schoolPages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API_BASE}/api/schools`, { next: { revalidate: 86400 } });
    if (res.ok) {
      const schools: { id: string }[] = await res.json();
      schoolPages = schools.map((school) => ({
        url: `${SITE}/school/${school.id}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: TOP_100.has(school.id) ? 0.9 : 0.7,
      }));
    }
  } catch {
    // API unavailable at build time - skip dynamic school pages
  }

  // ── Geo pages (countries, regions, cities) ────────────────────────────
  let countryPages: MetadataRoute.Sitemap = [];
  let cityPages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API_BASE}/api/schools/geo-meta`, { next: { revalidate: 86400 } });
    if (res.ok) {
      const geo: GeoMeta = await res.json();

      countryPages = geo.countries
        .filter((c) => c.count >= 2)
        .map((c) => ({
          url: `${SITE}/schools/country/${c.slug}`,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: 0.8,
        }));

      cityPages = geo.cities
        .filter((c) => c.count >= 2)
        .map((c) => ({
          url: `${SITE}/schools/city/${c.slug}`,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: 0.7,
        }));
    }
  } catch {
    // API unavailable at build time - skip geo pages
  }

  const regionPages: MetadataRoute.Sitemap = REGION_SLUGS.map((slug) => ({
    url: `${SITE}/schools/region/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // ── Guide pages (from meta.json) ──────────────────────────────────────
  const guidePages: MetadataRoute.Sitemap = Object.keys(guideMeta).map((slug) => ({
    url: `${SITE}/guides/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // ── Interview guide pages (T25 schools) ─────────────────────────────
  const INTERVIEW_GUIDE_SLUGS = [
    "hbs", "gsb", "wharton", "booth", "kellogg", "sloan", "columbia",
    "haas", "tuck", "ross", "fuqua", "darden", "stern", "yale",
    "anderson", "lbs", "insead", "johnson", "tepper", "mccombs",
    "kenan_flagler", "georgetown", "olin", "kelley", "owen",
  ];
  const interviewGuidePages: MetadataRoute.Sitemap = INTERVIEW_GUIDE_SLUGS.map((slug) => ({
    url: `${SITE}/interviews/guide/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // ── MBA-in country pages ────────────────────────────────────────────
  const MBA_IN_COUNTRIES = [
    "us", "uk", "canada", "france", "spain", "germany",
    "singapore", "india", "china", "australia",
  ];
  const mbaInPages: MetadataRoute.Sitemap = MBA_IN_COUNTRIES.map((slug) => ({
    url: `${SITE}/mba-in/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [
    ...staticPages,
    ...schoolPages,
    ...countryPages,
    ...regionPages,
    ...cityPages,
    ...guidePages,
    ...interviewGuidePages,
    ...mbaInPages,
  ];
}
