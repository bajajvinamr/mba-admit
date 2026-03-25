"use client";

import { motion } from"framer-motion";
import Link from"next/link";
import {
 GraduationCap, Briefcase, Calendar, DollarSign, Award,
 FileText, Sparkles, CheckCircle2, ShieldCheck, BookOpen, ChevronRight,
} from"lucide-react";
import type { SchoolData, AppState } from"./types";

type Props = {
 school: SchoolData;
 appState: AppState | null;
 onStartApplication: () => void;
};

function VerifiedBadge() {
 return (
 <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 text-[9px] font-bold uppercase tracking-wider ml-2">
 <ShieldCheck size={8} /> Verified
 </span>
 );
}

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

function PlacementStats({ place, isVerified }: { place: NonNullable<SchoolData["placement_stats"]>; isVerified: boolean }) {
 if (!place.employment_rate_3_months && !place.median_base_salary && !place.median_signing_bonus) return null;
 return (
 <div>
 <h2 className="heading-serif text-2xl mb-5 flex items-center gap-2">
 <DollarSign size={20} /> Placement Statistics
 {isVerified && <VerifiedBadge />}
 </h2>
 <div className="grid grid-cols-3 gap-4 mb-6">
 <div className="bg-background border border-border/5 p-4 text-center">
 <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 mb-1">Employed in 3 Mo.</p>
 <p className="text-xl heading-serif text-emerald-700">{place.employment_rate_3_months ||"-"}</p>
 </div>
 <div className="bg-background border border-border/5 p-4 text-center">
 <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 mb-1">Median Salary</p>
 <p className="text-xl heading-serif">{place.median_base_salary ||"-"}</p>
 </div>
 <div className="bg-background border border-border/5 p-4 text-center">
 <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 mb-1">Signing Bonus</p>
 <p className="text-xl heading-serif">{place.median_signing_bonus ||"-"}</p>
 </div>
 </div>

 {place.industry_breakdown && (
 <div className="mb-6">
 <p className="text-xs uppercase tracking-widest text-muted-foreground/40 mb-3 font-bold">Industry Breakdown</p>
 <div className="space-y-2">
 {place.industry_breakdown.map((ind, i) => (
 <div key={i} className="flex items-center gap-3">
 <div className="w-28 text-xs text-muted-foreground/60 text-right shrink-0">{ind.industry}</div>
 <div className="flex-1 bg-background h-5 relative overflow-hidden">
 <motion.div initial={{ width: 0 }} whileInView={{ width: `${ind.percentage}%` }} viewport={{ once: true }}
 transition={{ duration: 0.6, delay: i * 0.1 }}
 className="absolute inset-y-0 left-0 bg-foreground/80"
 />
 </div>
 <span className="text-xs font-medium w-8">{ind.percentage}%</span>
 </div>
 ))}
 </div>
 </div>
 )}

 {place.top_recruiters && (
 <div>
 <p className="text-xs uppercase tracking-widest text-muted-foreground/40 mb-3 font-bold">Top Recruiters</p>
 <div className="flex flex-wrap gap-2">
 {place.top_recruiters.map(r => (
 <span key={r} className="text-xs bg-card border border-border/10 px-3 py-1.5 text-muted-foreground/70">{r}</span>
 ))}
 </div>
 </div>
 )}
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

export function SchoolOverview({ school, appState, onStartApplication }: Props) {
 const reqs = school.admission_requirements;
 const prog = school.program_details;
 const place = school.placement_stats;
 const deadlines = school.admission_deadlines;
 const questions = school.application_questions || school.essay_prompts || [];
 const features = school.unique_features || [];
 const programs = school.programs || [];
 const dq = school.data_quality_summary;
 const isVerified = (field: string) => dq?.verified_fields?.includes(field) ?? false;

 return (
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-16">
 {/* Left Column: Main Info */}
 <div className="lg:col-span-7 space-y-10">
 <ProgramsOffered programs={programs} />
 {prog && <ProgramDetails prog={prog} />}

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

 {place ? (
 <PlacementStats place={place} isVerified={isVerified("placement_stats")} />
 ) : (
 <div>
 <h2 className="heading-serif text-2xl mb-5 flex items-center gap-2">
 <DollarSign size={20} /> Placement Statistics
 </h2>
 <div className="bg-background border border-border/5 p-6 text-center">
 <Briefcase size={24} className="mx-auto text-muted-foreground/20 mb-2"/>
 <p className="text-sm text-muted-foreground/50">Employment data not yet available</p>
 <p className="text-xs text-muted-foreground/30 mt-1">We&apos;re working on collecting placement data for this program.</p>
 </div>
 </div>
 )}
 </div>

 {/* Right Column: Sidebar */}
 <div className="lg:col-span-5 space-y-8">
 {reqs && (
 <div className="editorial-card">
 <h2 className="heading-serif text-xl mb-5 flex items-center gap-2"><Briefcase size={18} /> Admission Requirements</h2>
 <div className="space-y-4 text-sm">
 {[
 { label:"GMAT/GRE", value: reqs.gmat_gre },
 { label:"Work Experience", value: reqs.work_experience },
 { label:"Avg Experience", value: reqs.avg_work_experience },
 { label:"English", value: reqs.english_proficiency },
 { label:"Recommendations", value: reqs.recommendations },
 { label:"Interview", value: reqs.interview },
 { label:"Application Fee", value: school.application_fee_usd ? `$${school.application_fee_usd}` : reqs.application_fee },
 ].filter(item => item.value).map((item, i) => (
 <div key={i} className="flex justify-between border-b border-border/5 pb-3 last:border-0">
 <span className="text-muted-foreground/50">{item.label}</span>
 <span className="font-medium text-right max-w-[60%]">{item.value ||"-"}</span>
 </div>
 ))}
 </div>
 </div>
 )}

 {deadlines && deadlines.length > 0 && (
 <div className="editorial-card">
 <h2 className="heading-serif text-xl mb-5 flex items-center gap-2">
 <Calendar size={18} /> Deadlines
 {isVerified("deadlines") && <VerifiedBadge />}
 </h2>
 <div className="space-y-4">
 {deadlines.map((d, i) => {
 const daysAway = (() => {
 try {
 const parsed = new Date(d.deadline);
 if (isNaN(parsed.getTime())) return null;
 return Math.ceil((parsed.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
 } catch { return null; }
 })();
 const isPast = daysAway !== null && daysAway < 0;
 const isCritical = daysAway !== null && daysAway >= 0 && daysAway <= 7;
 const isSoon = daysAway !== null && daysAway > 7 && daysAway <= 30;
 return (
 <div key={i} className={`flex items-center gap-4 border p-4 ${isPast ?"bg-muted border-border opacity-60": isCritical ?"bg-red-50 border-red-200":"bg-background border-border/5"}`}>
 <div className={`w-10 h-10 flex items-center justify-center font-bold text-xs shrink-0 ${isPast ?"bg-gray-400 text-white": isCritical ?"bg-red-600 text-white":"bg-foreground text-white"}`}>
 R{i + 1}
 </div>
 <div className="flex-1">
 <p className="font-medium text-sm">{d.round}</p>
 <p className="text-xs text-muted-foreground/50">Deadline: {d.deadline}</p>
 <p className="text-xs text-muted-foreground/50">Decision: {d.decision}</p>
 </div>
 {daysAway !== null && !isPast && (
 <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 shrink-0 ${isCritical ?"bg-red-600 text-white": isSoon ?"bg-amber-100 text-amber-800 border border-amber-200":"bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
 {daysAway === 0 ?"Today!": daysAway === 1 ?"Tomorrow": `${daysAway}d`}
 </span>
 )}
 {isPast && (
 <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-gray-200 text-muted-foreground shrink-0">
 Passed
 </span>
 )}
 </div>
 );
 })}
 </div>
 </div>
 )}

 {school.scholarships && school.scholarships.length > 0 && (
 <div className="editorial-card">
 <h2 className="heading-serif text-xl mb-5 flex items-center gap-2">
 <Award size={18} /> Scholarships & Financial Aid
 </h2>
 <div className="space-y-3">
 {school.scholarships.map((s, i) => (
 <div key={i} className="bg-background border border-border/5 p-4">
 <div className="flex items-start justify-between">
 <h3 className="font-bold text-sm text-foreground">{s.name}</h3>
 {s.amount_usd && (
 <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 border border-primary/20">
 ${s.amount_usd.toLocaleString()}
 </span>
 )}
 </div>
 {(s.criteria || s.description) && (
 <p className="text-xs text-muted-foreground/60 mt-1">{s.criteria || s.description}</p>
 )}
 </div>
 ))}
 </div>
 </div>
 )}

 <div className="editorial-card">
 <h2 className="heading-serif text-xl mb-5 flex items-center gap-2">
 <FileText size={18} /> Essay Prompts
 {isVerified("essay_prompts") && <VerifiedBadge />}
 </h2>
 {questions.length > 0 ? (
 <>
 <div className="space-y-3">
 {questions.map((q, i) => {
 const text = typeof q ==="string" ? q : (q as Record<string, unknown>)?.prompt ?? String(q);
 const wordLimit = typeof q ==="object" && q !== null ? Number((q as Record<string, unknown>)?.word_limit) || null : null;
 const isOfficial = typeof q ==="object" && q !== null ? (q as Record<string, unknown>)?.type !=="practice": true;
 return (
 <div key={i} className="bg-background border border-border/5 p-4 text-sm text-muted-foreground/70 leading-relaxed">
 <span className="font-bold text-foreground mr-1">#{i + 1}</span>
 {!isOfficial && <span className="text-xs bg-primary/10 text-primary-dark px-1.5 py-0.5 rounded mr-2">PRACTICE</span>}
 {String(text)}
 {wordLimit && <span className="text-xs text-muted-foreground/40 ml-2">({wordLimit} words)</span>}
 </div>
 );
 })}
 </div>
 <button onClick={onStartApplication} className="btn-primary w-full mt-6">
 <Sparkles size={16} /> Start Application
 </button>
 </>
 ) : (
 <div className="bg-background border border-border/5 p-6 text-center">
 <FileText size={24} className="mx-auto text-muted-foreground/20 mb-2"/>
 <p className="text-sm text-muted-foreground/50">Essay prompts not yet available</p>
 <p className="text-xs text-muted-foreground/30 mt-1">Check back closer to the application season for updated prompts.</p>
 </div>
 )}
 </div>

 {school.application_url && (
 <div className="editorial-card bg-primary/5 border-primary/20">
 <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold mb-2">Official Application</p>
 <a href={school.application_url} target="_blank" rel="noopener noreferrer"
 className="btn-primary w-full text-center block">
 Apply on {school.name.split("").slice(0, 2).join("")}&apos;s Website →
 </a>
 {school.application_fee_usd && (
 <p className="text-xs text-muted-foreground/40 mt-2 text-center">Application fee: ${school.application_fee_usd}</p>
 )}
 </div>
 )}

 <RelatedGuides school={school} />

 {appState && (
 <div className="bg-foreground text-white p-5 text-sm">
 <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Agent Status</p>
 <p className="font-medium">{appState.current_agent.toUpperCase()}</p>
 <p className="text-white/60 mt-1">{appState.status_message}</p>
 </div>
 )}
 </div>
 </div>
 );
}
