import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admit Probability Simulator - Monte Carlo MBA Admissions",
  description:
    "Run 100 simulated admissions rounds to estimate your acceptance probability at top MBA programs. Factor in GMAT, GPA, work experience, URM status, and more.",
  alternates: { canonical: "/simulator" },
  openGraph: {
    title: "Admit Probability Simulator | Admit Compass",
    description: "Monte Carlo simulation of your MBA admission chances across top programs.",
    type: "website",
    siteName: "Admit Compass",
  },
};

export default function SimulatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "MBA Admit Probability Simulator",
            "applicationCategory": "EducationalApplication",
            "operatingSystem": "Web",
            "url": "https://admitcompass.ai/simulator",
            "description": "Run 100 simulated admissions rounds to estimate your acceptance probability at top MBA programs.",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD",
            },
            "featureList": [
              "Monte Carlo simulation with 100 rounds",
              "840+ MBA programs supported",
              "GMAT, GPA, work experience factors",
              "URM, military, international adjustments",
              "Confidence intervals for each school",
            ],
          }),
        }}
      />
      {children}
    </>
  );
}
