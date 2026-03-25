"use client";

import { useState, useEffect, useMemo } from"react";
import Link from"next/link";
import { MapPin, ArrowRight, Search, Award, Users, TrendingUp } from"lucide-react";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import { EmailCapture } from"@/components/EmailCapture";

type School = {
 id: string; name: string; location: string; country: string;
 gmat_avg: number | null; acceptance_rate: number; tuition_usd: number;
 median_salary: string; degree_type: string; class_size: number;
};

export default function CATMBALandingPage() {
 const [schools, setSchools] = useState<School[]>([]);
 const [search, setSearch] = useState("");
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 apiFetch<School[]>(`/api/schools`)
 .then((data) => {
 setSchools(data.filter(s => s.degree_type ==="MBA (CAT)"));
 setLoading(false);
 })
 .catch(() => { setError("Failed to load programs. Please refresh."); setLoading(false); });
 }, []);

 const filtered = useMemo(() => {
 let r = schools;
 if (search) { const q = search.toLowerCase(); r = r.filter(s => s.name.toLowerCase().includes(q) || s.location.toLowerCase().includes(q)); }
 return r.sort((a, b) => a.name.localeCompare(b.name));
 }, [schools, search]);

 const stats = useMemo(() => {
 if (!schools.length) return null;
 return {
 count: schools.length,
 cities: new Set(schools.map(s => s.location?.split(",")[0])).size,
 };
 }, [schools]);

 return (
 <div className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-8">
 <div className="max-w-4xl mx-auto">
 <p className="text-xs uppercase tracking-[0.2em] text-primary mb-4">Program Guide</p>
 <h1 className="heading-serif text-4xl md:text-5xl mb-4">MBA Programs (CAT)</h1>
 <p className="text-white/60 text-lg max-w-2xl leading-relaxed">
 India&apos;s premier MBA programs admit through the Common Admission Test (CAT).
 IIMs, ISB, XLRI, SPJIMR, and other top institutes offer world-class management education
 with some of the best ROI in global business education.
 </p>
 {stats && (
 <div className="grid grid-cols-2 gap-6 mt-10 pt-8 border-t border-border">
 <div><p className="text-2xl font-bold text-primary">{stats.count}</p><p className="text-xs text-white/40">Programs</p></div>
 <div><p className="text-2xl font-bold text-primary">{stats.cities}</p><p className="text-xs text-white/40">Cities</p></div>
 </div>
 )}
 </div>
 </section>

 <section className="max-w-4xl mx-auto px-8 py-12">
 <h2 className="heading-serif text-2xl mb-6">Why Indian MBA Programs Stand Out</h2>
 <div className="grid md:grid-cols-3 gap-4">
 {[
 { icon: <Award size={20} />, title:"Exceptional ROI", desc:"IIM tuition of INR 20-28L with median placements of INR 30-60L. Payback in 1-2 years."},
 { icon: <Users size={20} />, title:"Rigorous Selection", desc:"CAT 99th percentile + interviews. Only top 0.1% of applicants get into IIM-A, B, C."},
 { icon: <TrendingUp size={20} />, title:"Strong Placements", desc:"100% placement record at top IIMs. McKinsey, BCG, Goldman Sachs, Google recruit on campus."},
 ].map((f, i) => (
 <div key={i} className="editorial-card p-6">
 <div className="text-primary mb-3">{f.icon}</div>
 <h3 className="font-bold text-sm mb-1">{f.title}</h3>
 <p className="text-xs text-muted-foreground/60">{f.desc}</p>
 </div>
 ))}
 </div>
 </section>

 <section className="max-w-4xl mx-auto px-8 pb-16">
 <div className="flex items-center gap-4 mb-6">
 <div className="relative flex-1">
 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/30"/>
 <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Indian MBA programs..."
 className="w-full pl-9 pr-4 py-2.5 border border-border/10 text-sm bg-card focus:outline-none focus:border-primary"/>
 </div>
 </div>
 {error && (
 <div role="alert" className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg text-sm mb-4">
 {error}
 </div>
 )}
 <p className="text-xs text-muted-foreground/40 mb-4">{filtered.length} Indian MBA programs</p>
 {loading ? (
 <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 bg-foreground/5 animate-pulse"/>)}</div>
 ) : (
 <div className="space-y-2">
 {filtered.slice(0, 50).map(s => (
 <Link key={s.id} href={`/school/${s.id}`} className="block editorial-card p-4 hover:border-primary/30 transition-colors group">
 <div className="flex items-center justify-between">
 <div className="min-w-0 flex-1">
 <h3 className="font-bold text-sm group-hover:text-primary transition-colors truncate">{s.name}</h3>
 <p className="text-[10px] text-muted-foreground/40 flex items-center gap-1 mt-0.5"><MapPin size={9} /> {s.location}</p>
 </div>
 <div className="flex items-center gap-6 text-xs text-muted-foreground/60 shrink-0 ml-4">
 <span>{s.acceptance_rate}% accept</span>
 <ArrowRight size={14} className="text-muted-foreground/20 group-hover:text-primary transition-colors"/>
 </div>
 </div>
 </Link>
 ))}
 {filtered.length > 50 && (
 <Link href="/schools?degree=MBA+(CAT)" className="block text-center py-4 text-sm font-bold text-primary hover:underline">
 View all {filtered.length} programs →
 </Link>
 )}
 </div>
 )}
 </section>

 <div className="max-w-4xl mx-auto px-8 pb-16">
 <EmailCapture variant="contextual"source="programs-cat"/>
 <ToolCrossLinks current="/programs/cat"/>
 </div>
 </div>
 );
}
