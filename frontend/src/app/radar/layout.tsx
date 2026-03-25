import { Metadata } from "next";

export const metadata: Metadata = {
  title: "School Radar Comparison - Visualise MBA Programs Side-by-Side",
  description:
    "Compare MBA programs on a radar chart: GMAT, selectivity, salary, class size, international diversity, and employment rates.",
  openGraph: {
    title: "School Radar Comparison | Admit Compass",
    description: "Radar chart comparison of top MBA programs across 6 key dimensions.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function RadarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
