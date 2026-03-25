"use client";

import { useState, useEffect } from"react";
import { BookOpen, Filter, GraduationCap, Users, Briefcase } from"lucide-react";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type Concentration = {
 school_id: string;
 school_name: string;
 concentration_name: string;
 field: string;
 courses_required: number;
 notable_faculty: string;
 career_outcomes: string;
};

const FIELDS = [
 { value:"", label:"All Fields"},
 { value:"finance", label:"Finance"},
 { value:"tech", label:"Technology"},
 { value:"consulting", label:"Consulting"},
 { value:"marketing", label:"Marketing"},
 { value:"healthcare", label:"Healthcare"},
 { value:"social_impact", label:"Social Impact"},
 { value:"entrepreneurship", label:"Entrepreneurship"},
 { value:"operations", label:"Operations"},
];

const SCHOOLS = [
 { value:"", label:"All Schools"},
 { value:"hbs", label:"Harvard"},
 { value:"gsb", label:"Stanford"},
 { value:"wharton", label:"Wharton"},
 { value:"booth", label:"Booth"},
 { value:"kellogg", label:"Kellogg"},
 { value:"cbs", label:"Columbia"},
 { value:"sloan", label:"MIT Sloan"},
 { value:"haas", label:"Haas"},
 { value:"tuck", label:"Tuck"},
 { value:"ross", label:"Ross"},
 { value:"fuqua", label:"Fuqua"},
];

const FIELD_COLORS: Record<string, string> = {
 finance:"bg-blue-50 text-blue-700",
 tech:"bg-purple-50 text-purple-700",
 consulting:"bg-emerald-50 text-emerald-700",
 marketing:"bg-orange-50 text-orange-700",
 healthcare:"bg-red-50 text-red-700",
 social_impact:"bg-teal-50 text-teal-700",
 entrepreneurship:"bg-amber-50 text-amber-700",
 operations:"bg-muted text-muted-foreground",
};

export default function ConcentrationsPage() {
 const [concentrations, setConcentrations] = useState<Concentration[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState("");
 const [fieldFilter, setFieldFilter] = useState("");
 const [schoolFilter, setSchoolFilter] = useState("");

 const fetchData = async () => {
 setLoading(true);
 setError("");
 try {
 const params = new URLSearchParams();
 if (schoolFilter) params.set("school_id", schoolFilter);
 if (fieldFilter) params.set("field", fieldFilter);
 const qs = params.toString();
 const res = await apiFetch<{ concentrations: Concentration[]; total: number }>(
 `/api/concentrations${qs ? `?${qs}` :""}`
 );
 setConcentrations(res.concentrations);
 } catch (e: unknown) {
 setError(e instanceof Error ? e.message :"Failed to load data");
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => { fetchData(); }, [fieldFilter, schoolFilter]);

 const fieldLabel = (f: string) => FIELDS.find((x) => x.value === f)?.label || f;

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-4xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 MBA Concentration Finder
 </h1>
 <p className="text-white/70 text-lg">
 Discover specializations and majors across top MBA programs.
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
 value={fieldFilter}
 onChange={(e) => setFieldFilter(e.target.value)}
 className="px-4 py-2 border border-border/10 rounded-lg text-sm font-medium bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
 >
 {FIELDS.map((f) => (
 <option key={f.value} value={f.value}>{f.label}</option>
 ))}
 </select>
 <select
 value={schoolFilter}
 onChange={(e) => setSchoolFilter(e.target.value)}
 className="px-4 py-2 border border-border/10 rounded-lg text-sm font-medium bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
 >
 {SCHOOLS.map((s) => (
 <option key={s.value} value={s.value}>{s.label}</option>
 ))}
 </select>
 </div>

 {error && (
 <div className="editorial-card p-4 mb-6 border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
 )}

 {loading ? (
 <div className="text-center py-16 text-muted-foreground">Loading concentrations...</div>
 ) : concentrations.length === 0 ? (
 <div className="text-center py-16 text-muted-foreground">
 <BookOpen size={48} className="mx-auto mb-4 opacity-30"/>
 <p>No concentrations match your filters.</p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
 {concentrations.map((c, i) => (
 <div key={i} className="editorial-card p-6">
 <div className="flex items-start justify-between mb-3">
 <div>
 <p className="text-lg font-bold text-foreground">{c.concentration_name}</p>
 <p className="text-sm text-muted-foreground">{c.school_name}</p>
 </div>
 <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${FIELD_COLORS[c.field] ||"bg-foreground/5 text-muted-foreground"}`}>
 {fieldLabel(c.field)}
 </span>
 </div>

 <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4 pb-3 border-b border-border/5">
 <div className="flex items-center gap-1">
 <BookOpen size={12} />
 <span>{c.courses_required} courses required</span>
 </div>
 </div>

 <div className="space-y-3">
 <div>
 <div className="flex items-center gap-1 mb-1">
 <Users size={12} className="text-muted-foreground"/>
 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Notable Faculty</p>
 </div>
 <p className="text-sm text-muted-foreground">{c.notable_faculty}</p>
 </div>
 <div>
 <div className="flex items-center gap-1 mb-1">
 <Briefcase size={12} className="text-primary"/>
 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Career Outcomes</p>
 </div>
 <p className="text-sm text-muted-foreground leading-relaxed">{c.career_outcomes}</p>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}

 <ToolCrossLinks current="/concentrations"count={6} />
 </div>
 </main>
 );
}
