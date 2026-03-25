"use client";

import { useState, useEffect } from"react";
import { motion } from"framer-motion";
import {
 MapPin, Home, TreePine, Moon, DollarSign, Users, Dumbbell,
 Thermometer, Star, Building,
} from"lucide-react";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

/* ── Types ─────────────────────────────────────────────────────────── */

type Housing = { on_campus_available: boolean; avg_monthly_rent: number };

type CampusLife = {
 school_id: string;
 school_name: string;
 city: string;
 state_or_country: string;
 climate: string;
 housing: Housing;
 walkability_score: number;
 nightlife_score: number;
 cost_of_living_index: number;
 nearby_attractions: string[];
 student_clubs_count: number;
 sports_facilities: string[];
};

/* ── Helpers ───────────────────────────────────────────────────────── */

function ScoreBar({ score, max = 10, color }: { score: number; max?: number; color: string }) {
 const pct = (score / max) * 100;
 return (
 <div className="h-2 rounded-full bg-foreground/5 w-full overflow-hidden">
 <motion.div
 className={`h-full rounded-full ${color}`}
 initial={{ width: 0 }}
 animate={{ width: `${pct}%` }}
 transition={{ duration: 0.6 }}
 />
 </div>
 );
}

function CostBadge({ index }: { index: number }) {
 let label ="Average";
 let bg ="bg-foreground/5 text-foreground/60";
 if (index >= 150) { label ="Very High"; bg ="bg-red-50 text-red-700"; }
 else if (index >= 120) { label ="High"; bg ="bg-amber-50 text-amber-700"; }
 else if (index < 100) { label ="Below Avg"; bg ="bg-emerald-50 text-emerald-700"; }
 return (
 <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${bg}`}>
 {label} ({index})
 </span>
 );
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function CampusLifePage() {
 const [schools, setSchools] = useState<CampusLife[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [filter, setFilter] = useState<string>("all");

 useEffect(() => {
 setLoading(true);
 apiFetch<{ schools: CampusLife[] }>("/api/campus-life")
 .then((r) => setSchools(r.schools))
 .catch(() => setError("Failed to load campus life data. Please refresh."))
 .finally(() => setLoading(false));
 }, []);

 const filtered = filter ==="all"
 ? schools
 : schools.filter((s) => {
 if (filter ==="affordable") return s.cost_of_living_index < 110;
 if (filter ==="urban") return s.walkability_score >= 8;
 if (filter ==="warm") return s.climate.toLowerCase().includes("mild") || s.climate.toLowerCase().includes("mediterranean");
 return true;
 });

 const FILTERS = [
 { key:"all", label:"All Schools"},
 { key:"affordable", label:"Affordable"},
 { key:"urban", label:"Urban"},
 { key:"warm", label:"Warm Climate"},
 ];

 return (
 <main className="min-h-screen bg-background">
 {/* Hero */}
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-3xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Campus Life Comparison
 </h1>
 <p className="text-white/70 text-lg">
 Housing, nightlife, climate, and more - what life is really like at each school.
 </p>
 </div>
 </section>

 <div className="max-w-3xl mx-auto px-6 py-10">
 {error && (
 <div className="editorial-card p-4 mb-6 border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
 )}
 {/* Filters */}
 <div className="flex gap-2 mb-6 flex-wrap">
 {FILTERS.map((f) => (
 <button
 key={f.key}
 onClick={() => setFilter(f.key)}
 className={`px-4 py-2 text-sm font-medium rounded-full border transition-colors ${
 filter === f.key
 ?"bg-foreground text-white border-border"
 :"bg-card border-border/10 hover:border-border/30"
 }`}
 >
 {f.label}
 </button>
 ))}
 </div>

 {/* Loading */}
 {loading && (
 <div className="text-center py-8">
 <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"/>
 </div>
 )}

 {/* Cards */}
 {!loading && (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
 {filtered.map((s, i) => (
 <motion.div
 key={s.school_id}
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i * 0.04 }}
 className="editorial-card p-6"
 >
 {/* Header */}
 <div className="flex items-start justify-between mb-4">
 <div>
 <h2 className="font-semibold text-foreground text-lg">{s.school_name}</h2>
 <p className="text-xs text-foreground/40 flex items-center gap-1">
 <MapPin size={10} /> {s.city}, {s.state_or_country}
 </p>
 </div>
 <CostBadge index={s.cost_of_living_index} />
 </div>

 {/* Climate */}
 <div className="flex items-start gap-2 mb-4 p-3 bg-foreground/[0.02] rounded-lg">
 <Thermometer size={14} className="text-foreground/30 mt-0.5 shrink-0"/>
 <p className="text-sm text-foreground/60">{s.climate}</p>
 </div>

 {/* Scores */}
 <div className="grid grid-cols-2 gap-4 mb-4">
 <div>
 <div className="flex items-center gap-1.5 mb-1">
 <Building size={12} className="text-foreground/30"/>
 <span className="text-xs text-foreground/40">Walkability</span>
 <span className="ml-auto text-sm font-bold text-foreground">{s.walkability_score}/10</span>
 </div>
 <ScoreBar score={s.walkability_score} color="bg-gradient-to-r from-emerald-400 to-emerald-600"/>
 </div>
 <div>
 <div className="flex items-center gap-1.5 mb-1">
 <Moon size={12} className="text-foreground/30"/>
 <span className="text-xs text-foreground/40">Nightlife</span>
 <span className="ml-auto text-sm font-bold text-foreground">{s.nightlife_score}/10</span>
 </div>
 <ScoreBar score={s.nightlife_score} color="bg-gradient-to-r from-violet-400 to-violet-600"/>
 </div>
 </div>

 {/* Housing */}
 <div className="flex items-center justify-between p-3 bg-foreground/[0.02] rounded-lg mb-4">
 <div className="flex items-center gap-2">
 <Home size={14} className="text-foreground/30"/>
 <span className="text-sm text-foreground/60">Housing</span>
 </div>
 <div className="text-right">
 <span className="text-sm font-bold text-foreground">
 ${s.housing.avg_monthly_rent.toLocaleString()}/mo
 </span>
 <span className={`ml-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
 s.housing.on_campus_available ?"bg-emerald-50 text-emerald-700":"bg-foreground/5 text-foreground/40"
 }`}>
 {s.housing.on_campus_available ?"On-campus":"Off-campus only"}
 </span>
 </div>
 </div>

 {/* Clubs & Facilities */}
 <div className="grid grid-cols-2 gap-4 mb-4">
 <div>
 <div className="flex items-center gap-1.5 mb-2">
 <Users size={12} className="text-foreground/30"/>
 <span className="text-xs text-foreground/40">Student Clubs</span>
 <span className="ml-auto text-sm font-bold text-foreground">{s.student_clubs_count}</span>
 </div>
 </div>
 <div>
 <div className="flex items-center gap-1.5 mb-2">
 <Dumbbell size={12} className="text-foreground/30"/>
 <span className="text-xs text-foreground/40">Sports Facilities</span>
 </div>
 <div className="flex flex-wrap gap-1">
 {s.sports_facilities.slice(0, 3).map((f) => (
 <span key={f} className="text-[10px] bg-foreground/5 text-foreground/60 px-2 py-0.5 rounded-full">
 {f}
 </span>
 ))}
 {s.sports_facilities.length > 3 && (
 <span className="text-[10px] text-foreground/30">+{s.sports_facilities.length - 3}</span>
 )}
 </div>
 </div>
 </div>

 {/* Attractions */}
 <div>
 <div className="flex items-center gap-1.5 mb-2">
 <Star size={12} className="text-primary"/>
 <span className="text-xs text-foreground/40">Nearby Attractions</span>
 </div>
 <div className="flex flex-wrap gap-1.5">
 {s.nearby_attractions.map((a) => (
 <span key={a} className="text-[10px] bg-primary/10 text-foreground/70 px-2 py-1 rounded-full">
 {a}
 </span>
 ))}
 </div>
 </div>
 </motion.div>
 ))}

 {filtered.length === 0 && !loading && (
 <div className="text-center py-16 text-foreground/30">
 <TreePine size={48} className="mx-auto mb-4 opacity-30"/>
 <p>No schools match this filter</p>
 </div>
 )}

 <ToolCrossLinks current="/campus-life"/>
 </motion.div>
 )}

 {/* Empty state */}
 {!loading && schools.length === 0 && (
 <div className="text-center py-16 text-foreground/30">
 <MapPin size={48} className="mx-auto mb-4 opacity-30"/>
 <p>Campus life data is loading...</p>
 </div>
 )}
 </div>
 </main>
 );
}
