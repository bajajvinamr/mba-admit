import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Application Budget Calculator - Plan Your MBA Costs",
  description:
    "Calculate the total cost of applying to MBA programs: GMAT prep, application fees, campus visits, and more.",
  openGraph: {
    title: "MBA Application Budget | Admit Compass",
    description: "Plan and track your total MBA application costs.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function BudgetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
