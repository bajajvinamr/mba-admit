import { Metadata } from "next";

export const metadata: Metadata = {
  title: "School Visit Planner - Organize MBA Campus Visits",
  description:
    "Plan and track campus tours, info sessions, and networking events for your MBA target schools.",
  openGraph: {
    title: "School Visit Planner | Admit Compass",
    description: "Organize campus visits and school events for your MBA applications.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function VisitPlannerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
