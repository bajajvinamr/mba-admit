import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Concentration Finder - Majors & Specializations",
  description:
    "Find MBA concentrations by field: finance, tech, consulting, marketing, healthcare, social impact, entrepreneurship, and operations at top schools.",
  openGraph: {
    title: "MBA Concentration Finder | Admit Compass",
    description: "Discover which MBA concentrations are offered at M7 and T15 programs.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function ConcentrationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
