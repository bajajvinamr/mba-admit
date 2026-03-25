import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resume Keywords Optimizer - MBA Application Power Verbs",
  description:
    "Analyze your resume for MBA-relevant keywords, power verbs, and quantifiable achievements. Get suggestions to strengthen your application.",
  openGraph: {
    title: "Resume Keywords Optimizer | Admit Compass",
    description: "Optimize your resume with MBA power verbs and keyword analysis.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function ResumeKeywordsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
