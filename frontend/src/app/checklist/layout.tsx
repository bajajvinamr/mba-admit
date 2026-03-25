import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Application Checklist - Track Every Requirement",
  description:
    "Never miss a requirement. Interactive application checklist for every MBA program - track essays, documents, deadlines, and recommendations in one place.",
  openGraph: {
    title: "MBA Application Checklist | Admit Compass",
    description: "Interactive checklist to track every MBA application requirement.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function ChecklistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
