"use client";

import { useState, useEffect } from"react";
import dynamic from"next/dynamic";
import Link from"next/link";
import { ArrowRight } from"lucide-react";
import { apiFetch } from"@/lib/api";
import { track } from"@/lib/analytics";
import { HeroSection } from"@/components/landing/HeroSection";
import { WelcomeBack } from"@/components/landing/WelcomeBack";
import { TrustBar } from"@/components/landing/TrustBar";
import { OddsCalculator } from"@/components/landing/OddsCalculator";
import { EmailCapture } from"@/components/EmailCapture";
import { useProfile } from"@/hooks/useProfile";
import { RecommendedSchools } from"@/components/dashboard/RecommendedSchools";

// Lazy-load below-fold sections - only downloaded when the user scrolls
const HowItWorks = dynamic(() => import("@/components/landing/HowItWorks").then(m => ({ default: m.HowItWorks })), { ssr: true });
const TestimonialGrid = dynamic(() => import("@/components/landing/TestimonialGrid").then(m => ({ default: m.TestimonialGrid })), { ssr: true });
const FeaturedSchools = dynamic(() => import("@/components/landing/FeaturedSchools").then(m => ({ default: m.FeaturedSchools })), { ssr: true });

type School = {
 id: string; name: string; location: string; country: string;
 gmat_avg: number; median_salary: string; acceptance_rate: number;
 class_size: number; specializations: string[];
 tuition_usd: number; program_duration: string; stem_designated: boolean;
};

const FEATURED_IDS = ["hbs","gsb","wharton","insead","lbs","cbs"];

export default function HomePage() {
 const { profile, hasProfile } = useProfile();
 const [featuredSchools, setFeaturedSchools] = useState<School[]>([]);
 const [totalSchools, setTotalSchools] = useState(0);
 const [showCalc, setShowCalc] = useState(false);

 useEffect(() => {
 const controller = new AbortController();
 apiFetch<School[]>(`/api/schools`, { signal: controller.signal, noRetry: true })
 .then((data) => {
 setTotalSchools(data.length);
 const featured = FEATURED_IDS
 .map(id => data.find(s => s.id === id))
 .filter(Boolean) as School[];
 if (featured.length < 6) {
 const remaining = data
 .filter(s => !FEATURED_IDS.includes(s.id))
 .sort((a, b) => b.gmat_avg - a.gmat_avg)
 .slice(0, 6 - featured.length);
 featured.push(...remaining);
 }
 setFeaturedSchools(featured.slice(0, 6));
 track("homepage_loaded", { school_count: data.length, returning_user: hasProfile });
 })
 .catch(err => {
 if (err.name !=="AbortError") {
 // Fallback: show placeholder count so UI isn't empty
 setTotalSchools(840);
 }
 });
 return () => controller.abort();
 }, []);

 return (
 <div>
 {hasProfile ? (
 <WelcomeBack profile={profile} onShowCalc={() => setShowCalc(true)} />
 ) : (
 <HeroSection showCalc={showCalc} onToggleCalc={() => setShowCalc(v => !v)} />
 )}

 {/* Trust stats already in HeroSection — removed duplicate TrustBar */}

 {!hasProfile && <HowItWorks />}

 {showCalc && <OddsCalculator />}

 {hasProfile && (
 <div className="max-w-6xl mx-auto px-8 py-12">
 <RecommendedSchools profile={{
 gmat: profile.gmat,
 gpa: profile.gpa,
 yoe: profile.yoe,
 }} />
 </div>
 )}

 <TestimonialGrid />

 <FeaturedSchools schools={featuredSchools} totalSchools={totalSchools} />

 <EmailCapture variant="banner"source="landing"/>

 {/* Pricing teaser - links to full /pricing page */}
 <section className="bg-foreground text-white py-20 px-8">
 <div className="max-w-3xl mx-auto text-center">
 <p className="text-xs uppercase tracking-[0.3em] text-white/30 mb-4 font-medium">Pricing</p>
 <h2 className="heading-serif text-4xl md:text-5xl mb-4">
 Better than a $10,000 consultant.
 </h2>
 <p className="text-white/50 text-lg mb-8 max-w-xl mx-auto">
 Free tools to explore. Pro for $29/mo. Premium for $79/mo. Cancel anytime.
 </p>
 <Link href="/pricing" onClick={() => track("landing_pricing_cta_clicked")} className="inline-flex items-center gap-2 bg-primary text-foreground px-8 py-4 font-bold text-sm uppercase tracking-widest hover:bg-primary/90 transition-colors">
 See All Plans <ArrowRight size={14} />
 </Link>
 </div>
 </section>
 </div>
 );
}
