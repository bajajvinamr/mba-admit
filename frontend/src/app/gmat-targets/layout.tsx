import { Metadata } from "next";

export const metadata: Metadata = {
  title: "GMAT Score Targets by School Tier - M7, T15, T25",
  description:
    "See the GMAT score you need for M7, T15, and T25 MBA programs. Enter your score to see where you stand relative to each school's average.",
  openGraph: {
    title: "GMAT Score Targets by Tier | Admit Compass",
    description: "GMAT averages for M7, T15, and T25 MBA programs - see where you stand.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function GmatTargetsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
