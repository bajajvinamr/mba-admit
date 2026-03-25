import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Admission Trends - Historical Stats (2022–2026)",
  description:
    "Track acceptance rates, GMAT medians, GPA averages, and class sizes over 5 years for top MBA programs. See which schools are getting more competitive.",
  openGraph: {
    title: "MBA Admission Trends | Admit Compass",
    description: "5-year admission trends for top MBA programs - acceptance rates, GMAT, GPA, class size.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function AdmissionTrendsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
