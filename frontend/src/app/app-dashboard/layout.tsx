import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Application Dashboard - Track Every School",
  description:
    "Track your MBA applications from research to decision. Kanban-style status board with deadlines, rounds, and progress tracking.",
  openGraph: {
    title: "Application Dashboard | Admit Compass",
    description: "Track every MBA application from research to decision.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function AppDashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
