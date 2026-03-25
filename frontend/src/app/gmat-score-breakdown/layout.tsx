import { Metadata } from "next";
export const metadata: Metadata = {
  title: "GMAT Score Breakdown - Understand Your Section Scores",
  description: "Analyze your GMAT score by section: Verbal, Quantitative, Integrated Reasoning, and AWA. See percentiles and school-specific targets.",
  openGraph: { title: "GMAT Score Breakdown | Admit Compass", description: "Understand your GMAT section scores and percentiles.", type: "website", siteName: "Admit Compass" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
