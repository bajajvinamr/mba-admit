import { Metadata } from "next";

export const metadata: Metadata = {
  title: "GMAT to GRE Score Converter - Official Concordance Table",
  description:
    "Convert GMAT to GRE scores and vice versa using the official ETS/GMAC concordance table. See your equivalent score and percentile instantly.",
  openGraph: {
    title: "GMAT ↔ GRE Score Converter | Admit Compass",
    description: "Official GMAT-GRE score conversion with percentile estimates.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function ScoreConvertLayout({ children }: { children: React.ReactNode }) {
  return children;
}
