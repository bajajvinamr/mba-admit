"use client";

import { useState } from"react";
import Link from"next/link";
import {
 MapPin, GraduationCap, Beaker, Timer, UserCheck, Building2,
 ShieldCheck, AlertTriangle, Plus, CheckCircle2, ArrowLeft, Share2, Check,
} from"lucide-react";
import type { SchoolData } from"./types";

type Props = {
 school: SchoolData;
 trackStatus: string | null;
 onAddToSchools: (status: string) => void;
};

export function SchoolHeader({ school, trackStatus, onAddToSchools }: Props) {
 const [trackOpen, setTrackOpen] = useState(false);
 const [copied, setCopied] = useState(false);
 const prog = school.program_details;

 return (
 <div className="mb-12">
 {/* Badges row */}
 <div className="flex flex-wrap items-center gap-3 mb-3">
 <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/50 font-medium flex items-center gap-1 whitespace-nowrap">
 <MapPin size={12} /> {school.location} · {school.country}
 </p>
 <span className="flex items-center gap-1 px-2 py-0.5 bg-primary/20 text-foreground border border-primary/30 text-xs font-bold uppercase tracking-wider whitespace-nowrap">
 <GraduationCap size={10} /> {school.degree_type}
 </span>
 {prog?.stem_designated && (
 <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase tracking-wider whitespace-nowrap">
 <Beaker size={10} /> STEM Designated
 </span>
 )}
 {school.data_quality_summary?.source ==="scraped" ? (
 <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase tracking-wider whitespace-nowrap">
 <ShieldCheck size={10} /> Verified Data
 {school.data_quality_summary.confidence > 0 && (
 <span className="ml-1 opacity-70">{Math.round(school.data_quality_summary.confidence * 100)}%</span>
 )}
 </span>
 ) : (
 <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold uppercase tracking-wider whitespace-nowrap">
 <AlertTriangle size={10} /> AI-Generated Data
 </span>
 )}
 </div>

 <h1 className="heading-serif text-5xl md:text-6xl mb-4 leading-tight">{school.name}</h1>

 {/* Program Duration Badges */}
 <div className="flex flex-wrap gap-2 mb-4">
 {school.program_duration && (
 <span className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${
 school.program_duration.includes("1-year") || school.program_duration.includes("10") || school.program_duration.includes("12-month") || school.program_duration.includes("14-month") || school.program_duration.includes("15-month")
 ?"bg-blue-50 text-blue-700 border-blue-200"
 :"bg-indigo-50 text-indigo-700 border-indigo-200"
 }`}>
 <Timer size={10} />
 {school.program_duration.includes("1-year") || school.program_duration.includes("10") || school.program_duration.includes("12-month") || school.program_duration.includes("14-month") || school.program_duration.includes("15-month")
 ?"1-Year Program":"2-Year Program"}
 </span>
 )}
 {["Harvard","Stanford","Yale","Booth"].some(name => school.name.includes(name)) && (
 <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase tracking-wider">
 <UserCheck size={10} /> Deferred Enrollment Available
 </span>
 )}
 {["Wharton","Booth","Kellogg","Columbia","INSEAD","LBS","London Business"].some(name => school.name.includes(name)) && (
 <span className="flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold uppercase tracking-wider">
 <Building2 size={10} /> Executive MBA Track
 </span>
 )}
 </div>

 {/* Specializations */}
 <div className="flex flex-wrap gap-2 mb-8">
 {school.specializations?.map(s => (
 <span key={s} className="text-xs bg-background border border-border/10 px-3 py-1 text-muted-foreground/70">{s}</span>
 ))}
 </div>

 {/* Quick Stats Row */}
 <div className="grid grid-cols-2 md:grid-cols-5 gap-6 bg-foreground text-white p-8 -mx-8 md:mx-0">
 <div>
 <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
 {school.primary_admission_test ==="CAT" ?"Primary Test":"Avg GMAT"}
 </p>
 <p className="text-2xl heading-serif">
 {school.primary_admission_test ==="CAT" ?"CAT": school.gmat_avg ||"-"}
 </p>
 </div>
 <div>
 <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Acceptance</p>
 <p className="text-2xl heading-serif">{school.acceptance_rate}%</p>
 </div>
 <div>
 <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Median Salary</p>
 <p className="text-2xl heading-serif">{school.median_salary}</p>
 </div>
 <div>
 <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Class Size</p>
 <p className="text-2xl heading-serif">{prog?.class_size || school.class_size}</p>
 </div>
 <div>
 <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Tuition</p>
 <p className="text-2xl heading-serif">
 {school.tuition_inr || `$${(school.tuition_usd || 0).toLocaleString()}`}
 </p>
 </div>
 </div>

 {/* Action CTAs */}
 <div className="flex flex-wrap gap-3 mt-6">
 <div className="relative">
 {trackStatus ? (
 <span className="bg-emerald-600 text-white px-5 py-3 font-bold text-xs uppercase tracking-widest inline-flex items-center gap-2">
 <CheckCircle2 size={14} /> Tracking · {trackStatus}
 </span>
 ) : (
 <>
 <button onClick={() => setTrackOpen(!trackOpen)}
 className="bg-primary text-foreground px-5 py-3 font-bold text-xs uppercase tracking-widest hover:bg-primary/80 transition-colors inline-flex items-center gap-2">
 <Plus size={14} /> Track This School
 </button>
 {trackOpen && (
 <div className="absolute top-full left-0 mt-1 bg-card border border-border/10 z-20 min-w-[200px] rounded">
 {["researching","preparing","submitted","interview","decision"].map(s => (
 <button key={s} onClick={() => { onAddToSchools(s); setTrackOpen(false); }}
 className="block w-full text-left px-4 py-3 text-xs uppercase tracking-widest font-medium hover:bg-foreground/5 transition-colors">
 {s}
 </button>
 ))}
 </div>
 )}
 </>
 )}
 </div>
 <Link href={`/compare?schools=${school.id}`}
 className="border border-border/10 text-foreground px-5 py-3 font-bold text-xs uppercase tracking-widest hover:border-border/30 transition-colors inline-flex items-center gap-2">
 Compare
 </Link>
 <Link href="/decisions"
 className="border border-border/10 text-foreground px-5 py-3 font-bold text-xs uppercase tracking-widest hover:border-border/30 transition-colors inline-flex items-center gap-2">
 See Outcomes
 </Link>
 {school.application_url && (
 <a href={school.application_url} target="_blank" rel="noopener noreferrer"
 className="bg-primary text-foreground px-5 py-3 font-bold text-xs uppercase tracking-widest hover:bg-primary/90 transition-colors inline-flex items-center gap-2">
 Apply Now <ArrowLeft size={12} className="rotate-[135deg]"/>
 </a>
 )}
 <button
 onClick={async () => {
 await navigator.clipboard.writeText(window.location.href);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 }}
 className="border border-border/10 text-muted-foreground/50 px-4 py-3 text-xs uppercase tracking-widest hover:border-border/20 hover:text-foreground transition-colors inline-flex items-center gap-2"
 title="Copy link to clipboard"
 >
 {copied ? <><Check size={12} className="text-emerald-500"/> Copied</> : <><Share2 size={12} /> Share</>}
 </button>
 </div>
 </div>
 );
}
