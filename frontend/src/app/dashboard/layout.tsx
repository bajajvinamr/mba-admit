import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard - Your MBA Admissions Overview",
  description:
    "Your personalized MBA admissions dashboard. Track application progress, school fit scores, and upcoming deadlines at a glance.",
  alternates: { canonical: "/dashboard" },
  openGraph: {
    title: "MBA Dashboard | Admit Compass",
    description:
      "Personalized MBA admissions dashboard with school fit scores, deadline tracking, and application progress.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
