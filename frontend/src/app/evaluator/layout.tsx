import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MBA Essay Evaluator - AI Feedback on Your Application Essays | Admit Compass",
  description:
    "Get instant AI feedback on your MBA application essays. Our evaluator scores structure, authenticity, storytelling, and provides actionable rewrites. Works for HBS, Stanford, Wharton, and 905 programs.",
  alternates: { canonical: "/evaluator" },
  openGraph: {
    title: "MBA Essay Evaluator | Admit Compass",
    description:
      "AI-powered essay feedback for MBA applications. Get scores, critiques, and rewrites instantly.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function EvaluatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "MBA Essay Evaluator",
            "applicationCategory": "EducationalApplication",
            "operatingSystem": "Web",
            "url": "https://admitcompass.ai/evaluator",
            "description": "Get instant AI feedback on MBA application essays - structure, authenticity, storytelling, and school fit.",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD",
            },
            "featureList": [
              "AI scoring on 6 dimensions",
              "School-specific prompt matching",
              "Actionable rewrite suggestions",
              "Works for 905 MBA programs",
            ],
          }),
        }}
      />
      {children}
    </>
  );
}
