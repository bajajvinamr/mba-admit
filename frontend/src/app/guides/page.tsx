import { Metadata } from"next";
import Link from"next/link";
import guideMeta from"@/content/guides/meta.json";

export const metadata: Metadata = {
 title:"MBA Admissions Guides - Expert Advice & Analysis",
 description:"In-depth MBA admissions guides covering GMAT scores, scholarships, ROI analysis, application timelines, and school comparisons. Data-driven insights for your MBA journey.",
 alternates: { canonical:"/guides"},
 openGraph: {
 title:"MBA Admissions Guides | Admit Compass",
 description:"Expert MBA admissions guides backed by real school data.",
 type:"website",
 siteName:"Admit Compass",
 },
};

type GuideMeta = { title: string; description: string; date: string; readingTime: string };
const META = guideMeta as Record<string, GuideMeta>;

export default function GuidesIndex() {
 const guides = Object.entries(META)
 .map(([slug, meta]) => ({ slug, ...meta }))
 .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

 return (
 <div className="max-w-4xl mx-auto px-8">
 <div className="py-12 border-b border-border/5 mb-10">
 <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/40 mb-3 font-medium">
 Resources
 </p>
 <h1 className="heading-serif text-4xl md:text-5xl mb-3">
 MBA Admissions Guides
 </h1>
 <p className="text-muted-foreground/50 max-w-2xl">
 Data-driven guides to help you navigate every aspect of the MBA admissions process.
 </p>
 </div>

 <div className="space-y-0 divide-y divide-jet/5">
 {guides.map(guide => (
 <Link
 key={guide.slug}
 href={`/guides/${guide.slug}`}
 className="block py-8 group hover:bg-background -mx-8 px-8 transition-colors"
 >
 <div className="flex items-start justify-between gap-6">
 <div>
 <h2 className="heading-serif text-xl mb-2 group-hover:text-primary transition-colors">
 {guide.title}
 </h2>
 <p className="text-muted-foreground/50 text-sm leading-relaxed max-w-xl">
 {guide.description}
 </p>
 </div>
 <div className="flex-shrink-0 text-right">
 <p className="text-[10px] uppercase tracking-widest text-muted-foreground/30 font-bold">
 {guide.readingTime}
 </p>
 </div>
 </div>
 </Link>
 ))}
 </div>

 {guides.length === 0 && (
 <p className="text-muted-foreground/40 text-center py-20">Guides coming soon.</p>
 )}

 </div>
 );
}
