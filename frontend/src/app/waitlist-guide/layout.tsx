import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Waitlist Strategy Guide - What to Do When Waitlisted",
  description:
    "Complete waitlist strategy: response timing, update letters, additional recommendations, campus visits, and decision-making when waitlisted at MBA programs.",
  openGraph: {
    title: "Waitlist Strategy Guide | Admit Compass",
    description: "What to do and not do when you're waitlisted at an MBA program.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function WaitlistGuideLayout({ children }: { children: React.ReactNode }) {
  return children;
}
