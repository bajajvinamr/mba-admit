import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Reading List - 15 Essential Books Before Business School",
  description:
    "Curated reading list for MBA applicants: strategy, leadership, entrepreneurship, and memoir books that sharpen your essays and interviews.",
  openGraph: {
    title: "MBA Reading List | Admit Compass",
    description: "15 must-read books before business school.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function ReadingListLayout({ children }: { children: React.ReactNode }) {
  return children;
}
