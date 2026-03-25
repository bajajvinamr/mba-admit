import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Application Portfolio | Track MBA Applications | AdmitCompass",
  description:
    "Manage your entire MBA application portfolio. Track essays, deadlines, recommendations, and interview prep across all your target schools.",
  openGraph: {
    title: "MBA Application Portfolio",
    description: "One dashboard to track all your MBA applications, essays, and deadlines.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
