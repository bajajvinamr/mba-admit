"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Globe,
  DollarSign,
  Briefcase,
  GraduationCap,
  ArrowRight,
  Check,
  X as XIcon,
  Loader2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { ToolCrossLinks } from "@/components/ToolCrossLinks";

// ── Types ──────────────────────────────────────────────────────────────────

type CountrySummary = {
  slug: string;
  country_name: string;
  flag: string;
  avg_tuition_usd: number;
  avg_post_mba_salary_usd: number;
  program_length_years: number;
  post_study_work_visa: { name: string; duration: string; restrictions: string };
  cost_of_living_index: number;
  top_schools_count: number;
};

type CountryFull = CountrySummary & {
  avg_living_cost_usd: number;
  top_schools: { slug: string; name: string }[];
  language_requirement: string;
  safety_index: number;
  scholarship_availability: string;
  path_to_pr: string;
  test_policy: string;
};

type CompareResponse = {
  countries: CountryFull[];
  comparison: Record<string, Record<string, unknown>>;
  dimensions: string[];
};

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtUSD(n: number): string {
  return `$${n.toLocaleString()}`;
}

const DIMENSION_LABELS: Record<string, string> = {
  avg_tuition_usd: "Average Tuition (USD)",
  avg_living_cost_usd: "Annual Living Cost (USD)",
  program_length_years: "Program Length (years)",
  avg_post_mba_salary_usd: "Avg Post-MBA Salary (USD)",
  cost_of_living_index: "Cost of Living Index",
  safety_index: "Safety Index",
  scholarship_availability: "Scholarship Availability",
  language_requirement: "Language Requirement",
  path_to_pr: "Path to PR / Long-Term Stay",
  test_policy: "Test Requirements",
};

function formatDimensionValue(dim: string, val: unknown): string {
  if (val == null) return "--";
  if (typeof val === "number") {
    if (dim.includes("usd") || dim.includes("salary") || dim.includes("tuition") || dim.includes("living_cost")) {
      return fmtUSD(val);
    }
    return val.toString();
  }
  return String(val);
}

// ── Country Card ───────────────────────────────────────────────────────────

function CountryCard({
  country,
  selected,
  onToggle,
}: {
  country: CountrySummary;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`relative text-left rounded-xl border p-5 transition-all ${
        selected
          ? "border-[#b8860b] bg-primary/5 ring-1 ring-[#b8860b]/30"
          : "border-border bg-card hover:border-foreground/20"
      }`}
    >
      {selected && (
        <div className="absolute top-3 right-3 rounded-full bg-primary p-0.5">
          <Check className="size-3 text-white" />
        </div>
      )}
      <div className="text-3xl mb-3">{country.flag}</div>
      <h3 className="font-semibold text-foreground text-sm">{country.country_name}</h3>
      <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <DollarSign className="size-3" />
          <span>Tuition: {fmtUSD(country.avg_tuition_usd)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Briefcase className="size-3" />
          <span>Salary: {fmtUSD(country.avg_post_mba_salary_usd)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <GraduationCap className="size-3" />
          <span>Visa: {country.post_study_work_visa?.duration ?? "N/A"}</span>
        </div>
      </div>
      <Link
        href={`/mba-in/${country.slug}`}
        onClick={(e) => e.stopPropagation()}
        className="mt-3 inline-flex items-center gap-1 text-xs text-[#b8860b] font-medium hover:underline"
      >
        Full profile <ArrowRight className="size-3" />
      </Link>
    </button>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function CompareCountriesPage() {
  const [countries, setCountries] = useState<CountrySummary[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [comparison, setComparison] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ countries: CountrySummary[] }>("/api/countries")
      .then((r) => setCountries(r.countries))
      .catch(() => setError("Failed to load countries."))
      .finally(() => setLoading(false));
  }, []);

  function toggleCountry(slug: string) {
    setSelected((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      if (prev.length >= 4) return prev;
      return [...prev, slug];
    });
    setComparison(null);
  }

  async function handleCompare() {
    if (selected.length < 2) return;
    setComparing(true);
    setError(null);
    try {
      const data = await apiFetch<CompareResponse>(
        `/api/countries/compare?countries=${selected.join(",")}`
      );
      setComparison(data);
    } catch {
      setError("Comparison failed. Please try again.");
    } finally {
      setComparing(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">
            Compare MBA Destinations
          </h1>
          <p className="mt-2 text-muted-foreground">
            Compare tuition, salary outcomes, visa policies, and quality of life across top MBA destinations worldwide.
          </p>
        </div>

        {/* Country Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-8">
              {countries.map((c) => (
                <CountryCard
                  key={c.slug}
                  country={c}
                  selected={selected.includes(c.slug)}
                  onToggle={() => toggleCountry(c.slug)}
                />
              ))}
            </div>

            {/* Compare Action */}
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={handleCompare}
                disabled={selected.length < 2 || comparing}
                className="inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
              >
                {comparing ? <Loader2 className="size-4 animate-spin" /> : <Globe className="size-4" />}
                Compare {selected.length} {selected.length === 1 ? "Country" : "Countries"}
              </button>
              {selected.length > 0 && (
                <button
                  onClick={() => {
                    setSelected([]);
                    setComparison(null);
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Clear selection
                </button>
              )}
              {selected.length < 2 && selected.length > 0 && (
                <span className="text-xs text-muted-foreground">Select at least 2 countries</span>
              )}
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-600 mb-6">{error}</p>}

        {/* Comparison Table */}
        {comparison && (
          <div className="rounded-xl border border-border bg-card overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground sticky left-0 bg-muted/30 min-w-[180px]">
                      Dimension
                    </th>
                    {comparison.countries.map((c) => (
                      <th key={c.slug} className="text-center px-4 py-3 font-medium text-foreground min-w-[160px]">
                        <span className="text-lg mr-1">{c.flag}</span> {c.country_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {comparison.dimensions.map((dim) => (
                    <tr key={dim} className="hover:bg-muted/10">
                      <td className="px-4 py-3 font-medium text-foreground sticky left-0 bg-card">
                        {DIMENSION_LABELS[dim] ?? dim}
                      </td>
                      {comparison.countries.map((c) => (
                        <td key={c.slug} className="px-4 py-3 text-center text-muted-foreground">
                          {formatDimensionValue(dim, comparison.comparison[dim]?.[c.slug])}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {/* Visa row (nested object) */}
                  <tr className="hover:bg-muted/10">
                    <td className="px-4 py-3 font-medium text-foreground sticky left-0 bg-card">
                      Post-Study Work Visa
                    </td>
                    {comparison.countries.map((c) => (
                      <td key={c.slug} className="px-4 py-3 text-center text-muted-foreground text-xs leading-relaxed">
                        <span className="font-medium text-foreground block">{c.post_study_work_visa?.name}</span>
                        <span className="block">{c.post_study_work_visa?.duration}</span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-12">
          <ToolCrossLinks current="/compare-countries" />
        </div>
      </div>
    </div>
  );
}
