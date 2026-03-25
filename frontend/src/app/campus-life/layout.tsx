import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Campus Life Comparison - Housing, Climate & Social Scores",
  description:
    "Compare campus life across top MBA programs. Explore housing costs, walkability, nightlife, climate, student clubs, and sports facilities for M7 and T15 schools.",
  openGraph: {
    title: "MBA Campus Life Comparison | Admit Compass",
    description: "Side-by-side campus life comparison for top MBA programs worldwide.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function CampusLifeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
