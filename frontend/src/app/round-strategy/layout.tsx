import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Round Strategy - Which MBA Application Round Is Best for You?",
  description: "Find the optimal application round based on your GMAT, work experience, profile strength, and target schools. R1 vs R2 vs R3 analysis.",
  openGraph: { title: "Round Strategy | Admit Compass", description: "Find your optimal MBA application round.", type: "website", siteName: "Admit Compass" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
