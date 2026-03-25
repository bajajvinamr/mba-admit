import { Metadata } from "next";

export const metadata: Metadata = {
  title: "School Fit Score Calculator - Profile-Program Match",
  description:
    "See how well your GMAT, GPA, and experience match each MBA program. 5-dimension fit score across academics, experience, career fit, financial, and selectivity.",
  openGraph: {
    title: "School Fit Score Calculator | Admit Compass",
    description: "Calculate your profile-program fit score across 5 dimensions for any MBA program.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function FitScoreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
