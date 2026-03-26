"use client";

import { useState, useEffect, useCallback, Suspense } from"react";
import { useSearchParams } from"next/navigation";
import { motion } from"framer-motion";
import {
 BarChart3, GraduationCap, Briefcase, Users, Globe, Award,
 TrendingUp, ChevronRight, Target, ArrowRight, Share2,
 Copy, Check, Twitter, Linkedin, MessageCircle,
} from"lucide-react";
import Link from"next/link";
import { apiFetch } from"@/lib/api";
import { useProfile } from"@/hooks/useProfile";
import { useUsage } from"@/hooks/useUsage";
import { UsageGate } from"@/components/UsageGate";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type Dimensions = {
 academics: number;
 work_experience: number;
 leadership: number;
 diversity: number;
 extracurriculars: number;
 pedigree: number;
};

type SchoolFit = {
 school_id: string;
 school_name: string;
 fit_score: number;
 strongest: string;
 weakest: string;
};

type Report = {
 dimensions: Dimensions;
 overall: number;
 school_fits: SchoolFit[];
};

const DIM_LABELS: Record<keyof Dimensions, { label: string; icon: React.ReactNode }> = {
 academics: { label:"Academics", icon: <GraduationCap size={16} /> },
 work_experience: { label:"Work Experience", icon: <Briefcase size={16} /> },
 leadership: { label:"Leadership", icon: <TrendingUp size={16} /> },
 diversity: { label:"Diversity", icon: <Globe size={16} /> },
 extracurriculars: { label:"Extracurriculars", icon: <Users size={16} /> },
 pedigree: { label:"Pedigree", icon: <Award size={16} /> },
};

// ── Share helpers ────────────────────────────────────────────────────────────

type ShareParams = {
 g: number; // gmat
 p: number; // gpa
 s: string; // gpa scale
 t: string; // test type
 ts?: number; // test score (non-gmat)
 i?: string; // industry
 y?: number; // yoe
 u?: string; // undergrad tier
 l?: string; // leadership
 x?: number; // intl_experience (1/0)
 c?: number; // community_service (1/0)
};

function encodeShareParams(form: {
 testType: string; gmat: string; testScore: string;
 gpa: string; gpaScale: string; industry: string;
 years_experience: string; undergrad_tier: string;
 leadership_roles: string; intl_experience: boolean;
 community_service: boolean;
}): string {
 const params: ShareParams = {
 g: parseInt(form.gmat) || 700,
 p: parseFloat(form.gpa) || 3.5,
 s: form.gpaScale,
 t: form.testType,
 };
 if (form.testType !=="gmat" && form.testScore) params.ts = parseInt(form.testScore);
 if (form.industry) params.i = form.industry;
 if (form.years_experience) params.y = parseInt(form.years_experience);
 if (form.undergrad_tier) params.u = form.undergrad_tier;
 if (form.leadership_roles) params.l = form.leadership_roles;
 if (form.intl_experience) params.x = 1;
 if (form.community_service) params.c = 1;
 return btoa(JSON.stringify(params));
}

function decodeShareParams(encoded: string): ShareParams | null {
 try {
 return JSON.parse(atob(encoded));
 } catch {
 return null;
 }
}

function getShareUrl(encoded: string): string {
 if (typeof window ==="undefined") return "";
 return `${window.location.origin}/profile-report?d=${encoded}`;
}

function ShareBar({ shareUrl, overall }: { shareUrl: string; overall: number }) {
 const [copied, setCopied] = useState(false);

 const handleCopy = async () => {
 await navigator.clipboard.writeText(shareUrl);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 };

 const shareText = `I scored ${overall}/100 on the MBA Profile Strength Report. See how your profile compares:`;
 const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
 const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
 const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;

 return (
 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.3 }}
 className="bg-card border border-border/10 p-6"
 >
 <div className="flex items-center gap-2 mb-4">
 <Share2 size={14} className="text-primary"/>
 <h3 className="text-xs uppercase tracking-widest font-bold text-muted-foreground/40">
 Share Your Report
 </h3>
 </div>
 <div className="flex gap-2 mb-3">
 <button
 onClick={handleCopy}
 className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-border/10 text-sm font-bold text-foreground hover:bg-background transition-colors"
 >
 {copied ? <><Check size={14} className="text-emerald-500"/> Copied!</> : <><Copy size={14} /> Copy Link</>}
 </button>
 <a
 href={twitterUrl}
 target="_blank"
 rel="noopener noreferrer"
 aria-label="Share on Twitter"
 className="px-4 py-2.5 border border-border/10 text-foreground hover:bg-background transition-colors flex items-center"
 >
 <Twitter size={16} />
 </a>
 <a
 href={linkedinUrl}
 target="_blank"
 rel="noopener noreferrer"
 aria-label="Share on LinkedIn"
 className="px-4 py-2.5 border border-border/10 text-foreground hover:bg-background transition-colors flex items-center"
 >
 <Linkedin size={16} />
 </a>
 <a
 href={whatsappUrl}
 target="_blank"
 rel="noopener noreferrer"
 aria-label="Share on WhatsApp"
 className="px-4 py-2.5 border border-border/10 text-foreground hover:bg-background transition-colors flex items-center"
 >
 <MessageCircle size={16} />
 </a>
 </div>
 <p className="text-[10px] text-muted-foreground/30 text-center">
 Share your MBA readiness score with friends and study groups
 </p>
 </motion.div>
 );
}

