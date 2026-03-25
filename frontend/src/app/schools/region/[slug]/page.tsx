import { Metadata } from"next";
import { notFound } from"next/navigation";
import Link from"next/link";
import { REGIONS, slugify } from"@/lib/geo";
import { API_BASE } from"@/lib/api";

type School = {
 id: string; name: string; location: string; country: string;
 gmat_avg: number; median_salary: string; acceptance_rate: number;
 class_size: number; specializations: string[];
};

export const dynamic ="force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function getRegionSchools(regionSlug: string): Promise<School[]> {
 const region = REGIONS[regionSlug];
 if (!region) return [];
 const results = await Promise.all(
 region.countries.map(async (country) => {
 const res = await fetch(`${API_BASE}/api/schools?country=${encodeURIComponent(country)}`, {
 next: { revalidate: 3600 },
 });
 if (!res.ok) return [];
 return res.json();
 })
 );
 return results.flat();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
 const { slug } = await params;
 const region = REGIONS[slug];
 if (!region) return { title:"Not Found"};
 const schools = await getRegionSchools(slug);
 const count = schools.length;
 const avgGmat = count > 0
 ? Math.round(schools.reduce((s, sc) => s + (sc.gmat_avg || 0), 0) / count)
 : 0;

 return {
 title: `Top ${count} MBA Programs in ${region.name} - Rankings & Admissions Guide`,
 description: `Compare ${count} MBA programs across ${region.name}. Average GMAT: ${avgGmat}. Browse by country, compare tuition, salaries, and acceptance rates.`,
 openGraph: {
 title: `MBA Programs in ${region.name} | Admit Compass`,
 description: `Explore ${count} MBA programs across ${region.name} with detailed admissions stats.`,
 type:"website",
 siteName:"Admit Compass",
 },
 };
}

