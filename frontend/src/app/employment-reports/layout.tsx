import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Employment Reports - Post-MBA Outcomes by School & Industry",
  description:
    "Browse employment reports for top MBA programs. Compare employment rates, salaries, industry breakdowns, top employers, and job functions across 12 leading business schools.",
  openGraph: {
    title: "MBA Employment Reports | Admit Compass",
    description: "Compare post-MBA employment outcomes across top business schools - industries, salaries, and top employers.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function EmploymentReportsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
