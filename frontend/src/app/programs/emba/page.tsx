"use client";

import { useState, useEffect, useMemo } from"react";
import Link from"next/link";
import { Briefcase, MapPin, TrendingUp, Clock, DollarSign, ArrowRight, Search } from"lucide-react";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type School = {
 id: string; name: string; location: string; country: string;
 gmat_avg: number | null; acceptance_rate: number; tuition_usd: number;
 median_salary: string; degree_type: string; class_size: number;
};

export default function EMBALandingPage() {
 const [schools, setSchools] = useState<School[]>([]);
 const [search, setSearch] = useState("");
 const [country, setCountry] = useState("");
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 apiFetch<School[]>(`/api/schools`)
 .then((data) => {
 setSchools(data.filter(s => s.degree_type ==="Executive MBA"));
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
 <h1 className="heading-serif text-4xl md:text-5xl mb-4">Executive MBA Programs</h1>
 <p className="text-white/60 text-lg max-w-2xl leading-relaxed">
 The Executive MBA is designed for senior professionals with 8+ years of experience
 who want to accelerate into leadership roles without leaving their careers.
 Weekend/modular formats allow you to earn a top MBA while working.
 </p>
 {stats && (
 <div className="grid grid-cols-4 gap-6 mt-10 pt-8 border-t border-border">
 <div><p className="text-2xl font-bold text-primary">{stats.count}</p><p className="text-xs text-white/40">Programs</p></div>
 <div><p className="text-2xl font-bold text-primary">{stats.avgGmat ||"Varies"}</p><p className="text-xs text-white/40">Avg GMAT</p></div>
 <div><p className="text-2xl font-bold text-primary">${(stats.avgTuition / 1000).toFixed(0)}K</p><p className="text-xs text-white/40">Avg Tuition</p></div>
 <div><p className="text-2xl font-bold text-primary">{stats.countries}</p><p className="text-xs text-white/40">Countries</p></div>
 </div>
 )}
 </div>
 </section>

 <section className="max-w-4xl mx-auto px-8 py-12">
 <h2 className="heading-serif text-2xl mb-6">Is an EMBA Right for You?</h2>
 <div className="grid md:grid-cols-3 gap-4">
 {[
 { icon: <Briefcase size={20} />, title:"Keep Your Career", desc:"Weekend and modular formats let you maintain your salary and seniority while studying."},
 { icon: <TrendingUp size={20} />, title:"Senior Cohort", desc:"Average 14 years of experience. Your classmates are VPs, directors, and entrepreneurs."},
 { icon: <Clock size={20} />, title:"Fast Track", desc:"16-22 months to completion. Many programs offer global modules across 3-4 countries."},
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
 <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search EMBA programs..."
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
 <p className="text-xs text-muted-foreground/40 mb-4">{filtered.length} Executive MBA programs</p>
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
 <Link href="/schools?degree=Executive+MBA" className="block text-center py-4 text-sm font-bold text-primary hover:underline">
 View all {filtered.length} Executive MBA programs →
 </Link>
 )}
 </div>
 )}
 </section>

 <div className="max-w-4xl mx-auto px-8 pb-16">
 <ToolCrossLinks current="/programs/emba"/>
 </div>
 </div>
 );
}
