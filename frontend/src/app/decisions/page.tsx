"use client";

import { useState, useEffect, useCallback } from"react";
import { motion, AnimatePresence } from"framer-motion";
import {
 CheckCircle2, XOctagon, Clock, MessageSquare, Search,
 ChevronLeft, ChevronRight, X, Plus, Filter, BarChart3,
 Target, TrendingUp, Award,
} from"lucide-react";
import Link from"next/link";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type GmatClubDecision = {
 school_slug: string;
 school_id: string;
 program: string;
 status: string;
 round: string;
 year: string;
 gpa: number | null;
 yoe: number | null;
 industry: string | null;
 location: string | null;
 date: string;
 gmat?: number;
 gmat_focus?: number;
 gre?: number;
};

type DecisionStats = {
 total_decisions: number;
 schools: number;
 by_school: Record<string, number>;
 by_status: Record<string, number>;
 avg_gmat: number | null;
 avg_gpa: number | null;
};

const SCHOOL_NAMES: Record<string, string> = {
 hbs:"Harvard Business School",
 gsb:"Stanford GSB",
 wharton:"Wharton",
 chicago_booth:"Chicago Booth",
 kellogg:"Kellogg",
 mit_sloan:"MIT Sloan",
 columbia_business_school:"Columbia Business School",
 dartmouth_tuck:"Dartmouth Tuck",
 uc_berkeley_haas:"UC Berkeley Haas",
 michigan_ross:"Michigan Ross",
 duke_fuqua:"Duke Fuqua",
 uva_darden:"UVA Darden",
 nyu_stern:"NYU Stern",
 yale_som:"Yale SOM",
 cornell_johnson:"Cornell Johnson",
 unc_kenanflagler:"UNC Kenan-Flagler",
 ucla_anderson:"UCLA Anderson",
 indiana_kelley:"Indiana Kelley",
 emory_goizueta:"Emory Goizueta",
 london_business_school:"London Business School",
 insead:"INSEAD",
 isb:"ISB",
};

type AnalyticsData = {
 school_id: string;
 total_decisions: number;
 gmat_distribution: { range: string; admitted: number; denied: number }[];
 gpa_distribution: { range: string; admitted: number; denied: number }[];
 round_trends: { round: string; total: number; admitted: number; waitlisted: number; denied: number; admit_rate: number }[];
 industry_admit_rates: { industry: string; total: number; admitted: number; admit_rate: number }[];
 work_exp_distribution: { range: string; count: number }[];
};

type ChancesSchool = {
 school_id: string;
 school_name: string;
 sample_size: number;
 admitted: number;
 denied: number;
 admit_rate: number;
 confidence:"high"|"medium"|"low";
 avg_gmat_admitted: number | null;
 avg_gpa_admitted: number | null;
 scholarship_rate: number;
};

type ChancesResult = {
 profile: { gmat: number | null; gpa: number | null; work_exp_years: number | null; industry: string | null };
 total_similar_profiles: number;
 schools: ChancesSchool[];
};

const STATUS_GROUPS: Record<string, { label: string; color: string; match: (s: string) => boolean }> = {
 admitted: {
 label:"Admitted",
 color:"emerald",
 match: (s) => s.toLowerCase().startsWith("admitted") || s.toLowerCase().startsWith("matriculating"),
 },
 denied: {
 label:"Denied",
 color:"red",
 match: (s) => s.toLowerCase().includes("denied"),
 },
 waitlisted: {
 label:"Waitlisted",
 color:"amber",
 match: (s) => s.toLowerCase().includes("waitlist"),
 },
 interviewed: {
 label:"Interviewed",
 color:"blue",
 match: (s) => s.toLowerCase().includes("interview") && !s.toLowerCase().includes("denied") && !s.toLowerCase().includes("without"),
 },
};

function getStatusGroup(status: string): string {
 for (const [key, val] of Object.entries(STATUS_GROUPS)) {
 if (val.match(status)) return key;
 }
 return "other";
}

