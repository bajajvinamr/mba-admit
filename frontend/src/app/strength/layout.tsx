import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Application Strength Meter - MBA Profile Assessment",
  description:
    "Assess your MBA application strength across academics, professional experience, leadership, extracurriculars, and diversity. Get a score and actionable tips.",
  openGraph: {
    title: "Application Strength Meter | Admit Compass",
    description: "Score your MBA application across 5 key dimensions and get personalized improvement tips.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function StrengthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
