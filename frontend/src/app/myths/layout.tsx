import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Admissions Myths - Busted with Data",
  description:
    "Common MBA admissions myths debunked with real data and expert analysis. Don't let misinformation hurt your application.",
  openGraph: {
    title: "MBA Myths Busted | Admit Compass",
    description: "Common MBA admissions myths debunked with data.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function MythsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
