"use client";

import { useState, useEffect, useMemo } from"react";
import Link from"next/link";
import { GraduationCap, MapPin, TrendingUp, Clock, Globe, ArrowRight, Search } from"lucide-react";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import { EmailCapture } from"@/components/EmailCapture";

type School = {
 id: string; name: string; location: string; country: string;
 gmat_avg: number | null; acceptance_rate: number; tuition_usd: number;
 median_salary: string; degree_type: string; class_size: number;
};

export default function MiMLandingPage() {
 const [schools, setSchools] = useState<School[]>([]);
 const [search, setSearch] = useState("");
 const [country, setCountry] = useState("");
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 apiFetch<School[]>(`/api/schools`)
 .then((data) => {
 setSchools(data.filter(s => s.degree_type ==="MiM"));
 setLoading(false);
 })
 .catch(() => { setError("Failed to load programs. Please refresh."); setLoading(false); });
 }, []);

 const countries = useMemo(() => Array.from(new Set(schools.map(s => s.country).filter(Boolean))).sort(), [schools]);

 const filtered = useMemo(() => {
 let r = schools;
 if (search) { const q = search.toLowerCase(); r = r.filter(s => s.name.toLowerCase().includes(q) || s.location.toLowerCase().includes(q)); }
 if (country) r = r.filter(s => s.country === country);
 return r.sort((a, b) => (b.gmat_avg || 0) - (a.gmat_avg || 0));
 }, [schools, search, country]);

 const stats = useMemo(() => {
 if (!schools.length) return null;
 const gmats = schools.filter(s => s.gmat_avg).map(s => s.gmat_avg!);
 const tuitions = schools.filter(s => s.tuition_usd).map(s => s.tuition_usd);
 return {
 count: schools.length,
 avgGmat: gmats.length ? Math.round(gmats.reduce((a, b) => a + b, 0) / gmats.length) : 0,
 avgTuition: tuitions.length ? Math.round(tuitions.reduce((a, b) => a + b, 0) / tuitions.length) : 0,
 countries: new Set(schools.map(s => s.country)).size,
 };
 }, [schools]);

 return (
 <div className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-8">
 <div className="max-w-4xl mx-auto">
 <p className="text-xs uppercase tracking-[0.2em] text-primary mb-4">Program Guide</p>
 <h1 className="heading-serif text-4xl md:text-5xl mb-4">Masters in Management (MiM)</h1>
 <p className="text-white/60 text-lg max-w-2xl leading-relaxed">
 The MiM is a pre-experience master&apos;s degree designed for recent graduates with 0-2 years
 of work experience. Popular in Europe and Asia, MiM programs offer rigorous business
 fundamentals at a fraction of the MBA cost.
 </p>
 {stats && (
 <div className="grid grid-cols-4 gap-6 mt-10 pt-8 border-t border-border">
 <div><p className="text-2xl font-bold text-primary">{stats.count}</p><p className="text-xs text-white/40">Programs</p></div>
 <div><p className="text-2xl font-bold text-primary">{stats.avgGmat ||"GMAT/GRE"}</p><p className="text-xs text-white/40">{stats.avgGmat ?"Avg GMAT":"Test Type"}</p></div>
 <div><p className="text-2xl font-bold text-primary">${(stats.avgTuition / 1000).toFixed(0)}K</p><p className="text-xs text-white/40">Avg Tuition</p></div>
 <div><p className="text-2xl font-bold text-primary">{stats.countries}</p><p className="text-xs text-white/40">Countries</p></div>
 </div>
 )}
 </div>
 </section>

 <section className="max-w-4xl mx-auto px-8 py-12">
 <h2 className="heading-serif text-2xl mb-6">MiM vs MBA: Key Differences</h2>
 <div className="editorial-card overflow-hidden">
 <table className="w-full text-sm">
 <thead><tr className="bg-foreground text-white text-xs uppercase tracking-wider">
 <th className="p-3 text-left">Aspect</th><th className="p-3 text-left">MiM</th><th className="p-3 text-left">MBA</th>
 </tr></thead>
 <tbody className="divide-y divide-jet/5">
 {[
 ["Experience Required","0-2 years","3-7 years"],
 ["Typical Duration","10-18 months","12-24 months"],
 ["Average Tuition","$20K-$50K","$60K-$150K"],
 ["Average Age","22-25","27-32"],
 ["Best For","Career starters","Career switchers"],
 ["Geographic Focus","Europe & Asia","Global (US-dominated)"],
 ].map(([aspect, mim, mba], i) => (
 <tr key={i} className={i % 2 === 0 ?"bg-background":""}>
 <td className="p-3 font-medium">{aspect}</td>
 <td className="p-3 text-primary">{mim}</td>
 <td className="p-3 text-muted-foreground/60">{mba}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </section>

 <section className="max-w-4xl mx-auto px-8 pb-16">
 <div className="flex items-center gap-4 mb-6">
 <div className="relative flex-1">
 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/30"/>
 <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search MiM programs..."
 className="w-full pl-9 pr-4 py-2.5 border border-border/10 text-sm bg-card focus:outline-none focus:border-primary"/>
 </div>
 <select value={country} onChange={e => setCountry(e.target.value)}
 className="border border-border/10 px-3 py-2.5 text-sm bg-card min-w-[140px]">
 <option value="">All Countries</option>
 {countries.map(c => <option key={c} value={c}>{c}</option>)}
 </select>
 </div>
 {error && (
 <div role="alert" className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg text-sm mb-4">
 {error}
 </div>
 )}
 <p className="text-xs text-muted-foreground/40 mb-4">{filtered.length} MiM programs</p>
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
 {s.gmat_avg && <span>GMAT {s.gmat_avg}</span>}
 <span>${(s.tuition_usd / 1000).toFixed(0)}K</span>
 <ArrowRight size={14} className="text-muted-foreground/20 group-hover:text-primary transition-colors"/>
 </div>
 </div>
 </Link>
 ))}
 {filtered.length > 50 && (
 <Link href="/schools?degree=MiM" className="block text-center py-4 text-sm font-bold text-primary hover:underline">
 View all {filtered.length} MiM programs →
 </Link>
 )}
 </div>
 )}
 </section>

 <div className="max-w-4xl mx-auto px-8 pb-16">
 <EmailCapture variant="contextual"source="programs-mim"/>
 <ToolCrossLinks current="/programs/mim"/>
 </div>
 </div>
 );
}
