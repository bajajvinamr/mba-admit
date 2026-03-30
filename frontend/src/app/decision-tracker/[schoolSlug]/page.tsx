import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { API_BASE } from "@/lib/api";
import { EmailCapture } from "@/components/EmailCapture";
import { ToolCrossLinks } from "@/components/ToolCrossLinks";

// ── Top 50 MBA schools for static generation ────────────────────────────────

const SCHOOLS: { slug: string; name: string }[] = [
  { slug: "hbs", name: "Harvard Business School" },
  { slug: "gsb", name: "Stanford GSB" },
  { slug: "wharton", name: "Wharton" },
  { slug: "chicago_booth", name: "Chicago Booth" },
  { slug: "kellogg", name: "Kellogg" },
  { slug: "mit_sloan", name: "MIT Sloan" },
  { slug: "columbia_business_school", name: "Columbia Business School" },
  { slug: "dartmouth_tuck", name: "Dartmouth Tuck" },
  { slug: "uc_berkeley_haas", name: "UC Berkeley Haas" },
  { slug: "michigan_ross", name: "Michigan Ross" },
  { slug: "duke_fuqua", name: "Duke Fuqua" },
  { slug: "uva_darden", name: "UVA Darden" },
  { slug: "nyu_stern", name: "NYU Stern" },
  { slug: "yale_som", name: "Yale SOM" },
  { slug: "cornell_johnson", name: "Cornell Johnson" },
  { slug: "ucla_anderson", name: "UCLA Anderson" },
  { slug: "london_business_school", name: "London Business School" },
  { slug: "insead", name: "INSEAD" },
  { slug: "cmu_tepper", name: "CMU Tepper" },
  { slug: "georgetown_mcdonough", name: "Georgetown McDonough" },
  { slug: "unc_kenan_flagler", name: "UNC Kenan-Flagler" },
  { slug: "usc_marshall", name: "USC Marshall" },
  { slug: "emory_goizueta", name: "Emory Goizueta" },
  { slug: "indiana_kelley", name: "Indiana Kelley" },
  { slug: "texas_mccombs", name: "Texas McCombs" },
  { slug: "washington_foster", name: "Washington Foster" },
  { slug: "notre_dame_mendoza", name: "Notre Dame Mendoza" },
  { slug: "vanderbilt_owen", name: "Vanderbilt Owen" },
  { slug: "rice_jones", name: "Rice Jones" },
  { slug: "ohio_state_fisher", name: "Ohio State Fisher" },
  { slug: "boston_college_carroll", name: "Boston College Carroll" },
  { slug: "rochester_simon", name: "Rochester Simon" },
  { slug: "wisconsin_school_of_business", name: "Wisconsin School of Business" },
  { slug: "iese", name: "IESE Business School" },
  { slug: "hec_paris", name: "HEC Paris" },
  { slug: "ie_business_school", name: "IE Business School" },
  { slug: "cambridge_judge", name: "Cambridge Judge" },
  { slug: "oxford_said", name: "Oxford Said" },
  { slug: "nus_business_school", name: "NUS Business School" },
  { slug: "hkust_business_school", name: "HKUST Business School" },
  { slug: "isb", name: "Indian School of Business" },
  { slug: "iim_ahmedabad", name: "IIM Ahmedabad" },
  { slug: "melbourne_business_school", name: "Melbourne Business School" },
  { slug: "rotman", name: "Rotman School of Management" },
  { slug: "ivey", name: "Ivey Business School" },
  { slug: "esade", name: "ESADE Business School" },
  { slug: "mannheim", name: "Mannheim Business School" },
  { slug: "sda_bocconi", name: "SDA Bocconi" },
  { slug: "ceibs", name: "CEIBS" },
  { slug: "st_gallen", name: "University of St. Gallen" },
];

const SCHOOL_MAP = new Map(SCHOOLS.map((s) => [s.slug, s.name]));

// ── Types (matching API response from /api/community/stats/:slug) ───────────

type ResultDistribution = {
  accepted: number;
  rejected: number;
  waitlisted: number;
  interviewed: number;
};

type GmatBucket = { range: string; accepted: number; rejected: number };
type RoundEntry = { round: string; total: number; accepted: number };

type SchoolStats = {
  school_slug: string;
  school_name: string;
  total_decisions: number;
  acceptance_rate: number;
  avg_gmat_accepted: number | null;
  avg_gpa_accepted: number | null;
  avg_work_years: number | null;
  result_distribution: ResultDistribution;
  gmat_distribution: GmatBucket[];
  round_breakdown: RoundEntry[];
};

