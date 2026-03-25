"use client";

import { useState, useEffect, useMemo } from"react";
import {
 TrendingDown,
 TrendingUp,
 Minus,
 GraduationCap,
 BarChart3,
 Users,
} from"lucide-react";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

/* -- Types ----------------------------------------------------------------- */

type YearRecord = {
 year: number;
 acceptance_rate: number;
 applications: number;
 class_size: number;
};

type SchoolHistory = {
 school_id: string;
 school_name: string;
 years: YearRecord[];
 trend:"up"|"down"|"stable";
};

type HistoryResponse = {
 schools: SchoolHistory[];
 total: number;
};

/* -- Constants ------------------------------------------------------------- */

const ALL_SCHOOLS = [
 { id:"hbs", name:"Harvard Business School"},
 { id:"gsb", name:"Stanford GSB"},
 { id:"wharton", name:"Wharton"},
 { id:"booth", name:"Chicago Booth"},
 { id:"kellogg", name:"Kellogg"},
 { id:"cbs", name:"Columbia"},
 { id:"sloan", name:"MIT Sloan"},
 { id:"tuck", name:"Dartmouth Tuck"},
 { id:"haas", name:"Berkeley Haas"},
 { id:"stern", name:"NYU Stern"},
 { id:"ross", name:"Michigan Ross"},
 { id:"fuqua", name:"Duke Fuqua"},
];

const SCHOOL_COLORS = [
"#B8860B","#1a1a2e","#3B82F6","#10B981","#8B5CF6",
"#F43F5E","#F59E0B","#06B6D4","#EC4899","#6366F1",
"#14B8A6","#A855F7",
];

const YEARS = [2022, 2023, 2024, 2025, 2026];

/* -- Helpers --------------------------------------------------------------- */

function TrendBadge({ direction, value }: { direction: string; value?: string }) {
 if (direction ==="up") {
 return (
 <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-medium">
 <TrendingUp size={10} /> {value ||"Rising"}
 </span>
 );
 }
 if (direction ==="down") {
 return (
 <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-medium">
 <TrendingDown size={10} /> {value ||"Falling"}
 </span>
 );
 }
 return (
 <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-foreground/5 text-foreground/40 text-[10px] font-medium">
 <Minus size={10} /> Stable
 </span>
 );
}

/* -- Page ------------------------------------------------------------------ */

