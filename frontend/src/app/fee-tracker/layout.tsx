import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Application Fee Tracker - Track Every Dollar",
  description:
    "Track application fees across your MBA school list. See total costs, mark paid schools, and manage your application budget.",
  openGraph: {
    title: "Application Fee Tracker | Admit Compass",
    description: "Track every application fee across your school list.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function FeeTrackerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
