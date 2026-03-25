import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare MBA Programs Side by Side",
  description:
    "Compare up to 4 MBA programs simultaneously. GMAT scores, GPA distributions, acceptance rates, class profiles, placement stats, and personalized fit analysis.",
  alternates: {
    canonical: "/compare",
  },
  openGraph: {
    title: "Compare MBA Programs | Admit Compass",
    description:
      "Side-by-side comparison of MBA programs with GMAT distributions and personalized fit scores.",
    type: "website",
    siteName: "Admit Compass",
    url: "/compare",
  },
};

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
