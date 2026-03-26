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

  // ── Static pages (consolidated routes) ───────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    // Core
    { url: SITE, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE}/schools`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/rankings`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/decisions`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/compare`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/compare-countries`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/profile-report`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/simulator`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // Consolidated hubs
    { url: `${SITE}/portfolio`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE}/essays`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE}/finances`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/test-prep`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // Application support
    { url: `${SITE}/interview`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/interview/questions`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/roaster`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/recommenders`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/rec-tracker`, lastModified: now, changeFrequency: "daily", priority: 0.5 },
    { url: `${SITE}/loi-builder`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/outreach`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/waitlist`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/round-strategy`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/checklist`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    // Planning & timeline
    { url: `${SITE}/timeline`, lastModified: now, changeFrequency: "daily", priority: 0.4 },
    { url: `${SITE}/calendar`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/alerts`, lastModified: now, changeFrequency: "daily", priority: 0.4 },
    { url: `${SITE}/plan`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/goals`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/decide`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    // Research & data
    { url: `${SITE}/class-profile`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/admission-trends`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/acceptance-history`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/diversity`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/specialty-rankings`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/concentrations`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/dual-degrees`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/program-formats`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/class-size`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/culture`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/culture-quiz`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/fit-score`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/strength`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    // Career
    { url: `${SITE}/careers`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/career-simulator`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/career-switcher`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/post-mba-locations`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/resume-keywords`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    // Life & community
    { url: `${SITE}/campus-life`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/day-in-life`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/alumni`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/alumni-interview`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/events`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/community`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE}/exchange-programs`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/visit-planner`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/study-group`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    // International
    { url: `${SITE}/international-guide`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/visa`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/cost-of-living`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    // Resources
    { url: `${SITE}/guide`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/glossary`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/myths`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/podcasts`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/reading-list`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/school-news`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/reapplicant`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/financial-aid-comparison`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    // Program landing pages
    { url: `${SITE}/programs`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/programs/mba`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/programs/mim`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/programs/emba`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/programs/cat`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    // Info & account
    { url: `${SITE}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/dashboard`, lastModified: now, changeFrequency: "daily", priority: 0.4 },
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
