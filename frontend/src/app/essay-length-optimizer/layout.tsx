import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Essay Length Optimizer - Real-Time Word Count by School",
  description: "Check your MBA essay against school-specific word limits. Real-time word count with color-coded status for every major program.",
  openGraph: { title: "Essay Length Optimizer | Admit Compass", description: "Check your essay against school word limits.", type: "website", siteName: "Admit Compass" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
