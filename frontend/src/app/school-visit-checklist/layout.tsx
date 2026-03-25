import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Campus Visit Checklist - Make the Most of Your MBA School Visit",
  description: "Complete checklist for MBA campus visits: what to do before, during, and after. Questions to ask, people to meet, and things to observe.",
  openGraph: { title: "Campus Visit Checklist | Admit Compass", description: "Everything to do during your MBA campus visit.", type: "website", siteName: "Admit Compass" },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
