"use client";

import { useState, useEffect, useMemo } from"react";
import { motion } from"framer-motion";
import {
 Trophy, GraduationCap, DollarSign, BarChart3, Users,
 ChevronUp, ChevronDown, ArrowRight, Search, Filter,
 TrendingUp, MapPin,
} from"lucide-react";
import Link from"next/link";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type School = {
 id: string;
 name: string;
 location: string;
 country: string;
 gmat_avg: number | null;
 acceptance_rate: number;
 class_size: number;
 tuition_usd: number;
 median_salary: string;
};

type SortKey ="name"|"gmat"|"acceptance"|"tuition"|"salary"|"class_size";

const TIERS = [
 { label:"M7", ids: new Set(["hbs","gsb","wharton","booth","kellogg","cbs","sloan"]) },
 { label:"T15", ids: new Set(["tuck","haas","ross","fuqua","darden","stern","yale-som","johnson"]) },
 { label:"T25", ids: new Set(["anderson","tepper","kenan-flagler","mccombs","marshall","georgetown-mcdonough","emory-goizueta","kelley","olin","foster"]) },
];

function parseSalary(s: string): number {
 const m = s.replace(/[^0-9.]/g,"");
 return parseFloat(m) || 0;
}

export default function RankingsPage() {
 const [schools, setSchools] = useState<School[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [sortKey, setSortKey] = useState<SortKey>("gmat");
 const [sortAsc, setSortAsc] = useState(false);
 const [search, setSearch] = useState("");
 const [tierFilter, setTierFilter] = useState<string>("all");
 const [countryFilter, setCountryFilter] = useState<string>("all");

 useEffect(() => {
 apiFetch<{ schools: School[] }>("/api/schools")
 .then((r) => {
 setSchools(
 r.schools
 .filter((s) => s.name && s.id.length <= 20)
 .sort((a, b) => (b.gmat_avg || 0) - (a.gmat_avg || 0))
 );
 })
 .catch(() => setError("Failed to load school rankings. Please refresh."))
 .finally(() => setLoading(false));
 }, []);

 const countries = useMemo(() => {
 const set = new Set(schools.map((s) => s.country).filter(Boolean));
 return [...set].sort();
 }, [schools]);

 const handleSort = (key: SortKey) => {
 if (sortKey === key) setSortAsc(!sortAsc);
 else { setSortKey(key); setSortAsc(false); }
 };

 const tierIds = TIERS.find((t) => t.label === tierFilter)?.ids;

 const filtered = useMemo(() => {
 let list = schools.filter((s) => {
 if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
 if (tierIds && !tierIds.has(s.id)) return false;
 if (countryFilter !=="all" && s.country !== countryFilter) return false;
 return true;
 });

 list.sort((a, b) => {
 let cmp = 0;
 switch (sortKey) {
 case "name": cmp = a.name.localeCompare(b.name); break;
 case "gmat": cmp = (b.gmat_avg || 0) - (a.gmat_avg || 0); break;
 case "acceptance": cmp = a.acceptance_rate - b.acceptance_rate; break;
 case "tuition": cmp = b.tuition_usd - a.tuition_usd; break;
 case "salary": cmp = parseSalary(b.median_salary) - parseSalary(a.median_salary); break;
 case "class_size": cmp = b.class_size - a.class_size; break;
 }
 return sortAsc ? -cmp : cmp;
 });

 return list;
 }, [schools, search, sortKey, sortAsc, tierIds, countryFilter]);

 const SortIcon = ({ k }: { k: SortKey }) => {
 if (sortKey !== k) return null;
 return sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
 };

 const getTier = (id: string) => {
 for (const t of TIERS) {
 if (t.ids.has(id)) return t.label;
 }
 return null;
 };

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-6xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 MBA School Rankings
 </h1>
 <p className="text-white/70 text-lg">
 Sort by GMAT, selectivity, salary, or tuition - find your tier.
 </p>
 </div>
 </section>

 <div className="max-w-6xl mx-auto px-6 py-10">
 {/* Filters */}
 <div className="flex flex-wrap gap-3 mb-6">
 <div className="relative flex-1 min-w-[200px]">
 <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
 <input
 type="text" placeholder="Search schools..."
 value={search} onChange={(e) => setSearch(e.target.value)}
 className="w-full pl-9 pr-4 py-2.5 border border-border/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
 />
 </div>
 <div className="flex gap-2">
 {["all","M7","T15","T25"].map((t) => (
 <button key={t} onClick={() => setTierFilter(t)}
 className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
 tierFilter === t ?"bg-foreground text-white":"bg-card text-muted-foreground border border-border/10 hover:border-border/30"
 }`}>
 {t ==="all" ?"All": t}
 </button>
 ))}
 </div>
 <select
 value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}
 className="px-3 py-2.5 border border-border/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-card"
 >
 <option value="all">All Countries</option>
 {countries.map((c) => <option key={c} value={c}>{c}</option>)}
 </select>
 </div>

 {error && (
 <div role="alert" className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg text-sm mb-4">
 {error}
 </div>
 )}

 {/* Stats */}
 <p className="text-xs text-muted-foreground mb-4">{filtered.length} school{filtered.length !== 1 ?"s":""}</p>

 {loading ? (
 <div className="text-center py-16 text-muted-foreground">
 <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"/>
 </div>
 ) : (
 <div className="editorial-card overflow-hidden">
 {/* Header */}
 <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-2 px-6 py-3 bg-foreground/5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
 <button onClick={() => handleSort("name")} className="flex items-center gap-1 text-left">School <SortIcon k="name"/></button>
 <button onClick={() => handleSort("gmat")} className="flex items-center gap-1">GMAT <SortIcon k="gmat"/></button>
 <button onClick={() => handleSort("acceptance")} className="flex items-center gap-1">Accept % <SortIcon k="acceptance"/></button>
 <button onClick={() => handleSort("tuition")} className="flex items-center gap-1">Tuition <SortIcon k="tuition"/></button>
 <button onClick={() => handleSort("salary")} className="flex items-center gap-1">Salary <SortIcon k="salary"/></button>
 <button onClick={() => handleSort("class_size")} className="flex items-center gap-1">Class <SortIcon k="class_size"/></button>
 </div>

 {/* Rows */}
 <div className="divide-y divide-jet/5">
 {filtered.slice(0, 100).map((s, i) => {
 const tier = getTier(s.id);
 return (
 <motion.div
 key={s.id}
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ delay: Math.min(i * 0.01, 0.5) }}
 className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-2 px-6 py-4 hover:bg-primary/3 transition-colors items-center"
 >
 <div className="flex items-center gap-3">
 <span className="text-xs text-muted-foreground font-mono w-6">{i + 1}</span>
 <div>
 <Link href={`/school/${s.id}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
 {s.name}
 </Link>
 <div className="flex items-center gap-2 mt-0.5">
 <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
 <MapPin size={8} /> {s.location}
 </span>
 {tier && (
 <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
 tier ==="M7" ?"bg-primary/15 text-primary":
 tier ==="T15" ?"bg-blue-50 text-blue-600":
"bg-foreground/5 text-muted-foreground"
 }`}>{tier}</span>
 )}
 </div>
 </div>
 </div>
 <div className="text-sm font-medium text-foreground md:text-center">
 {s.gmat_avg ||"-"}
 </div>
 <div className="text-sm text-muted-foreground md:text-center">
 {s.acceptance_rate ? `${s.acceptance_rate}%` :"-"}
 </div>
 <div className="text-sm text-muted-foreground md:text-center">
 {s.tuition_usd ? `$${(s.tuition_usd / 1000).toFixed(0)}k` :"-"}
 </div>
 <div className="text-sm text-muted-foreground md:text-center">
 {s.median_salary ||"-"}
 </div>
 <div className="text-sm text-muted-foreground md:text-center">
 {s.class_size ||"-"}
 </div>
 </motion.div>
 );
 })}
 </div>
 </div>
 )}
 <ToolCrossLinks current="/rankings"/>
 </div>
 </main>
 );
}
