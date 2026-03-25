import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Essay Word Frequency Analyzer - Optimize Your MBA Essay Vocabulary",
  description:
    "Paste your MBA essay and instantly see word frequency, overused words, readability stats, and vocabulary diversity score.",
  openGraph: {
    title: "Essay Word Frequency | Admit Compass",
    description: "Analyze your MBA essay vocabulary and word patterns.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function EssayWordFrequencyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