export default async function RegionPage({ params }: Props) {
 const { slug } = await params;
 const region = REGIONS[slug];
 if (!region) notFound();

 const schools = await getRegionSchools(slug);
 if (schools.length === 0) notFound();

 const avgGmat = Math.round(schools.reduce((s, sc) => s + (sc.gmat_avg || 0), 0) / schools.length);

 // Group by country
 const byCountry: Record<string, School[]> = {};
 for (const s of schools) {
 const c = s.country ||"Other";
 if (!byCountry[c]) byCountry[c] = [];
 byCountry[c].push(s);
 }
 // Sort countries by school count desc
 const sortedCountries = Object.entries(byCountry).sort((a, b) => b[1].length - a[1].length);

 return (
 <div className="max-w-7xl mx-auto px-8">
 {/* Breadcrumb */}
 <nav className="py-6 text-xs text-muted-foreground/40">
 <Link href="/schools" className="hover:text-foreground">Schools</Link>
 <span className="mx-2">/</span>
 <span className="text-foreground font-medium">{region.name}</span>
 </nav>

 {/* Hero */}
 <div className="py-8 border-b border-border/5 mb-8">
 <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/40 mb-3 font-medium">
 MBA Programs by Region
 </p>
 <h1 className="heading-serif text-4xl md:text-5xl mb-3">
 Top MBA Programs in {region.name}
 </h1>
 <p className="text-muted-foreground/50 max-w-2xl">
 {schools.length} MBA programs across {sortedCountries.length} countries in {region.name}.
 Average GMAT: {avgGmat}. Explore by country below.
 </p>
 </div>

 {/* Stats bar */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
 <div className="bg-card border border-border/5 p-4 text-center">
 <p className="text-2xl font-bold text-foreground">{schools.length}</p>
 <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold">Programs</p>
 </div>
 <div className="bg-card border border-border/5 p-4 text-center">
 <p className="text-2xl font-bold text-foreground">{sortedCountries.length}</p>
 <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold">Countries</p>
 </div>
 <div className="bg-card border border-border/5 p-4 text-center">
 <p className="text-2xl font-bold text-foreground">{avgGmat}</p>
 <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold">Avg GMAT</p>
 </div>
 <div className="bg-card border border-border/5 p-4 text-center">
 <p className="text-2xl font-bold text-foreground">
 {Math.round(schools.reduce((s, sc) => s + (typeof sc.acceptance_rate ==="number" ? sc.acceptance_rate : 30), 0) / schools.length)}%
 </p>
 <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold">Avg Accept Rate</p>
 </div>
 </div>

 {/* Country quick-nav */}
 <div className="flex flex-wrap gap-2 mb-10">
 {sortedCountries.map(([country, countrySchools]) => (
 <Link
 key={country}
 href={`/schools/country/${slugify(country)}`}
 className="text-xs px-3 py-1.5 bg-card border border-border/10 hover:border-primary transition-colors font-medium"
 >
 {country} ({countrySchools.length})
 </Link>
 ))}
 </div>

 {/* Schools grouped by country */}
 {sortedCountries.map(([country, countrySchools]) => {
 const sorted = [...countrySchools].sort((a, b) => b.gmat_avg - a.gmat_avg);
 return (
 <div key={country} className="mb-12">
 <div className="flex items-center justify-between mb-4">
 <h2 className="heading-serif text-2xl">{country}</h2>
 <Link
 href={`/schools/country/${slugify(country)}`}
 className="text-xs text-muted-foreground/40 hover:text-primary transition-colors font-medium"
 >
 View all {countrySchools.length} →
 </Link>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-foreground/5">
 {sorted.slice(0, 6).map(school => (
 <Link
 key={school.id}
 href={`/school/${school.id}`}
 className="bg-card p-6 hover:bg-background transition-colors group"
 >
 <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 mb-1">{school.location}</p>
 <h3 className="heading-serif text-lg mb-2 group-hover:text-primary transition-colors">{school.name}</h3>
 <div className="grid grid-cols-3 gap-2 text-center border-t border-border/5 pt-3">
 <div>
 <p className="text-[9px] uppercase text-muted-foreground/40">GMAT</p>
 <p className="font-medium text-sm">{school.gmat_avg}</p>
 </div>
 <div>
 <p className="text-[9px] uppercase text-muted-foreground/40">Accept</p>
 <p className="font-medium text-sm">{school.acceptance_rate}%</p>
 </div>
 <div>
 <p className="text-[9px] uppercase text-muted-foreground/40">Salary</p>
 <p className="font-medium text-sm">{school.median_salary}</p>
 </div>
 </div>
 </Link>
 ))}
 </div>
 </div>
 );
 })}

 {/* CTA */}
 <div className="bg-foreground p-8 text-center text-white mb-12">
 <h3 className="heading-serif text-2xl mb-3">Find your best fit in {region.name}</h3>
 <p className="text-white/50 mb-6 text-sm">Enter your profile to see which programs are reaches, targets, and safeties.</p>
 <Link href="/#calc" className="inline-block bg-primary text-foreground px-8 py-3 font-bold uppercase tracking-widest text-sm hover:scale-105 transition-transform">
 Check My Odds - Free
 </Link>
 </div>

 {/* Cross-links to other regions */}
 <div className="border-t border-border/5 py-8 mb-8">
 <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold mb-4">
 Explore other regions
 </p>
 <div className="flex flex-wrap gap-2">
 {Object.entries(REGIONS)
 .filter(([key]) => key !== slug)
 .map(([key, r]) => (
 <Link
 key={key}
 href={`/schools/region/${key}`}
 className="text-xs px-3 py-1.5 border border-border/10 hover:border-primary transition-colors font-medium"
 >
 {r.name}
 </Link>
 ))}
 </div>
 </div>

 {/* JSON-LD */}
 <script
 type="application/ld+json"
 dangerouslySetInnerHTML={{
 __html: JSON.stringify({
"@context":"https://schema.org",
"@type":"ItemList",
 name: `MBA Programs in ${region.name}`,
 numberOfItems: schools.length,
 itemListElement: schools
 .sort((a, b) => b.gmat_avg - a.gmat_avg)
 .slice(0, 20)
 .map((s, i) => ({
"@type":"ListItem",
 position: i + 1,
 item: {
"@type":"EducationalOrganization",
 name: s.name,
 url: `https://admitcompass.ai/school/${s.id}`,
 },
 })),
 }),
 }}
 />
 </div>
 );
}
