import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Application Timeline - Track Your MBA Journey",
  description:
    "Visual step-by-step tracker for your MBA application. From research to decision, track progress for every school you're applying to.",
  openGraph: {
    title: "MBA Application Timeline | Admit Compass",
    description: "Track your MBA application journey from research to admission decision.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function TimelineLayout({ children }: { children: React.ReactNode }) {
  return children;
}
