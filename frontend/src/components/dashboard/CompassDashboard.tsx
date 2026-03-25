"use client";

import Link from "next/link";
import {
  Globe,
  ArrowRight,
  MapPin,
  TrendingUp,
  DollarSign,
  Briefcase,
  GraduationCap,
  Clock,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

type CountryCard = {
  slug: string;
  name: string;
  flag: string;
  tuition: string;
  salary: string;
  visa: string;
};

type CompassDashboardProps = {
  targetCountries?: string[];
  className?: string;
};

// ── Popular Paths Data ─────────────────────────────────────────────────────

const POPULAR_PATHS: CountryCard[] = [
  {
    slug: "us",
    name: "United States",
    flag: "\u{1F1FA}\u{1F1F8}",
    tuition: "$155K",
    salary: "$165K",
    visa: "OPT 3yr (STEM)",
  },
  {
    slug: "uk",
    name: "United Kingdom",
    flag: "\u{1F1EC}\u{1F1E7}",
    tuition: "$95K",
    salary: "$130K",
    visa: "Graduate 2yr",
  },
  {
    slug: "canada",
    name: "Canada",
    flag: "\u{1F1E8}\u{1F1E6}",
    tuition: "$75K",
    salary: "$105K",
    visa: "PGWP 3yr",
  },
  {
    slug: "singapore",
    name: "Singapore",
    flag: "\u{1F1F8}\u{1F1EC}",
    tuition: "$90K",
    salary: "$120K",
    visa: "EP (merit)",
  },
  {
    slug: "france",
    name: "France",
    flag: "\u{1F1EB}\u{1F1F7}",
    tuition: "$85K",
    salary: "$110K",
    visa: "APS 1yr",
  },
  {
    slug: "germany",
    name: "Germany",
    flag: "\u{1F1E9}\u{1F1EA}",
    tuition: "$45K",
    salary: "$100K",
    visa: "Job Seeker 18mo",
  },
];

// ── Country Target Card ────────────────────────────────────────────────────

function TargetCountryCard({ country }: { country: CountryCard }) {
  return (
    <Link
      href={`/mba-in/${country.slug}`}
      className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-foreground/20 hover:shadow-sm"
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{country.flag}</span>
        <h3 className="font-semibold text-foreground text-sm">{country.name}</h3>
      </div>
      <div className="space-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <DollarSign className="size-3" />
          <span>Tuition: {country.tuition}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Briefcase className="size-3" />
          <span>Salary: {country.salary}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="size-3" />
          <span>Visa: {country.visa}</span>
        </div>
      </div>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#b8860b] group-hover:underline">
        View guide <ArrowRight className="size-3" />
      </span>
    </Link>
  );
}

// ── Recommendation Card ────────────────────────────────────────────────────

function RegionRecommendation({
  region,
  countries,
  highlight,
}: {
  region: string;
  countries: string[];
  highlight: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{region}</p>
      <p className="text-sm font-semibold text-foreground">{countries.join(", ")}</p>
      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{highlight}</p>
    </div>
  );
}

// ── CompassDashboard ───────────────────────────────────────────────────────

export function CompassDashboard({ targetCountries = [], className = "" }: CompassDashboardProps) {
  // Filter to show user's target countries first, fall back to popular paths
  const userTargets = targetCountries.length > 0
    ? POPULAR_PATHS.filter((p) => targetCountries.includes(p.slug))
    : [];
  const showTargets = userTargets.length > 0;

  return (
    <div className={`space-y-8 ${className}`}>
      {/* User's Target Countries (if set) */}
      {showTargets && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Your Target Countries</h3>
            <Link
              href="/compare-countries"
              className="inline-flex items-center gap-2 rounded-lg bg-[#b8860b] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#a07608]"
            >
              <Globe className="size-3.5" />
              Quick Compare
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {userTargets.map((c) => (
              <TargetCountryCard key={c.slug} country={c} />
            ))}
          </div>
        </div>
      )}

      {/* Popular Paths */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            {showTargets ? "Other Popular Destinations" : "Popular MBA Destinations"}
          </h3>
          <Link
            href="/compare-countries"
            className="text-sm text-[#b8860b] font-medium hover:underline inline-flex items-center gap-1"
          >
            Compare all <ArrowRight className="size-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {POPULAR_PATHS.filter((p) => !targetCountries.includes(p.slug))
            .slice(0, showTargets ? 3 : 6)
            .map((c) => (
              <TargetCountryCard key={c.slug} country={c} />
            ))}
        </div>
      </div>

      {/* School Recommendations by Region */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">School Recommendations by Region</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <RegionRecommendation
            region="North America"
            countries={["US", "Canada"]}
            highlight="Strongest recruiting pipelines for consulting and tech. US offers highest salaries; Canada has the best immigration pathway."
          />
          <RegionRecommendation
            region="Europe"
            countries={["UK", "France", "Spain", "Germany"]}
            highlight="1-year programs reduce opportunity cost. Strong for international careers. INSEAD and LBS are top global brands."
          />
          <RegionRecommendation
            region="Asia-Pacific"
            countries={["Singapore", "India", "China", "Australia"]}
            highlight="Fastest-growing MBA market. Singapore and India offer best value. Strong for Asia-focused careers."
          />
        </div>
      </div>

      {/* Compare CTA */}
      <div className="rounded-xl border-2 border-[#b8860b]/30 bg-[#b8860b]/5 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-foreground">Not sure where to study?</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Compare tuition, visa, salary, and lifestyle across any 2-4 countries side by side.
          </p>
        </div>
        <Link
          href="/compare-countries"
          className="inline-flex items-center gap-2 rounded-lg bg-[#b8860b] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#a07608] transition-colors shrink-0"
        >
          <Globe className="size-4" />
          Compare Countries
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
