import { Metadata } from "next";
import { notFound } from "next/navigation";
import { CountryProfileClient } from "./CountryProfileClient";

// ── Static country slugs for generateStaticParams ──────────────────────────

const COUNTRY_SLUGS = [
  "us", "uk", "canada", "france", "spain",
  "germany", "singapore", "india", "china", "australia",
];

const COUNTRY_NAMES: Record<string, string> = {
  us: "United States",
  uk: "United Kingdom",
  canada: "Canada",
  france: "France",
  spain: "Spain",
  germany: "Germany",
  singapore: "Singapore",
  india: "India",
  china: "China",
  australia: "Australia",
};

// ── SEO Metadata ───────────────────────────────────────────────────────────

type PageProps = {
  params: Promise<{ country: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country } = await params;
  const name = COUNTRY_NAMES[country] ?? country;
  return {
    title: `MBA in ${name} — Tuition, Visa, Schools & Cost Guide`,
    description: `Complete guide to pursuing an MBA in ${name}. Tuition costs, post-study work visa, top schools, salary outcomes, scholarship availability, and path to permanent residency.`,
    openGraph: {
      title: `MBA in ${name} | Admit Compass`,
      description: `Tuition, visa, salary, and top MBA schools in ${name}.`,
    },
  };
}

export function generateStaticParams() {
  return COUNTRY_SLUGS.map((country) => ({ country }));
}

// ── Page Component ─────────────────────────────────────────────────────────

export default async function MBAInCountryPage({ params }: PageProps) {
  const { country } = await params;
  if (!COUNTRY_SLUGS.includes(country)) {
    notFound();
  }
  return <CountryProfileClient slug={country} />;
}
