import { Metadata } from "next";

export const metadata: Metadata = {
  title: "GMAT Score Predictor - Predict Your Test Day Score",
  description:
    "Enter your practice scores, study hours, and weeks remaining to predict your GMAT score, see your percentile, and compare against top MBA programs.",
  openGraph: {
    title: "GMAT Score Predictor | Admit Compass",
    description: "AI-powered GMAT score prediction with school comparison and study recommendations.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function GmatPredictorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
