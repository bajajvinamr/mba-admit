import { Metadata } from "next";

export const metadata: Metadata = {
  title: "GMAT vs GRE - Which Test Should You Take for MBA?",
  description:
    "Interactive quiz and factor-by-factor comparison to help you decide between GMAT and GRE for your MBA application.",
  openGraph: {
    title: "GMAT vs GRE Decision Tool | Admit Compass",
    description: "Which test is right for your MBA goals?",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function GmatVsGreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
