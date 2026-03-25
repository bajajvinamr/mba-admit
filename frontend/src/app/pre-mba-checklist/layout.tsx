import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pre-MBA Checklist - Everything Before Day One",
  description:
    "Complete checklist from admission to orientation: housing, loans, visa, courses, networking, wardrobe, and first-week essentials.",
  openGraph: {
    title: "Pre-MBA Checklist | Admit Compass",
    description: "Everything to do between getting admitted and day one.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function PreMbaChecklistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
