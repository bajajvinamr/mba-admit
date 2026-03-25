import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Application Checklist Generator - MBA Application Tasks",
  description:
    "Generate a personalized MBA application checklist for any school and round. Track essays, recommendations, tests, and deadlines in one place.",
  openGraph: {
    title: "Application Checklist Generator | Admit Compass",
    description: "Build a prioritized checklist for your MBA applications with deadlines and progress tracking.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function AppChecklistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
