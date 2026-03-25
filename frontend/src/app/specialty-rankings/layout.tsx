import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Rankings by Specialty - Finance, Consulting, Tech & More",
  description:
    "Explore MBA program rankings by specialty: finance, consulting, technology, entrepreneurship, healthcare, marketing, operations, social impact, international business, and real estate.",
  openGraph: {
    title: "Specialty Rankings | Admit Compass",
    description: "Top MBA programs ranked by specialty area with scores, notable features, and key centers.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function SpecialtyRankingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
