"use client";

import { FileText, ShieldCheck, Sparkles } from"lucide-react";
import type { SchoolData } from"../types";

type Props = {
 school: SchoolData;
 onStartApplication: () => void;
};

function VerifiedBadge() {
 return (
 <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 text-[9px] font-bold uppercase tracking-wider ml-2">
 <ShieldCheck size={8} /> Verified
 </span>
 );
}

export function EssaysTab({ school, onStartApplication }: Props) {
 // Prefer essay_prompts (scraped, structured with word_limit) over application_questions (often generic)
 const questions = school.essay_prompts?.length ? school.essay_prompts : school.application_questions || [];
 const dq = school.data_quality_summary;
 const isVerified = dq?.verified_fields?.includes("essay_prompts") ?? false;

 return (
 <div className="pb-16 max-w-3xl">
 <h2 className="heading-serif text-2xl mb-5 flex items-center gap-2">
 <FileText size={20} /> Essay Prompts
 {isVerified && <VerifiedBadge />}
 </h2>

 {questions.length > 0 ? (
 <>
 <div className="space-y-4">
 {questions.map((q, i) => {
 const text = typeof q ==="string" ? q : (q as Record<string, unknown>)?.prompt ?? String(q);
 const wordLimit = typeof q ==="object" && q !== null ? Number((q as Record<string, unknown>)?.word_limit) || null : null;
 const isRequired = typeof q ==="object" && q !== null ? (q as Record<string, unknown>)?.required !== false : true;
 const isOfficial = typeof q ==="object" && q !== null ? (q as Record<string, unknown>)?.type !=="practice": true;
 const category = typeof q ==="object" && q !== null ? (q as Record<string, unknown>)?.category as string | undefined : undefined;

 return (
 <div key={i} className="bg-card border border-border/8 p-6 hover:border-border/15 transition-colors">
 <div className="flex items-start justify-between gap-4 mb-3">
 <div className="flex items-center gap-2">
 <span className="bg-foreground text-white w-7 h-7 flex items-center justify-center text-xs font-bold shrink-0">
 {i + 1}
 </span>
 {category && (
 <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold">
 {category}
 </span>
 )}
 </div>
 <div className="flex items-center gap-2">
 {!isOfficial && (
 <span className="text-[10px] bg-primary/10 text-primary-dark px-2 py-0.5 border border-primary/20 font-bold uppercase tracking-wider">
 Practice
 </span>
 )}
 {isRequired ? (
 <span className="text-[10px] bg-foreground/5 text-foreground px-2 py-0.5 border border-border/10 font-bold uppercase tracking-wider">
 Required
 </span>
 ) : (
 <span className="text-[10px] bg-background text-muted-foreground/50 px-2 py-0.5 border border-border/5 font-bold uppercase tracking-wider">
 Optional
 </span>
 )}
 </div>
 </div>
 <p className="text-sm text-muted-foreground/80 leading-relaxed">{String(text)}</p>
 {wordLimit && (
 <p className="text-xs text-muted-foreground/40 mt-3 pt-3 border-t border-border/5">
 Word limit: {wordLimit} words
 </p>
 )}
 </div>
 );
 })}
 </div>
 <button onClick={onStartApplication} className="btn-primary w-full mt-8">
 <Sparkles size={16} /> Draft Essays with AI
 </button>
 </>
 ) : (
 <div className="bg-background border border-border/5 p-8 text-center">
 <FileText size={32} className="mx-auto text-muted-foreground/20 mb-3"/>
 <p className="text-sm text-muted-foreground/50 mb-1">Essay prompts not yet available</p>
 <p className="text-xs text-muted-foreground/30">Check back closer to the application season for updated prompts.</p>
 </div>
 )}
 </div>
 );
}
