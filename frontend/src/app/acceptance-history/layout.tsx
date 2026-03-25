import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Acceptance Rate History - 5-Year Trends (2022–2026)",
  description:
    "Compare acceptance rates, application volumes, and class sizes across 12 top MBA programs over 5 years. Visualize which schools are getting more competitive.",
  openGraph: {
    title: "MBA Acceptance Rate History | Admit Compass",
    description: "5-year acceptance rate history for 12 top MBA programs with trend analysis and visual comparisons.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function AcceptanceHistoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
