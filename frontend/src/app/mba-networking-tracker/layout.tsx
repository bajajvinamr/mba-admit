import { Metadata } from "next";
export const metadata: Metadata = {
  title: "MBA Networking Tracker - Track Your Admissions Contacts",
  description: "Track networking contacts for MBA admissions: alumni, students, admissions officers. Log conversations and follow-ups.",
  openGraph: { title: "Networking Tracker | Admit Compass", description: "Track your MBA admissions networking contacts.", type: "website", siteName: "Admit Compass" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