function ScoreBar({ label, icon, score }: { label: string; icon: React.ReactNode; score: number }) {
 const color =
 score >= 70 ?"bg-emerald-500": score >= 50 ?"bg-amber-500":"bg-red-400";
 return (
 <div className="space-y-1.5">
 <div className="flex justify-between items-center">
 <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50 flex items-center gap-2">
 {icon} {label}
 </span>
 <span className="text-sm font-bold text-foreground">{score}</span>
 </div>
 <div className="h-3 bg-foreground/5 rounded-full overflow-hidden">
 <motion.div
 initial={{ width: 0 }}
 animate={{ width: `${score}%` }}
 transition={{ duration: 0.8, ease:"easeOut"}}
 className={`h-full rounded-full ${color}`}
 />
 </div>
 </div>
 );
}

export default function ProfileReportPage() {
 return (
 <Suspense fallback={
 <div className="min-h-screen bg-background flex items-center justify-center">
 <div className="w-10 h-10 border-4 border-border/5 border-t-jet rounded-full animate-spin"/>
 </div>
 }>
 <ProfileReportContent />
 </Suspense>
 );
}

function ProfileReportContent() {
 const searchParams = useSearchParams();
 const { profile: savedProfile, updateProfile: saveProfile } = useProfile();
 const usage = useUsage("profile_report");
 const [form, setForm] = useState({
 testType:"gmat",
 gmat:"",
 testScore:"",
 gpa:"",
 gpaScale:"4.0",
 industry:"",
 years_experience:"",
 undergrad_tier:"",
 leadership_roles:"",
 intl_experience: false,
 community_service: false,
 });
 const [report, setReport] = useState<Report | null>(null);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState("");
 const [shareCode, setShareCode] = useState("");
 const [isSharedView, setIsSharedView] = useState(false);

 // Generate report from params (used by both form submit and shared link)
 const generateReport = useCallback(async (params: {
 gmat: number; gpa: number; gpaScale: string; testType: string;
 testScore?: number; industry?: string; years_experience?: number;
 undergrad_tier?: string; leadership_roles?: string;
 intl_experience?: boolean; community_service?: boolean;
 }) => {
 setLoading(true);
 setError("");
 try {
 const data = await apiFetch<Report>("/api/profile/analyze", {
 method:"POST",
 body: JSON.stringify({
 gmat: params.gmat,
 gpa: params.gpa,
 gpa_scale: params.gpaScale,
 test_type: params.testType,
 test_score: params.testScore ?? null,
 industry: params.industry ||"",
 years_experience: params.years_experience || 3,
 undergrad_tier: params.undergrad_tier ||"",
 leadership_roles: params.leadership_roles ||"",
 intl_experience: params.intl_experience || false,
 community_service: params.community_service || false,
 }),
 });
 setReport(data);
 usage.recordUse();
 } catch (e: unknown) {
 setError(e instanceof Error ? e.message :"Failed to analyze profile");
 } finally {
 setLoading(false);
 }
 }, []);

 // Check for shared link params on mount
 useEffect(() => {
 const encoded = searchParams.get("d");
 if (encoded) {
 const params = decodeShareParams(encoded);
 if (params) {
 setIsSharedView(true);
 setShareCode(encoded);
 setForm({
 testType: params.t,
 gmat: String(params.g),
 testScore: params.ts ? String(params.ts) :"",
 gpa: String(params.p),
 gpaScale: params.s,
 industry: params.i ||"",
 years_experience: params.y ? String(params.y) :"",
 undergrad_tier: params.u ||"",
 leadership_roles: params.l ||"",
 intl_experience: !!params.x,
 community_service: !!params.c,
 });
 generateReport({
 gmat: params.g,
 gpa: params.p,
 gpaScale: params.s,
 testType: params.t,
 testScore: params.ts,
 industry: params.i,
 years_experience: params.y,
 undergrad_tier: params.u,
 leadership_roles: params.l,
 intl_experience: !!params.x,
 community_service: !!params.c,
 });
 return;
 }
 }

 // Pre-fill from shared profile store
 setForm(prev => ({
 ...prev,
 ...(savedProfile.gmat ? { gmat: String(savedProfile.gmat) } : {}),
 ...(savedProfile.gpa ? { gpa: String(savedProfile.gpa) } : {}),
 ...(savedProfile.yoe ? { years_experience: String(savedProfile.yoe) } : {}),
 ...(savedProfile.industry ? { industry: savedProfile.industry } : {}),
 }));
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 const gmatValue = form.testType ==="gmat" ? (parseInt(form.gmat) || 700) : 700;
 const testScore = form.testType !=="gmat" && form.testType !=="waiver" && form.testScore
 ? parseInt(form.testScore) : undefined;

 // Generate share code before API call
 const code = encodeShareParams(form);
 setShareCode(code);

 await generateReport({
 gmat: gmatValue,
 gpa: parseFloat(form.gpa) || 3.5,
 gpaScale: form.gpaScale,
 testType: form.testType,
 testScore,
 industry: form.industry,
 years_experience: parseInt(form.years_experience) || 3,
 undergrad_tier: form.undergrad_tier,
 leadership_roles: form.leadership_roles,
 intl_experience: form.intl_experience,
 community_service: form.community_service,
 });

 // Persist to shared profile store
 saveProfile({
 gmat: form.testType ==="gmat" && form.gmat ? parseInt(form.gmat) : null,
 gpa: form.gpa ? parseFloat(form.gpa) : null,
 yoe: form.years_experience ? parseInt(form.years_experience) : null,
 industry: form.industry || null,
 });

 // Update URL without reload for bookmarkability
 window.history.replaceState(null,"", `/profile-report?d=${code}`);
 };

 return (
 <div className="min-h-screen bg-background">
 {/* Header */}
 <section className="bg-foreground text-white pt-4 pb-14 px-8">
 <div className="max-w-5xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4">Profile Strength Report</h1>
 <p className="text-lg text-white/60 max-w-xl mx-auto">
 {isSharedView
 ?"Someone shared their MBA profile report with you. Generate yours below!"
 :"See how your profile stacks up across 6 dimensions that admissions committees evaluate."}
 </p>
 </div>
 </section>

 <main className="max-w-5xl mx-auto px-8 py-12 -mt-6 relative z-20">
 {!report ? (
 <motion.form
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 onSubmit={handleSubmit}
 className="bg-card border border-border/10 p-8 max-w-2xl mx-auto space-y-6"
 >
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label htmlFor="pr-test-type" className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40 mb-1 block">Test Type</label>
 <select
 id="pr-test-type"
 value={form.testType}
 onChange={(e) => setForm({ ...form, testType: e.target.value, gmat:"", testScore:""})}
 className="w-full border border-border/10 px-4 py-3 focus:border-border focus:outline-none bg-card mb-2"
 >
 <option value="gmat">GMAT</option>
 <option value="gre">GRE</option>
 <option value="cat">CAT Percentile</option>
 <option value="xat">XAT Percentile</option>
 <option value="waiver">Test Waiver</option>
 </select>
 {form.testType ==="gmat" && (
 <input
 id="pr-gmat"
 type="number"
 min={200}
 max={800}
 value={form.gmat}
 onChange={(e) => setForm({ ...form, gmat: e.target.value })}
 placeholder="740"
 aria-label="GMAT score"
 className="w-full border border-border/10 px-4 py-3 focus:border-border focus:outline-none"
 />
 )}
 {form.testType ==="gre" && (
 <input
 id="pr-gre"
 type="number"
 min={260}
 max={340}
 value={form.testScore}
 onChange={(e) => setForm({ ...form, testScore: e.target.value })}
 placeholder="325"
 aria-label="GRE score"
 className="w-full border border-border/10 px-4 py-3 focus:border-border focus:outline-none"
 />
 )}
 {form.testType ==="cat" && (
 <input
 id="pr-cat"
 type="number"
 min={0}
 max={100}
 value={form.testScore}
 onChange={(e) => setForm({ ...form, testScore: e.target.value })}
 placeholder="98"
 aria-label="CAT percentile"
 className="w-full border border-border/10 px-4 py-3 focus:border-border focus:outline-none"
 />
 )}
 {form.testType ==="xat" && (
 <input
 id="pr-xat"
 type="number"
 min={0}
 max={100}
 value={form.testScore}
 onChange={(e) => setForm({ ...form, testScore: e.target.value })}
 placeholder="95"
 aria-label="XAT percentile"
 className="w-full border border-border/10 px-4 py-3 focus:border-border focus:outline-none"
 />
 )}
 {form.testType ==="waiver" && (
 <p className="text-[10px] text-muted-foreground/40 mt-1">We&apos;ll estimate your profile strength</p>
 )}
 </div>
 <div>
 <label htmlFor="pr-gpa" className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40 mb-1 block">GPA</label>
 <div className="flex gap-2">
 <input
 id="pr-gpa"
 type="number"
 step={0.01}
 min={0}
 max={10}
 value={form.gpa}
 onChange={(e) => setForm({ ...form, gpa: e.target.value })}
 placeholder="3.8"
 className="flex-1 border border-border/10 px-4 py-3 focus:border-border focus:outline-none"
 required
 />
 <select
 id="pr-gpa-scale"
 aria-label="GPA scale"
 value={form.gpaScale}
 onChange={(e) => setForm({ ...form, gpaScale: e.target.value })}
 className="border border-border/10 px-2 py-3 focus:border-border focus:outline-none bg-card text-xs"
 >
 <option value="4.0">US (4.0)</option>
 <option value="10.0">India (10)</option>
 <option value="5.0">Germany (1-5)</option>
 <option value="100">Percentage</option>
 </select>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label htmlFor="pr-industry" className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40 mb-1 block">Industry</label>
 <select
 id="pr-industry"
 value={form.industry}
 onChange={(e) => setForm({ ...form, industry: e.target.value })}
 className="w-full border border-border/10 px-4 py-3 focus:border-border focus:outline-none bg-card"
 >
 <option value="">Select...</option>
 <option value="consulting">Consulting</option>
 <option value="finance">Finance / IB</option>
 <option value="tech">Technology</option>
 <option value="military">Military</option>
 <option value="nonprofit">Nonprofit</option>
 <option value="healthcare">Healthcare</option>
 <option value="government">Government</option>
 <option value="other">Other</option>
 </select>
 </div>
 <div>
 <label htmlFor="pr-yoe" className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40 mb-1 block">Years of Experience</label>
 <input
 id="pr-yoe"
 type="number"
 value={form.years_experience}
 onChange={(e) => setForm({ ...form, years_experience: e.target.value })}
 placeholder="4"
 className="w-full border border-border/10 px-4 py-3 focus:border-border focus:outline-none"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label htmlFor="pr-undergrad" className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40 mb-1 block">Undergrad Tier</label>
 <select
 id="pr-undergrad"
 value={form.undergrad_tier}
 onChange={(e) => setForm({ ...form, undergrad_tier: e.target.value })}
 className="w-full border border-border/10 px-4 py-3 focus:border-border focus:outline-none bg-card"
 >
 <option value="">Select...</option>
 <option value="top_10">Top 10 (Ivy / equiv.)</option>
 <option value="top_50">Top 50</option>
 <option value="top_100">Top 100</option>
 <option value="other">Other</option>
 </select>
 </div>
 <div>
 <label htmlFor="pr-leadership" className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40 mb-1 block">Leadership Level</label>
 <select
 id="pr-leadership"
 value={form.leadership_roles}
 onChange={(e) => setForm({ ...form, leadership_roles: e.target.value })}
 className="w-full border border-border/10 px-4 py-3 focus:border-border focus:outline-none bg-card"
 >
 <option value="">Select...</option>
 <option value="cxo">C-suite / Founder</option>
 <option value="manager">Manager</option>
 <option value="team_lead">Team Lead</option>
 <option value="individual">Individual Contributor</option>
 </select>
 </div>
 </div>

 <div className="flex gap-6">
 <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
 <input
 type="checkbox"
 checked={form.intl_experience}
 onChange={(e) => setForm({ ...form, intl_experience: e.target.checked })}
 className="w-4 h-4"
 />
 International experience
 </label>
 <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
 <input
 type="checkbox"
 checked={form.community_service}
 onChange={(e) => setForm({ ...form, community_service: e.target.checked })}
 className="w-4 h-4"
 />
 Community service
 </label>
 </div>

 {error && <p role="alert" className="text-red-500 text-sm">{error}</p>}

 <button
 type="submit"
 disabled={loading || !form.gpa}
 aria-busy={loading}
 className="w-full bg-foreground text-white py-4 font-bold uppercase tracking-widest text-sm hover:bg-foreground/80 transition-colors disabled:opacity-50"
 >
 {loading ?"Analyzing...":"Generate Profile Report"}
 </button>
 </motion.form>
 ) : (
 <UsageGate feature="profile_report">
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8" aria-live="polite">
 {/* Overall score */}
 <div className="bg-foreground text-white p-8 text-center">
 <p className="text-xs uppercase tracking-widest text-white/40 mb-3">Overall Profile Strength</p>
 <p className="text-6xl font-bold">{report.overall}</p>
 <p className="text-white/50 mt-2">out of 100</p>
 </div>

 {/* Share bar */}
 {shareCode && (
 <ShareBar shareUrl={getShareUrl(shareCode)} overall={report.overall} />
 )}

 {/* CTA for shared view visitors */}
 {isSharedView && (
 <div className="bg-primary/10 border border-primary/30 p-6 text-center">
 <p className="text-sm font-bold text-foreground mb-2">Want to see your own profile score?</p>
 <button
 onClick={() => {
 setReport(null);
 setIsSharedView(false);
 setShareCode("");
 window.history.replaceState(null,"","/profile-report");
 }}
 className="bg-foreground text-white px-6 py-2.5 text-sm font-bold hover:bg-foreground/80 transition-colors inline-flex items-center gap-2"
 >
 Generate My Report <ArrowRight size={14} />
 </button>
 </div>
 )}

 {/* Dimension bars */}
 <div className="bg-card border border-border/10 p-8 space-y-5">
 <h2 className="text-xs uppercase tracking-widest font-bold text-muted-foreground/40 mb-4 flex items-center gap-2">
 <BarChart3 size={14} /> Profile Dimensions
 </h2>
 {(Object.entries(report.dimensions) as [keyof Dimensions, number][]).map(([key, score]) => (
 <ScoreBar
 key={key}
 label={DIM_LABELS[key].label}
 icon={DIM_LABELS[key].icon}
 score={score}
 />
 ))}
 </div>

 {/* School fits */}
 <div className="bg-card border border-border/10 p-8">
 <h2 className="text-xs uppercase tracking-widest font-bold text-muted-foreground/40 mb-6 flex items-center gap-2">
 <Target size={14} /> School Fit Scores
 </h2>
 <div className="space-y-3">
 {report.school_fits.map((sf) => (
 <div
 key={sf.school_id}
 className="flex justify-between items-center p-4 border border-border/5 hover:border-border/20 transition-colors"
 >
 <div>
 <p className="font-bold text-foreground">{sf.school_name}</p>
 <p className="text-[10px] text-muted-foreground/40 mt-0.5">
 Strongest: {DIM_LABELS[sf.strongest as keyof Dimensions]?.label || sf.strongest} &middot;{""}
 Weakest: {DIM_LABELS[sf.weakest as keyof Dimensions]?.label || sf.weakest}
 </p>
 </div>
 <div className="flex items-center gap-3">
 <span
 className={`text-2xl font-bold ${
 sf.fit_score >= 60
 ?"text-emerald-600"
 : sf.fit_score >= 40
 ?"text-amber-600"
 :"text-red-500"
 }`}
 >
 {sf.fit_score}%
 </span>
 <Link
 href={`/school/${sf.school_id}`}
 className="text-[10px] font-bold uppercase text-primary hover:text-foreground transition-colors"
 >
 Apply <ArrowRight size={10} className="inline"/>
 </Link>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Next Steps */}
 <div className="bg-card border border-border/10 p-8">
 <h2 className="text-xs uppercase tracking-widest font-bold text-muted-foreground/40 mb-4">What&apos;s Next?</h2>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <Link href="/schools" className="p-4 border border-border/5 hover:border-primary transition-colors group">
 <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">Browse Schools</p>
 <p className="text-[11px] text-muted-foreground/40 mt-1">Find programs matching your profile</p>
 </Link>
 <Link href="/my-schools" className="p-4 border border-border/5 hover:border-primary transition-colors group">
 <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">Track Applications</p>
 <p className="text-[11px] text-muted-foreground/40 mt-1">Add target schools to your tracker</p>
 </Link>
 <Link href="/evaluator" className="p-4 border border-border/5 hover:border-primary transition-colors group">
 <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">Evaluate an Essay</p>
 <p className="text-[11px] text-muted-foreground/40 mt-1">Get AI feedback on your draft</p>
 </Link>
 </div>
 </div>

 <button
 onClick={() => setReport(null)}
 className="text-sm font-bold text-muted-foreground/50 hover:text-foreground transition-colors flex items-center gap-1"
 >
 <ChevronRight size={14} className="rotate-180"/> Run again with different profile
 </button>

 </motion.div>
 </UsageGate>
 )}
 <ToolCrossLinks current="/profile-report"/>
 </main>
 </div>
 );
}
