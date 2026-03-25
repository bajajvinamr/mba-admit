import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Admissions Guide - Complete Application Playbook",
  description:
    "Step-by-step MBA admissions guide covering GMAT prep, school selection, essays, interviews, and application strategy from M7 insiders.",
  openGraph: {
    title: "MBA Admissions Guide | Admit Compass",
    description:
      "The complete MBA application playbook. From GMAT prep to interview day, built by people who know what admissions committees look for.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function GuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
