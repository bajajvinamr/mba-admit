import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Application Fee Calculator - Total Cost per School",
  description:
    "Calculate the total application cost across all your target MBA programs including fees, score reports, and transcripts.",
  openGraph: {
    title: "MBA Fee Calculator | Admit Compass",
    description: "Know your total application costs before you apply.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function FeeCalcLayout({ children }: { children: React.ReactNode }) {
  return children;
}
