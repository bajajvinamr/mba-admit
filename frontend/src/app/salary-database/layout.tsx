import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Salary Database - Post-MBA Compensation by School & Industry",
  description:
    "Explore median base salary, signing bonus, and total compensation for top MBA programs. Filter by industry - consulting, finance, tech, and more.",
  openGraph: {
    title: "MBA Salary Database | Admit Compass",
    description: "Compare post-MBA salaries across top business schools and industries.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function SalaryDatabaseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
