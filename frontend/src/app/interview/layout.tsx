import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Interview Prep - AI Mock Interviews | Admit Compass",
  description:
    "Practice MBA admissions interviews with our AI interviewer. Choose difficulty level, get real-time feedback, and build confidence for HBS, Stanford, Wharton, and more.",
  alternates: { canonical: "/interview" },
  openGraph: {
    title: "MBA Interview Prep | Admit Compass",
    description: "AI-powered mock interviews for MBA admissions. Practice, get feedback, build confidence.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function InterviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "MBA Mock Interview Prep",
            "applicationCategory": "EducationalApplication",
            "operatingSystem": "Web",
            "url": "https://admitcompass.ai/interview",
            "description": "Practice MBA admissions interviews with an AI interviewer. Choose difficulty, get real-time feedback, review transcripts.",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD",
            },
            "featureList": [
              "3 difficulty levels: friendly, standard, pressure",
              "School-specific question banks",
              "Real-time scoring on 6 dimensions",
              "Full transcript with per-question notes",
              "Session history tracking",
            ],
          }),
        }}
      />
      {children}
    </>
  );
}
