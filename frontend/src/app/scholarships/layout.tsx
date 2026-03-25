import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Scholarship Negotiator & ROI Calculator | Admit Compass",
  description:
    "Calculate your MBA ROI and negotiate scholarships with AI-generated appeal letters. Leverage competing offers to maximize your financial aid package.",
  alternates: { canonical: "/scholarships" },
  openGraph: {
    title: "MBA Scholarship Negotiator | Admit Compass",
    description: "Calculate MBA ROI and negotiate scholarships with AI-drafted appeal letters.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function ScholarshipsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
