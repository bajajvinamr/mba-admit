"use client";

import { useState } from"react";
import { motion } from"framer-motion";
import { BarChart3, Target, TrendingUp, Users } from"lucide-react";
import type { SchoolInsights } from"./types";

type Props = {
 insights: SchoolInsights;
 insightsProfile: { gmat: string; gpa: string; yoe: string };
 showInsightsForm: boolean;
 onProfileChange: (profile: { gmat: string; gpa: string; yoe: string }) => void;
 onShowForm: () => void;
 onHideForm: () => void;
 onSubmitProfile: () => void;
};

function DistributionChart({ data, label }: { data: { range: string; admitted: number; denied: number }[]; label: string }) {
 const maxTotal = Math.max(...data.map(b => b.admitted + b.denied));
 return (
 <div>
 <p className="text-xs uppercase tracking-widest text-muted-foreground/40 mb-3 font-bold">{label}</p>
 <div className="space-y-2">
 {data.map((bucket, i) => {
 const total = bucket.admitted + bucket.denied;
 const barWidth = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
 const admitPct = total > 0 ? (bucket.admitted / total) * 100 : 0;
 return (
 <div key={i} className="flex items-center gap-3">
 <span className="text-xs text-muted-foreground/60 w-16 text-right shrink-0 font-mono">{bucket.range}</span>
 <div className="flex-1 h-6 bg-background relative overflow-hidden">
 <motion.div initial={{ width: 0 }} whileInView={{ width: `${barWidth}%` }} viewport={{ once: true }}
 transition={{ duration: 0.5, delay: i * 0.1 }}
 className="absolute inset-y-0 left-0 flex">
 <div className="bg-emerald-500/80 h-full" style={{ width: `${admitPct}%` }} />
 <div className="bg-rose-400/60 h-full" style={{ width: `${100 - admitPct}%` }} />
 </motion.div>
 </div>
 <span className="text-[10px] text-muted-foreground/40 w-12 shrink-0">{bucket.admitted}A / {bucket.denied}D</span>
 </div>
 );
 })}
 </div>
 <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground/40">
 <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500/80"/> Admitted</span>
 <span className="flex items-center gap-1"><span className="w-2 h-2 bg-rose-400/60"/> Denied</span>
 </div>
 </div>
 );
}

