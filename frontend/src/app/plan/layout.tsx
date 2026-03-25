import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Application Timeline Planner - R1, R2, R3 Month-by-Month",
  description:
    "Plan your MBA application timeline by round. Month-by-month roadmap covering testing, essays, recommendations, and interviews.",
  openGraph: {
    title: "MBA Application Timeline | Admit Compass",
    description: "Month-by-month application timeline for R1, R2, and R3 MBA rounds.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
