import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Application Timeline Builder - Plan Your MBA Application Calendar",
  description: "Build a personalized MBA application timeline. Set your target schools, rounds, and get a week-by-week plan with milestones.",
  openGraph: { title: "Application Timeline Builder | Admit Compass", description: "Build your personalized MBA application calendar.", type: "website", siteName: "Admit Compass" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
