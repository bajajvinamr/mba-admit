import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cross-Essay Theme Tracker | MBA Essay Analysis | AdmitCompass",
  description:
    "Analyze themes across all your MBA application essays. Identify overlaps, discover gaps, and diversify your narrative portfolio for stronger applications.",
  openGraph: {
    title: "Cross-Essay Theme Tracker",
    description:
      "AI-powered theme analysis across your MBA essays. Find overlaps, gaps, and diversification opportunities.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
