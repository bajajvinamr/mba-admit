import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Networking Strategy Guide - Templates & Tactics",
  description:
    "Step-by-step networking strategies for MBA applicants: cold emails, alumni chats, LinkedIn optimization, and post-acceptance networking with copy-paste templates.",
  openGraph: {
    title: "Networking Strategy Guide | Admit Compass",
    description: "MBA networking templates and tactics for every stage.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function NetworkingGuideLayout({ children }: { children: React.ReactNode }) {
  return children;
}
