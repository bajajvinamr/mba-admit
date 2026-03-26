"use client";

import { useState, useEffect } from"react";
import { Globe, Plane, Briefcase, Users, ChevronRight } from"lucide-react";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type VisaInfo = {
 country: string;
 available: boolean;
 student_visa?: string;
 work_permit?: string;
 stem_extension?: boolean;
 spouse_work?: string;
 post_grad_options?: string[];
 tips?: string[];
 message?: string;
 countries_available?: string[];
};

export default function VisaPage() {
 const [countries, setCountries] = useState<string[]>([]);
 const [selected, setSelected] = useState("United States");
 const [info, setInfo] = useState<VisaInfo | null>(null);
 const [loading, setLoading] = useState(false);

 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 apiFetch<{ countries: string[] }>("/api/visa-info/countries")
 .then((r) => setCountries(r.countries))
 .catch(() => setError("Failed to load countries. Please refresh."));
 }, []);

 useEffect(() => {
 setLoading(true);
 apiFetch<VisaInfo>(`/api/visa-info?country=${encodeURIComponent(selected)}`)
 .then(setInfo)
 .catch(() => { setInfo(null); setError("Failed to load visa info. Please try again."); })
 .finally(() => setLoading(false));
 }, [selected]);

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-4xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Visa & Work Permits
 </h1>
 <p className="text-white/70 text-lg">Post-MBA work authorization by country.</p>
 </div>
 </section>

 <div className="max-w-4xl mx-auto px-6 py-10">
 {error && (
 <div className="editorial-card p-4 mb-6 border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
 )}
 {/* Country selector */}
 <div className="editorial-card p-6 mb-8">
 <label className="text-sm font-medium text-muted-foreground block mb-2">Select Country</label>
 <select value={selected} onChange={(e) => setSelected(e.target.value)}
 className="w-full px-4 py-3 border border-border/10 rounded-lg text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/50">
 {countries.map((c) => <option key={c} value={c}>{c}</option>)}
 </select>
 </div>

 {loading && (
 <div className="text-center py-16">
 <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"/>
 </div>
 )}

 {info && info.available && !loading && (
 <div className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="editorial-card p-5">
 <div className="flex items-center gap-2 mb-2 text-primary">
 <Plane size={18} />
 <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Student Visa</span>
 </div>
 <p className="text-lg font-bold text-foreground">{info.student_visa}</p>
 </div>

 <div className="editorial-card p-5">
 <div className="flex items-center gap-2 mb-2 text-primary">
 <Briefcase size={18} />
 <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Work Permit</span>
 </div>
 <p className="text-lg font-bold text-foreground">{info.work_permit}</p>
 </div>

 <div className="editorial-card p-5">
 <div className="flex items-center gap-2 mb-2 text-primary">
 <Users size={18} />
 <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Spouse Work</span>
 </div>
 <p className="text-sm text-foreground">{info.spouse_work}</p>
 </div>

 <div className="editorial-card p-5">
 <div className="flex items-center gap-2 mb-2 text-primary">
 <Globe size={18} />
 <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">STEM Extension</span>
 </div>
 <p className="text-lg font-bold text-foreground">{info.stem_extension ?"Yes - 36 months":"Not applicable"}</p>
 </div>
 </div>

 {info.post_grad_options && (
 <div className="editorial-card p-5">
 <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Post-Graduation Pathways</h3>
 <div className="flex flex-wrap gap-2">
 {info.post_grad_options.map((opt) => (
 <span key={opt} className="px-3 py-1.5 bg-primary/10 text-primary text-sm rounded-full font-medium">{opt}</span>
 ))}
 </div>
 </div>
 )}

 {info.tips && info.tips.length > 0 && (
 <div className="editorial-card p-5">
 <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Key Tips</h3>
 <ul className="space-y-2">
 {info.tips.map((tip, i) => (
 <li key={i} className="flex items-start gap-2 text-sm text-foreground">
 <ChevronRight size={14} className="text-primary mt-0.5 shrink-0"/>
 {tip}
 </li>
 ))}
 </ul>
 </div>
 )}
 </div>
 )}

 {info && !info.available && !loading && (
 <div className="editorial-card p-8 text-center">
 <p className="text-muted-foreground mb-2">{info.message}</p>
 </div>
 )}

 <ToolCrossLinks current="/visa"/>
 </div>
 </main>
 );
}