export default function AcceptanceHistoryPage() {
 const [data, setData] = useState<HistoryResponse | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [selected, setSelected] = useState<string[]>(["hbs","gsb","wharton"]);

 useEffect(() => {
 if (selected.length === 0) {
 setData(null);
 setLoading(false);
 return;
 }
 setLoading(true);
 setError(null);
 apiFetch<HistoryResponse>(
 `/api/acceptance-rate-history?school_id=${selected.join(",")}`
 )
 .then(setData)
 .catch(() => { setData(null); setError("Failed to load acceptance rate data. Please try again."); })
 .finally(() => setLoading(false));
 }, [selected]);

 const toggleSchool = (id: string) =>
 setSelected((prev) =>
 prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
 );

 /* -- Bar chart data -- */
 const barData = useMemo(() => {
 if (!data?.schools.length) return null;

 const maxRate = Math.max(
 ...data.schools.flatMap((s) => s.years.map((y) => y.acceptance_rate))
 );

 return { maxRate: Math.ceil(maxRate / 5) * 5 };
 }, [data]);

 /* -- YoY changes -- */
 const yoyChanges = useMemo(() => {
 if (!data) return [];
 return data.schools.map((school) => {
 const yrs = school.years;
 if (yrs.length < 2) return { school, change: 0, changeStr:"0.0%"};
 const latest = yrs[yrs.length - 1].acceptance_rate;
 const prev = yrs[yrs.length - 2].acceptance_rate;
 const change = latest - prev;
 return {
 school,
 change,
 changeStr: `${change >= 0 ?"+":""}${change.toFixed(1)}pp`,
 };
 });
 }, [data]);

 return (
 <main className="min-h-screen bg-background">
 {/* Hero */}
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-5xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Acceptance Rate History
 </h1>
 <p className="text-white/70 text-lg max-w-2xl mx-auto">
 Track how competitive top MBA programs have become over 5 years.
 Compare acceptance rates, application volumes, and class sizes.
 </p>
 </div>
 </section>

 <div className="max-w-5xl mx-auto px-6 py-10">
 {/* School Multi-Select */}
 <div className="editorial-card p-4 mb-6">
 <p className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-3">
 Select Schools
 </p>
 <div className="flex flex-wrap gap-1.5">
 {ALL_SCHOOLS.map((s, i) => (
 <button
 key={s.id}
 onClick={() => toggleSchool(s.id)}
 className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
 selected.includes(s.id)
 ?"text-white"
 :"bg-foreground/5 text-foreground/60 hover:bg-foreground/10"
 }`}
 style={
 selected.includes(s.id)
 ? { backgroundColor: SCHOOL_COLORS[i % SCHOOL_COLORS.length] }
 : undefined
 }
 >
 {s.name}
 </button>
 ))}
 </div>
 </div>

 {error && (
 <div role="alert" className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg text-sm mb-4">
 {error}
 </div>
 )}

 {/* Loading */}
 {loading && (
 <div className="text-center py-12">
 <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"/>
 </div>
 )}

 {/* Chart + Data */}
 {!loading && data && barData && (
 <>
 {/* CSS Bar Chart */}
 <div className="editorial-card p-6 mb-6">
 <h2 className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-4">
 Acceptance Rate by Year
 </h2>

 {YEARS.map((year) => (
 <div key={year} className="mb-5">
 <p className="text-xs font-semibold text-foreground/50 mb-2">{year}</p>
 <div className="space-y-1.5">
 {data.schools.map((school, si) => {
 const yearData = school.years.find((y) => y.year === year);
 if (!yearData) return null;
 const pct = (yearData.acceptance_rate / barData.maxRate) * 100;
 const colorIdx = ALL_SCHOOLS.findIndex(
 (s) => s.id === school.school_id
 );

 return (
 <div key={school.school_id} className="flex items-center gap-2">
 <span className="text-[10px] text-foreground/50 w-28 text-right shrink-0 truncate">
 {school.school_name}
 </span>
 <div className="flex-1 bg-foreground/5 rounded-full h-5 relative overflow-hidden">
 <div
 className="h-full rounded-full transition-all duration-500"
 style={{
 width: `${pct}%`,
 backgroundColor:
 SCHOOL_COLORS[
 colorIdx >= 0 ? colorIdx : si % SCHOOL_COLORS.length
 ],
 }}
 />
 </div>
 <span className="text-[10px] font-semibold text-foreground/60 w-12 tabular-nums">
 {yearData.acceptance_rate.toFixed(1)}%
 </span>
 </div>
 );
 })}
 </div>
 </div>
 ))}
 </div>

 {/* YoY Change Cards */}
 <div className="editorial-card p-6 mb-6">
 <h2 className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-4">
 Year-over-Year Change (2025 to 2026)
 </h2>
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
 {yoyChanges.map(({ school, change, changeStr }) => {
 const direction =
 change > 0 ?"up": change < 0 ?"down":"stable";
 const latest = school.years[school.years.length - 1];
 return (
 <div
 key={school.school_id}
 className="p-3 border border-border/5 rounded-lg flex items-center justify-between"
 >
 <div>
 <p className="text-sm font-medium text-foreground">
 {school.school_name}
 </p>
 <p className="text-lg font-bold text-foreground tabular-nums">
 {latest.acceptance_rate.toFixed(1)}%
 </p>
 <p className="text-[10px] text-foreground/40">
 {latest.applications.toLocaleString()} apps
 </p>
 </div>
 <TrendBadge direction={direction} value={changeStr} />
 </div>
 );
 })}
 </div>
 </div>

 {/* Data Table */}
 <div className="editorial-card overflow-hidden mb-6">
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-border/10">
 <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-foreground/40">
 School
 </th>
 {YEARS.map((yr) => (
 <th
 key={yr}
 className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-foreground/40"
 >
 {yr}
 </th>
 ))}
 <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-foreground/40">
 Trend
 </th>
 </tr>
 </thead>
 <tbody>
 {data.schools.map((school) => (
 <tr
 key={school.school_id}
 className="border-b border-border/5 hover:bg-primary/3 transition-colors"
 >
 <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
 {school.school_name}
 </td>
 {school.years.map((y) => (
 <td
 key={y.year}
 className="px-3 py-3 text-center tabular-nums"
 >
 <span className="text-foreground/70">
 {y.acceptance_rate.toFixed(1)}%
 </span>
 <br />
 <span className="text-[10px] text-foreground/30">
 {y.applications.toLocaleString()}
 </span>
 </td>
 ))}
 <td className="px-3 py-3 text-center">
 <TrendBadge direction={school.trend} />
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 {/* Summary Stats */}
 <div className="editorial-card p-6 mb-6">
 <h2 className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-4">
 2026 Snapshot
 </h2>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div className="text-center">
 <BarChart3 size={20} className="mx-auto mb-1 text-primary"/>
 <p className="text-2xl font-bold text-foreground tabular-nums">
 {(
 data.schools.reduce(
 (sum, s) =>
 sum +
 (s.years.find((y) => y.year === 2026)
 ?.acceptance_rate ?? 0),
 0
 ) / data.schools.length
 ).toFixed(1)}
 %
 </p>
 <p className="text-[10px] text-foreground/40 uppercase tracking-wider">
 Avg Acceptance Rate
 </p>
 </div>
 <div className="text-center">
 <Users size={20} className="mx-auto mb-1 text-primary"/>
 <p className="text-2xl font-bold text-foreground tabular-nums">
 {data.schools
 .reduce(
 (sum, s) =>
 sum +
 (s.years.find((y) => y.year === 2026)?.applications ??
 0),
 0
 )
 .toLocaleString()}
 </p>
 <p className="text-[10px] text-foreground/40 uppercase tracking-wider">
 Total Applications
 </p>
 </div>
 <div className="text-center">
 <GraduationCap size={20} className="mx-auto mb-1 text-primary"/>
 <p className="text-2xl font-bold text-foreground tabular-nums">
 {data.schools
 .reduce(
 (sum, s) =>
 sum +
 (s.years.find((y) => y.year === 2026)?.class_size ??
 0),
 0
 )
 .toLocaleString()}
 </p>
 <p className="text-[10px] text-foreground/40 uppercase tracking-wider">
 Total Seats
 </p>
 </div>
 <div className="text-center">
 <TrendingDown size={20} className="mx-auto mb-1 text-primary"/>
 <p className="text-2xl font-bold text-foreground tabular-nums">
 {data.schools.filter((s) => s.trend ==="down").length}/
 {data.schools.length}
 </p>
 <p className="text-[10px] text-foreground/40 uppercase tracking-wider">
 Getting Harder
 </p>
 </div>
 </div>
 </div>
 </>
 )}

 {!loading && selected.length === 0 && (
 <div className="text-center py-16 text-foreground/20">
 <GraduationCap size={48} className="mx-auto mb-4 opacity-30"/>
 <p>Select schools above to view acceptance rate history</p>
 </div>
 )}

 <ToolCrossLinks current="/acceptance-history"/>
 </div>
 </main>
 );
}
