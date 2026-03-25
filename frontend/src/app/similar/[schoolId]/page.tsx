"use client";

import { useState, useEffect } from"react";
import { useParams } from"next/navigation";
import { motion } from"framer-motion";
import {
 ArrowLeft, ArrowRight, GraduationCap, MapPin, Target,
 DollarSign, Users, BarChart3,
} from"lucide-react";
import Link from"next/link";
import { apiFetch } from"@/lib/api";

type SimilarSchool = {
 school_id: string;
 school_name: string;
 similarity_score: number;
 match_reasons: string[];
};

type SimilarResponse = {
 school_id: string;
 school_name: string;
 similar_schools: SimilarSchool[];
};

export default function SimilarSchoolsPage() {
 const { schoolId } = useParams<{ schoolId: string }>();
 const [data, setData] = useState<SimilarResponse | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 if (!schoolId) return;
 setLoading(true);
 setError(null);
 apiFetch<SimilarResponse>(`/api/schools/${schoolId}/similar`)
 .then(setData)
 .catch(() => { setData(null); setError("Failed to load similar schools."); })
 .finally(() => setLoading(false));
 }, [schoolId]);

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-3xl mx-auto">
 <Link href={`/school/${schoolId}`} className="text-white/40 hover:text-white text-sm flex items-center gap-1 mb-4">
 <ArrowLeft size={14} /> Back to {data?.school_name || schoolId}
 </Link>
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Schools Similar to {data?.school_name || schoolId}
 </h1>
 <p className="text-white/70">Programs with comparable profiles, rankings, and outcomes.</p>
 </div>
 </section>

 <div className="max-w-3xl mx-auto px-6 py-10">
 {error && (
 <div role="alert" className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg text-sm mb-4">
 {error}
 </div>
 )}
 {loading && (
 <div className="text-center py-16 text-foreground/40">
 <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"/>
 </div>
 )}

 {data && !loading && (
 <div className="space-y-4">
 {data.similar_schools.map((s, i) => {
 const pct = Math.round(s.similarity_score * 100);
 return (
 <motion.div
 key={s.school_id}
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i * 0.05 }}
 className="editorial-card p-6"
 >
 <div className="flex items-start justify-between mb-3">
 <div>
 <Link
 href={`/school/${s.school_id}`}
 className="font-semibold text-lg text-foreground hover:text-primary transition-colors"
 >
 {s.school_name}
 </Link>
 <div className="flex flex-wrap gap-1.5 mt-2">
 {s.match_reasons.map((r, j) => (
 <span key={j} className="text-[10px] px-2 py-1 bg-primary/10 text-primary rounded-full">
 {r}
 </span>
 ))}
 </div>
 </div>
 <div className="text-right flex-shrink-0">
 <span className={`text-2xl font-bold ${
 pct >= 80 ?"text-emerald-600": pct >= 60 ?"text-amber-600":"text-foreground/40"
 }`}>
 {pct}%
 </span>
 <p className="text-[10px] text-foreground/40">match</p>
 </div>
 </div>

 {/* Similarity bar */}
 <div className="w-full bg-foreground/5 rounded-full h-1.5 overflow-hidden">
 <motion.div
 className={`h-full rounded-full ${
 pct >= 80 ?"bg-emerald-500": pct >= 60 ?"bg-amber-500":"bg-foreground/20"
 }`}
 initial={{ width: 0 }}
 animate={{ width: `${pct}%` }}
 transition={{ duration: 0.5, delay: i * 0.05 }}
 />
 </div>

 <div className="flex gap-3 mt-3">
 <Link href={`/school/${s.school_id}`} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
 View Profile <ArrowRight size={10} />
 </Link>
 <Link href={`/compare?schools=${schoolId},${s.school_id}`} className="text-xs text-foreground/40 hover:text-foreground/60 flex items-center gap-1">
 Compare <BarChart3 size={10} />
 </Link>
 </div>
 </motion.div>
 );
 })}
 </div>
 )}

 {!loading && !data && (
 <div className="text-center py-16 text-foreground/30">
 <GraduationCap size={48} className="mx-auto mb-4 opacity-30"/>
 <p>School not found</p>
 </div>
 )}
 </div>
 </main>
 );
}
