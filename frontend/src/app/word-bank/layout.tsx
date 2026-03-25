import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Essay Word Bank - Power Words & Phrases by Essay Type",
  description:
    "Browse curated power words, action verbs, and transition phrases organized by MBA essay type: leadership, goals, diversity, and more.",
  openGraph: {
    title: "Essay Word Bank | Admit Compass",
    description: "Power words and phrases to strengthen your MBA essays.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function WordBankLayout({ children }: { children: React.ReactNode }) {
  return children;
}
