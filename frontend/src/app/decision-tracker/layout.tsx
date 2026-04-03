import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Decision Tracker - Community MBA Admission Data",
  description:
    "Explore real MBA admission decisions from the community. See acceptance rates, GMAT distributions, round breakdowns, and trends for top business schools.",
  openGraph: {
    title: "MBA Decision Tracker - Real Admission Outcomes",
    description:
      "Browse thousands of anonymous MBA admission decisions. Compare acceptance rates, GMAT scores, and round breakdowns across top programs.",
  },
};

export default function DecisionTrackerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