export function ApplicantInsights({ insights, insightsProfile, showInsightsForm, onProfileChange, onShowForm, onHideForm, onSubmitProfile }: Props) {
 if (!insights.has_data || !insights.outcomes) return null;

 const outcomes = insights.outcomes;

 return (
 <div className="mt-10 border-t border-border/10 pt-10">
 <div className="flex items-center justify-between mb-6">
 <h2 className="heading-serif text-2xl flex items-center gap-2">
 <BarChart3 size={20} /> Applicant Insights
 </h2>
 <span className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-medium">
 {outcomes.total_decisions.toLocaleString()} decisions tracked
 </span>
 </div>

 {/* Outcome Stats Strip */}
 <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
 {[
 { label:"Admitted", value: outcomes.admit_count, color:"text-emerald-700"},
 { label:"Denied", value: outcomes.deny_count, color:"text-rose-600"},
 { label:"Waitlisted", value: outcomes.waitlist_count, color:"text-amber-600"},
 { label:"Interviewed", value: outcomes.interview_count, color:"text-blue-600"},
 { label:"Admit Rate", value: `${((outcomes.admit_count / outcomes.total_decisions) * 100).toFixed(1)}%`, color:"text-foreground"},
 ].map((stat, i) => (
 <div key={i} className="bg-background border border-border/5 p-4 text-center">
 <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 mb-1">{stat.label}</p>
 <p className={`text-xl heading-serif ${stat.color}`}>{typeof stat.value ==="number" ? stat.value.toLocaleString() : stat.value}</p>
 </div>
 ))}
 </div>

 {/* Medians for admitted applicants */}
 <div className="grid grid-cols-3 gap-4 mb-8">
 {outcomes.median_gmat_admitted && (
 <div className="bg-card border border-border/5 p-4 text-center">
 <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 mb-1">Median GMAT (Admits)</p>
 <p className="text-2xl heading-serif">{outcomes.median_gmat_admitted}</p>
 </div>
 )}
 {outcomes.median_gpa_admitted && (
 <div className="bg-card border border-border/5 p-4 text-center">
 <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 mb-1">Median GPA (Admits)</p>
 <p className="text-2xl heading-serif">{outcomes.median_gpa_admitted}</p>
 </div>
 )}
 {outcomes.median_yoe_admitted && (
 <div className="bg-card border border-border/5 p-4 text-center">
 <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 mb-1">Median YOE (Admits)</p>
 <p className="text-2xl heading-serif">{outcomes.median_yoe_admitted} yrs</p>
 </div>
 )}
 </div>

 {/* GMAT + GPA Distributions */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
 <DistributionChart data={outcomes.gmat_distribution} label="GMAT Distribution"/>
 <DistributionChart data={outcomes.gpa_distribution} label="GPA Distribution"/>
 </div>

 {/* Top Industries + Profile Fit */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 {/* Top Industries */}
 {outcomes.top_industries.length > 0 && (
 <div>
 <p className="text-xs uppercase tracking-widest text-muted-foreground/40 mb-3 font-bold">Top Industries (Admits)</p>
 <div className="space-y-2">
 {outcomes.top_industries.slice(0, 6).map((ind, i) => (
 <div key={i} className="flex items-center gap-3">
 <span className="text-xs text-muted-foreground/60 w-36 text-right shrink-0 truncate">{ind.industry}</span>
 <div className="flex-1 bg-background h-5 relative overflow-hidden">
 <motion.div initial={{ width: 0 }} whileInView={{ width: `${ind.pct}%` }} viewport={{ once: true }}
 transition={{ duration: 0.5, delay: i * 0.1 }}
 className="absolute inset-y-0 left-0 bg-foreground/70"
 />
 </div>
 <span className="text-xs font-medium w-10 text-right">{ind.pct}%</span>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Profile Fit OR Prompt */}
 <div>
 {insights.profile_fit ? (
 <div>
 <p className="text-xs uppercase tracking-widest text-muted-foreground/40 mb-3 font-bold flex items-center gap-2">
 <Target size={12} /> Your Profile Fit
 </p>
 <div className="space-y-3 mb-4">
 {[
 { label:"GMAT", pct: insights.profile_fit.gmat_percentile },
 { label:"GPA", pct: insights.profile_fit.gpa_percentile },
 { label:"Experience", pct: insights.profile_fit.yoe_percentile },
 ].map(({ label, pct }) => (
 <div key={label}>
 <div className="flex justify-between text-xs mb-1">
 <span className="text-muted-foreground/60">{label}</span>
 <span className={`font-bold ${pct >= 50 ?"text-emerald-700": pct >= 25 ?"text-amber-600":"text-rose-600"}`}>
 {pct}th percentile
 </span>
 </div>
 <div className="h-2 bg-background relative overflow-hidden">
 <motion.div initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }}
 transition={{ duration: 0.6 }}
 className={`absolute inset-y-0 left-0 ${pct >= 50 ?"bg-emerald-500": pct >= 25 ?"bg-amber-500":"bg-rose-500"}`}
 />
 </div>
 </div>
 ))}
 </div>
 <p className="text-sm text-muted-foreground/60 leading-relaxed bg-background border border-border/5 p-3">
 {insights.profile_fit.verdict}
 </p>
 <button onClick={onShowForm}
 className="text-xs text-primary hover:text-primary/80 font-medium mt-3 transition-colors">
 Update profile →
 </button>
 </div>
 ) : (
 <div className="bg-background border border-border/5 p-6 text-center">
 <TrendingUp size={24} className="text-muted-foreground/20 mx-auto mb-3"strokeWidth={1.5} />
 <p className="text-sm font-medium text-foreground mb-1">See how you compare</p>
 <p className="text-xs text-muted-foreground/40 mb-4">Enter your profile to see where you stand among admitted applicants</p>
 <button onClick={onShowForm}
 className="bg-foreground text-white px-5 py-3 text-xs uppercase tracking-widest font-bold hover:bg-foreground/80 transition-colors">
 Enter Profile
 </button>
 </div>
 )}

 {/* Similar Applicants */}
 {insights.similar_applicants && insights.similar_applicants.length > 0 && (
 <div className="mt-6">
 <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground/40 mb-3 flex items-center gap-2">
 <Users size={14} /> People Like You
 </p>
 <div className="space-y-2">
 {insights.similar_applicants.slice(0, 6).map((a, i) => {
 const outcomeColor =
 a.outcome ==="Admitted" ?"bg-emerald-50 text-emerald-700 border-emerald-200":
 a.outcome ==="Interview" ?"bg-blue-50 text-blue-700 border-blue-200":
 a.outcome ==="Waitlisted" ?"bg-amber-50 text-amber-700 border-amber-200":
"bg-red-50 text-red-700 border-red-200";
 return (
 <div key={i} className="flex items-center justify-between bg-background border border-border/5 px-4 py-2.5">
 <div className="flex items-center gap-4 text-xs text-muted-foreground/60">
 {a.gmat && <span className="font-bold text-foreground">{a.gmat}</span>}
 {a.gpa && <span>{a.gpa} GPA</span>}
 {a.yoe && <span>{a.yoe}y exp</span>}
 {a.industry && <span className="text-muted-foreground/40">{a.industry}</span>}
 </div>
 <div className="flex items-center gap-2">
 {a.round && <span className="text-[10px] text-muted-foreground/30">{a.round}</span>}
 <span className={`text-[10px] px-2 py-0.5 border font-bold uppercase ${outcomeColor}`}>
 {a.outcome}
 </span>
 </div>
 </div>
 );
 })}
 </div>
 <p className="text-[10px] text-muted-foreground/30 mt-2">
 Showing applicants with similar GMAT/GPA/experience. Data from GMAT Club community.
 </p>
 </div>
 )}

 {/* Profile Input Form */}
 {showInsightsForm && (
 <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
 className="mt-4 bg-card border border-border/10 p-5">
 <p className="text-xs uppercase tracking-widest text-muted-foreground/40 mb-3 font-bold">Your Profile</p>
 <div className="grid grid-cols-3 gap-3 mb-3">
 <input type="number" placeholder="GMAT" value={insightsProfile.gmat}
 onChange={e => onProfileChange({ ...insightsProfile, gmat: e.target.value })}
 className="border border-border/10 px-3 py-2 text-sm focus:outline-none focus:border-border transition-colors"/>
 <input type="number" step="0.01" placeholder="GPA" value={insightsProfile.gpa}
 onChange={e => onProfileChange({ ...insightsProfile, gpa: e.target.value })}
 className="border border-border/10 px-3 py-2 text-sm focus:outline-none focus:border-border transition-colors"/>
 <input type="number" placeholder="YOE" value={insightsProfile.yoe}
 onChange={e => onProfileChange({ ...insightsProfile, yoe: e.target.value })}
 className="border border-border/10 px-3 py-2 text-sm focus:outline-none focus:border-border transition-colors"/>
 </div>
 <div className="flex gap-2">
 <button onClick={onSubmitProfile}
 className="bg-foreground text-white px-4 py-2 text-xs uppercase tracking-widest font-bold hover:bg-foreground/80 transition-colors">
 Show My Fit
 </button>
 <button onClick={onHideForm}
 className="text-muted-foreground/40 px-4 py-2 text-xs uppercase tracking-widest hover:text-muted-foreground transition-colors">
 Cancel
 </button>
 </div>
 </motion.div>
 )}
 </div>
 </div>
 </div>
 );
}
