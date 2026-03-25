"use client";

import { useState, useEffect } from"react";
import { Users, ArrowUpDown, GraduationCap } from"lucide-react";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type ClassSizeRow = {
 school_id: string;
 school_name: string;
 class_size: number;
 sections: number;
 avg_section_size: number;
 student_faculty_ratio: number;
 international_pct: number;
};

const SORT_OPTIONS = [
 { value:"class_size", label:"Class Size"},
 { value:"school_name", label:"School Name"},
 { value:"avg_section_size", label:"Section Size"},
 { value:"student_faculty_ratio", label:"Student:Faculty"},
 { value:"international_pct", label:"International %"},
];

export default function ClassSizePage() {
 const [schools, setSchools] = useState<ClassSizeRow[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState("");
 const [sortBy, setSortBy] = useState("class_size");

 const fetchData = async () => {
 setLoading(true);
 setError("");
 try {
 const res = await apiFetch<{ schools: ClassSizeRow[]; total: number }>(
 `/api/class-size?sort_by=${sortBy}`
 );
 setSchools(res.schools);
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
 Class Size Comparison
 </h1>
 <p className="text-white/70 text-lg">
 Compare cohort sizes, sections, and student-faculty ratios across top MBA programs.
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
 <div className="text-center py-16 text-foreground/30">Loading class size data...</div>
 ) : (
 <div className="editorial-card overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-border/10">
 <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-foreground/40">School</th>
 <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-foreground/40">Class Size</th>
 <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-foreground/40 hidden md:table-cell">Sections</th>
 <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-foreground/40 hidden md:table-cell">Avg Section</th>
 <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-foreground/40">Student:Faculty</th>
 <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-foreground/40">Intl %</th>
 </tr>
 </thead>
 <tbody>
 {schools.map((s) => (
 <tr key={s.school_id} className="border-b border-border/5 hover:bg-primary/5 transition-colors">
 <td className="px-5 py-4">
 <p className="font-bold text-foreground">{s.school_name}</p>
 </td>
 <td className="text-right px-5 py-4">
 <span className="font-bold text-foreground text-lg">{s.class_size.toLocaleString()}</span>
 </td>
 <td className="text-right px-5 py-4 text-foreground/60 hidden md:table-cell">
 {s.sections ||"Flexible"}
 </td>
 <td className="text-right px-5 py-4 text-foreground/60 hidden md:table-cell">
 {s.avg_section_size ||"N/A"}
 </td>
 <td className="text-right px-5 py-4">
 <span className={`font-medium ${s.student_faculty_ratio <= 4.5 ?"text-emerald-600":"text-foreground/70"}`}>
 {s.student_faculty_ratio}:1
 </span>
 </td>
 <td className="text-right px-5 py-4">
 <span className="text-primary font-bold">{s.international_pct}%</span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* Summary stats */}
 {!loading && schools.length > 0 && (
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
 <div className="editorial-card p-5 text-center">
 <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-1">Largest Class</p>
 <p className="text-2xl font-bold text-foreground">{Math.max(...schools.map(s => s.class_size)).toLocaleString()}</p>
 </div>
 <div className="editorial-card p-5 text-center">
 <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-1">Smallest Class</p>
 <p className="text-2xl font-bold text-foreground">{Math.min(...schools.map(s => s.class_size)).toLocaleString()}</p>
 </div>
 <div className="editorial-card p-5 text-center">
 <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-1">Avg Class Size</p>
 <p className="text-2xl font-bold text-foreground">{Math.round(schools.reduce((a, s) => a + s.class_size, 0) / schools.length).toLocaleString()}</p>
 </div>
 <div className="editorial-card p-5 text-center">
 <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-1">Avg Intl %</p>
 <p className="text-2xl font-bold text-primary">{Math.round(schools.reduce((a, s) => a + s.international_pct, 0) / schools.length)}%</p>
 </div>
 </div>
 )}

 <ToolCrossLinks current="/class-size"count={6} />
 </div>
 </main>
 );
}
