import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA ROI by Industry - Return on Investment by Career Path",
  description: "Compare MBA ROI across industries: consulting, tech, finance, PE/VC, healthcare, and more. See salary data, payback periods, and 10-year projections.",
  openGraph: { title: "MBA ROI by Industry | Admit Compass", description: "Which MBA career path has the best ROI?", type: "website", siteName: "Admit Compass" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
