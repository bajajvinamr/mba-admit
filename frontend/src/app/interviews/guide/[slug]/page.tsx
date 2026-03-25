import { Metadata } from "next";
import { API_BASE } from "@/lib/api";
import InterviewGuideClient from "./InterviewGuideClient";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const label = slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title: `${label} Interview Guide | MBA Interview Prep | AdmitCompass`,
    description: `Complete interview intelligence for ${label}: format, style, sample questions, red flags, and expert tips. Prepare for your MBA interview with confidence.`,
    openGraph: {
      title: `${label} Interview Guide`,
      description: `Pre-game briefing for your ${label} MBA interview. Format, common questions, red flags, and tips.`,
    },
  };
}

export default async function InterviewGuidePage({ params }: Props) {
  const { slug } = await params;

  let guide: Record<string, unknown> | null = null;
  let error: string | null = null;

  try {
    const res = await fetch(`${API_BASE}/api/interviews/guide/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      guide = await res.json();
    } else {
      error = `Interview guide not found for "${slug}".`;
    }
  } catch {
    error = "Unable to load interview guide. Please try again later.";
  }

  return <InterviewGuideClient slug={slug} guide={guide} error={error} />;
}
