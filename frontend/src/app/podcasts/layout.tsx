import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Podcasts - Best Shows for Admissions & Career Prep",
  description:
    "Curated list of the best MBA admissions podcasts: interview tips, school profiles, career strategy, and applicant stories.",
  openGraph: {
    title: "MBA Podcasts | Admit Compass",
    description: "Best podcasts for MBA applicants - admissions tips, school profiles, and career strategy.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function PodcastsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
