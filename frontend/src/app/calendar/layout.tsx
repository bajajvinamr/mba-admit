import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Application Deadline Calendar 2025–2026",
  description:
    "Every MBA application deadline and decision date in one calendar. Filter by school, track R1/R2/R3 rounds for HBS, Stanford, Wharton, and 200+ programs.",
  openGraph: {
    title: "MBA Deadline Calendar | Admit Compass",
    description: "All MBA application deadlines and decision dates - HBS, Stanford, Wharton, and 200+ schools.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
