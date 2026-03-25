import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Study Group Builder - Map Strengths & Build Your Team",
  description:
    "Build a balanced MBA study group by mapping each member's strengths and weaknesses. See skill coverage, identify gaps, and get recruitment suggestions.",
  openGraph: {
    title: "Study Group Builder | Admit Compass",
    description: "Build a balanced MBA study group by mapping strengths.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function StudyGroupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
