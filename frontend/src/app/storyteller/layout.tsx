import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Story Builder - MBA Personal Narrative Architect",
  description:
    "Build a cohesive personal narrative for your MBA application. AI-powered story mapping that connects your experiences into a compelling admissions arc.",
  alternates: { canonical: "/storyteller" },
  openGraph: {
    title: "MBA Story Builder | Admit Compass",
    description:
      "Transform your experiences into a compelling MBA admissions narrative. AI-powered personal story architecture.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function StorytellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
