"use client";

import { Briefcase, GraduationCap } from"lucide-react";
import type { SchoolData } from"../types";

type Props = {
 school: SchoolData;
};

export function AdmissionsTab({ school }: Props) {
 const reqs = school.admission_requirements;

 return (
 <div className="pb-16 max-w-4xl">
 {/* Key admission stats */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
 {[
 { label:"Avg GMAT", value: school.gmat_avg ? String(school.gmat_avg) : null },
 { label:"Acceptance Rate", value: school.acceptance_rate ? `${school.acceptance_rate}%` : null },
 { label:"Class Size", value: school.class_size ? String(school.class_size) : null },
 { label:"Application Fee", value: school.application_fee_usd ? `$${school.application_fee_usd}` : null },
 ].filter(s => s.value).map((stat, i) => (
 <div key={i} className="bg-foreground text-white p-5 text-center">
 <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">{stat.label}</p>
 <p className="text-2xl heading-serif">{stat.value}</p>
 </div>
 ))}
 </div>

 {reqs ? (
 <div>
 <h2 className="heading-serif text-2xl mb-5 flex items-center gap-2">
 <Briefcase size={20} /> Admission Requirements
 </h2>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {[
 { label:"GMAT/GRE", value: reqs.gmat_gre, icon:"test"},
 { label:"Work Experience", value: reqs.work_experience, icon:"work"},
 { label:"Avg Work Experience", value: reqs.avg_work_experience, icon:"work"},
 { label:"English Proficiency", value: reqs.english_proficiency, icon:"lang"},
 { label:"Transcripts", value: reqs.transcripts, icon:"doc"},
 { label:"Recommendations", value: reqs.recommendations, icon:"rec"},
 { label:"Resume/CV", value: reqs.resume, icon:"doc"},
 { label:"Interview", value: reqs.interview, icon:"int"},
 { label:"Application Fee", value: school.application_fee_usd ? `$${school.application_fee_usd}` : reqs.application_fee, icon:"fee"},
 ].filter(item => item.value).map((item, i) => (
 <div key={i} className="bg-card border border-border/8 p-5 hover:border-border/15 transition-colors">
 <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 mb-2 font-bold">{item.label}</p>
 <p className="text-sm text-muted-foreground/80">{item.value}</p>
 </div>
 ))}
 </div>
 </div>
 ) : (
 <div className="bg-background border border-border/5 p-8 text-center">
 <GraduationCap size={32} className="mx-auto text-muted-foreground/20 mb-3"/>
 <p className="text-sm text-muted-foreground/50 mb-1">Admission requirements not yet available</p>
 <p className="text-xs text-muted-foreground/30">Visit the school website for detailed admission criteria.</p>
 </div>
 )}
 </div>
 );
}
