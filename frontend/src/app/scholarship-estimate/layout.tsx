import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Scholarship Estimator - Estimate Your Financial Aid",
  description:
    "Estimate your MBA scholarship probability and award amount across top business schools based on your GMAT, GPA, work experience, and profile.",
  openGraph: {
    title: "MBA Scholarship Estimator | Admit Compass",
    description: "Estimate scholarship awards and probability for top MBA programs based on your profile.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function ScholarshipEstimateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
