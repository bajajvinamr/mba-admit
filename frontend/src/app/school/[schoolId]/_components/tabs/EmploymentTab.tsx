"use client";

import { DollarSign, Briefcase, ShieldCheck } from"lucide-react";
import { motion } from"framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from"recharts";
import type { SchoolData } from"../types";

type Props = {
 school: SchoolData;
};

const PIE_COLORS = [
"#1a1a1a","#b8860b","#2d5016","#1e3a5f","#5b2c6f",
"#7b3f00","#4a4a4a","#6b6b6b","#8b8b8b","#ababab",
];

function VerifiedBadge() {
 return (
 <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 text-[9px] font-bold uppercase tracking-wider ml-2">
 <ShieldCheck size={8} /> Verified
 </span>
 );
}

export function EmploymentTab({ school }: Props) {
 const place = school.placement_stats;
 const dq = school.data_quality_summary;
 const isVerified = dq?.verified_fields?.includes("placement_stats") ?? false;

 if (!place || (!place.employment_rate_3_months && !place.median_base_salary && !place.median_signing_bonus)) {
 return (
 <div className="pb-16 max-w-3xl">
 <h2 className="heading-serif text-2xl mb-5 flex items-center gap-2">
 <DollarSign size={20} /> Placement Statistics
 </h2>
 <div className="bg-background border border-border/5 p-8 text-center">
 <Briefcase size={32} className="mx-auto text-muted-foreground/20 mb-3"/>
 <p className="text-sm text-muted-foreground/50 mb-1">Employment data not yet available</p>
 <p className="text-xs text-muted-foreground/30">We&apos;re working on collecting placement data for this program.</p>
 </div>
 </div>
 );
 }

 const pieData = place.industry_breakdown?.map(ind => ({
 name: ind.industry,
 value: ind.percentage,
 })) ?? [];

 return (
 <div className="pb-16">
 <h2 className="heading-serif text-2xl mb-5 flex items-center gap-2">
 <DollarSign size={20} /> Placement Statistics
 {isVerified && <VerifiedBadge />}
 </h2>

 {/* Key stats */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
 <div className="bg-foreground text-white p-6 text-center">
 <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Employed in 3 Months</p>
 <p className="text-3xl heading-serif">{place.employment_rate_3_months ||"-"}</p>
 </div>
 <div className="bg-foreground text-white p-6 text-center">
 <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Median Base Salary</p>
 <p className="text-3xl heading-serif">{place.median_base_salary ||"-"}</p>
 </div>
 <div className="bg-foreground text-white p-6 text-center">
 <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Median Signing Bonus</p>
 <p className="text-3xl heading-serif">{place.median_signing_bonus ||"-"}</p>
 </div>
 </div>

 {place.internship_rate && (
 <div className="bg-background border border-border/5 p-4 text-center mb-10">
 <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 mb-1">Internship Rate</p>
 <p className="text-xl heading-serif">{place.internship_rate}</p>
 </div>
 )}

 {/* Industry breakdown: chart + bar */}
 {place.industry_breakdown && place.industry_breakdown.length > 0 && (
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">
 {/* Pie chart */}
 {pieData.length > 0 && (
 <div>
 <p className="text-xs uppercase tracking-widest text-muted-foreground/40 mb-4 font-bold">Industry Breakdown</p>
 <div className="h-72">
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie
 data={pieData}
 cx="50%"
 cy="50%"
 innerRadius={50}
 outerRadius={100}
 paddingAngle={2}
 dataKey="value"
 nameKey="name"
 >
 {pieData.map((_entry, idx) => (
 <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
 ))}
 </Pie>
 <Tooltip
 formatter={(value) => [`${value}%`,"Share"]}
 contentStyle={{
 backgroundColor:"#1a1a1a",
 border:"none",
 color:"#fff",
 fontSize:"12px",
 }}
 />
 </PieChart>
 </ResponsiveContainer>
 </div>
 {/* Legend */}
 <div className="flex flex-wrap gap-3 mt-2">
 {pieData.slice(0, 8).map((entry, idx) => (
 <span key={idx} className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
 <span className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
 {entry.name}
 </span>
 ))}
 </div>
 </div>
 )}

 {/* Bar breakdown */}
 <div>
 <p className="text-xs uppercase tracking-widest text-muted-foreground/40 mb-4 font-bold">Detailed Breakdown</p>
 <div className="space-y-2">
 {place.industry_breakdown.map((ind, i) => (
 <div key={i} className="flex items-center gap-3">
 <div className="w-28 text-xs text-muted-foreground/60 text-right shrink-0 truncate">{ind.industry}</div>
 <div className="flex-1 bg-background h-6 relative overflow-hidden">
 <motion.div initial={{ width: 0 }} whileInView={{ width: `${ind.percentage}%` }} viewport={{ once: true }}
 transition={{ duration: 0.6, delay: i * 0.1 }}
 className="absolute inset-y-0 left-0 bg-foreground/80"
 />
 </div>
 <span className="text-xs font-medium w-10 text-right">{ind.percentage}%</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* Top recruiters */}
 {place.top_recruiters && place.top_recruiters.length > 0 && (
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
