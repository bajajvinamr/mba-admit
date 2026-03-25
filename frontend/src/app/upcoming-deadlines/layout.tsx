import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Upcoming MBA Application Deadlines",
  description:
    "Track upcoming MBA application deadlines for top business schools. Never miss a round.",
  openGraph: {
    title: "Upcoming Deadlines | Admit Compass",
    description: "MBA application deadlines for top programs at a glance.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function UpcomingDeadlinesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
