import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Admission Decisions & Statistics | Admit Compass",
  description:
    "Explore 12,000+ real MBA admission decisions from GMAT Club. Filter by school, round, GMAT score, and outcome. See acceptance rates and applicant profiles.",
  alternates: { canonical: "/decisions" },
  openGraph: {
    title: "MBA Admission Decisions Tracker | Admit Compass",
    description:
      "12,000+ real MBA admission decisions. Filter by school, GMAT, round, and outcome.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function DecisionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
