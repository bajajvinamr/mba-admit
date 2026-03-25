import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Admissions Tools - 100+ Free AI Tools for Your Application",
  description:
    "Every tool you need for MBA admissions: essay evaluator, interview simulator, school comparison, deadline calendar, word counter, fit score calculator, and more.",
  alternates: { canonical: "/tools" },
  openGraph: {
    title: "MBA Admissions Tools | Admit Compass",
    description: "100+ free AI-powered tools for MBA admissions - from research to post-admit.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
