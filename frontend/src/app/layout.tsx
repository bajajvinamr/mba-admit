import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { Navbar } from "@/components/Navbar";
import { ToastContainer } from "@/components/Toast";
import { CommandPalette } from "@/components/CommandPalette";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { WebVitals } from "@/components/WebVitals";
import { GlobalErrorHandler } from "@/components/GlobalErrorHandler";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { ScrollToTop } from "@/components/ScrollToTop";
import { OfflineBanner } from "@/components/OfflineBanner";
import { MobileTabBar } from "@/components/MobileTabBar";
import { CompassAdvisor } from "@/components/CompassAdvisor";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { validateEnv } from "@/lib/env";
import { cn } from "@/lib/utils";

// Validate environment on server startup (runs once at module load)
validateEnv();

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: {
    default: "Admit Compass - AI-Powered MBA Admissions Platform",
    template: "%s | Admit Compass",
  },
  description:
    "AI-powered MBA admissions platform. Odds calculator, essay evaluator, interview prep, school comparison, and application tracking for 905 programs worldwide.",
  metadataBase: new URL("https://admitcompass.ai"),
  openGraph: {
    title: "Admit Compass - AI-Powered MBA Admissions",
    description:
      "School research, essay feedback, interview prep, and odds calculation. Everything for MBA admissions, in one place.",
    type: "website",
    siteName: "Admit Compass",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Admit Compass - AI-Powered MBA Admissions",
    description:
      "905 programs. 67K+ real decisions. AI essay feedback. Free odds calculator.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable, jetbrainsMono.variable)} suppressHydrationWarning>
      <head>
        {/* Preconnect to API for faster first request */}
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"} />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"} />
        {/* JSON-LD structured data - SoftwareApplication + Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "name": "Admit Compass",
                  "url": "https://admitcompass.ai",
                  "description": "AI-powered MBA admissions platform with 100+ tools for 905 programs worldwide.",
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": "https://admitcompass.ai/schools?q={search_term_string}",
                    "query-input": " required name=search_term_string",
                  },
                },
                {
                  "@type": "SoftwareApplication",
                  "name": "Admit Compass",
                  "applicationCategory": "EducationalApplication",
                  "operatingSystem": "Web",
                  "offers": [
                    { "@type": "Offer", "price": "0", "priceCurrency": "USD", "description": "Free tier" },
                    { "@type": "Offer", "price": "29", "priceCurrency": "USD", "description": "Pro - monthly" },
                    { "@type": "Offer", "price": "79", "priceCurrency": "USD", "description": "Premium - monthly" },
                  ],
                },
                {
                  "@type": "Organization",
                  "name": "Admit Compass",
                  "url": "https://admitcompass.ai",
                  "sameAs": [],
                },
              ],
            }),
          }}
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} min-h-screen flex flex-col bg-background`}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-foreground focus:text-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold">
          Skip to content
        </a>
        <ThemeProvider>
        <AuthProvider>
        <QueryProvider>
        <PostHogProvider>
        <Navbar />
        <ErrorBoundary>
        <main id="main-content" className="flex-1 pt-16 pb-16" role="main">
          {children}
        </main>
        </ErrorBoundary>
        <footer className="bg-foreground text-primary-foreground dark:bg-card dark:text-card-foreground dark:border-t dark:border-border py-16 px-8 mt-auto" role="contentinfo">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
              <div className="md:col-span-2">
                <span className="font-display text-2xl font-bold">ADMIT COMPASS.</span>
                <p className="text-primary-foreground/40 dark:text-muted-foreground text-sm mt-3 max-w-sm leading-relaxed">
                  905 MBA programs. 67,000+ real admissions decisions. School research,
                  essay coaching, interview prep, and scholarship intelligence. Your
                  complete admissions advantage.
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-primary-foreground/30 dark:text-muted-foreground/50 mb-4 font-bold">Programs</p>
                <ul className="space-y-2 text-sm text-primary-foreground/50 dark:text-muted-foreground">
                  <li><a href="/programs/mba" className="hover:text-primary-foreground dark:hover:text-foreground transition-colors">MBA Programs</a></li>
                  <li><a href="/programs/mim" className="hover:text-primary-foreground dark:hover:text-foreground transition-colors">Masters in Management</a></li>
                  <li><a href="/programs/emba" className="hover:text-primary-foreground dark:hover:text-foreground transition-colors">Executive MBA</a></li>
                  <li><a href="/programs/cat" className="hover:text-primary-foreground dark:hover:text-foreground transition-colors">MBA (CAT) - India</a></li>
                  <li><a href="/schools" className="hover:text-primary-foreground dark:hover:text-foreground transition-colors">All Schools</a></li>
                </ul>
                <p className="text-xs uppercase tracking-widest text-primary-foreground/30 dark:text-muted-foreground/50 mb-4 mt-8 font-bold">Tools</p>
                <ul className="space-y-2 text-sm text-primary-foreground/50 dark:text-muted-foreground">
                  <li><a href="/compare" className="hover:text-primary-foreground dark:hover:text-foreground transition-colors">Compare Schools</a></li>
                  <li><a href="/evaluator" className="hover:text-primary-foreground dark:hover:text-foreground transition-colors">Essay Evaluator</a></li>
                  <li><a href="/interview" className="hover:text-primary-foreground dark:hover:text-foreground transition-colors">Interview Prep</a></li>
                  <li><a href="/scholarships" className="hover:text-primary-foreground dark:hover:text-foreground transition-colors">Scholarship Help</a></li>
                  <li><a href="/guides" className="hover:text-primary-foreground dark:hover:text-foreground transition-colors">Admissions Guides</a></li>
                  <li><a href="/pricing" className="hover:text-primary-foreground dark:hover:text-foreground transition-colors">Pricing</a></li>
                </ul>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-primary-foreground/30 dark:text-muted-foreground/50 mb-4 font-bold">Stay Updated</p>
                <p className="text-sm text-primary-foreground/40 dark:text-muted-foreground mb-4">Join the beta waitlist. Free during early access.</p>
                <ul className="space-y-2 text-sm text-primary-foreground/50 dark:text-muted-foreground mt-6">
                  <li><a href="/about" className="hover:text-primary-foreground dark:hover:text-foreground transition-colors">About</a></li>
                  <li><a href="/privacy" className="hover:text-primary-foreground dark:hover:text-foreground transition-colors">Privacy</a></li>
                  <li><a href="/contact" className="hover:text-primary-foreground dark:hover:text-foreground transition-colors">Contact</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <span className="text-sm text-primary-foreground/30 dark:text-muted-foreground/50">&copy; 2026 Admit Compass. All rights reserved.</span>
              <span className="text-xs text-white/20">Built for MBA applicants who want an edge.</span>
            </div>
          </div>
        </footer>
        <CommandPalette />
        <WebVitals />
        <GlobalErrorHandler />
        <KeyboardShortcuts />
        <ScrollToTop />
        <ToastContainer />
        <OfflineBanner />
        <MobileTabBar />
        <CompassAdvisor />
        </PostHogProvider>
        </QueryProvider>
        </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
