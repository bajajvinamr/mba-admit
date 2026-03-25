import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Class Profile Comparison - Demographics & Stats Side-by-Side",
  description:
    "Compare MBA class profiles across top schools: class size, average GMAT/GPA, diversity stats, work experience, and employment outcomes.",
  openGraph: {
    title: "MBA Class Profile Comparison | Admit Compass",
    description: "Side-by-side class profile comparison for top MBA programs.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function ClassProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