// ── Data fetching ───────────────────────────────────────────────────────────

async function getSchoolStats(slug: string): Promise<SchoolStats | null> {
  try {
    const res = await fetch(`${API_BASE}/api/community/stats/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ── Static params & metadata ────────────────────────────────────────────────

type PageProps = {
  params: Promise<{ schoolSlug: string }>;
};

export function generateStaticParams() {
  return SCHOOLS.map((s) => ({ schoolSlug: s.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { schoolSlug } = await params;
  const name = SCHOOL_MAP.get(schoolSlug) ?? schoolSlug;
  const stats = await getSchoolStats(schoolSlug);

  const statBits = [
    stats?.acceptance_rate != null && `${stats.acceptance_rate}% accept rate`,
    stats?.avg_gmat_accepted != null && `Avg GMAT ${stats.avg_gmat_accepted}`,
    stats?.total_decisions && `${stats.total_decisions} decisions`,
  ].filter(Boolean);

  const statSuffix = statBits.length ? ` ${statBits.join(" · ")}.` : "";

  return {
    title: `${name} Admission Decisions & Stats - Decision Tracker`,
    description: `See real community-reported admission decisions for ${name}.${statSuffix} Explore GMAT distributions, round breakdowns, and acceptance trends.`,
    alternates: {
      canonical: `/decision-tracker/${schoolSlug}`,
    },
    openGraph: {
      title: `${name} Admission Decisions & Stats | Admit Compass`,
      description: `Community-reported admission outcomes for ${name}.${statSuffix}`,
      type: "website",
      siteName: "Admit Compass",
      url: `/decision-tracker/${schoolSlug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} Admission Decisions | Admit Compass`,
      description: `Real admission outcomes for ${name}.${statSuffix}`,
    },
  };
}

// ── Visual components (server-rendered, CSS-only) ───────────────────────────

function DonutChart({ data }: { data: ResultDistribution }) {
  const total =
    data.accepted + data.rejected + data.waitlisted + data.interviewed;
  if (total === 0)
    return (
      <div className="text-sm text-muted-foreground">No outcome data yet</div>
    );

  const segments = [
    { key: "accepted", value: data.accepted, color: "hsl(160 84% 39%)" },
    { key: "rejected", value: data.rejected, color: "hsl(0 72% 51%)" },
    { key: "waitlisted", value: data.waitlisted, color: "hsl(38 92% 50%)" },
    { key: "interviewed", value: data.interviewed, color: "hsl(220 70% 55%)" },
  ].filter((s) => s.value > 0);

  let cumulative = 0;
  const gradientParts = segments.map((seg) => {
    const start = (cumulative / total) * 360;
    cumulative += seg.value;
    const end = (cumulative / total) * 360;
    return `${seg.color} ${start}deg ${end}deg`;
  });

  const acceptRate =
    total > 0 ? Math.round((data.accepted / total) * 100) : 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative w-40 h-40 rounded-full"
        style={{
          background: `conic-gradient(${gradientParts.join(", ")})`,
        }}
      >
        <div className="absolute inset-4 rounded-full bg-card flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-foreground">
            {acceptRate}%
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Accept Rate
          </span>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center gap-1.5 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: seg.color }}
            />
            <span className="capitalize text-muted-foreground">{seg.key}</span>
            <span className="font-medium text-foreground">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GmatBarChart({ buckets }: { buckets: GmatBucket[] }) {
  if (!buckets.length)
    return <div className="text-sm text-muted-foreground">No GMAT data</div>;

  const maxVal = Math.max(
    ...buckets.map((b) => b.accepted + b.rejected),
    1
  );

  return (
    <div className="space-y-1.5">
      {buckets.map((bucket) => {
        const total = bucket.accepted + bucket.rejected;
        const accPct = total > 0 ? (bucket.accepted / maxVal) * 100 : 0;
        const rejPct = total > 0 ? (bucket.rejected / maxVal) * 100 : 0;
        return (
          <div key={bucket.range} className="flex items-center gap-2 text-xs">
            <span className="w-16 text-right text-muted-foreground font-mono text-[11px]">
              {bucket.range}
            </span>
            <div className="flex-1 flex h-5 rounded-sm overflow-hidden bg-muted/30">
              {accPct > 0 && (
                <div
                  className="h-full rounded-l-sm"
                  style={{
                    width: `${accPct}%`,
                    backgroundColor: "hsl(160 84% 39%)",
                  }}
                />
              )}
              {rejPct > 0 && (
                <div
                  className="h-full"
                  style={{
                    width: `${rejPct}%`,
                    backgroundColor: "hsl(0 72% 51%)",
                    borderRadius:
                      accPct > 0 ? "0" : "0.125rem 0 0 0.125rem",
                  }}
                />
              )}
            </div>
            <span className="w-8 text-right font-mono text-muted-foreground">
              {total}
            </span>
          </div>
        );
      })}
      <div className="flex gap-4 mt-2 justify-end text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: "hsl(160 84% 39%)" }}
          />{" "}
          Accepted
        </span>
        <span className="flex items-center gap-1">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: "hsl(0 72% 51%)" }}
          />{" "}
          Rejected
        </span>
      </div>
    </div>
  );
}

function RoundBreakdown({ rounds }: { rounds: RoundEntry[] }) {
  if (!rounds.length)
    return <div className="text-sm text-muted-foreground">No round data</div>;

  return (
    <div className="space-y-2">
      {rounds.map((r) => {
        const rate =
          r.total > 0 ? Math.round((r.accepted / r.total) * 100) : 0;
        return (
          <div key={r.round} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-foreground">{r.round}</span>
              <span className="text-muted-foreground">
                {r.accepted}/{r.total} accepted ({rate}%)
              </span>
            </div>
            <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${rate}%`,
                  backgroundColor:
                    rate > 30
                      ? "hsl(160 84% 39%)"
                      : rate > 15
                        ? "hsl(38 92% 50%)"
                        : "hsl(0 72% 51%)",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-card border border-border/50 rounded-lg p-4 shadow-card">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-2">
        {label}
      </span>
      <span className="text-xl font-bold text-foreground">{value}</span>
    </div>
  );
}

// ── Page component ──────────────────────────────────────────────────────────

export default async function SchoolDecisionPage({ params }: PageProps) {
  const { schoolSlug } = await params;
  const schoolName = SCHOOL_MAP.get(schoolSlug);

  if (!schoolName) {
    notFound();
  }

  const stats = await getSchoolStats(schoolSlug);

  const pageUrl = `https://admitcompass.ai/decision-tracker/${schoolSlug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": pageUrl,
        name: `${schoolName} Admission Decisions & Stats`,
        description: `Community-reported admission decisions for ${schoolName}.`,
        url: pageUrl,
        isPartOf: {
          "@type": "WebSite",
          name: "Admit Compass",
          url: "https://admitcompass.ai",
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://admitcompass.ai",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Decision Tracker",
            item: "https://admitcompass.ai/decision-tracker",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: schoolName,
            item: pageUrl,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="min-h-screen bg-background">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="bg-foreground text-white py-14 px-6 relative overflow-hidden">
          <div className="max-w-5xl mx-auto relative z-10">
            <nav className="text-xs text-white/40 mb-6 flex items-center gap-1.5">
              <Link
                href="/decision-tracker"
                className="hover:text-white/70 transition-colors"
              >
                Decision Tracker
              </Link>
              <span>/</span>
              <span className="text-white/60">{schoolName}</span>
            </nav>

            <h1 className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl font-semibold mb-3 tracking-tight">
              {schoolName} Admission Decisions
            </h1>
            <p className="text-white/60 text-base max-w-2xl">
              {stats
                ? `Community-reported admission outcomes based on ${stats.total_decisions.toLocaleString()} data points. See GMAT distributions, round breakdowns, and acceptance rates.`
                : `Explore community-reported admission outcomes for ${schoolName}. Be the first to contribute your decision data.`}
            </p>
          </div>
        </section>

        {/* ── Content ──────────────────────────────────────────────────── */}
        <div className="max-w-5xl mx-auto px-6 py-10">
          {stats ? (
            <div className="space-y-8">
              {/* ── Overview stat cards ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  label="Accept Rate"
                  value={`${stats.acceptance_rate}%`}
                />
                <StatCard
                  label="Avg GMAT"
                  value={stats.avg_gmat_accepted?.toString() ?? "N/A"}
                />
                <StatCard
                  label="Avg GPA"
                  value={stats.avg_gpa_accepted?.toFixed(2) ?? "N/A"}
                />
                <StatCard
                  label="Avg Work Yrs"
                  value={stats.avg_work_years?.toFixed(1) ?? "N/A"}
                />
              </div>

              {/* ── Charts grid ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Outcome Distribution */}
                <div className="bg-card border border-border/50 rounded-lg p-6 shadow-card">
                  <h2 className="text-sm font-semibold text-foreground mb-4">
                    Outcome Distribution
                  </h2>
                  <DonutChart data={stats.result_distribution} />
                </div>

                {/* Round Breakdown */}
                <div className="bg-card border border-border/50 rounded-lg p-6 shadow-card">
                  <h2 className="text-sm font-semibold text-foreground mb-4">
                    Round Breakdown
                  </h2>
                  <RoundBreakdown rounds={stats.round_breakdown} />
                </div>
              </div>

              {/* GMAT Distribution (full width) */}
              <div className="bg-card border border-border/50 rounded-lg p-6 shadow-card">
                <h2 className="text-sm font-semibold text-foreground mb-4">
                  GMAT Score Distribution
                </h2>
                <GmatBarChart buckets={stats.gmat_distribution} />
              </div>

              {/* ── Key takeaways ── */}
              <div className="bg-accent border border-primary/10 rounded-lg p-6">
                <h2 className="text-sm font-semibold text-foreground mb-3">
                  Key Takeaways
                </h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {stats.avg_gmat_accepted != null && (
                    <li>
                      The average GMAT for accepted applicants at {schoolName}{" "}
                      is{" "}
                      <span className="font-medium text-foreground">
                        {stats.avg_gmat_accepted}
                      </span>
                      .
                    </li>
                  )}
                  {stats.acceptance_rate != null && (
                    <li>
                      Community-reported acceptance rate is{" "}
                      <span className="font-medium text-foreground">
                        {stats.acceptance_rate}%
                      </span>{" "}
                      across {stats.total_decisions.toLocaleString()} decisions.
                    </li>
                  )}
                  {stats.round_breakdown.length > 0 && (
                    <li>
                      Data spans{" "}
                      <span className="font-medium text-foreground">
                        {stats.round_breakdown.length} rounds
                      </span>
                      , with varying acceptance rates per round.
                    </li>
                  )}
                  {stats.avg_work_years != null && (
                    <li>
                      Accepted applicants average{" "}
                      <span className="font-medium text-foreground">
                        {stats.avg_work_years.toFixed(1)} years
                      </span>{" "}
                      of work experience.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          ) : (
            /* ── Empty state ── */
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-muted-foreground/40"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                No Decision Data Yet
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                We don&apos;t have enough community-reported decisions for{" "}
                {schoolName} yet. Be the first to contribute and help future
                applicants.
              </p>
            </div>
          )}

          {/* ── Contribute CTA ── */}
          <div className="bg-card border border-border/50 rounded-lg p-8 shadow-card text-center mt-8">
            <h2 className="text-base font-semibold text-foreground mb-2">
              Contribute Your Decision
            </h2>
            <p className="text-sm text-muted-foreground mb-5 max-w-lg mx-auto">
              Share your {schoolName} admission decision anonymously. Your data
              helps thousands of future applicants make more informed choices.
            </p>
            <Link
              href="/decisions"
              className="btn-primary inline-flex text-sm rounded-lg"
            >
              Share Your Decision
              <svg
                className="w-4 h-4 ml-1.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
          </div>

          {/* ── Browse other schools ── */}
          <div className="mt-10">
            <h2 className="text-sm font-semibold text-foreground mb-4">
              Browse Other Schools
            </h2>
            <div className="flex flex-wrap gap-2">
              {SCHOOLS.filter((s) => s.slug !== schoolSlug)
                .slice(0, 18)
                .map((school) => (
                  <Link
                    key={school.slug}
                    href={`/decision-tracker/${school.slug}`}
                    className="text-xs px-3 py-1.5 rounded-full border border-border/50 bg-card text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                  >
                    {school.name}
                  </Link>
                ))}
              <Link
                href="/decision-tracker"
                className="text-xs px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
              >
                View All Schools
              </Link>
            </div>
          </div>

          {/* ── Email capture & cross-links ── */}
          <div className="mt-10">
            <EmailCapture
              variant="contextual"
              source={`decision-tracker-${schoolSlug}`}
            />
          </div>
          <div className="mt-8">
            <ToolCrossLinks current="/decision-tracker" />
          </div>
        </div>
      </main>
    </>
  );
}
