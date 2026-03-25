import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "MBA Programs - Full-Time MBA Directory | Admit Compass",
  description: "Browse 220+ full-time MBA programs worldwide. Compare GMAT scores, tuition, acceptance rates, and career outcomes across top business schools.",
  openGraph: { title: "MBA Programs Directory", description: "Find the right MBA program for your career goals." },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
