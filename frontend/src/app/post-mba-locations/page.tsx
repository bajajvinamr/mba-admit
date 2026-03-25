"use client";

import { useState, useEffect } from"react";
import { MapPin, DollarSign, Star, Globe, Briefcase, ArrowUpDown } from"lucide-react";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type Location = {
 city: string;
 country: string;
 top_industries: string[];
 avg_mba_salary: number;
 cost_of_living_index: number;
 quality_of_life_score: number;
 visa_friendliness: string;
 top_employers: string[];
 feeder_schools: string[];
};

const SORT_OPTIONS = [
 { value:"avg_mba_salary", label:"Salary (High to Low)"},
 { value:"quality_of_life_score", label:"Quality of Life"},
 { value:"cost_of_living_index", label:"Cost of Living"},
 { value:"city", label:"City Name"},
];

function fmt(n: number) {
 return "$"+ n.toLocaleString("en-US");
}

export default function PostMbaLocationsPage() {
 const [locations, setLocations] = useState<Location[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState("");
 const [sortBy, setSortBy] = useState("avg_mba_salary");

 const fetchData = async () => {
 setLoading(true);
 setError("");
 try {
 const res = await apiFetch<{ locations: Location[]; total: number }>(
 `/api/post-mba-locations?sort_by=${sortBy}`
 );
 setLocations(res.locations);
 } catch (e: unknown) {
 setError(e instanceof Error ? e.message :"Failed to load data");
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => { fetchData(); }, [sortBy]);

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-4xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Post-MBA Location Guide
 </h1>
 <p className="text-white/70 text-lg">
 Compare cities where MBA graduates launch their careers - salaries, cost of living, and visa info.
 </p>
 </div>
 </section>

 <div className="max-w-5xl mx-auto px-6 py-10">
 {/* Sort control */}
 <div className="editorial-card p-4 mb-8 flex items-center gap-4">
 <ArrowUpDown size={16} className="text-foreground/30"/>
 <span className="text-xs font-bold uppercase tracking-widest text-foreground/40">Sort by</span>
 <select
 value={sortBy}
 onChange={(e) => setSortBy(e.target.value)}
 className="px-4 py-2 border border-border/10 rounded-lg text-sm font-medium bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
 >
 {SORT_OPTIONS.map((o) => (
 <option key={o.value} value={o.value}>{o.label}</option>
 ))}
 </select>
 </div>

 {error && (
 <div className="editorial-card p-4 mb-6 border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
 )}

 {loading ? (
 <div className="text-center py-16 text-foreground/30">Loading location data...</div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
 {locations.map((loc) => (
 <div key={loc.city} className="editorial-card p-6">
 {/* Header */}
 <div className="flex items-start justify-between mb-4">
 <div>
 <div className="flex items-center gap-2">
 <MapPin size={16} className="text-primary"/>
 <h3 className="text-lg font-bold text-foreground">{loc.city}</h3>
 </div>
 <p className="text-xs text-foreground/40 ml-6">{loc.country}</p>
 </div>
 <div className="text-right">
 <p className="text-xl font-bold text-foreground">{fmt(loc.avg_mba_salary)}</p>
 <p className="text-[10px] text-foreground/40">avg MBA salary</p>
 </div>
 </div>

 {/* Metrics row */}
 <div className="flex gap-4 mb-4 pb-4 border-b border-border/5">
 <div className="flex items-center gap-1">
 <Star size={12} className="text-primary"/>
 <span className="text-sm font-medium text-foreground">{loc.quality_of_life_score}</span>
 <span className="text-[10px] text-foreground/30">/10 QoL</span>
 </div>
 <div className="flex items-center gap-1">
 <DollarSign size={12} className="text-foreground/30"/>
 <span className="text-sm font-medium text-foreground">{loc.cost_of_living_index}</span>
 <span className="text-[10px] text-foreground/30">CoL index</span>
 </div>
 </div>

 {/* Industries */}
 <div className="mb-3">
 <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-1">Top Industries</p>
 <div className="flex flex-wrap gap-1">
 {loc.top_industries.map((ind) => (
 <span key={ind} className="text-xs bg-foreground/5 text-foreground/60 px-2 py-0.5 rounded">{ind}</span>
 ))}
 </div>
 </div>

 {/* Top Employers */}
 <div className="mb-3">
 <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-1">Top Employers</p>
 <p className="text-sm text-foreground/60">{loc.top_employers.join(",")}</p>
 </div>

 {/* Feeder Schools */}
 <div className="mb-3">
 <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-1">Feeder Schools</p>
 <p className="text-sm text-foreground/60">{loc.feeder_schools.join(",")}</p>
 </div>

 {/* Visa */}
 <div className="border-t border-border/5 pt-3">
 <div className="flex items-start gap-1">
 <Globe size={12} className="text-foreground/30 mt-0.5 shrink-0"/>
 <p className="text-xs text-foreground/50">{loc.visa_friendliness}</p>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}

 <ToolCrossLinks current="/post-mba-locations"count={6} />
 </div>
 </main>
 );
}
