"use client";

import { DollarSign, Award, TrendingUp } from"lucide-react";
import type { SchoolData } from"../types";

type Props = {
 school: SchoolData;
};

export function CostsTab({ school }: Props) {
 const tuition = school.tuition_usd;
 const tuitionInr = school.tuition_inr;
 const appFee = school.application_fee_usd;
 const scholarships = school.scholarships;
 const medianSalary = school.median_salary;

 // Simple ROI calculation if we have tuition and salary
 const salaryNum = medianSalary ? parseInt(medianSalary.replace(/[^0-9]/g,"")) : null;
 const roiYears = tuition && salaryNum && salaryNum > 0
 ? (tuition / salaryNum).toFixed(1)
 : null;

 return (
 <div className="pb-16 max-w-4xl">
 <h2 className="heading-serif text-2xl mb-8 flex items-center gap-2">
 <DollarSign size={20} /> Costs & Financial Aid
 </h2>

 {/* Cost overview */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
 <div className="bg-foreground text-white p-6 text-center">
 <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Tuition</p>
 <p className="text-3xl heading-serif">
 {tuitionInr || (tuition ? `$${tuition.toLocaleString()}` :"-")}
 </p>
 {tuitionInr && tuition > 0 && (
 <p className="text-xs text-white/40 mt-1">${tuition.toLocaleString()} USD</p>
 )}
 </div>
 {appFee && (
 <div className="bg-foreground text-white p-6 text-center">
 <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Application Fee</p>
 <p className="text-3xl heading-serif">${appFee}</p>
 </div>
 )}
 {medianSalary && (
 <div className="bg-foreground text-white p-6 text-center">
 <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Median Salary Post-MBA</p>
 <p className="text-3xl heading-serif">{medianSalary}</p>
 </div>
 )}
 </div>

 {/* ROI indicator */}
 {roiYears && (
 <div className="bg-primary/10 border border-primary/20 p-6 mb-10 flex items-center gap-4">
 <TrendingUp size={24} className="text-primary shrink-0"/>
 <div>
 <p className="text-sm font-bold text-foreground">ROI Payback Period</p>
 <p className="text-xs text-muted-foreground/60 mt-0.5">
 At median salary, tuition investment is recouped in approximately <span className="font-bold text-foreground">{roiYears} years</span> of post-MBA earnings.
 </p>
 </div>
 </div>
 )}

 {/* Scholarships */}
 {scholarships && scholarships.length > 0 ? (
 <div>
 <h3 className="heading-serif text-xl mb-5 flex items-center gap-2">
 <Award size={18} /> Scholarships & Financial Aid
 </h3>
 <div className="space-y-4">
 {scholarships.map((s, i) => (
 <div key={i} className="bg-card border border-border/8 p-5 hover:border-border/15 transition-colors">
 <div className="flex items-start justify-between gap-4">
 <h4 className="font-bold text-sm text-foreground">{s.name}</h4>
 {s.amount_usd && (
 <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 border border-primary/20 shrink-0">
 ${s.amount_usd.toLocaleString()}
 </span>
 )}
 </div>
 {(s.criteria || s.description) && (
 <p className="text-xs text-muted-foreground/60 mt-2">{s.criteria || s.description}</p>
 )}
 </div>
 ))}
 </div>
 </div>
 ) : (
 <div className="bg-background border border-border/5 p-8 text-center">
 <Award size={32} className="mx-auto text-muted-foreground/20 mb-3"/>
 <p className="text-sm text-muted-foreground/50 mb-1">Scholarship information not yet available</p>
 <p className="text-xs text-muted-foreground/30">Check the school website for financial aid options.</p>
 </div>
 )}
 </div>
 );
}