function StatusBadge({ status }: { status: string }) {
 const group = getStatusGroup(status);
 const configs: Record<string, { icon: React.ReactNode; bg: string; text: string; border: string }> = {
 admitted: { icon: <CheckCircle2 size={12} />, bg:"bg-emerald-50", text:"text-emerald-700", border:"border-emerald-200"},
 denied: { icon: <XOctagon size={12} />, bg:"bg-red-50", text:"text-red-700", border:"border-red-200"},
 waitlisted: { icon: <Clock size={12} />, bg:"bg-amber-50", text:"text-amber-700", border:"border-amber-200"},
 interviewed: { icon: <MessageSquare size={12} />, bg:"bg-blue-50", text:"text-blue-700", border:"border-blue-200"},
 other: { icon: null, bg:"bg-muted", text:"text-muted-foreground", border:"border-border"},
 };
 const c = configs[group] || configs.other;
 return (
 <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${c.bg} ${c.text} border ${c.border}`}>
 {c.icon} {status}
 </span>
 );
}

function getTestScore(d: GmatClubDecision): string {
 if (d.gmat_focus) return `${d.gmat_focus} (Focus)`;
 if (d.gmat) return `${d.gmat}`;
 if (d.gre) return `${d.gre} GRE`;
 return "";
}

export default function DecisionsPage() {
 const [decisions, setDecisions] = useState<GmatClubDecision[]>([]);
 const [stats, setStats] = useState<DecisionStats | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 // Chances calculator
 const [showChances, setShowChances] = useState(false);
 const [chancesGmat, setChancesGmat] = useState("");
 const [chancesGpa, setChancesGpa] = useState("");
 const [chancesYoe, setChancesYoe] = useState("");
 const [chancesIndustry, setChancesIndustry] = useState("");
 const [chancesResult, setChancesResult] = useState<ChancesResult | null>(null);
 const [chancesLoading, setChancesLoading] = useState(false);

 // Analytics dashboard
 const [showAnalytics, setShowAnalytics] = useState(false);
 const [analyticsSchool, setAnalyticsSchool] = useState("");
 const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
 const [analyticsLoading, setAnalyticsLoading] = useState(false);

 // Submit decision form
 const [showSubmit, setShowSubmit] = useState(false);
 const [submitSchool, setSubmitSchool] = useState("");
 const [submitRound, setSubmitRound] = useState<string>("R1");
 const [submitStatus, setSubmitStatus] = useState<string>("Admitted");
 const [submitGmat, setSubmitGmat] = useState("");
 const [submitGpa, setSubmitGpa] = useState("");
 const [submitWorkYears, setSubmitWorkYears] = useState("");
 const [submitIndustry, setSubmitIndustry] = useState("");
 const [submitAnonymous, setSubmitAnonymous] = useState(true);
 const [submitLoading, setSubmitLoading] = useState(false);
 const [submitSuccess, setSubmitSuccess] = useState(false);
 const [submitError, setSubmitError] = useState<string | null>(null);

 const resetSubmitForm = useCallback(() => {
 setSubmitSchool("");
 setSubmitRound("R1");
 setSubmitStatus("Admitted");
 setSubmitGmat("");
 setSubmitGpa("");
 setSubmitWorkYears("");
 setSubmitIndustry("");
 setSubmitAnonymous(true);
 setSubmitError(null);
 }, []);

 const handleSubmitDecision = useCallback(async () => {
 if (!submitSchool) { setSubmitError("Please select a school."); return; }
 setSubmitLoading(true);
 setSubmitError(null);
 try {
 const body: Record<string, unknown> = {
 school_id: submitSchool,
 round: submitRound,
 status: submitStatus,
 is_anonymous: submitAnonymous,
 };
 if (submitGmat) body.gmat = parseInt(submitGmat);
 if (submitGpa) body.gpa = parseFloat(submitGpa);
 if (submitWorkYears) body.work_years = parseInt(submitWorkYears);
 if (submitIndustry) body.industry = submitIndustry;
 await apiFetch("/api/decisions/submit", {
 method:"POST",
 headers: {"Content-Type":"application/json"},
 body: JSON.stringify(body),
 });
 setSubmitSuccess(true);
 resetSubmitForm();
 setTimeout(() => setSubmitSuccess(false), 4000);
 } catch {
 setSubmitError("Failed to submit decision. Please try again.");
 } finally {
 setSubmitLoading(false);
 }
 }, [submitSchool, submitRound, submitStatus, submitGmat, submitGpa, submitWorkYears, submitIndustry, submitAnonymous, resetSubmitForm]);

 const runChances = useCallback(async () => {
 setChancesLoading(true);
 try {
 const body: Record<string, unknown> = {};
 if (chancesGmat) body.gmat = parseInt(chancesGmat);
 if (chancesGpa) body.gpa = parseFloat(chancesGpa);
 if (chancesYoe) body.work_exp_years = parseInt(chancesYoe);
 if (chancesIndustry) body.industry = chancesIndustry;
 const data = await apiFetch<ChancesResult>("/api/decisions/chances", {
 method:"POST",
 headers: {"Content-Type":"application/json"},
 body: JSON.stringify(body),
 });
 setChancesResult(data);
 } catch {
 setChancesResult(null);
 } finally {
 setChancesLoading(false);
 }
 }, [chancesGmat, chancesGpa, chancesYoe, chancesIndustry]);

 const fetchAnalytics = useCallback(async (schoolId: string) => {
 if (!schoolId) { setAnalyticsData(null); return; }
 setAnalyticsLoading(true);
 try {
 const data = await apiFetch<AnalyticsData>(`/api/decisions/analytics?school_id=${schoolId}`);
 setAnalyticsData(data);
 } catch { setAnalyticsData(null); }
 finally { setAnalyticsLoading(false); }
 }, []);

 // Filters
 const [schoolFilter, setSchoolFilter] = useState("");
 const [statusFilter, setStatusFilter] = useState("");
 const [roundFilter, setRoundFilter] = useState("");
 const [yearFilter, setYearFilter] = useState("");
 const [searchTerm, setSearchTerm] = useState("");
 const [showFilters, setShowFilters] = useState(false);

 // Pagination
 const [page, setPage] = useState(0);
 const [total, setTotal] = useState(0);
 const pageSize = 50;

 const fetchDecisions = useCallback(async () => {
 setLoading(true);
 try {
 const params = new URLSearchParams();
 if (schoolFilter) params.set("school_id", schoolFilter);
 if (statusFilter) params.set("status", statusFilter);
 if (roundFilter) params.set("round", roundFilter);
 if (yearFilter) params.set("year", yearFilter);
 params.set("offset", String(page * pageSize));
 params.set("limit", String(pageSize));

 const data = await apiFetch<{
 decisions: GmatClubDecision[];
 total: number;
 }>(`/api/decisions?${params.toString()}`);

 setDecisions(data.decisions);
 setTotal(data.total);
 } catch (e) {
 console.error(e);
 setError("Failed to load decisions.");
 } finally {
 setLoading(false);
 }
 }, [schoolFilter, statusFilter, roundFilter, yearFilter, page]);

 useEffect(() => {
 fetchDecisions();
 }, [fetchDecisions]);

 useEffect(() => {
 apiFetch<DecisionStats>("/api/decisions/stats")
 .then(setStats)
 .catch(console.error);
 }, []);

 // Reset page when filters change
 useEffect(() => {
 setPage(0);
 }, [schoolFilter, statusFilter, roundFilter, yearFilter]);

 const totalPages = Math.ceil(total / pageSize);

 // Local search filter on loaded data
 const filtered = searchTerm
 ? decisions.filter(
 (d) =>
 (d.industry ||"").toLowerCase().includes(searchTerm.toLowerCase()) ||
 (d.location ||"").toLowerCase().includes(searchTerm.toLowerCase()) ||
 (SCHOOL_NAMES[d.school_id] || d.school_id).toLowerCase().includes(searchTerm.toLowerCase())
 )
 : decisions;

 return (
 <div className="bg-background min-h-screen">
 {/* Header */}
 <section className="bg-foreground text-white pt-4 pb-16 px-8 relative overflow-hidden">
 <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent"/>
 <div className="max-w-6xl mx-auto relative z-10 text-center">
 <h1 className="heading-serif text-5xl md:text-6xl mb-4">Decision Tracker</h1>
 <p className="text-lg text-white/60 max-w-2xl mx-auto mb-8">
 {stats ? `${stats.total_decisions.toLocaleString()} real admissions decisions across ${stats.schools} MBA programs` :"Loading..."}
 </p>

 {stats && (
 <div className="flex items-center justify-center gap-8 flex-wrap">
 <div className="text-center">
 <p className="text-3xl font-bold text-emerald-400">{(stats.by_status["Admitted"] || 0).toLocaleString()}</p>
 <p className="text-[10px] uppercase tracking-widest text-white/40">Admitted</p>
 </div>
 <div className="text-center">
 <p className="text-3xl font-bold text-red-400">{((stats.by_status["Denied without Interview"] || 0) + (stats.by_status["Denied with Interview"] || 0)).toLocaleString()}</p>
 <p className="text-[10px] uppercase tracking-widest text-white/40">Denied</p>
 </div>
 <div className="text-center">
 <p className="text-3xl font-bold text-amber-400">{((stats.by_status["Waitlisted with Interview"] || 0) + (stats.by_status["Waitlisted without Interview"] || 0)).toLocaleString()}</p>
 <p className="text-[10px] uppercase tracking-widest text-white/40">Waitlisted</p>
 </div>
 <div className="text-center border-l border-border pl-8">
 <p className="text-3xl font-bold text-white">{stats.avg_gmat ||"-"}</p>
 <p className="text-[10px] uppercase tracking-widest text-white/40">Avg GMAT</p>
 </div>
 <div className="text-center">
 <p className="text-3xl font-bold text-white">{stats.avg_gpa ||"-"}</p>
 <p className="text-[10px] uppercase tracking-widest text-white/40">Avg GPA</p>
 </div>
 </div>
 )}

 <p className="text-[10px] text-white/30 mt-6">Source: GMAT Club community-reported decisions</p>
 </div>
 </section>

 {/* ── What Are My Chances? ──────────────────────────────────── */}
 <section className="max-w-6xl mx-auto px-8 -mt-8 relative z-20 mb-0">
 <div className="bg-card border-2 border-primary/30">
 <button
 onClick={() => setShowChances(!showChances)}
 className="w-full flex items-center justify-between px-6 py-4 hover:bg-primary/5 transition-colors"
 >
 <div className="flex items-center gap-3">
 <Target size={20} className="text-primary"/>
 <span className="font-display text-lg font-bold">What Are My Chances?</span>
 <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold bg-primary/10 px-2 py-0.5">
 Powered by {stats?.total_decisions.toLocaleString() ||"12K"} real decisions
 </span>
 </div>
 <ChevronRight size={18} className={`text-muted-foreground/40 transition-transform ${showChances ?"rotate-90":""}`} />
 </button>

 <AnimatePresence>
 {showChances && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height:"auto", opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 transition={{ duration: 0.2 }}
 className="overflow-hidden"
 >
 <div className="px-6 pb-6 border-t border-border/5">
 <p className="text-xs text-muted-foreground/50 mt-4 mb-4">
 Enter your profile to see admission rates from applicants with similar stats.
 </p>
 <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
 <div>
 <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40 mb-1 block">GMAT Score</label>
 <input
 type="number"
 placeholder="e.g. 730"
 value={chancesGmat}
 onChange={(e) => setChancesGmat(e.target.value)}
 className="w-full border border-border/15 px-3 py-2 text-sm focus:border-primary focus:outline-none"
 />
 </div>
 <div>
 <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40 mb-1 block">GPA</label>
 <input
 type="number"
 step="0.1"
 placeholder="e.g. 3.7"
 value={chancesGpa}
 onChange={(e) => setChancesGpa(e.target.value)}
 className="w-full border border-border/15 px-3 py-2 text-sm focus:border-primary focus:outline-none"
 />
 </div>
 <div>
 <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40 mb-1 block">Work Exp (yrs)</label>
 <input
 type="number"
 placeholder="e.g. 5"
 value={chancesYoe}
 onChange={(e) => setChancesYoe(e.target.value)}
 className="w-full border border-border/15 px-3 py-2 text-sm focus:border-primary focus:outline-none"
 />
 </div>
 <div>
 <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40 mb-1 block">Industry</label>
 <input
 type="text"
 placeholder="e.g. Consulting"
 value={chancesIndustry}
 onChange={(e) => setChancesIndustry(e.target.value)}
 className="w-full border border-border/15 px-3 py-2 text-sm focus:border-primary focus:outline-none"
 />
 </div>
 <div className="flex items-end">
 <button
 onClick={runChances}
 disabled={chancesLoading || (!chancesGmat && !chancesGpa && !chancesYoe)}
 className="w-full bg-foreground text-white font-bold py-2 px-4 text-sm hover:bg-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
 >
 {chancesLoading ?"Analyzing...":"Check Chances"}
 </button>
 </div>
 </div>

 {/* Results */}
 {chancesResult && (
 <div className="mt-2">
 <div className="flex items-center gap-4 mb-4">
 <p className="text-xs text-muted-foreground/50">
 Based on <span className="font-bold text-foreground">{chancesResult.total_similar_profiles.toLocaleString()}</span> similar profiles
 </p>
 </div>

 <div className="space-y-2">
 {chancesResult.schools.map((s) => {
 const barColor =
 s.admit_rate >= 70 ?"bg-emerald-500":
 s.admit_rate >= 40 ?"bg-primary":
 s.admit_rate >= 20 ?"bg-amber-500":
"bg-red-400";
 const confidenceLabel =
 s.confidence ==="high" ?"":
 s.confidence ==="medium" ?"*":"**";
 return (
 <div key={s.school_id} className="flex items-center gap-3 group">
 <Link
 href={`/school/${s.school_id}`}
 className="text-sm font-bold text-foreground hover:text-primary transition-colors w-44 shrink-0 truncate"
 >
 {SCHOOL_NAMES[s.school_id] || s.school_name}
 </Link>
 <div className="flex-1 bg-foreground/5 h-7 relative overflow-hidden">
 <div
 className={`h-full ${barColor} transition-all duration-500 flex items-center`}
 style={{ width: `${Math.max(s.admit_rate, 3)}%` }}
 >
 {s.admit_rate >= 15 && (
 <span className="text-white text-[11px] font-bold pl-2 whitespace-nowrap">
 {s.admit_rate}%{confidenceLabel}
 </span>
 )}
 </div>
 {s.admit_rate < 15 && (
 <span className="absolute left-[calc(3%+8px)] top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground/60">
 {s.admit_rate}%{confidenceLabel}
 </span>
 )}
 </div>
 <div className="text-[10px] text-muted-foreground/40 w-20 shrink-0 text-right">
 n={s.sample_size}
 {s.scholarship_rate > 0 && (
 <span className="block text-emerald-600">{s.scholarship_rate}% $$</span>
 )}
 </div>
 </div>
 );
 })}
 </div>

 {chancesResult.schools.some(s => s.confidence !=="high") && (
 <p className="text-[10px] text-muted-foreground/30 mt-3">
 * Medium confidence (8-19 data points) &nbsp; ** Low confidence (&lt;8 data points)
 </p>
 )}
 </div>
 )}
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </section>

 {/* ── Submit Your Decision ──────────────────────────────────── */}
 <section className="max-w-6xl mx-auto px-8 mt-3 relative z-20 mb-0">
 <div className="bg-card border border-border/10">
 <button
 onClick={() => setShowSubmit(!showSubmit)}
 className="w-full flex items-center justify-between px-6 py-4 hover:bg-primary/5 transition-colors"
 >
 <div className="flex items-center gap-3">
 <Plus size={20} className="text-primary"/>
 <span className="font-display text-lg font-bold">Submit Your Decision</span>
 <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold bg-primary/10 px-2 py-0.5">
 Community
 </span>
 </div>
 <ChevronRight size={18} className={`text-muted-foreground/40 transition-transform ${showSubmit ?"rotate-90":""}`} />
 </button>

 <AnimatePresence>
 {showSubmit && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height:"auto", opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 transition={{ duration: 0.2 }}
 className="overflow-hidden"
 >
 <div className="px-6 pb-6 border-t border-border/5">
 <p className="text-xs text-muted-foreground/50 mt-4 mb-4">
 Share your admissions decision to help future applicants. All submissions are anonymous by default.
 </p>

 {submitSuccess && (
 <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 mb-4 text-sm font-bold">
 <CheckCircle2 size={16} /> Decision submitted successfully. Thank you!
 </div>
 )}

 {submitError && (
 <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mb-4 text-sm">
 {submitError}
 </div>
 )}

 {/* Row 1: School, Round, Status */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
 <div>
 <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40 mb-1 block">School *</label>
 <select
 value={submitSchool}
 onChange={(e) => setSubmitSchool(e.target.value)}
 className="w-full border border-border/15 px-3 py-2 text-sm focus:border-primary focus:outline-none bg-card"
 >
 <option value="">Select a school</option>
 {Object.entries(SCHOOL_NAMES).map(([id, name]) => (
 <option key={id} value={id}>{name}</option>
 ))}
 </select>
 </div>
 <div>
 <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40 mb-1 block">Round *</label>
 <select
 value={submitRound}
 onChange={(e) => setSubmitRound(e.target.value)}
 className="w-full border border-border/15 px-3 py-2 text-sm focus:border-primary focus:outline-none bg-card"
 >
 {["R1","R2","R3","ED","Rolling","Deferred","EMBA","Other"].map((r) => (
 <option key={r} value={r}>{r}</option>
 ))}
 </select>
 </div>
 <div>
 <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40 mb-1 block">Status *</label>
 <div className="flex gap-2">
 {([
 { value:"Admitted", bg:"bg-emerald-50", border:"border-emerald-400", text:"text-emerald-700", activeBg:"bg-emerald-100"},
 { value:"Waitlisted", bg:"bg-amber-50", border:"border-amber-400", text:"text-amber-700", activeBg:"bg-amber-100"},
 { value:"Dinged", bg:"bg-red-50", border:"border-red-400", text:"text-red-700", activeBg:"bg-red-100"},
 ] as const).map((s) => (
 <button
 key={s.value}
 type="button"
 onClick={() => setSubmitStatus(s.value)}
 className={`flex-1 py-2 text-sm font-bold border transition-colors ${s.text} ${
 submitStatus === s.value
 ? `${s.activeBg} ${s.border} ring-1 ring-offset-0 ring-current`
 : `bg-card border-border/15 opacity-60 hover:opacity-100`
 }`}
 >
 {s.value}
 </button>
 ))}
 </div>
 </div>
 </div>

 {/* Row 2: Optional fields */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
 <div>
 <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40 mb-1 block">GMAT Score</label>
 <input
 type="number"
 placeholder="e.g. 730"
 value={submitGmat}
 onChange={(e) => setSubmitGmat(e.target.value)}
 className="w-full border border-border/15 px-3 py-2 text-sm focus:border-primary focus:outline-none"
 />
 </div>
 <div>
 <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40 mb-1 block">GPA</label>
 <input
 type="number"
 step="0.1"
 placeholder="e.g. 3.7"
 value={submitGpa}
 onChange={(e) => setSubmitGpa(e.target.value)}
 className="w-full border border-border/15 px-3 py-2 text-sm focus:border-primary focus:outline-none"
 />
 </div>
 <div>
 <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40 mb-1 block">Work Years</label>
 <input
 type="number"
 placeholder="e.g. 5"
 value={submitWorkYears}
 onChange={(e) => setSubmitWorkYears(e.target.value)}
 className="w-full border border-border/15 px-3 py-2 text-sm focus:border-primary focus:outline-none"
 />
 </div>
 <div>
 <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40 mb-1 block">Industry</label>
 <input
 type="text"
 placeholder="e.g. Consulting"
 value={submitIndustry}
 onChange={(e) => setSubmitIndustry(e.target.value)}
 className="w-full border border-border/15 px-3 py-2 text-sm focus:border-primary focus:outline-none"
 />
 </div>
 </div>

 {/* Anonymous toggle + Submit */}
 <div className="flex items-center justify-between">
 <label className="flex items-center gap-2 cursor-pointer select-none">
 <button
 type="button"
 onClick={() => setSubmitAnonymous(!submitAnonymous)}
 className={`w-9 h-5 rounded-full relative transition-colors ${submitAnonymous ?"bg-primary":"bg-foreground/20"}`}
 >
 <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-all ${submitAnonymous ?"left-[18px]":"left-0.5"}`} />
 </button>
 <span className="text-xs text-muted-foreground/60">Submit anonymously</span>
 </label>
 <button
 onClick={handleSubmitDecision}
 disabled={submitLoading || !submitSchool}
 className="bg-foreground text-white font-bold py-2 px-6 text-sm hover:bg-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
 >
 {submitLoading ?"Submitting...":"Submit Decision"}
 </button>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </section>

 {/* ── Analytics Dashboard ──────────────────────────────────── */}
 <section className="max-w-6xl mx-auto px-8 mt-3 relative z-20 mb-0">
 <div className="bg-card border border-border/10">
 <button
 onClick={() => setShowAnalytics(!showAnalytics)}
 className="w-full flex items-center justify-between px-6 py-4 hover:bg-primary/5 transition-colors"
 >
 <div className="flex items-center gap-3">
 <BarChart3 size={20} className="text-primary"/>
 <span className="font-display text-lg font-bold">Analytics Dashboard</span>
 <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold bg-primary/10 px-2 py-0.5">
 Deep Dive
 </span>
 </div>
 <ChevronRight size={18} className={`text-muted-foreground/40 transition-transform ${showAnalytics ?"rotate-90":""}`} />
 </button>

 <AnimatePresence>
 {showAnalytics && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height:"auto", opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 transition={{ duration: 0.2 }}
 className="overflow-hidden"
 >
 <div className="px-6 pb-6 border-t border-border/5">
 <p className="text-xs text-muted-foreground/50 mt-4 mb-4">
 Select a school to explore GMAT, GPA, round, industry, and work experience breakdowns.
 </p>
 <div className="flex items-center gap-3 mb-6">
 <select
 value={analyticsSchool}
 onChange={(e) => { setAnalyticsSchool(e.target.value); fetchAnalytics(e.target.value); }}
 className="flex-1 max-w-xs border border-border/15 px-3 py-2 text-sm focus:border-primary focus:outline-none bg-card"
 >
 <option value="">Select a school</option>
 {Object.entries(SCHOOL_NAMES).map(([id, name]) => (
 <option key={id} value={id}>{name}</option>
 ))}
 </select>
 {analyticsLoading && <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin"/>}
 </div>

 {analyticsData && (
 <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-8">
 {/* Summary */}
 <div className="flex items-center gap-2 text-xs text-muted-foreground/50">
 <Award size={14} className="text-primary"/>
 <span className="font-bold text-foreground">{SCHOOL_NAMES[analyticsData.school_id] || analyticsData.school_id}</span>
 - {analyticsData.total_decisions.toLocaleString()} decisions analyzed
 </div>

 {/* GMAT Distribution */}
 {analyticsData.gmat_distribution.length > 0 && (
 <div>
 <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40 mb-3 flex items-center gap-2">
 <TrendingUp size={12} /> GMAT Distribution
 </h3>
 <div className="space-y-1.5">
 {analyticsData.gmat_distribution.map((b) => {
 const max = Math.max(...analyticsData.gmat_distribution.map(d => d.admitted + d.denied), 1);
 return (
 <div key={b.range} className="flex items-center gap-2">
 <span className="text-[11px] font-mono text-muted-foreground/60 w-16 shrink-0">{b.range}</span>
 <div className="flex-1 flex h-5 bg-foreground/5 overflow-hidden">
 <div className="bg-emerald-500 h-full" style={{ width: `${(b.admitted / max) * 100}%` }} />
 <div className="bg-red-400 h-full" style={{ width: `${(b.denied / max) * 100}%` }} />
 </div>
 <span className="text-[10px] text-muted-foreground/40 w-16 shrink-0 text-right">{b.admitted}A / {b.denied}D</span>
 </div>
 );
 })}
 </div>
 <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground/40">
 <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 inline-block"/> Admitted</span>
 <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 inline-block"/> Denied</span>
 </div>
 </div>
 )}

 {/* GPA Distribution */}
 {analyticsData.gpa_distribution.length > 0 && (
 <div>
 <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40 mb-3 flex items-center gap-2">
 <Target size={12} /> GPA Distribution
 </h3>
 <div className="space-y-1.5">
 {analyticsData.gpa_distribution.map((b) => {
 const max = Math.max(...analyticsData.gpa_distribution.map(d => d.admitted + d.denied), 1);
 return (
 <div key={b.range} className="flex items-center gap-2">
 <span className="text-[11px] font-mono text-muted-foreground/60 w-16 shrink-0">{b.range}</span>
 <div className="flex-1 flex h-5 bg-foreground/5 overflow-hidden">
 <div className="bg-emerald-500 h-full" style={{ width: `${(b.admitted / max) * 100}%` }} />
 <div className="bg-red-400 h-full" style={{ width: `${(b.denied / max) * 100}%` }} />
 </div>
 <span className="text-[10px] text-muted-foreground/40 w-16 shrink-0 text-right">{b.admitted}A / {b.denied}D</span>
 </div>
 );
 })}
 </div>
 </div>
 )}

 {/* Round Trends */}
 {analyticsData.round_trends.length > 0 && (
 <div>
 <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40 mb-3 flex items-center gap-2">
 <BarChart3 size={12} /> Round-by-Round Admit Rates
 </h3>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 {analyticsData.round_trends.map((r) => (
 <div key={r.round} className="border border-border/10 p-3">
 <p className="font-display font-bold text-sm mb-1">{r.round}</p>
 <p className="text-2xl font-bold text-foreground">{r.admit_rate.toFixed(1)}%</p>
 <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground/40">
 <span className="text-emerald-600">{r.admitted}A</span>
 <span className="text-amber-600">{r.waitlisted}W</span>
 <span className="text-red-500">{r.denied}D</span>
 </div>
 <p className="text-[10px] text-muted-foreground/30 mt-0.5">n={r.total}</p>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Industry Admit Rates */}
 {analyticsData.industry_admit_rates.length > 0 && (
 <div>
 <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40 mb-3 flex items-center gap-2">
 <TrendingUp size={12} /> Top Industries by Admit Rate
 </h3>
 <div className="space-y-1.5">
 {analyticsData.industry_admit_rates.slice(0, 8).map((ind) => (
 <div key={ind.industry} className="flex items-center gap-2">
 <span className="text-[11px] text-muted-foreground/60 w-28 shrink-0 truncate">{ind.industry}</span>
 <div className="flex-1 bg-foreground/5 h-5 overflow-hidden">
 <div
 className="h-full bg-primary/70"
 style={{ width: `${Math.max(ind.admit_rate, 2)}%` }}
 />
 </div>
 <span className="text-[10px] font-bold text-muted-foreground/60 w-14 shrink-0 text-right">{ind.admit_rate.toFixed(0)}%</span>
 <span className="text-[10px] text-muted-foreground/30 w-10 shrink-0 text-right">n={ind.total}</span>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Work Experience Distribution */}
 {analyticsData.work_exp_distribution.length > 0 && (
 <div>
 <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40 mb-3 flex items-center gap-2">
 <Award size={12} /> Work Experience Distribution (years)
 </h3>
 <div className="flex items-end gap-1 h-24">
 {analyticsData.work_exp_distribution.map((w) => {
 const max = Math.max(...analyticsData.work_exp_distribution.map(d => d.count), 1);
 return (
 <div key={w.range} className="flex-1 flex flex-col items-center gap-1">
 <span className="text-[9px] font-mono text-muted-foreground/40">{w.count}</span>
 <div className="w-full bg-primary/60 rounded-t" style={{ height: `${(w.count / max) * 72}px` }} />
 <span className="text-[9px] text-muted-foreground/50">{w.range}</span>
 </div>
 );
 })}
 </div>
 </div>
 )}
 </motion.div>
 )}

 {analyticsSchool && !analyticsLoading && !analyticsData && (
 <p className="text-xs text-muted-foreground/40">No analytics data available for this school.</p>
 )}
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </section>

 <section className="max-w-6xl mx-auto px-8 py-12 relative z-20">
 {error && (
 <div className="bg-red-50 border border-red-200 text-red-800 p-4 text-sm mb-6">{error}</div>
 )}

 {/* Filters bar */}
 <div className="bg-card border border-border/10 p-4 mb-6">
 <div className="flex flex-col md:flex-row items-center gap-4">
 <div className="flex items-center gap-3 flex-1 w-full">
 <Search size={18} className="text-muted-foreground/40"/>
 <input
 type="text"
 placeholder="Search by school, industry, location..."
 className="w-full bg-transparent border-none focus:outline-none text-muted-foreground text-sm"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 />
 </div>
 <button
 onClick={() => setShowFilters(!showFilters)}
 className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-4 py-2 border transition-all ${
 showFilters ?"bg-foreground text-white border-border":"bg-card text-muted-foreground/60 border-border/10 hover:border-border/30"
 }`}
 >
 <Filter size={14} /> Filters
 </button>
 </div>

 <AnimatePresence>
 {showFilters && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height:"auto", opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 className="overflow-hidden"
 >
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-border/5 mt-4">
 <div>
 <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40 mb-1 block">School</label>
 <select
 value={schoolFilter}
 onChange={(e) => setSchoolFilter(e.target.value)}
 className="w-full border border-border/10 px-3 py-2 text-sm focus:border-border focus:outline-none bg-card"
 >
 <option value="">All Schools</option>
 {Object.entries(SCHOOL_NAMES).map(([id, name]) => (
 <option key={id} value={id}>{name}</option>
 ))}
 </select>
 </div>
 <div>
 <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40 mb-1 block">Status</label>
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 className="w-full border border-border/10 px-3 py-2 text-sm focus:border-border focus:outline-none bg-card"
 >
 <option value="">All Statuses</option>
 <option value="Admitted">Admitted</option>
 <option value="Denied">Denied</option>
 <option value="Waitlisted">Waitlisted</option>
 <option value="Interviewed">Interviewed</option>
 </select>
 </div>
 <div>
 <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40 mb-1 block">Round</label>
 <select
 value={roundFilter}
 onChange={(e) => setRoundFilter(e.target.value)}
 className="w-full border border-border/10 px-3 py-2 text-sm focus:border-border focus:outline-none bg-card"
 >
 <option value="">All Rounds</option>
 <option value="Round 1">Round 1</option>
 <option value="Round 2">Round 2</option>
 <option value="Round 3">Round 3</option>
 </select>
 </div>
 <div>
 <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40 mb-1 block">Year</label>
 <select
 value={yearFilter}
 onChange={(e) => setYearFilter(e.target.value)}
 className="w-full border border-border/10 px-3 py-2 text-sm focus:border-border focus:outline-none bg-card"
 >
 <option value="">All Years</option>
 <option value="2026">2026</option>
 <option value="2025">2025</option>
 <option value="2024">2024</option>
 <option value="2023">2023</option>
 </select>
 </div>
 </div>

 {(schoolFilter || statusFilter || roundFilter || yearFilter) && (
 <button
 onClick={() => { setSchoolFilter(""); setStatusFilter(""); setRoundFilter(""); setYearFilter(""); }}
 className="mt-3 text-xs text-muted-foreground/40 hover:text-foreground transition-colors flex items-center gap-1"
 >
 <X size={12} /> Clear all filters
 </button>
 )}
 </motion.div>
 )}
 </AnimatePresence>
 </div>

 {/* Results count + pagination */}
 <div className="flex items-center justify-between mb-4">
 <p className="text-xs text-muted-foreground/40">
 {total.toLocaleString()} results
 {schoolFilter && ` for ${SCHOOL_NAMES[schoolFilter] || schoolFilter}`}
 </p>
 {totalPages > 1 && (
 <div className="flex items-center gap-2">
 <button
 onClick={() => setPage(Math.max(0, page - 1))}
 disabled={page === 0}
 className="p-1.5 border border-border/10 disabled:opacity-30 hover:bg-foreground/5 transition-colors"
 >
 <ChevronLeft size={14} />
 </button>
 <span className="text-xs text-muted-foreground/50">
 {page + 1} / {totalPages}
 </span>
 <button
 onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
 disabled={page >= totalPages - 1}
 className="p-1.5 border border-border/10 disabled:opacity-30 hover:bg-foreground/5 transition-colors"
 >
 <ChevronRight size={14} />
 </button>
 </div>
 )}
 </div>

 {/* Table */}
 <div className="bg-card border border-border/10 overflow-x-auto">
 {loading ? (
 <div className="flex items-center justify-center py-24">
 <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"/>
 </div>
 ) : (
 <table className="w-full text-left border-collapse min-w-[800px]">
 <thead>
 <tr className="bg-foreground/5 border-b border-border/10 text-[10px] uppercase tracking-widest text-muted-foreground/50">
 <th className="py-3.5 px-5 font-bold">School</th>
 <th className="py-3.5 px-5 font-bold">Status</th>
 <th className="py-3.5 px-5 font-bold">Round</th>
 <th className="py-3.5 px-5 font-bold">GMAT/GRE</th>
 <th className="py-3.5 px-5 font-bold">GPA</th>
 <th className="py-3.5 px-5 font-bold">YOE</th>
 <th className="py-3.5 px-5 font-bold">Industry</th>
 <th className="py-3.5 px-5 font-bold">Location</th>
 </tr>
 </thead>
 <tbody>
 {filtered.length > 0 ? (
 filtered.map((d, i) => (
 <tr
 key={`${d.school_id}-${d.date}-${d.status}-${i}`}
 className="border-b border-border/5 hover:bg-foreground/[0.02] transition-colors"
 >
 <td className="py-3 px-5">
 <Link href={`/school/${d.school_id}`} className="font-display font-bold text-foreground hover:text-primary transition-colors text-sm">
 {SCHOOL_NAMES[d.school_id] || d.school_id}
 </Link>
 {d.program && d.program !=="Full Time MBA" && (
 <p className="text-[10px] text-muted-foreground/40">{d.program}</p>
 )}
 </td>
 <td className="py-3 px-5"><StatusBadge status={d.status} /></td>
 <td className="py-3 px-5 text-xs text-muted-foreground/60">{d.round ||"-"}</td>
 <td className="py-3 px-5 text-sm font-mono text-muted-foreground/70">{getTestScore(d) ||"-"}</td>
 <td className="py-3 px-5 text-sm font-mono text-muted-foreground/70">{d.gpa ? d.gpa.toFixed(2) :"-"}</td>
 <td className="py-3 px-5 text-sm text-muted-foreground/60">{d.yoe != null ? `${d.yoe}y` :"-"}</td>
 <td className="py-3 px-5 text-xs text-muted-foreground/60">{d.industry ||"-"}</td>
 <td className="py-3 px-5 text-xs text-muted-foreground/40">{d.location ||"-"}</td>
 </tr>
 ))
 ) : (
 <tr>
 <td colSpan={8} className="py-16 text-center text-muted-foreground/50">
 No decisions match your filters.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 )}
 </div>

 {/* Bottom pagination */}
 {totalPages > 1 && (
 <div className="flex items-center justify-center gap-2 mt-6">
 <button
 onClick={() => setPage(Math.max(0, page - 1))}
 disabled={page === 0}
 className="px-4 py-2 text-xs font-bold border border-border/10 disabled:opacity-30 hover:bg-foreground/5 transition-colors"
 >
 Previous
 </button>
 <span className="text-xs text-muted-foreground/50 px-4">
 Page {page + 1} of {totalPages}
 </span>
 <button
 onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
 disabled={page >= totalPages - 1}
 className="px-4 py-2 text-xs font-bold border border-border/10 disabled:opacity-30 hover:bg-foreground/5 transition-colors"
 >
 Next
 </button>
 </div>
 )}
 </section>

 {/* CTA */}
 <section className="bg-success text-foreground py-16 px-8 text-center border-t border-border/10">
 <div className="max-w-2xl mx-auto">
 <h2 className="heading-serif text-3xl mb-4">See where you stand</h2>
 <p className="text-muted-foreground/80 mb-6">
 Compare financial outcomes and plan your scholarship strategy across schools.
 </p>
 <div className="flex items-center justify-center gap-4 flex-wrap">
 <button
 onClick={() => { setShowChances(true); window.scrollTo({ top: 0, behavior:"smooth"}); }}
 className="border-2 border-border text-foreground px-6 py-3 font-bold hover:bg-foreground hover:text-white transition-colors"
 >
 Check My Chances
 </button>
 <Link href="/scholarships" className="border-2 border-primary text-foreground px-6 py-3 font-bold hover:bg-primary transition-colors">
 Financial Aid Dashboard
 </Link>
 </div>
 </div>
 </section>

 <div className="max-w-6xl mx-auto px-8 pb-12">
 <ToolCrossLinks current="/decisions"/>
 </div>
 </div>
 );
}
