import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Admissions Community - Questions, Advice & Discussion",
  description:
    "Ask questions, share advice, and connect with other MBA applicants in our community forum.",
  openGraph: {
    title: "MBA Community | Admit Compass",
    description: "Connect with MBA applicants - questions, advice, and real experiences.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
