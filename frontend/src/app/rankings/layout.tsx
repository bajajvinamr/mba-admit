import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA School Rankings 2025 - Sort by GMAT, Salary, Selectivity",
  description:
    "Compare 250+ MBA programs ranked by GMAT average, acceptance rate, post-MBA salary, and tuition. Filter by M7, T15, T25 tiers and country.",
  openGraph: {
    title: "MBA School Rankings 2025 | Admit Compass",
    description: "Sort and filter 250+ MBA programs by GMAT, selectivity, salary, tuition, and tier.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function RankingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
