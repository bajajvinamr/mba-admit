"use client";

import { useState, useEffect } from"react";
import Link from"next/link";
import { motion, AnimatePresence } from"framer-motion";
import {
 GraduationCap, Target, TrendingUp, Users, MapPin,
 ChevronRight, Sparkles, Shield, ArrowUpRight,
 CheckCircle2, Star, Plus, Check, Loader2,
} from"lucide-react";
import { apiFetch, ApiError } from"@/lib/api";
import { useAbortSignal } from"@/hooks/useAbortSignal";
import { toast } from"@/components/Toast";
import { track } from"@/lib/analytics";

type TrackingState =" idle"|"loading"|"tracked";

type ProfileFit = {
 gmat_percentile: number;
 gpa_percentile: number;
 yoe_percentile: number;
 verdict: string;
};

type RecommendedSchool = {
 school_id: string;
 name: string;
 location: string;
 country: string;
 gmat_avg: number | null;
 acceptance_rate: number | null;
 median_salary: string;
 tuition_usd: number | null;
 tuition_inr: string | null;
 specializations: string[];
 primary_admission_test: string | null;
 stem_designated: boolean;
 degree_type?: string;
 tier:"Reach"|"Target"|"Safety";
 prob: number;
 total_decisions: number;
 admit_count: number;
 similar_admits: number;
 profile_fit: ProfileFit | null;
 fit_reason: string | null;
};

type RecommendationsData = {
 recommendations: RecommendedSchool[];
 profile_summary: {
 gmat: number;
 gpa: number;
 yoe: number | null;
 gmat_estimated: boolean;
 };
 tier_counts: {
 reach: number;
 target: number;
 safety: number;
 };
};

type UserProfile = {
 gmat?: number | null;
 gpa?: number | null;
 yoe?: number | null;
 test_type?: string | null;
 target_degree?: string | null;
};

const TIER_META = {
 Reach: {
 label:"Reach",
 icon: Star,
 color:"text-amber-600",
 bgColor:"bg-amber-50",
 borderColor:"border-amber-200",
 badgeColor:"bg-amber-100 text-amber-700",
 desc:"Aspirational - need a strong story",
 },
 Target: {
 label:"Target",
 icon: Target,
 color:"text-emerald-600",
 bgColor:"bg-emerald-50",
 borderColor:"border-emerald-200",
 badgeColor:"bg-emerald-100 text-emerald-700",
 desc:"Best fit - highest ROI of effort",
 },
 Safety: {
 label:"Safety",
 icon: Shield,
 color:"text-blue-600",
 bgColor:"bg-blue-50",
 borderColor:"border-blue-200",
 badgeColor:"bg-blue-100 text-blue-700",
 desc:"Strong chance - build your list",
 },
};

function fitGradient(prob: number): string {
 if (prob >= 60) return "from-emerald-500 to-emerald-400";
 if (prob >= 40) return "from-amber-500 to-amber-400";
 if (prob >= 25) return "from-orange-500 to-orange-400";
 return "from-red-500 to-red-400";
}

