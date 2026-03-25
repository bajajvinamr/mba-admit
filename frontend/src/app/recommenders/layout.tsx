import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recommender Strategy Engine - MBA Letter of Recommendation Prep",
  description:
    "Generate a personalized prep packet for your MBA recommenders. AI-powered strategy aligned to your target school's admissions criteria.",
  openGraph: {
    title: "MBA Recommender Strategy Engine | Admit Compass",
    description:
      "Stop leaving your recommenders guessing. Generate school-specific prep packets with key talking points and email drafts.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function RecommendersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
