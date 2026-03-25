import { Metadata } from "next";

export const metadata: Metadata = {
  title: "GMAT Study Planner - Personalized Week-by-Week Study Schedule",
  description:
    "Generate a personalized GMAT study plan based on your current score, target score, and available study time. Get a week-by-week breakdown with milestones and resource suggestions.",
  openGraph: {
    title: "GMAT Study Planner | Admit Compass",
    description: "Personalized week-by-week GMAT study schedule with milestones and phase breakdowns.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function GmatPlannerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
