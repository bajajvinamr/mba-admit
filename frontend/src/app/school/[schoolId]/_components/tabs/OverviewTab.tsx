"use client";

import {
 GraduationCap, Award, CheckCircle2, BookOpen, ChevronRight,
} from"lucide-react";
import Link from"next/link";
import type { SchoolData } from"../types";

type Props = {
 school: SchoolData;
};

function ProgramsOffered({ programs }: { programs: NonNullable<SchoolData["programs"]> }) {
 if (programs.length <= 1) return null;
 const testColors: Record<string, string> = {
 CAT:"bg-amber-100 text-amber-800 border-amber-200",
"GMAT/GRE":"bg-blue-100 text-blue-800 border-blue-200",
"GMAT/CAT":"bg-violet-100 text-violet-800 border-violet-200",
"CAT/GMAT":"bg-violet-100 text-violet-800 border-violet-200",
"XAT/GMAT":"bg-emerald-100 text-emerald-800 border-emerald-200",
 XAT:"bg-emerald-100 text-emerald-800 border-emerald-200",
 NMAT:"bg-rose-100 text-rose-800 border-rose-200",
 };
 return (
 <div>
 <h2 className="heading-serif text-2xl mb-5 flex items-center gap-2">
 <GraduationCap size={20} /> Programs Offered
 </h2>
 <div className="space-y-4">
 {programs.map((p, i) => {
 const testClass = testColors[p.admission_test] ||"bg-muted text-gray-700 border-border";
 return (
 <div key={i} className="border border-border/8 bg-card p-5 hover:border-border/15 transition-colors">
 <div className="flex items-start justify-between gap-4 mb-3">
 <div>
 <h3 className="font-bold text-base">{p.name} <span className="font-normal text-muted-foreground/50">- {p.full_name}</span></h3>
 <p className="text-xs text-muted-foreground/40 mt-0.5">{p.type}</p>
 </div>
 <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 border shrink-0 ${testClass}`}>
 {p.admission_test}
 </span>
 </div>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 <div><p className="text-[10px] uppercase tracking-widest text-muted-foreground/40">Duration</p><p className="text-sm font-medium">{p.duration}</p></div>
 {p.fees && <div><p className="text-[10px] uppercase tracking-widest text-muted-foreground/40">Fees</p><p className="text-sm font-medium">{p.fees}</p></div>}
 {p.class_size && <div><p className="text-[10px] uppercase tracking-widest text-muted-foreground/40">Class Size</p><p className="text-sm font-medium">{p.class_size}</p></div>}
 {p.avg_salary && <div><p className="text-[10px] uppercase tracking-widest text-muted-foreground/40">Avg Salary</p><p className="text-sm font-medium">{p.avg_salary}</p></div>}
 {p.min_experience && <div><p className="text-[10px] uppercase tracking-widest text-muted-foreground/40">Experience</p><p className="text-sm font-medium">{p.min_experience}</p></div>}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 );
}

function ProgramDetails({ prog }: { prog: NonNullable<SchoolData["program_details"]> }) {
 return (
 <div>
 <h2 className="heading-serif text-2xl mb-5 flex items-center gap-2"><GraduationCap size={20} /> Program Details</h2>
 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
 {[
 { label:"Duration", value: prog.duration },
 { label:"Format", value: prog.format },
 { label:"Credits", value: prog.total_credits?.toString() },
 { label:"Core Courses", value: prog.core_courses?.toString() },
 { label:"Electives", value: prog.elective_courses },
 { label:"Avg Age", value: prog.avg_age?.toString() },
 { label:"Female %", value: prog.female_percentage },
 { label:"International %", value: prog.international_percentage },
 { label:"Countries", value: prog.countries_represented?.toString() },
 { label:"Start Date", value: prog.start_date },
 ].filter(item => item.value).map((item, i) => (
 <div key={i} className="bg-background border border-border/5 p-4">
 <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 mb-1">{item.label}</p>
 <p className="font-medium text-sm">{item.value ||"-"}</p>
 </div>
 ))}
 </div>
 </div>
 );
}

function ClassProfileChart({ school }: { school: SchoolData }) {
 const prog = school.program_details;
 if (!prog) return null;

 const stats = [
 { label:"Class Size", value: prog.class_size || school.class_size },
 { label:"Avg Age", value: prog.avg_age },
 { label:"Countries", value: prog.countries_represented },
 { label:"Credits", value: prog.total_credits },
 ].filter(s => s.value != null && s.value > 0);

 if (stats.length < 2) return null;

 const maxVal = Math.max(...stats.map(s => s.value as number));

 return (
 <div>
 <h2 className="heading-serif text-2xl mb-5 flex items-center gap-2">
 <GraduationCap size={20} /> Class Profile at a Glance
 </h2>
 <div className="space-y-3">
 {stats.map((s, i) => {
 const pct = maxVal > 0 ? ((s.value as number) / maxVal) * 100 : 0;
 return (
 <div key={i} className="flex items-center gap-3">
 <span className="text-xs text-muted-foreground/60 w-24 text-right shrink-0">{s.label}</span>
 <div className="flex-1 bg-background h-7 relative overflow-hidden">
 <div
 className="absolute inset-y-0 left-0 bg-foreground/70 transition-all duration-700"
 style={{ width: `${pct}%` }}
 />
 <span className="absolute inset-y-0 left-2 flex items-center text-xs font-bold text-white mix-blend-difference">
 {s.value}
 </span>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 );
}

function RelatedGuides({ school }: { school: SchoolData }) {
 const guides: { slug: string; title: string }[] = [];
 const country = school.country?.toLowerCase();
 const name = school.name?.toLowerCase() ||"";
 guides.push({ slug:"gmat-score-for-top-schools", title:"What GMAT Score Do You Need?"});
 if (country ==="india") {
 guides.push({ slug:"iim-vs-isb-vs-abroad", title:"IIM vs ISB vs Abroad: Which Path?"});
 if (name.includes("iim") || name.includes("isb")) {
 guides.push({ slug:"1-year-vs-2-year-mba", title:"1-Year vs 2-Year MBA"});
 }
 }
 if (country ==="usa" || country ==="united states") {
 guides.push({ slug:"mba-in-usa-for-indians", title:"MBA in USA from India"});
 guides.push({ slug:"mba-scholarships-guide", title:"How to Fund Your MBA"});
 }
 if (["uk","united kingdom","france","spain","switzerland"].includes(country ||"")) {
 guides.push({ slug:"1-year-vs-2-year-mba", title:"1-Year vs 2-Year MBA"});
 }
 guides.push({ slug:"mba-roi-analysis", title:"Is a $200K MBA Worth It?"});
 guides.push({ slug:"mba-application-timeline", title:"Application Timeline Guide"});
 const seen = new Set<string>();
 const unique = guides.filter(g => { if (seen.has(g.slug)) return false; seen.add(g.slug); return true; }).slice(0, 4);

 return (
 <div className="editorial-card">
 <h2 className="heading-serif text-xl mb-4 flex items-center gap-2">
 <BookOpen size={18} /> Related Guides
 </h2>
 <div className="space-y-2">
 {unique.map(g => (
 <Link key={g.slug} href={`/guides/${g.slug}`}
 className="flex items-center gap-3 p-3 bg-background border border-border/5 hover:border-border/15 transition-colors group">
 <ChevronRight size={14} className="text-primary shrink-0 group-hover:translate-x-0.5 transition-transform"/>
 <span className="text-sm text-muted-foreground/70 group-hover:text-foreground transition-colors">{g.title}</span>
 </Link>
 ))}
 </div>
 </div>
 );
}

export function OverviewTab({ school }: Props) {
 const prog = school.program_details;
 const features = school.unique_features || [];
 const programs = school.programs || [];

 return (
 <div className="space-y-10 pb-16">
 <ProgramsOffered programs={programs} />
 {prog && <ProgramDetails prog={prog} />}

 <ClassProfileChart school={school} />

 {features.length > 0 && (
 <div>
 <h2 className="heading-serif text-2xl mb-5 flex items-center gap-2"><Award size={20} /> What Sets This Program Apart</h2>
 <div className="space-y-3">
 {features.map((f, i) => (
 <div key={i} className="flex items-start gap-3 bg-card border border-border/5 p-4">
 <CheckCircle2 size={16} className="text-success mt-0.5 shrink-0"/>
 <p className="text-sm text-muted-foreground/80">{f}</p>
 </div>
 ))}
 </div>
 </div>
 )}

 <RelatedGuides school={school} />
 </div>
 );
}
