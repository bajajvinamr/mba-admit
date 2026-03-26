import { Metadata } from"next";
import { notFound } from"next/navigation";
import Link from"next/link";
import { deslugify, slugify, REGIONS } from"@/lib/geo";
import { API_BASE } from"@/lib/api";
import { Breadcrumb } from"@/components/ui/Breadcrumb";

type School = {
 id: string; name: string; location: string; country: string;
 gmat_avg: number; median_salary: string; acceptance_rate: number;
 class_size: number; specializations: string[];
 tuition_usd: number; stem_designated: boolean;
};

export const dynamic ="force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function getSchools(country: string): Promise<School[]> {
 const res = await fetch(`${API_BASE}/api/schools?country=${encodeURIComponent(country)}`, {
 next: { revalidate: 3600 },
 });
 if (!res.ok) return [];
 return res.json();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
 const { slug } = await params;
 const country = deslugify(slug);
 const schools = await getSchools(country);
 const count = schools.length;
 const avgGmat = count > 0
 ? Math.round(schools.reduce((s, sc) => s + (sc.gmat_avg || 0), 0) / count)
 : 0;

 return {
 title: `Top ${count} MBA Programs in ${country} - GMAT, Rankings & Admissions`,
 description: `Browse ${count} MBA programs in ${country}. Average GMAT: ${avgGmat}. Compare acceptance rates, tuition, salaries, and find your best fit.`,
 openGraph: {
 title: `MBA Programs in ${country} | Admit Compass`,
 description: `Explore ${count} MBA programs in ${country} with detailed stats and admissions data.`,
 type:"website",
 siteName:"Admit Compass",
 },
 };
}

export default async function CountryPage({ params }: Props) {
 const { slug } = await params;
 const country = deslugify(slug);
 const schools = await getSchools(country);

 if (schools.length === 0) notFound();

 const avgGmat = Math.round(schools.reduce((s, sc) => s + (sc.gmat_avg || 0), 0) / schools.length);
 const sorted = [...schools].sort((a, b) => b.gmat_avg - a.gmat_avg);

 const regionEntry = Object.entries(REGIONS).find(([, r]) => r.countries.includes(country));
 const cities = [...new Set(schools.map(s => s.location.split(",")[0].trim()))].filter(Boolean).sort();

 return (
 <div className="max-w-7xl mx-auto px-8">
 <Breadcrumb items={[
   { label: "Schools", href: "/schools" },
   { label: country },
 ]} />

 <div className="py-8 border-b border-border/5 mb-8">
 <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/40 mb-3 font-medium">
 MBA Programs by Country
 </p>
 <h1 className="heading-serif text-4xl md:text-5xl mb-3">
 Top MBA Programs in {country}
 </h1>
 <p className="text-muted-foreground/50 max-w-2xl">
 {schools.length} MBA programs in {country}. Average GMAT: {avgGmat}.
 Compare schools, check your odds, and find your best fit.
 </p>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
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
 <div className="bg-card border border-border/5 p-4 text-center">
 <p className="text-2xl font-bold text-foreground">{cities.length}</p>
 <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold">Cities</p>
 </div>
 </div>

 {cities.length > 1 && (
 <div className="flex flex-wrap gap-2 mb-8">
 {cities.slice(0, 15).map(city => (
 <Link
 key={city}
 href={`/schools/city/${slugify(city)}`}
 className="text-xs px-3 py-1.5 bg-card border border-border/10 hover:border-primary transition-colors font-medium"
 >
 {city}
 </Link>
 ))}
 </div>
 )}

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-foreground/5 mb-12">
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

 <div className="bg-foreground p-8 text-center text-white mb-12">
 <h3 className="heading-serif text-2xl mb-3">Check your odds at these {schools.length} schools</h3>
 <p className="text-white/50 mb-6 text-sm">Enter your GMAT and GPA to see which {country} programs are reaches, targets, and safeties.</p>
 <Link href="/#calc" className="inline-block bg-primary text-foreground px-8 py-3 font-bold uppercase tracking-widest text-sm hover:scale-105 transition-transform">
 Check My Odds - Free
 </Link>
 </div>

 {regionEntry && (
 <div className="border-t border-border/5 py-8 mb-8">
 <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold mb-4">
 Also explore in {regionEntry[1].name}
 </p>
 <div className="flex flex-wrap gap-2">
 {regionEntry[1].countries
 .filter(c => c !== country)
 .slice(0, 8)
 .map(c => (
 <Link
 key={c}
 href={`/schools/country/${slugify(c)}`}
 className="text-xs px-3 py-1.5 border border-border/10 hover:border-primary transition-colors font-medium"
 >
 {c}
 </Link>
 ))}
 </div>
 </div>
 )}

 <script
 type="application/ld+json"
 dangerouslySetInnerHTML={{
 __html: JSON.stringify({
"@context":"https://schema.org",
"@type":"ItemList",
 name: `MBA Programs in ${country}`,
 numberOfItems: schools.length,
 itemListElement: sorted.slice(0, 20).map((s, i) => ({
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
