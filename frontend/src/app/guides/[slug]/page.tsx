import { Metadata } from"next";
import { notFound } from"next/navigation";
import Link from"next/link";
import guideMeta from"@/content/guides/meta.json";

type GuideMeta = { title: string; description: string; date: string; readingTime: string };
const META = guideMeta as Record<string, GuideMeta>;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
 const { slug } = await params;
 const meta = META[slug];
 if (!meta) return { title:"Not Found"};

 return {
 title: `${meta.title} - MBA Admissions Guide`,
 description: meta.description,
 openGraph: {
 title: `${meta.title} | Admit Compass`,
 description: meta.description,
 type:"article",
 siteName:"Admit Compass",
 },
 };
}

export async function generateStaticParams() {
 return Object.keys(META).map(slug => ({ slug }));
}

export default async function GuidePage({ params }: Props) {
 const { slug } = await params;
 const meta = META[slug];
 if (!meta) notFound();

 try {
 const GuideContent = (await import(`@/content/guides/${slug}.mdx`)).default;
 return (
 <div className="max-w-3xl mx-auto px-8">
 {/* Breadcrumb */}
 <nav className="py-6 text-xs text-muted-foreground/40">
 <Link href="/guides" className="hover:text-foreground">Guides</Link>
 <span className="mx-2">/</span>
 <span className="text-foreground font-medium">{meta.title}</span>
 </nav>

 {/* Header */}
 <div className="py-8 border-b border-border/5 mb-10">
 <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/40 mb-3 font-medium">
 {meta.readingTime} read
 </p>
 <h1 className="heading-serif text-4xl md:text-5xl mb-4">
 {meta.title}
 </h1>
 <p className="text-muted-foreground/50 max-w-2xl leading-relaxed">
 {meta.description}
 </p>
 </div>

 {/* Content */}
 <article className="prose-editorial mb-16">
 <GuideContent />
 </article>

 {/* CTA */}
 <div className="bg-foreground p-8 text-center text-white mb-12">
 <h3 className="heading-serif text-2xl mb-3">Ready to check your odds?</h3>
 <p className="text-white/50 mb-6 text-sm">See where you stand at top MBA programs with real admissions data.</p>
 <Link href="/#calc" className="inline-block bg-primary text-foreground px-8 py-3 font-bold uppercase tracking-widest text-sm hover:scale-105 transition-transform">
 Check My Odds - Free
 </Link>
 </div>

 {/* JSON-LD */}
 <script
 type="application/ld+json"
 dangerouslySetInnerHTML={{
 __html: JSON.stringify({
"@context":"https://schema.org",
"@type":"Article",
 headline: meta.title,
 description: meta.description,
 datePublished: meta.date,
 publisher: {
"@type":"Organization",
 name:"Admit Compass",
 },
 }),
 }}
 />
 </div>
 );
 } catch {
 notFound();
 }
}
