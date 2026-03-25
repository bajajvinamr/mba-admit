import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Application Tracker - MBA School Pipeline Management",
  description:
    "Track your MBA applications across schools with a Kanban board. Monitor deadlines, essay progress, and application status in one place.",
  openGraph: {
    title: "MBA Application Tracker | Admit Compass",
    description:
      "Kanban-style MBA application tracker. Manage deadlines, essays, and status across all your target schools.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function MySchoolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
