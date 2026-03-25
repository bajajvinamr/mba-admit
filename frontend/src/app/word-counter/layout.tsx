import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Essay Word Counter - Track Limits in Real Time",
  description:
    "Free word counter for MBA essays. Track word count, character count, reading time, and paragraph count. Set limits for HBS (900 words), Stanford (750 words), and more.",
  openGraph: {
    title: "MBA Essay Word Counter | Admit Compass",
    description: "Real-time word counter with essay limit tracking for MBA applications.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function WordCounterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
