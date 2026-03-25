"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  DollarSign,
  GraduationCap,
  Briefcase,
  Shield,
  Globe,
  FileText,
  ArrowRight,
  Loader2,
  MapPin,
  Award,
  Clock,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { ToolCrossLinks } from "@/components/ToolCrossLinks";

// ── Types ──────────────────────────────────────────────────────────────────

type CountryProfile = {
  slug: string;
  country_name: string;
  flag: string;
  avg_tuition_usd: number;
  avg_living_cost_usd: number;
  program_length_years: number;
  post_study_work_visa: { name: string; duration: string; restrictions: string };
  avg_post_mba_salary_usd: number;
  top_schools: { slug: string; name: string }[];
  language_requirement: string;
  safety_index: number;
  cost_of_living_index: number;
  scholarship_availability: string;
  path_to_pr: string;
  test_policy: string;
};

function fmtUSD(n: number): string {
  return `$${n.toLocaleString()}`;
}

// ── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <Icon className="size-5 text-muted-foreground mb-2" />
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

// ── Section ────────────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground mb-3">
        <Icon className="size-5 text-[#b8860b]" />
        {title}
      </h2>
      {children}
    </div>
  );
}

// ── Client Component ───────────────────────────────────────────────────────

export function CountryProfileClient({ slug }: { slug: string }) {
  const [data, setData] = useState<CountryProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<CountryProfile>(`/api/countries/${slug}`)
      .then(setData)
      .catch(() => setError("Failed to load country profile."))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-muted-foreground">{error ?? "Country not found."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/compare-countries"
            className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block"
          >
            ← Compare Countries
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-5xl">{data.flag}</span>
            <div>
              <h1 className="text-3xl font-semibold text-foreground tracking-tight">
                MBA in {data.country_name}
              </h1>
              <p className="text-muted-foreground mt-1">
                Complete guide to costs, visas, schools, and career outcomes
              </p>
            </div>
          </div>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard icon={DollarSign} label="Avg Tuition" value={fmtUSD(data.avg_tuition_usd)} />
          <StatCard icon={Briefcase} label="Avg Post-MBA Salary" value={fmtUSD(data.avg_post_mba_salary_usd)} />
          <StatCard icon={Clock} label="Program Length" value={`${data.program_length_years} years`} />
          <StatCard icon={Shield} label="Safety Index" value={`${data.safety_index}/100`} />
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {/* Visa Guide */}
          <Section icon={Globe} title="Post-Study Work Visa">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">{data.post_study_work_visa.name}</span>
                {" "}&mdash; {data.post_study_work_visa.duration}
              </p>
              <p>{data.post_study_work_visa.restrictions}</p>
            </div>
          </Section>

          {/* Cost Breakdown */}
          <Section icon={DollarSign} title="Cost Breakdown">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Average Tuition (total)</p>
                <p className="font-semibold text-foreground text-lg">{fmtUSD(data.avg_tuition_usd)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Annual Living Cost</p>
                <p className="font-semibold text-foreground text-lg">{fmtUSD(data.avg_living_cost_usd)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Cost of Living Index</p>
                <p className="font-semibold text-foreground text-lg">{data.cost_of_living_index}/100</p>
              </div>
              <div>
                <p className="text-muted-foreground">Scholarship Availability</p>
                <p className="font-medium text-foreground text-sm leading-relaxed">{data.scholarship_availability}</p>
              </div>
            </div>
          </Section>

          {/* Top Schools */}
          <Section icon={GraduationCap} title="Top Schools">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.top_schools.map((school) => (
                <Link
                  key={school.slug}
                  href={`/school/${school.slug}`}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <span className="text-sm font-medium text-foreground">{school.name}</span>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </Section>

          {/* Path to PR */}
          <Section icon={MapPin} title="Path to Permanent Residency">
            <p className="text-sm text-muted-foreground leading-relaxed">{data.path_to_pr}</p>
          </Section>

          {/* Language & Tests */}
          <Section icon={FileText} title="Language & Test Requirements">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><span className="font-medium text-foreground">Language:</span> {data.language_requirement}</p>
              <p><span className="font-medium text-foreground">Tests:</span> {data.test_policy}</p>
            </div>
          </Section>
        </div>

        {/* Compare CTA */}
        <div className="mt-8 rounded-xl border-2 border-[#b8860b]/30 bg-primary/5 p-6 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Compare with other countries</h3>
            <p className="text-sm text-muted-foreground mt-1">
              See how {data.country_name} stacks up against other MBA destinations
            </p>
          </div>
          <Link
            href="/compare-countries"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            Compare <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-12">
          <ToolCrossLinks current={`/mba-in/${slug}`} />
        </div>
      </div>
    </div>
  );
}
