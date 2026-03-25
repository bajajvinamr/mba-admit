import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Reapplicant Guide - Strengthen Your Application for Round 2",
  description:
    "A structured guide for MBA reapplicants: what to change, how to show growth, and strategies for a stronger second application.",
  openGraph: {
    title: "Reapplicant Guide | Admit Compass",
    description: "Expert advice for MBA reapplicants - show growth, strengthen your story, get admitted.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function ReapplicantLayout({ children }: { children: React.ReactNode }) {
  return children;
}
