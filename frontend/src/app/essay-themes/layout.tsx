import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Essay Theme Analyzer - Identify Strengths & Gaps",
  description:
    "Analyze themes across your MBA application essays. Identify dominant narratives, thematic gaps, and get tips to build a balanced, compelling story.",
  openGraph: {
    title: "MBA Essay Theme Analyzer | Admit Compass",
    description: "Keyword-based theme analysis for MBA essays - find strengths, gaps, and balance your narrative.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function EssayThemesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
