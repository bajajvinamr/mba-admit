import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recommendation Letter Tracker - Manage Your MBA Recommenders",
  description:
    "Track recommendation letter status, deadlines, and follow-ups for each MBA program application.",
  openGraph: {
    title: "Rec Letter Tracker | Admit Compass",
    description: "Manage recommenders across all your MBA applications in one place.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function RecTrackerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
