import { Metadata } from"next";
import { notFound } from"next/navigation";
import Link from"next/link";
import { slugify, REGIONS } from"@/lib/geo";
import { API_BASE } from"@/lib/api";

type School = {
 id: string; name: string; location: string; country: string;
 gmat_avg: number; median_salary: string; acceptance_rate: number;
 class_size: number; specializations: string[];
};

export const dynamic ="force-dynamic";

type Props = { params: Promise<{ slug: string }> };

function cityFromSlug(slug: string): string {
 return slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}

async function getSchools(city: string): Promise<School[]> {
 const res = await fetch(`${API_BASE}/api/schools?city=${encodeURIComponent(city)}`, {
 next: { revalidate: 3600 },
 });
 if (!res.ok) return [];
 return res.json();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
 const { slug } = await params;
 const city = cityFromSlug(slug);
 const schools = await getSchools(city);
 const count = schools.length;
 const avgGmat = count > 0
 ? Math.round(schools.reduce((s, sc) => s + (sc.gmat_avg || 0), 0) / count)
 : 0;

 return {
 title: `MBA Programs in ${city} - ${count} Schools, GMAT & Admissions Data`,
 description: `Explore ${count} MBA programs in ${city}. Average GMAT: ${avgGmat}. Compare tuition, salaries, acceptance rates, and specializations.`,
 openGraph: {
 title: `MBA Schools in ${city} | Admit Compass`,
 description: `Find and compare ${count} MBA programs in ${city}.`,
 type:"website",
 siteName:"Admit Compass",
 },
 };
}

export default async function CityPage({ params }: Props) {
 const { slug } = await params;
 const city = cityFromSlug(slug);
 const schools = await getSchools(city);

 if (schools.length === 0) notFound();

 const avgGmat = Math.round(schools.reduce((s, sc) => s + (sc.gmat_avg || 0), 0) / schools.length);
 const sorted = [...schools].sort((a, b) => b.gmat_avg - a.gmat_avg);

 // Find country for breadcrumb
 const primaryCountry = schools[0]?.country;
 const regionEntry = primaryCountry
 ? Object.entries(REGIONS).find(([, r]) => r.countries.includes(primaryCountry))
 : null;

 return (
 <div className="max-w-7xl mx-auto px-8">
 {/* Breadcrumb */}
 <nav className="py-6 text-xs text-muted-foreground/40">
 <Link href="/schools" className="hover:text-foreground">Schools</Link>
 <span className="mx-2">/</span>
 {regionEntry && (
 <>
 <Link href={`/schools/region/${regionEntry[0]}`} className="hover:text-foreground">
 {regionEntry[1].name}
 </Link>
 <span className="mx-2">/</span>
 </>
 )}
 {primaryCountry && (
 <>
 <Link href={`/schools/country/${slugify(primaryCountry)}`} className="hover:text-foreground">
 {primaryCountry}
 </Link>
 <span className="mx-2">/</span>
 </>
 )}
 <span className="text-foreground font-medium">{city}</span>
 </nav>

 {/* Hero */}
 <div className="py-8 border-b border-border/5 mb-8">
 <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/40 mb-3 font-medium">
 MBA Programs by City
 </p>
 <h1 className="heading-serif text-4xl md:text-5xl mb-3">
 MBA Programs in {city}
 </h1>
 <p className="text-muted-foreground/50 max-w-2xl">
 {schools.length} MBA programs in {city}{primaryCountry ? `, ${primaryCountry}` :""}.
 Average GMAT: {avgGmat}. Compare programs and check your odds.
 </p>
 </div>

 {/* Stats bar */}
 <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
 <div className="bg-card border border-border/5 p-4 text-center">
 <p className="text-2xl font-bold text-foreground">{schools.length}</p>
 <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold">Programs</p>
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

 {/* School grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-foreground/5 mb-12">
 {sorted.map(school => (
 <Link
 key={school.id}
 href={`/school/${school.id}`}
 className="bg-card p-6 hover:bg-background transition-colors group"
 >
 <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 mb-1">{school.location}</p>
 <h3 className="heading-serif text-lg mb-2 group-hover:text-primary transition-colors">{school.name}</h3>
 <div className="flex flex-wrap gap-1 mb-3">
 {(school.specializations || []).slice(0, 3).map(s => (
 <span key={s} className="text-[9px] bg-background border border-border/5 px-2 py-0.5 uppercase tracking-wider text-muted-foreground/50">{s}</span>
 ))}
 </div>
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

 {/* CTA */}
 <div className="bg-foreground p-8 text-center text-white mb-12">
 <h3 className="heading-serif text-2xl mb-3">Check your odds in {city}</h3>
 <p className="text-white/50 mb-6 text-sm">Enter your GMAT and GPA to see your chances at {city} MBA programs.</p>
 <Link href="/#calc" className="inline-block bg-primary text-foreground px-8 py-3 font-bold uppercase tracking-widest text-sm hover:scale-105 transition-transform">
 Check My Odds - Free
 </Link>
 </div>

 {/* Cross-links */}
 {primaryCountry && (
 <div className="border-t border-border/5 py-8 mb-8">
 <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold mb-4">
 More in {primaryCountry}
 </p>
 <Link
 href={`/schools/country/${slugify(primaryCountry)}`}
 className="text-xs px-3 py-1.5 border border-border/10 hover:border-primary transition-colors font-medium"
 >
 All {primaryCountry} MBA Programs →
 </Link>
 </div>
 )}

 {/* JSON-LD */}
 <script
 type="application/ld+json"
 dangerouslySetInnerHTML={{
 __html: JSON.stringify({
"@context":"https://schema.org",
"@type":"ItemList",
 name: `MBA Programs in ${city}`,
 numberOfItems: schools.length,
 itemListElement: sorted.map((s, i) => ({
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
