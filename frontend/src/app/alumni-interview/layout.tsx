import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Alumni Interview Prep - MBA Interview Formats, Questions & Tips",
  description:
    "Prepare for your MBA admissions interview with school-specific formats, common questions, insider tips, and dress code guidance for HBS, Stanford GSB, Wharton, and more.",
  openGraph: {
    title: "Alumni Interview Prep | Admit Compass",
    description: "School-specific MBA interview prep: formats, questions, tips, and dress codes for top programs.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function AlumniInterviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
