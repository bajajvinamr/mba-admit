"use client";

import { useState, useEffect } from"react";
import { GraduationCap, Filter, Clock, Users, Sparkles } from"lucide-react";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type DualDegree = {
 school_id: string;
 school_name: string;
 partner_school: string;
 degree_combo: string;
 duration: string;
 typical_applicants: string;
 unique_benefits: string;
};

const DEGREE_TYPES = [
 { value:"", label:"All Types"},
 { value:"JD", label:"JD (Law)"},
 { value:"MD", label:"MD (Medicine)"},
 { value:"MPP", label:"MPP (Policy)"},
 { value:"MS", label:"MS (Engineering/Science)"},
 { value:"MPH", label:"MPH (Public Health)"},
];

export default function DualDegreesPage() {
 const [programs, setPrograms] = useState<DualDegree[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState("");
 const [schoolFilter, setSchoolFilter] = useState("");
 const [degreeFilter, setDegreeFilter] = useState("");

 const fetchData = async () => {
 setLoading(true);
 setError("");
 try {
 const params = new URLSearchParams();
 if (schoolFilter) params.set("school_id", schoolFilter);
 if (degreeFilter) params.set("degree_type", degreeFilter);
 const qs = params.toString();
 const res = await apiFetch<{ programs: DualDegree[]; total: number }>(
 `/api/dual-degrees${qs ? `?${qs}` :""}`
 );
 setPrograms(res.programs);
 } catch (e: unknown) {
 setError(e instanceof Error ? e.message :"Failed to load data");
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => { fetchData(); }, [schoolFilter, degreeFilter]);

 const schools = [
 { value:"", label:"All Schools"},
 { value:"hbs", label:"Harvard"},
 { value:"gsb", label:"Stanford"},
 { value:"wharton", label:"Wharton"},
 { value:"booth", label:"Booth"},
 { value:"kellogg", label:"Kellogg"},
 { value:"cbs", label:"Columbia"},
 { value:"sloan", label:"MIT Sloan"},
 { value:"tuck", label:"Tuck"},
 { value:"haas", label:"Haas"},
 ];

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-4xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Dual Degree Explorer
 </h1>
 <p className="text-white/70 text-lg">
 Explore MBA joint degree programs across top business schools.
 </p>
 </div>
 </section>

 <div className="max-w-5xl mx-auto px-6 py-10">
 {/* Filters */}
 <div className="editorial-card p-5 mb-8 flex flex-col sm:flex-row gap-4">
 <div className="flex items-center gap-2 shrink-0">
 <Filter size={16} className="text-muted-foreground"/>
 <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Filter</span>
 </div>
 <select
 value={schoolFilter}
 onChange={(e) => setSchoolFilter(e.target.value)}
 className="px-4 py-2 border border-border/10 rounded-lg text-sm font-medium bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
 >
 {schools.map((s) => (
 <option key={s.value} value={s.value}>{s.label}</option>
 ))}
 </select>
 <select
 value={degreeFilter}
 onChange={(e) => setDegreeFilter(e.target.value)}
 className="px-4 py-2 border border-border/10 rounded-lg text-sm font-medium bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
 >
 {DEGREE_TYPES.map((d) => (
 <option key={d.value} value={d.value}>{d.label}</option>
 ))}
 </select>
 </div>

 {error && (
 <div className="editorial-card p-4 mb-6 border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
 )}

 {loading ? (
 <div className="text-center py-16 text-muted-foreground">Loading programs...</div>
 ) : programs.length === 0 ? (
 <div className="text-center py-16 text-muted-foreground">
 <GraduationCap size={48} className="mx-auto mb-4 opacity-30"/>
 <p>No dual degree programs match your filters.</p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
 {programs.map((p, i) => (
 <div key={i} className="editorial-card p-6">
 <div className="flex items-start justify-between mb-3">
 <div>
 <p className="text-lg font-bold text-foreground">{p.degree_combo}</p>
 <p className="text-sm text-muted-foreground">{p.school_name}</p>
 </div>
 <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">
 {p.duration}
 </span>
 </div>
 <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
 <GraduationCap size={12} />
 <span>Partner: {p.partner_school}</span>
 </div>
 <div className="space-y-3 mt-4">
 <div>
 <div className="flex items-center gap-1 mb-1">
 <Users size={12} className="text-muted-foreground"/>
 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Typical Applicants</p>
 </div>
 <p className="text-sm text-muted-foreground leading-relaxed">{p.typical_applicants}</p>
 </div>
 <div>
 <div className="flex items-center gap-1 mb-1">
 <Sparkles size={12} className="text-primary"/>
 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Unique Benefits</p>
 </div>
 <p className="text-sm text-muted-foreground leading-relaxed">{p.unique_benefits}</p>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}

 <ToolCrossLinks current="/dual-degrees"count={6} />
 </div>
 </main>
 );
}
