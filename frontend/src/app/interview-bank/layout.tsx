import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Interview Questions - Question Bank with Tips & Strategies",
  description:
    "Prepare for your MBA admissions interview with 100+ curated questions across 8 categories. Difficulty ratings, expert tips, and school-specific questions for top programs.",
  openGraph: {
    title: "MBA Interview Question Bank | Admit Compass",
    description: "100+ MBA interview questions with difficulty ratings, expert tips, and school-specific prep for HBS, Stanford GSB, Wharton, and more.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function InterviewBankLayout({ children }: { children: React.ReactNode }) {
  return children;
}
