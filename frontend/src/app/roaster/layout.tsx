import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resume Roaster - Get Your Resume Roasted by AI | Admit Compass",
  description:
    "Paste a resume bullet and get it brutally critiqued by our AI trained on M7 admissions standards. Get a rewrite with quantified impact and leadership scope.",
  alternates: { canonical: "/roaster" },
  openGraph: {
    title: "Resume Roaster | Admit Compass",
    description: "Get your resume bullet brutally roasted by AI. Trained on M7 admissions standards.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function RoasterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
