import { Metadata } from "next";

type Props = {
  searchParams: Promise<{ d?: string }>;
};

function decodeShareData(encoded: string): { g: number; p: number; y?: number } | null {
  try {
    return JSON.parse(Buffer.from(encoded, "base64").toString());
  } catch {
    return null;
  }
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const encoded = params?.d;

  if (encoded) {
    const data = decodeShareData(encoded);
    if (data) {
      const gmat = data.g;
      const gpa = data.p;
      const title = `MBA Profile Report: GMAT ${gmat}, GPA ${gpa} | Admit Compass`;
      const description = `See how a GMAT ${gmat} / GPA ${gpa} profile scores across 6 MBA admissions dimensions. Generate your own free report.`;
      return {
        title,
        description,
        openGraph: {
          title,
          description,
          type: "website",
          siteName: "Admit Compass",
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
        },
      };
    }
  }

  return {
    title: "MBA Profile Strength Report - Free Analysis | Admit Compass",
    description:
      "Get a free AI-powered analysis of your MBA profile across 6 dimensions: academics, work experience, leadership, diversity, extracurriculars, and pedigree. See school-specific fit scores.",
    openGraph: {
      title: "MBA Profile Strength Report | Admit Compass",
      description:
        "Free AI profile analysis across 6 dimensions. See how you stack up against MBA applicants.",
      type: "website",
      siteName: "Admit Compass",
    },
  };
}

export default function ProfileReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