export function RecommendedSchools({ profile }: { profile: UserProfile }) {
 const [data, setData] = useState<RecommendationsData | null>(null);
 const [loading, setLoading] = useState(true);
 const [activeTier, setActiveTier] = useState<string | null>(null);
 const [trackingStates, setTrackingStates] = useState<Record<string, TrackingState>>({});

 const handleTrack = async (schoolId: string, e: React.MouseEvent) => {
 e.preventDefault();
 e.stopPropagation();
 if (trackingStates[schoolId] ==="tracked" || trackingStates[schoolId] ==="loading") return;

 setTrackingStates((prev) => ({ ...prev, [schoolId]:"loading"}));
 try {
 await apiFetch(`/api/user/schools`, {
 method:"POST",
 body: JSON.stringify({ school_id: schoolId }),
 noRetry: true,
 });
 setTrackingStates((prev) => ({ ...prev, [schoolId]:"tracked"}));
 const school = data?.recommendations.find(r => r.school_id === schoolId);
 toast.success(`${school?.name ||"School"} added to your tracker`);
 track("school_tracked", { school_id: schoolId, source:"recommendations"});
 } catch (err) {
 if (err instanceof ApiError && err.status === 409) {
 setTrackingStates((prev) => ({ ...prev, [schoolId]:"tracked"}));
 toast.success("Already in your tracker");
 } else if (err instanceof ApiError && err.status === 401) {
 setTrackingStates((prev) => ({ ...prev, [schoolId]:" idle"}));
 toast.info("Sign in to track schools");
 } else {
 setTrackingStates((prev) => ({ ...prev, [schoolId]:" idle"}));
 toast.error("Failed to track school. Try again.");
 }
 }
 };

 useEffect(() => {
 if (!profile.gmat && !profile.gpa) {
 setLoading(false);
 return;
 }

 const params = new URLSearchParams();
 if (profile.gmat) params.set("gmat", String(profile.gmat));
 if (profile.gpa) params.set("gpa", String(profile.gpa));
 if (profile.yoe) params.set("yoe", String(profile.yoe));
 if (profile.test_type) params.set("test_type", profile.test_type);
 if (profile.target_degree) params.set("degree_type", profile.target_degree);
 params.set("limit","12");

 const controller = new AbortController();
 apiFetch<RecommendationsData>(`/api/recommendations?${params.toString()}`, {
 signal: controller.signal,
 })
 .then((d) => setData(d))
 .catch((err) => {
 if (err?.name !=="AbortError") {
 console.error("Failed to load recommendations:", err);
 }
 })
 .finally(() => setLoading(false));

 return () => controller.abort();
 }, [profile.gmat, profile.gpa, profile.yoe]);

 if (!profile.gmat && !profile.gpa) {
 return null; // Don't render section without profile
 }

 if (loading) {
 return (
 <section>
 <div className="flex items-center gap-2 mb-5">
 <Sparkles size={14} className="text-primary"/>
 <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/30">
 Recommended For You
 </h2>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {Array.from({ length: 6 }).map((_, i) => (
 <div key={i} className="editorial-card animate-pulse">
 <div className="h-4 w-32 bg-foreground/10 rounded mb-3"/>
 <div className="h-3 w-24 bg-foreground/5 rounded mb-4"/>
 <div className="h-8 w-full bg-foreground/5 rounded mb-3"/>
 <div className="h-3 w-20 bg-foreground/5 rounded"/>
 </div>
 ))}
 </div>
 </section>
 );
 }

 if (!data || data.recommendations.length === 0) {
 return null;
 }

 const { recommendations, tier_counts } = data;
 const filtered = activeTier
 ? recommendations.filter((s) => s.tier === activeTier)
 : recommendations;

 return (
 <section>
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
 <div className="flex items-center gap-2">
 <Sparkles size={14} className="text-primary"/>
 <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/30">
 Recommended For You
 </h2>
 </div>

 {/* Tier Filter Chips */}
 <div className="flex gap-2">
 {(["Target","Reach","Safety"] as const).map((tier) => {
 const meta = TIER_META[tier];
 const count = tier_counts[tier.toLowerCase() as keyof typeof tier_counts];
 const isActive = activeTier === tier;
 return (
 <button
 key={tier}
 onClick={() => setActiveTier(isActive ? null : tier)}
 className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all ${
 isActive
 ? `${meta.badgeColor} ring-1 ring-current`
 :"bg-foreground/5 text-muted-foreground/40 hover:bg-foreground/10"
 }`}
 >
 {meta.label}
 <span className="font-mono">{count}</span>
 </button>
 );
 })}
 </div>
 </div>

 {/* Cards */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 <AnimatePresence mode="popLayout">
 {filtered.map((school) => {
 const meta = TIER_META[school.tier];
 const TierIcon = meta.icon;

 return (
 <motion.div
 key={school.school_id}
 layout
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 transition={{ duration: 0.2 }}
 >
 <Link
 href={`/school/${school.school_id}`}
 className={`editorial-card group hover:border-primary/30 transition-all flex flex-col h-full border-l-2 ${meta.borderColor}`}
 >
 {/* Top row: name + tier badge */}
 <div className="flex items-start justify-between mb-2">
 <div className="min-w-0 flex-1">
 <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
 {school.name}
 </h3>
 <p className="text-[10px] text-muted-foreground/40 flex items-center gap-1 mt-0.5">
 <MapPin size={9} /> {school.location}
 {school.degree_type && school.degree_type !=="MBA" && (
 <span className="ml-1 text-[8px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 uppercase tracking-wider border border-primary/20">{school.degree_type}</span>
 )}
 </p>
 </div>
 <span
 className={`flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-full whitespace-nowrap ml-2 ${meta.badgeColor}`}
 >
 <TierIcon size={9} />
 {meta.label}
 </span>
 </div>

 {/* Probability bar */}
 <div className="mb-3">
 <div className="flex items-center justify-between mb-1">
 <span className="text-[9px] text-muted-foreground/30 uppercase tracking-widest">
 Chance
 </span>
 <span className="text-xs font-bold font-mono text-foreground">
 {school.prob}%
 </span>
 </div>
 <div className="h-1.5 bg-foreground/5 rounded-full overflow-hidden">
 <div
 className={`h-full rounded-full bg-gradient-to-r ${fitGradient(school.prob)}`}
 style={{ width: `${school.prob}%` }}
 />
 </div>
 {school.fit_reason && (
 <p className="text-[10px] text-muted-foreground/50 mt-1.5 italic">
 {school.fit_reason}
 </p>
 )}
 </div>

 {/* Stats row */}
 <div className="grid grid-cols-3 gap-2 mb-3">
 <div className="text-center">
 <p className="text-[9px] text-muted-foreground/30 uppercase tracking-widest">
 {school.primary_admission_test ==="CAT" ?"Test":"GMAT"}
 </p>
 <p className="text-sm font-bold font-mono text-foreground">
 {school.gmat_avg || school.primary_admission_test ||"-"}
 </p>
 </div>
 <div className="text-center">
 <p className="text-[9px] text-muted-foreground/30 uppercase tracking-widest">
 Accept
 </p>
 <p className="text-sm font-bold font-mono text-foreground">
 {school.acceptance_rate
 ? `${school.acceptance_rate}%`
 :"-"}
 </p>
 </div>
 <div className="text-center">
 <p className="text-[9px] text-muted-foreground/30 uppercase tracking-widest">
 Salary
 </p>
 <p className="text-sm font-bold font-mono text-foreground truncate">
 {school.median_salary !=="N/A"
 ? school.median_salary
 :"-"}
 </p>
 </div>
 </div>

 {/* Social proof line */}
 {school.total_decisions > 0 && (
 <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40 mb-3 py-2 px-3 bg-background rounded">
 <Users size={10} className="text-muted-foreground/30 flex-shrink-0"/>
 {school.similar_admits > 0 ? (
 <span>
 <span className="font-bold text-foreground">
 {school.similar_admits}
 </span>{""}
 similar profiles admitted
 </span>
 ) : (
 <span>
 <span className="font-bold text-foreground">
 {school.total_decisions.toLocaleString()}
 </span>{""}
 real decisions tracked
 </span>
 )}
 </div>
 )}

 {/* Specializations */}
 {school.specializations.length > 0 && (
 <div className="flex flex-wrap gap-1 mb-3">
 {school.specializations.map((s) => (
 <span
 key={s}
 className="text-[9px] px-2 py-0.5 bg-foreground/5 text-muted-foreground/50 rounded-full"
 >
 {s}
 </span>
 ))}
 {school.stem_designated && (
 <span className="text-[9px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-bold">
 STEM
 </span>
 )}
 </div>
 )}

 {/* CTA row */}
 <div className="mt-auto pt-2 flex items-center justify-between">
 <span className="text-[10px] text-muted-foreground/30 uppercase tracking-widest font-bold flex items-center gap-1">
 View Details
 <ArrowUpRight size={10} className="text-muted-foreground/20 group-hover:text-primary transition-colors"/>
 </span>
 <button
 onClick={(e) => handleTrack(school.school_id, e)}
 className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full transition-all ${
 trackingStates[school.school_id] ==="tracked"
 ?"bg-emerald-100 text-emerald-700"
 :"bg-foreground/5 text-muted-foreground/50 hover:bg-primary/20 hover:text-foreground"
 }`}
 >
 {trackingStates[school.school_id] ==="loading" ? (
 <Loader2 size={10} className="animate-spin"/>
 ) : trackingStates[school.school_id] ==="tracked" ? (
 <Check size={10} />
 ) : (
 <Plus size={10} />
 )}
 {trackingStates[school.school_id] ==="tracked" ?"Tracked":"Track"}
 </button>
 </div>
 </Link>
 </motion.div>
 );
 })}
 </AnimatePresence>
 </div>

 {/* Footer CTA */}
 <div className="mt-6 text-center">
 <Link
 href="/schools"
 className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:text-foreground transition-colors"
 >
 Browse all {tier_counts.reach + tier_counts.target + tier_counts.safety}{""}
 schools <ChevronRight size={12} />
 </Link>
 </div>
 </section>
 );
}
