import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA School News Feed - Latest Updates from Top Programs",
  description:
    "Stay current with the latest news from top MBA programs. Rankings, curriculum changes, faculty hires, admissions updates, and student life highlights.",
  openGraph: {
    title: "MBA School News Feed | Admit Compass",
    description: "Real-time news feed covering top MBA programs worldwide.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function SchoolNewsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
