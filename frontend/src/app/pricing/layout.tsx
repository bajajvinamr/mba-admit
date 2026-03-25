import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing - Free, Pro & Premium MBA Admissions Plans",
  description:
    "Simple, transparent pricing for MBA admissions tools. Free tier with no credit card required. Pro from $29/mo. Premium from $79/mo with 1:1 strategy calls.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing | Admit Compass",
    description: "Free tools to explore. Pro to apply confidently. Premium to replace your consultant.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* FAQ structured data for Google rich snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "Can I try before I pay?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes. Every tool has a free tier - no credit card required. The odds calculator gives you 3 free simulations per day, the essay evaluator gives you 1 free evaluation per month, and mock interviews give you 3 free sessions per month.",
                },
              },
              {
                "@type": "Question",
                "name": "What's the difference between Pro and Premium?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Pro gives you expanded AI tool usage (10 essay evaluations/mo, 20 mock interviews/mo, unlimited odds calculations). Premium adds unlimited everything, plus a monthly 1:1 strategy call with an M7/IIM mentor and priority 24-hour essay reviews.",
                },
              },
              {
                "@type": "Question",
                "name": "Can I cancel anytime?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes. Cancel with one click from your account settings - no lock-in, no cancellation fees. Plus every plan includes a 7-day money-back guarantee.",
                },
              },
              {
                "@type": "Question",
                "name": "How is this different from an admissions consultant?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Traditional consultants charge $5,000–$10,000+ and work on their schedule. Admit Compass gives you 24/7 AI-powered feedback for a fraction of the cost. Premium users also get monthly strategy calls.",
                },
              },
              {
                "@type": "Question",
                "name": "Do annual plans save money?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes - 20% off. Pro drops from $29/mo to $23.20/mo, and Premium drops from $79/mo to $63.20/mo when billed annually.",
                },
              },
            ],
          }),
        }}
      />
      {children}
    </>
  );
}
