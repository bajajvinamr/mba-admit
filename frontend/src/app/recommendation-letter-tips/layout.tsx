import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recommendation Letter Tips - How to Get Stellar MBA Recommendations",
  description:
    "Complete guide to MBA recommendation letters: whom to ask, what to share, timeline, dos and don'ts, and templates for recommender briefing docs.",
  openGraph: {
    title: "Recommendation Letter Tips | Admit Compass",
    description: "Get the strongest possible MBA recommendation letters.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function RecommendationLetterTipsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
