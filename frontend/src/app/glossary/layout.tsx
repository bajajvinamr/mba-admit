import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Admissions Glossary - Every Term Explained",
  description:
    "A comprehensive glossary of MBA admissions terms: GMAT, GPA, LOR, R1/R2/R3, yield, dings, and more.",
  openGraph: {
    title: "MBA Glossary | Admit Compass",
    description: "Every MBA admissions term explained - from GMAT to yield rate.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function GlossaryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
