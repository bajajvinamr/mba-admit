"use client";

import { useState, useEffect } from"react";
import { motion } from"framer-motion";
import {
 Target, GraduationCap, TrendingUp, ArrowRight, BarChart3,
} from"lucide-react";
import Link from"next/link";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import { EmailCapture } from"@/components/EmailCapture";

type SchoolTarget = {
 school_id: string;
 school_name: string;
 gmat_avg: number;
 acceptance_rate: number | null;
};

type TargetResponse = {
 tiers: Record<string, SchoolTarget[]>;
 summary: { M7_avg: number; T15_avg: number; T25_avg: number };
};

const TIER_COLORS: Record<string, string> = {
 M7:"bg-primary/15 text-primary border-primary/30",
 T15:"bg-blue-50 text-blue-600 border-blue-200",
 T25:"bg-purple-50 text-purple-600 border-purple-200",
 Other:"bg-foreground/5 text-foreground/50 border-border/10",
};

export default function GmatTargetsPage() {
 const [data, setData] = useState<TargetResponse | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [myScore, setMyScore] = useState<number | undefined>();

 useEffect(() => {
 apiFetch<TargetResponse>("/api/schools/gmat-targets")
 .then(setData)
 .catch(() => setError("Failed to load GMAT targets. Please refresh."))
 .finally(() => setLoading(false));
 }, []);

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-4xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 GMAT Score Targets
 </h1>
 <p className="text-white/70 text-lg">
 What score do you need? See averages by tier.
 </p>
 </div>
 </section>

 <div className="max-w-4xl mx-auto px-6 py-10">
 {error && (
 <div className="editorial-card p-4 mb-6 border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
 )}

 {/* My Score Input */}
 <div className="editorial-card p-6 mb-8">
 <label className="text-sm font-medium text-foreground/60 block mb-2">Your GMAT Score (optional)</label>
 <input type="number" placeholder="Enter your score to see where you stand"
 value={myScore ??""} onChange={(e) => setMyScore(e.target.value ? +e.target.value : undefined)}
 className="w-full px-4 py-3 border border-border/10 rounded-lg text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"/>
 </div>

 {/* Summary */}
 {data && (
 <div className="grid grid-cols-3 gap-4 mb-8">
 {[
 { label:"M7 Average", value: data.summary.M7_avg, color:"text-primary"},
 { label:"T15 Average", value: data.summary.T15_avg, color:"text-blue-600"},
 { label:"T25 Average", value: data.summary.T25_avg, color:"text-purple-600"},
 ].map((s) => (
 <div key={s.label} className="editorial-card p-4 text-center">
 <p className="text-xs text-foreground/40 mb-1">{s.label}</p>
 <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
 {myScore && (
 <p className={`text-xs mt-1 ${myScore >= s.value ?"text-emerald-600":"text-red-500"}`}>
 {myScore >= s.value ? `+${myScore - s.value} above` : `${s.value - myScore} below`}
 </p>
 )}
 </div>
 ))}
 </div>
 )}

 {loading && (
 <div className="text-center py-16">
 <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"/>
 </div>
 )}

 {/* Tiers */}
 {data && ["M7","T15","T25","Other"].map((tier) => {
 const schools = data.tiers[tier];
 if (!schools || schools.length === 0) return null;
 return (
 <div key={tier} className="mb-8">
 <h2 className="heading-serif text-xl font-[family-name:var(--font-heading)] text-foreground mb-4 flex items-center gap-2">
 <span className={`text-xs px-2 py-1 rounded border font-bold ${TIER_COLORS[tier]}`}>{tier}</span>
 {tier !=="Other" && <span className="text-sm text-foreground/40">({schools.length} schools)</span>}
 </h2>
 <div className="editorial-card overflow-hidden">
 <div className="divide-y divide-jet/5">
 {schools.slice(0, tier ==="Other" ? 15 : schools.length).map((s, i) => {
 const barWidth = Math.max(10, ((s.gmat_avg - 500) / 300) * 100);
 const isAbove = myScore ? myScore >= s.gmat_avg : false;
 return (
 <motion.div
 key={s.school_id}
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ delay: i * 0.02 }}
 className="flex items-center gap-4 px-6 py-3"
 >
 <Link href={`/school/${s.school_id}`}
 className="text-sm font-medium text-foreground hover:text-primary transition-colors w-40 truncate">
 {s.school_name}
 </Link>
 <div className="flex-1 bg-foreground/5 rounded-full h-2.5 overflow-hidden">
 <div className={`h-full rounded-full ${
 myScore && isAbove ?"bg-emerald-500": myScore && !isAbove ?"bg-red-400":"bg-primary"
 }`} style={{ width: `${barWidth}%` }} />
 </div>
 <span className="text-sm font-bold text-foreground w-12 text-right">{s.gmat_avg}</span>
 {s.acceptance_rate && (
 <span className="text-[10px] text-foreground/30 w-12 text-right">{s.acceptance_rate}%</span>
 )}
 </motion.div>
 );
 })}
 </div>
 </div>
 </div>
 );
 })}

 <EmailCapture variant="contextual"source="gmat-targets"/>
 <ToolCrossLinks current="/gmat-targets"/>
 </div>
 </main>
 );
}
