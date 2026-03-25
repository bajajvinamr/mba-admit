import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Peer Comparison - See Where You Stand Among MBA Applicants",
  description:
    "Compare your GMAT, GPA, and work experience against real MBA program averages. Instant percentile rankings and personalized advice.",
  openGraph: {
    title: "Peer Comparison | Admit Compass",
    description: "See where your profile ranks among MBA applicants with percentile breakdowns.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function PeerCompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
