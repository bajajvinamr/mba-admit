import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA ROI Calculator - Is the MBA Worth It?",
  description:
    "Calculate 10-year ROI for any MBA program. Compare total investment, post-MBA salary, breakeven year, and net gain across schools.",
  alternates: { canonical: "/roi" },
  openGraph: {
    title: "MBA ROI Calculator | Admit Compass",
    description: "Is the MBA worth it? Calculate 10-year ROI for any program.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function RoiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
