import type { Metadata } from "next";

const SITE_NAME = "AdmitIQ";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://admitiq.com";

/** Base metadata shared by all pages */
export const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} - AI-Powered MBA Admissions Platform`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Research 1,800+ MBA programs, practice interviews with AI, draft essays, and make data-driven admissions decisions.",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

interface SchoolSEO {
  name: string;
  slug: string;
  gmatMedian?: number | null;
  acceptanceRate?: number | null;
  location?: string | null;
  country?: string | null;
}

/** Generate metadata for a school detail page */
export function schoolMetadata(school: SchoolSEO): Metadata {
  const stats: string[] = [];
  if (school.gmatMedian) stats.push(`${school.gmatMedian} median GMAT`);
  if (school.acceptanceRate) stats.push(`${school.acceptanceRate}% acceptance rate`);

  const description = stats.length
    ? `${school.name} MBA: ${stats.join(", ")}. View essays, deadlines, class profile, and real applicant data.`
    : `${school.name} MBA program. View essays, deadlines, class profile, and real applicant data on AdmitIQ.`;

  return {
    title: `${school.name} MBA Program - Essays, Deadlines, Stats`,
    description,
    openGraph: {
      title: `${school.name} MBA - Complete Admissions Guide`,
      description: `Everything you need to apply to ${school.name} MBA.`,
      images: [
        {
          url: `/api/og/school/${school.slug}`,
          width: 1200,
          height: 630,
          alt: `${school.name} MBA Program`,
        },
      ],
    },
    alternates: {
      canonical: `${SITE_URL}/schools/${school.slug}`,
    },
  };
}

/** Generate metadata for a tool page */
export function toolMetadata(
  title: string,
  description: string,
  slug: string
): Metadata {
  return {
    title,
    description,
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
    },
    alternates: {
      canonical: `${SITE_URL}/${slug}`,
    },
  };
}
