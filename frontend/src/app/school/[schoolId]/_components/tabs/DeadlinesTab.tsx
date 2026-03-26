"use client";

import { Calendar, ShieldCheck } from"lucide-react";
import type { SchoolData } from"../types";

type Props = {
 school: SchoolData;
};

function VerifiedBadge() {
 return (
 <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 text-[9px] font-bold uppercase tracking-wider ml-2">
 <ShieldCheck size={8} /> Verified
 </span>
 );
}

export function DeadlinesTab({ school }: Props) {
 const deadlines = school.admission_deadlines;
 const dq = school.data_quality_summary;
 const isVerified = dq?.verified_fields?.includes("deadlines") ?? false;

 if (!deadlines || deadlines.length === 0) {
 return (
 <div className="pb-16 max-w-3xl">
 <h2 className="heading-serif text-2xl mb-5 flex items-center gap-2">
 <Calendar size={20} /> Admission Deadlines
 </h2>
 <div className="bg-background border border-border/5 p-8 text-center">
 <Calendar size={32} className="mx-auto text-muted-foreground/20 mb-3"/>
 <p className="text-sm text-muted-foreground/50 mb-1">Deadline information not yet available</p>
 <p className="text-xs text-muted-foreground/30">Check the school website for the latest application deadlines.</p>
 </div>
 </div>
 );
 }

 return (
 <div className="pb-16 max-w-3xl">
 <h2 className="heading-serif text-2xl mb-5 flex items-center gap-2">
 <Calendar size={20} /> Admission Deadlines
 {isVerified && <VerifiedBadge />}
 </h2>

 {/* Timeline */}
 <div className="relative">
 {/* Timeline line */}
 <div className="absolute left-5 top-0 bottom-0 w-px bg-foreground/10"/>

 <div className="space-y-0">
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
 <div key={i} className="relative pl-14 pb-8 last:pb-0">
 {/* Timeline dot */}
 <div className={`absolute left-3 top-1 w-5 h-5 flex items-center justify-center text-[10px] font-bold border-2 ${
 isPast
 ?"bg-gray-200 border-border text-muted-foreground"
 : isCritical
 ?"bg-red-600 border-red-700 text-white"
 :"bg-foreground border-border text-white"
 }`}>
 {i + 1}
 </div>

 <div className={`border p-5 ${
 isPast
 ?"bg-muted border-border opacity-60"
 : isCritical
 ?"bg-red-50 border-red-200"
 :"bg-card border-border/8 hover:border-border/15 transition-colors"
 }`}>
 <div className="flex items-start justify-between gap-4">
 <div>
 <h3 className="font-bold text-sm mb-1">{d.round}</h3>
 <div className="space-y-1">
 <p className="text-xs text-muted-foreground/60">
 <span className="text-muted-foreground/40">Deadline:</span> {d.deadline}
 </p>
 <p className="text-xs text-muted-foreground/60">
 <span className="text-muted-foreground/40">Decision:</span> {d.decision}
 </p>
 </div>
 </div>
 <div>
 {daysAway !== null && !isPast && (
 <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 shrink-0 ${
 isCritical
 ?"bg-red-600 text-white"
 : isSoon
 ?"bg-amber-100 text-amber-800 border border-amber-200"
 :"bg-emerald-50 text-emerald-700 border border-emerald-200"
 }`}>
 {daysAway === 0 ?"Today!": daysAway === 1 ?"Tomorrow": `${daysAway} days`}
 </span>
 )}
 {isPast && (
 <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 bg-gray-200 text-muted-foreground shrink-0">
 Passed
 </span>
 )}
 </div>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {school.application_url && (
 <div className="mt-8 editorial-card bg-primary/5 border-primary/20">
 <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold mb-2">Official Application</p>
 <a href={school.application_url} target="_blank" rel="noopener noreferrer"
 className="btn-primary w-full text-center block">
 Apply on {school.name.split(" ").slice(0, 2).join(" ")}&apos;s Website &rarr;
 </a>
 {school.application_fee_usd && (
 <p className="text-xs text-muted-foreground/40 mt-2 text-center">Application fee: ${school.application_fee_usd}</p>
 )}
 </div>
 )}
 </div>
 );
}
