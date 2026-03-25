import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Salary Negotiation Guide - Scripts & Strategies",
  description:
    "Post-MBA salary negotiation tactics: scripts for countering offers, leveraging competing offers, and negotiating beyond base salary in consulting, tech, and finance.",
  openGraph: {
    title: "Salary Negotiation Guide | Admit Compass",
    description: "Scripts and strategies for post-MBA compensation negotiation.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function SalaryNegotiationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
