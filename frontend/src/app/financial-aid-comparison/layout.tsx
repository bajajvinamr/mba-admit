import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Financial Aid Comparison - Compare MBA Scholarship & Aid Packages",
  description: "Side-by-side comparison of MBA financial aid packages. Input offers from multiple schools and see total cost of attendance, net cost, and ROI.",
  openGraph: { title: "Financial Aid Comparison | Admit Compass", description: "Compare MBA financial aid packages side by side.", type: "website", siteName: "Admit Compass" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
