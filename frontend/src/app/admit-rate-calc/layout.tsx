import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Admit Rate Calculator - Portfolio Probability",
  description:
    "Calculate your probability of getting into at least one MBA program based on your school portfolio. Uses independent probability model across top schools.",
  openGraph: {
    title: "Admit Rate Calculator | Admit Compass",
    description: "See your odds of getting into at least one MBA program.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function AdmitRateCalcLayout({ children }: { children: React.ReactNode }) {
  return children;
}
