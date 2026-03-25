import { Metadata } from "next";
import { API_BASE } from "@/lib/api";

type Props = {
  params: Promise<{ schoolId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { schoolId } = await params;
  try {
    const res = await fetch(`${API_BASE}/api/schools/${schoolId}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error("fetch failed");
    const school = await res.json();
    const name = school.name || schoolId.toUpperCase();
    const desc = [
      school.gmat_avg && `GMAT avg: ${school.gmat_avg}`,
      school.acceptance_rate && `Acceptance: ${school.acceptance_rate}%`,
      school.class_size && `Class: ${school.class_size}`,
      school.location,
    ]
      .filter(Boolean)
      .join(" · ");

    const degreeLabel = school.degree_type === "MiM" ? "MiM Program"
      : school.degree_type === "Executive MBA" ? "EMBA Program"
      : school.degree_type === "MBA (CAT)" ? "MBA Program (CAT)"
      : "MBA Program";
    return {
      title: `${name} ${degreeLabel} - Admissions, Essays & Stats`,
      description: `Complete guide to ${name} admissions. ${desc}. Essay prompts, deadlines, interview prep, and AI-powered application guidance.`,
      alternates: {
        canonical: `/school/${schoolId}`,
      },
      openGraph: {
        title: `${name} ${degreeLabel} | Admit Compass`,
        description: `Admissions data, essay prompts, and AI guidance for ${name}. ${desc}`,
        type: "website",
        siteName: "Admit Compass",
        url: `/school/${schoolId}`,
      },
      twitter: {
        card: "summary_large_image",
        title: `${name} ${degreeLabel} | Admit Compass`,
        description: `Admissions data, essay prompts, and AI guidance for ${name}.`,
      },
    };
  } catch {
    return {
      title: "MBA Program | Admit Compass",
      description:
        "Explore MBA programs with AI-powered admissions guidance, essay prompts, and interview prep.",
    };
  }
}

export default async function SchoolLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  let jsonLd = null;

  try {
    const res = await fetch(`${API_BASE}/api/schools/${schoolId}`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const school = await res.json();
      const name = school.name || schoolId.toUpperCase();
      const pageUrl = `https://admitcompass.ai/school/${schoolId}`;
      const org = {
        "@type": "EducationalOrganization",
        "@id": `${pageUrl}#org`,
        name,
        url: pageUrl,
        ...(school.location && {
          address: {
            "@type": "PostalAddress",
            addressLocality: school.location,
          },
        }),
      };

      const dtLabel = school.degree_type === "MiM" ? "Masters in Management"
        : school.degree_type === "Executive MBA" ? "Executive MBA"
        : school.degree_type === "MBA (CAT)" ? "MBA"
        : "MBA";
      const course: Record<string, unknown> = {
        "@type": "Course",
        name: `${name} ${dtLabel} Program`,
        description: `${dtLabel} at ${name}. ${
          school.program_details?.duration || ""
        }`.trim(),
        provider: { "@id": `${pageUrl}#org` },
        url: pageUrl,
        ...(school.program_details?.duration && {
          timeRequired: school.program_details.duration,
        }),
        ...(school.degree_type && {
          educationalCredentialAwarded: school.degree_type,
        }),
      };

      if (school.tuition_usd) {
        course.offers = {
          "@type": "Offer",
          price: school.tuition_usd,
          priceCurrency: "USD",
          category: "Tuition",
        };
      }

      if (school.program_length_months) {
        course.timeRequired = `P${school.program_length_months}M`;
      }

      if (school.application_fee_usd) {
        course.applicationFee = {
          "@type": "MonetaryAmount",
          value: school.application_fee_usd,
          currency: "USD",
        };
      }

      if (school.gmat_avg || school.acceptance_rate) {
        course.hasCourseInstance = {
          "@type": "CourseInstance",
          courseMode: "onsite",
          ...(school.class_size && {
            maximumAttendeeCapacity: school.class_size,
          }),
        };
      }

      const breadcrumb = {
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
            name: "Schools",
            item: "https://admitcompass.ai/schools",
          },
          {
            "@type": "ListItem",
            position: 3,
            name,
            item: pageUrl,
          },
        ],
      };

      jsonLd = {
        "@context": "https://schema.org",
        "@graph": [org, course, breadcrumb],
      };
    }
  } catch {
    // skip structured data if API unavailable
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
