import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Masters in Management (MiM) Programs | Admit Compass",
  description: "Browse 305+ Masters in Management programs. Compare pre-experience master's degrees in Europe, Asia, and worldwide.",
  openGraph: { title: "MiM Programs Directory", description: "Find the right Masters in Management for your career start." },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
