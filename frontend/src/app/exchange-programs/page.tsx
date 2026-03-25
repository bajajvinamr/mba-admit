"use client";

import { useState, useEffect } from"react";
import { MapPin, Clock, BookOpen, Languages } from"lucide-react";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type ExchangeProgram = {
 school_id: string;
 school_name: string;
 partner_school: string;
 partner_country: string;
 region: string;
 duration: string;
 focus_areas: string[];
 language: string;
};

type ExchangeResponse = {
 programs: ExchangeProgram[];
 total: number;
 schools: string[];
 regions: string[];
};

const COUNTRY_FLAGS: Record<string, string> = {
"France / Singapore":"\u{1F1EB}\u{1F1F7}",
 France:"\u{1F1EB}\u{1F1F7}",
 China:"\u{1F1E8}\u{1F1F3}",
 Spain:"\u{1F1EA}\u{1F1F8}",
"United Kingdom":"\u{1F1EC}\u{1F1E7}",
 Singapore:"\u{1F1F8}\u{1F1EC}",
"United States":"\u{1F1FA}\u{1F1F8}",
"Hong Kong":"\u{1F1ED}\u{1F1F0}",
 Germany:"\u{1F1E9}\u{1F1EA}",
 Israel:"\u{1F1EE}\u{1F1F1}",
};

const REGIONS = ["All","Americas","Europe","Asia"];

export default function ExchangeProgramsPage() {
 const [data, setData] = useState<ExchangeResponse | null>(null);
 const [region, setRegion] = useState("All");
 const [schoolFilter, setSchoolFilter] = useState("");
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 setLoading(true);
 const params = new URLSearchParams();
 if (region !=="All") params.set("region", region);
 if (schoolFilter) params.set("school_id", schoolFilter);
 const qs = params.toString();

 setError(null);
 apiFetch<ExchangeResponse>(`/api/exchange-programs${qs ? `?${qs}` :""}`)
 .then(setData)
 .catch(() => { setData(null); setError("Failed to load exchange programs. Please refresh."); })
 .finally(() => setLoading(false));
 }, [region, schoolFilter]);

 // Get unique schools for dropdown from all programs (not filtered)
 const [allSchools, setAllSchools] = useState<[string, string][]>([]);
 useEffect(() => {
 apiFetch<ExchangeResponse>("/api/exchange-programs")
 .then((r) => {
 const map = new Map<string, string>();
 r.programs.forEach((p) => map.set(p.school_id, p.school_name));
 setAllSchools([...map.entries()]);
 })
 .catch(() => setError("Failed to load school list. Please refresh."));
 }, []);

 // Group programs by school
 const grouped = data
 ? data.programs.reduce<Record<string, ExchangeProgram[]>>((acc, p) => {
 if (!acc[p.school_name]) acc[p.school_name] = [];
 acc[p.school_name].push(p);
 return acc;
 }, {})
 : {};

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-4xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Exchange Programs
 </h1>
 <p className="text-white/70 text-lg">Study abroad partnerships at top MBA programs worldwide.</p>
 </div>
 </section>

 <div className="max-w-4xl mx-auto px-6 py-10">
 {/* Filters */}
 <div className="editorial-card p-6 mb-8">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="text-sm font-medium text-muted-foreground block mb-2">Filter by Region</label>
 <div className="flex gap-2 flex-wrap">
 {REGIONS.map((r) => (
 <button
 key={r}
 onClick={() => setRegion(r)}
 className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
 region === r
 ?"bg-primary text-white"
 :"bg-foreground/5 text-muted-foreground hover:bg-foreground/10"
 }`}
 >
 {r}
 </button>
 ))}
 </div>
 </div>
 <div>
 <label className="text-sm font-medium text-muted-foreground block mb-2">Filter by School</label>
 <select
 value={schoolFilter}
 onChange={(e) => setSchoolFilter(e.target.value)}
 className="w-full px-4 py-2.5 border border-border/10 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
 >
 <option value="">All Schools</option>
 {allSchools.map(([id, name]) => (
 <option key={id} value={id}>{name}</option>
 ))}
 </select>
 </div>
 </div>
 </div>

 {error && (
 <div className="editorial-card p-4 mb-6 border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
 )}

 {loading && (
 <div className="text-center py-16">
 <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"/>
 </div>
 )}

 {!loading && data && data.programs.length === 0 && (
 <div className="editorial-card p-8 text-center">
 <p className="text-muted-foreground">No exchange programs found for this filter combination.</p>
 </div>
 )}

 {!loading && data && data.programs.length > 0 && (
 <div className="space-y-8">
 <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
 {data.total} partnership{data.total !== 1 ?"s":""} found
 </p>

 {Object.entries(grouped).map(([schoolName, programs]) => (
 <div key={schoolName}>
 <h2 className="heading-serif text-xl font-bold text-foreground mb-4 font-[family-name:var(--font-heading)]">
 {schoolName}
 </h2>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {programs.map((p, i) => (
 <div key={i} className="editorial-card p-5 hover: transition-shadow">
 <div className="flex items-start justify-between mb-3">
 <div>
 <h3 className="font-bold text-foreground text-lg">{p.partner_school}</h3>
 <div className="flex items-center gap-1.5 mt-1">
 <MapPin size={13} className="text-primary"/>
 <span className="text-sm text-muted-foreground">
 {COUNTRY_FLAGS[p.partner_country] ||""} {p.partner_country}
 </span>
 </div>
 </div>
 <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
 {p.region}
 </span>
 </div>

 <div className="space-y-2 mt-4">
 <div className="flex items-center gap-2">
 <Clock size={13} className="text-muted-foreground"/>
 <span className="text-sm text-muted-foreground">{p.duration}</span>
 </div>
 <div className="flex items-center gap-2">
 <Languages size={13} className="text-muted-foreground"/>
 <span className="text-sm text-muted-foreground">{p.language}</span>
 </div>
 <div className="flex items-start gap-2">
 <BookOpen size={13} className="text-muted-foreground mt-0.5"/>
 <div className="flex flex-wrap gap-1.5">
 {p.focus_areas.map((area) => (
 <span key={area} className="px-2 py-0.5 bg-foreground/5 text-muted-foreground text-xs rounded font-medium">
 {area}
 </span>
 ))}
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 ))}
 </div>
 )}

 <ToolCrossLinks current="/exchange-programs"/>
 </div>
 </main>
 );
}
