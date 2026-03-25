import { Metadata } from "next";

export const metadata: Metadata = {
  title: "International MBA Student Guide - Visa, Funding, Career & More",
  description:
    "Complete guide for international MBA applicants: F-1 visa process, funding options, GMAT/TOEFL tips, post-MBA work authorization, and cultural adjustment advice.",
  openGraph: {
    title: "International Student Guide | Admit Compass",
    description: "Everything international MBA applicants need to know.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function InternationalGuideLayout({ children }: { children: React.ReactNode }) {
  return children;
}
