import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Alumni Outreach Hub - MBA Networking Email Templates",
  description:
    "Draft high-conversion cold outreach emails to MBA alumni and current students. AI-tailored templates based on school culture and your background.",
  openGraph: {
    title: "MBA Alumni Outreach Hub | Admit Compass",
    description:
      "Stop sending generic cold emails. Get AI-crafted networking templates that land coffee chats with MBA students and alumni.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function OutreachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
