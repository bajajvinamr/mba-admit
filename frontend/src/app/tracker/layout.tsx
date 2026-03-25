import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Application Tracker - Manage Your MBA Applications",
  description:
    "Track every MBA application from research to decision. Organize by status, round, and notes - all saved locally.",
  openGraph: {
    title: "MBA Application Tracker | Admit Compass",
    description: "Track and manage your MBA applications across schools, rounds, and statuses.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function TrackerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
