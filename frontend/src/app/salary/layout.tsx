import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Salary Negotiation Calculator - Post-MBA Compensation",
  description:
    "Calculate your post-MBA salary range by role, location, and school. Get market data, signing bonus estimates, and negotiation tips.",
  openGraph: {
    title: "Salary Negotiation Calculator | Admit Compass",
    description: "Know your worth. Calculate post-MBA salary ranges and get negotiation tips.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function SalaryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
