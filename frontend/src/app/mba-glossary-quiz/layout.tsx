import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Glossary Quiz - Test Your Business School Vocabulary",
  description:
    "Interactive quiz on MBA admissions terms. Test your knowledge of GMAT, case method, cohort systems, and more.",
  openGraph: {
    title: "MBA Glossary Quiz | Admit Compass",
    description: "How well do you know MBA admissions vocabulary?",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function MBAGlossaryQuizLayout({ children }: { children: React.ReactNode }) {
  return children;
}
