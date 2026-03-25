"use client";

import { useState, useEffect } from"react";
import { motion } from"framer-motion";
import {
 Plus,
 X,
 Search,
 ArrowRight,
 GraduationCap,
 MapPin,
 DollarSign,
 Users,
 Award,
 Briefcase,
 ChevronDown,
 ChevronUp,
 BarChart3,
} from"lucide-react";
import { apiFetch } from"@/lib/api";
import { track } from"@/lib/analytics";
import { useProfile } from"@/hooks/useProfile";
import { useUsage } from"@/hooks/useUsage";
import { UsageGate } from"@/components/UsageGate";
import { EmptyState } from"@/components/EmptyState";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import { EmailCapture } from"@/components/EmailCapture";
import { GmatDistributionChart } from"@/components/charts/GmatDistributionChart";
import { GpaDistributionChart } from"@/components/charts/GpaDistributionChart";
import { IndustryChart } from"@/components/charts/IndustryChart";
import { ProfileFitBars } from"@/components/charts/ProfileFitBars";

// ── Types ────────────────────────────────────────────────────────────────────

type SchoolInfo = {
 id: string;
 name: string;
 location: string;
};

type GmatBucket = { range: string; admitted: number; denied: number };
type GpaBucket = { range: string; admitted: number; denied: number };
type IndustryEntry = { industry: string; count: number; pct: number };
type YoeBucket = { range: string; count: number };

type Outcomes = {
 total_decisions: number;
 admit_count: number;
 deny_count: number;
 waitlist_count: number;
 interview_count: number;
 median_gmat_admitted: number | null;
 median_gpa_admitted: number | null;
 median_yoe_admitted: number | null;
 gmat_distribution: GmatBucket[];
 gpa_distribution: GpaBucket[];
 top_industries: IndustryEntry[];
 yoe_distribution: YoeBucket[];
};

type ProfileFit = {
 gmat_percentile: number;
 gpa_percentile: number;
 yoe_percentile: number;
 verdict: string;
};

type StaticData = {
 tuition_usd: number | null;
 class_size: number | null;
 acceptance_rate: number | null;
 median_salary: string | null;
 gmat_avg: number | null;
 stem_designated: boolean | null;
 program_duration: string | null;
 international_pct: string | null;
 employment_rate: string | null;
 specializations: string[];
 essay_count: number;
 deadlines: { round: string; deadline: string }[];
 degree_type?: string;
 application_fee_usd?: number;
};

type ComparedSchool = {
 school_id: string;
 name: string;
 location: string;
 static: StaticData;
 outcomes: Outcomes | null;
 profile_fit: ProfileFit | null;
};

type UserProfile = {
 gmat?: number;
 gpa?: number;
 yoe?: number;
};

// ── Component ────────────────────────────────────────────────────────────────

export default function ComparePage() {
 const usage = useUsage("school_compare");
 const [allSchools, setAllSchools] = useState<SchoolInfo[]>([]);
 const [selectedIds, setSelectedIds] = useState<string[]>([]);
 const [compared, setCompared] = useState<ComparedSchool[]>([]);
 const [loading, setLoading] = useState(false);
 const [search, setSearch] = useState("");
 const [showPicker, setShowPicker] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [schoolListError, setSchoolListError] = useState<string | null>(null);
 const [schoolsLoading, setSchoolsLoading] = useState(true);
 const { profile: savedProfile, updateProfile: saveProfile, hasProfile: hasSavedProfile } = useProfile();
 const [localProfile, setLocalProfile] = useState<UserProfile>({});
 const [showProfile, setShowProfile] = useState(false);

 useEffect(() => {
 setSchoolsLoading(true);
 apiFetch<SchoolInfo[]>(`/api/schools/names`)
 .then(setAllSchools)
 .catch(() => setSchoolListError("Failed to load school list. Please refresh the page."))
 .finally(() => setSchoolsLoading(false));
 }, []);

 // Sync local form state from shared profile
 useEffect(() => {
 setLocalProfile({
 gmat: savedProfile.gmat ?? undefined,
 gpa: savedProfile.gpa ?? undefined,
 yoe: savedProfile.yoe ?? undefined,
 });
 }, [savedProfile.gmat, savedProfile.gpa, savedProfile.yoe]);

 const addSchool = (id: string) => {
 if (selectedIds.length >= 4 || selectedIds.includes(id)) return;
 setSelectedIds((prev) => [...prev, id]);
 setShowPicker(false);
 setSearch("");
 };

 const removeSchool = (id: string) => {
 setSelectedIds((prev) => prev.filter((s) => s !== id));
 setCompared((prev) => prev.filter((s) => s.school_id !== id));
 };

 const runComparison = async () => {
 if (selectedIds.length < 2) return;
 setError(null);
 setLoading(true);
 try {
 const body: { school_ids: string[]; profile?: UserProfile } = {
 school_ids: selectedIds,
 };
 if (localProfile.gmat || localProfile.gpa || localProfile.yoe) {
 body.profile = localProfile;
 // Save to shared profile store
 saveProfile({
 gmat: localProfile.gmat ?? null,
 gpa: localProfile.gpa ?? null,
 yoe: localProfile.yoe ?? null,
 });
 }
 const data = await apiFetch<{ schools: ComparedSchool[] }>(
"/api/schools/compare",
 {
 method:"POST",
 body: JSON.stringify(body),
 }
 );
 setCompared(data.schools);
 usage.recordUse();
 track("schools_compared", {
 school_count: selectedIds.length,
 school_ids: selectedIds.join(","),
 has_profile: !!(localProfile.gmat || localProfile.gpa || localProfile.yoe),
 });
 } catch (e) {
 console.error(e);
 setError("Failed to load comparison data. Please try again.");
 } finally {
 setLoading(false);
 }
 };

 const fmt = (v: number | string | null | undefined) => {
 if (v === null || v === undefined) return "-";
 if (typeof v ==="number") return v.toLocaleString();
 return v;
 };

 // Build data maps for charts
 const schoolNames: Record<string, string> = {};
 const gmatDistData: Record<string, GmatBucket[]> = {};
 const gpaDistData: Record<string, GpaBucket[]> = {};
 const industryData: Record<string, IndustryEntry[]> = {};
 const profileFits: { schoolId: string; name: string; fit: ProfileFit }[] = [];

 for (const s of compared) {
 schoolNames[s.school_id] = s.name.split("").slice(0, 2).join(""); // short name for chart labels
 if (s.outcomes) {
 gmatDistData[s.school_id] = s.outcomes.gmat_distribution;
 gpaDistData[s.school_id] = s.outcomes.gpa_distribution;
 industryData[s.school_id] = s.outcomes.top_industries;
 }
 if (s.profile_fit) {
 profileFits.push({
 schoolId: s.school_id,
 name: s.name,
 fit: s.profile_fit,
 });
 }
 }

 const hasOutcomes = Object.keys(gmatDistData).length > 0;
 const hasProfileFit = profileFits.length > 0;

 // Tailwind requires static class names for purging - map count to explicit class
 const gridColsClass: Record<number, string> = {
 2:"grid-cols-2",
 3:"grid-cols-3",
 4:"grid-cols-4",
 };
 const costGridCols = gridColsClass[compared.length] ||"grid-cols-2";

 // Stats table rows
 const statRows: {
 label: string;
 icon: React.ReactNode;
 getValue: (s: ComparedSchool) => string;
 }[] = [
 {
 label:"Program Type",
 icon: <GraduationCap size={14} />,
 getValue: (s) => s.static.degree_type ||"MBA",
 },
 {
 label:"Location",
 icon: <MapPin size={14} />,
 getValue: (s) => s.location ||"-",
 },
 {
 label:"Median GMAT (admits)",
 icon: <Award size={14} />,
 getValue: (s) =>
 s.outcomes?.median_gmat_admitted?.toString() ||
 fmt(s.static.gmat_avg),
 },
 {
 label:"Median GPA (admits)",
 icon: <Award size={14} />,
 getValue: (s) => s.outcomes?.median_gpa_admitted?.toString() ||"-",
 },
 {
 label:"Acceptance Rate",
 icon: <GraduationCap size={14} />,
 getValue: (s) =>
 s.static.acceptance_rate ? `${s.static.acceptance_rate}%` :"-",
 },
 {
 label:"Data Points",
 icon: <BarChart3 size={14} />,
 getValue: (s) =>
 s.outcomes ? `${s.outcomes.total_decisions} decisions` :"-",
 },
 {
 label:"Class Size",
 icon: <Users size={14} />,
 getValue: (s) => fmt(s.static.class_size),
 },
 {
 label:"Tuition (USD)",
 icon: <DollarSign size={14} />,
 getValue: (s) =>
 s.static.tuition_usd ? `$${s.static.tuition_usd.toLocaleString()}` :"-",
 },
 {
 label:"Application Fee",
 icon: <DollarSign size={14} />,
 getValue: (s) =>
 s.static.application_fee_usd ? `$${s.static.application_fee_usd}` :"-",
 },
 {
 label:"Median Salary",
 icon: <Briefcase size={14} />,
 getValue: (s) => fmt(s.static.median_salary),
 },
 {
 label:"Duration",
 icon: <Award size={14} />,
 getValue: (s) => fmt(s.static.program_duration),
 },
 {
 label:"STEM Designated",
 icon: <Award size={14} />,
 getValue: (s) =>
 s.static.stem_designated === true
 ?"Yes"
 : s.static.stem_designated === false
 ?"No"
 :"-",
 },
 {
 label:"Essays",
 icon: <Award size={14} />,
 getValue: (s) => s.static.essay_count?.toString() ||"-",
 },
 ];

 return (
 <div className="min-h-screen bg-background">
 {/* Header */}
 <section className="bg-foreground text-white pt-4 pb-14 px-8 relative overflow-hidden">
 <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent"/>
 <div className="max-w-6xl mx-auto relative z-10 text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4">
 Compare Schools
 </h1>
 <p className="text-lg text-white/60 max-w-xl mx-auto">
 Side-by-side outcomes from 12K real admission decisions.
 </p>
 </div>
 </section>

 <main className="max-w-6xl mx-auto px-4 md:px-8 py-12 -mt-6 relative z-20" aria-label="School comparison tool">
 {/* School selector */}
 <div className="bg-card border border-border/10 p-4 md:p-6 mb-6" role="region" aria-label="Selected schools">
 <div className="flex flex-wrap gap-3 items-center">
 {selectedIds.map((id) => {
 const s = allSchools.find((s) => s.id === id);
 return (
 <span
 key={id}
 className="bg-foreground text-white px-4 py-2 text-sm font-bold flex items-center gap-2"
 >
 {s?.name || id}
 <button
 onClick={() => removeSchool(id)}
 className="hover:text-primary transition-colors"
 aria-label={`Remove ${s?.name || id}`}
 >
 <X size={14} />
 </button>
 </span>
 );
 })}
 {selectedIds.length < 4 && (
 <button
 onClick={() => setShowPicker(true)}
 aria-label="Add a school to compare"
 className="border-2 border-dashed border-border/20 text-muted-foreground/40 px-4 py-2 text-sm font-bold flex items-center gap-2 hover:border-primary hover:text-primary transition-all"
 >
 <Plus size={14} /> Add School
 </button>
 )}
 {selectedIds.length >= 2 && (
 <button
 onClick={runComparison}
 disabled={loading}
 aria-busy={loading}
 className="ml-auto bg-primary text-foreground px-6 py-2 font-bold text-sm flex items-center gap-2 hover:bg-primary/80 transition-colors disabled:opacity-50"
 >
 {loading ?"Comparing...":"Compare"}{""}
 <ArrowRight size={14} />
 </button>
 )}
 </div>
 </div>

 {/* School picker dropdown */}
 {showPicker && (
 <motion.div
 initial={{ opacity: 0, y: -8 }}
 animate={{ opacity: 1, y: 0 }}
 className="bg-card border border-border/10 p-4 mb-6 max-h-[300px] overflow-y-auto"
 >
 <div className="relative mb-3">
 <Search
 size={16}
 className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/30"
 />
 <input
 type="text"
 placeholder="Search schools..."
 aria-label="Search schools"
 className="w-full pl-10 pr-4 py-2 border border-border/10 focus:border-border focus:outline-none text-sm"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 autoFocus
 />
 </div>
 <div className="space-y-1" role="listbox" aria-label="Available schools">
 {schoolsLoading && (
 <div className="animate-pulse space-y-2 py-2">
 {Array.from({ length: 5 }).map((_, i) => (
 <div key={i} className="flex justify-between items-center p-2">
 <div className="h-3 w-40 bg-foreground/10"/>
 <div className="h-3 w-20 bg-foreground/5"/>
 </div>
 ))}
 </div>
 )}
 {!schoolsLoading && allSchools.length === 0 && !schoolListError && (
 <p className="text-sm text-foreground/40 py-4 text-center">No schools available.</p>
 )}
 {(() => {
 const filtered = allSchools
 .filter((s) =>
 s.name.toLowerCase().includes(search.toLowerCase())
 )
 .filter((s) => !selectedIds.includes(s.id));
 if (!schoolsLoading && filtered.length === 0 && allSchools.length > 0) {
 return (
 <p className="text-sm text-foreground/40 py-4 text-center">
 No schools match &ldquo;{search}&rdquo;
 </p>
 );
 }
 return filtered.slice(0, 15).map((s) => (
 <button
 key={s.id}
 role="option"
 aria-selected={false}
 onClick={() => addSchool(s.id)}
 className="w-full text-left p-2 hover:bg-background transition-colors flex justify-between items-center text-sm"
 >
 <span className="font-medium">{s.name}</span>
 <span className="text-xs text-muted-foreground/40">
 {s.location ||"-"}
 </span>
 </button>
 ));
 })()}
 </div>
 </motion.div>
 )}

 {/* Profile input panel */}
 {selectedIds.length >= 2 && (
 <div className="bg-card border border-border/10 mb-6">
 <button
 onClick={() => setShowProfile(!showProfile)}
 aria-expanded={showProfile}
 className="w-full flex items-center justify-between p-4 md:p-6 text-left"
 >
 <div>
 <span className="text-sm font-bold text-foreground">
 Your Profile
 </span>
 <span className="text-xs text-muted-foreground/40 ml-3">
 {localProfile.gmat || localProfile.gpa || localProfile.yoe
 ? `GMAT ${localProfile.gmat ||"-"} / GPA ${localProfile.gpa ||"-"} / ${localProfile.yoe ||"-"} yrs`
 :"Add your stats to see where you stand"}
 </span>
 </div>
 {showProfile ? (
 <ChevronUp size={16} className="text-muted-foreground/40"/>
 ) : (
 <ChevronDown size={16} className="text-muted-foreground/40"/>
 )}
 </button>
 {showProfile && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height:"auto", opacity: 1 }}
 className="px-4 md:px-6 pb-4 md:pb-6 border-t border-border/5"
 >
 <div className="grid grid-cols-3 gap-4 pt-4">
 <div>
 <label htmlFor="compare-gmat" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 block mb-1">
 GMAT / GRE
 </label>
 <input
 id="compare-gmat"
 type="number"
 placeholder="740"
 className="w-full px-3 py-2 border border-border/10 text-sm focus:border-border focus:outline-none"
 value={localProfile.gmat ||""}
 onChange={(e) =>
 setLocalProfile((p) => ({
 ...p,
 gmat: e.target.value ? Number(e.target.value) : undefined,
 }))
 }
 />
 </div>
 <div>
 <label htmlFor="compare-gpa" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 block mb-1">
 GPA
 </label>
 <input
 id="compare-gpa"
 type="number"
 step="0.1"
 placeholder="3.7"
 className="w-full px-3 py-2 border border-border/10 text-sm focus:border-border focus:outline-none"
 value={localProfile.gpa ||""}
 onChange={(e) =>
 setLocalProfile((p) => ({
 ...p,
 gpa: e.target.value ? Number(e.target.value) : undefined,
 }))
 }
 />
 </div>
 <div>
 <label htmlFor="compare-yoe" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 block mb-1">
 Years of Exp
 </label>
 <input
 id="compare-yoe"
 type="number"
 placeholder="4"
 className="w-full px-3 py-2 border border-border/10 text-sm focus:border-border focus:outline-none"
 value={localProfile.yoe ||""}
 onChange={(e) =>
 setLocalProfile((p) => ({
 ...p,
 yoe: e.target.value ? Number(e.target.value) : undefined,
 }))
 }
 />
 </div>
 </div>
 <p className="text-[10px] text-muted-foreground/30 mt-2">
 Hit Compare again to see your percentile at each school.
 </p>
 </motion.div>
 )}
 </div>
 )}

 {schoolListError && (
 <div role="alert" className="bg-red-50 border border-red-200 text-red-800 p-4 text-sm mb-6 flex items-center justify-between">
 <span>{schoolListError}</span>
 <button
 onClick={() => {
 setSchoolListError(null);
 setSchoolsLoading(true);
 apiFetch<SchoolInfo[]>(`/api/schools/names`)
 .then(setAllSchools)
 .catch(() => setSchoolListError("Failed to load school list. Please refresh the page."))
 .finally(() => setSchoolsLoading(false));
 }}
 className="ml-4 text-xs font-bold underline hover:no-underline whitespace-nowrap"
 >
 Retry
 </button>
 </div>
 )}

 {error && (
 <div role="alert" className="bg-red-50 border border-red-200 text-red-800 p-4 text-sm mb-6 flex items-center justify-between">
 <span>{error}</span>
 <button
 onClick={() => { setError(null); runComparison(); }}
 className="ml-4 text-xs font-bold underline hover:no-underline whitespace-nowrap"
 >
 Retry
 </button>
 </div>
 )}

 {/* Loading skeleton during comparison */}
 {loading && (
 <div className="space-y-6 animate-pulse" role="status" aria-label="Loading comparison data">
 <span className="sr-only">Loading comparison data...</span>
 <div className="bg-card border border-border/10 p-6">
 <div className="h-3 w-32 bg-foreground/10 mb-6"/>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 {selectedIds.map((id) => (
 <div key={id} className="bg-background p-4">
 <div className="h-2 w-16 bg-foreground/10 mx-auto mb-2"/>
 <div className="h-8 w-12 bg-foreground/10 mx-auto mb-1"/>
 <div className="h-2 w-20 bg-foreground/10 mx-auto"/>
 </div>
 ))}
 </div>
 </div>
 <div className="bg-card border border-border/10 p-6">
 <div className="h-3 w-48 bg-foreground/10 mb-6"/>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
 <div className="h-56 bg-foreground/5 rounded"/>
 <div className="h-56 bg-foreground/5 rounded"/>
 </div>
 </div>
 </div>
 )}

 {/* Results */}
 {!loading && compared.length >= 2 && (
 <UsageGate feature="school_compare">
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="space-y-6"
 aria-live="polite"
 >
 {/* Quick Cost Summary */}
 {compared.some(s => s.static.application_fee_usd || s.static.tuition_usd) && (
 <div className="bg-card border border-border/10 p-4 md:p-6">
 <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/40 mb-4">
 Cost Snapshot
 </h2>
 <div className={`grid ${costGridCols} gap-3`}>
 {compared.map(s => (
 <div key={s.school_id} className="text-center">
 <p className="text-[10px] uppercase tracking-wider text-muted-foreground/40 mb-1">{s.name}</p>
 <p className="heading-serif text-xl text-foreground">
 {s.static.tuition_usd ? `$${s.static.tuition_usd.toLocaleString()}` :"-"}
 </p>
 <p className="text-[10px] text-muted-foreground/40">tuition</p>
 {s.static.application_fee_usd && (
 <p className="text-xs text-muted-foreground/50 mt-1">+ ${s.static.application_fee_usd} app fee</p>
 )}
 </div>
 ))}
 </div>
 <div className="mt-3 pt-3 border-t border-border/5 text-center">
 <p className="text-[10px] uppercase tracking-wider text-muted-foreground/40">Total Application Fees</p>
 <p className="heading-serif text-lg text-primary">
 ${compared.reduce((sum, s) => sum + (s.static.application_fee_usd || 0), 0).toLocaleString()}
 </p>
 </div>
 </div>
 )}

 {/* Section A: Profile Fit */}
 {hasProfileFit && (
 <div className="bg-card border border-border/10 p-4 md:p-6">
 <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/40 mb-6">
 Your Profile Fit
 </h2>
 <ProfileFitBars fits={profileFits} />
 </div>
 )}

 {/* Section B: Outcome Charts */}
 {hasOutcomes && (
 <div className="bg-card border border-border/10 p-4 md:p-6">
 <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/40 mb-6">
 Admission Outcomes - {compared.reduce((sum, s) => sum + (s.outcomes?.total_decisions || 0), 0).toLocaleString()} real decisions
 </h2>

 {/* Key stats row */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
 {compared.map((s) =>
 s.outcomes ? (
 <div
 key={s.school_id}
 className="bg-background p-3 text-center"
 >
 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">
 {schoolNames[s.school_id]}
 </p>
 <p className="text-2xl font-bold text-foreground">
 {fmt(s.outcomes.median_gmat_admitted)}
 </p>
 <p className="text-[10px] text-muted-foreground/40">
 median GMAT (admits)
 </p>
 </div>
 ) : null
 )}
 </div>

 {/* Charts grid */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
 <GmatDistributionChart
 data={gmatDistData}
 schoolNames={schoolNames}
 />
 <GpaDistributionChart
 data={gpaDistData}
 schoolNames={schoolNames}
 />
 <div className="lg:col-span-2">
 <IndustryChart
 data={industryData}
 schoolNames={schoolNames}
 />
 </div>
 </div>
 </div>
 )}

 {/* Section C: Program Stats table (desktop) */}
 <div className="hidden md:block bg-card border border-border/10 overflow-x-auto">
 <table className="w-full text-left border-collapse" aria-label="Program statistics comparison">
 <thead>
 <tr className="bg-foreground text-white">
 <th scope="col" className="py-4 px-6 text-xs uppercase tracking-widest font-bold w-[180px]">
 Metric
 </th>
 {compared.map((s) => (
 <th scope="col" key={s.school_id} className="py-4 px-6 text-sm font-bold">
 {s.name}
 </th>
 ))}
 </tr>
 </thead>
 <tbody>
 {statRows.map((row, i) => (
 <tr
 key={row.label}
 className={`border-b border-border/5 ${i % 2 === 0 ?"bg-background/50":""}`}
 >
 <th scope="row" className="py-3 px-6 text-xs font-bold uppercase tracking-widest text-muted-foreground/40 flex items-center gap-2 text-left font-bold">
 {row.icon} {row.label}
 </th>
 {compared.map((s) => (
 <td
 key={s.school_id}
 className="py-3 px-6 text-sm font-medium text-foreground"
 >
 {row.getValue(s)}
 </td>
 ))}
 </tr>
 ))}
 {/* Specializations row */}
 <tr className="border-b border-border/5">
 <th scope="row" className="py-3 px-6 text-xs font-bold uppercase tracking-widest text-muted-foreground/40 text-left">
 Specializations
 </th>
 {compared.map((s) => (
 <td key={s.school_id} className="py-3 px-6">
 <div className="flex flex-wrap gap-1">
 {s.static.specializations?.slice(0, 4).map((spec) => (
 <span
 key={spec}
 className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 font-bold uppercase tracking-widest"
 >
 {spec}
 </span>
 ))}
 {(!s.static.specializations ||
 s.static.specializations.length === 0) && (
 <span className="text-xs text-muted-foreground/30">-</span>
 )}
 </div>
 </td>
 ))}
 </tr>
 </tbody>
 </table>
 </div>

 {/* Section C: Program Stats cards (mobile) */}
 <div className="md:hidden space-y-4">
 {compared.map((school) => (
 <div
 key={school.school_id}
 className="bg-card border border-border/10 p-5"
 >
 <h3 className="font-bold text-lg text-foreground mb-1">
 {school.name}
 </h3>
 <p className="text-xs text-muted-foreground/40 mb-4">
 {school.location ||"-"}
 </p>
 <div className="space-y-2">
 {statRows.map((row) => (
 <div
 key={row.label}
 className="flex justify-between items-center py-1.5 border-b border-border/5 last:border-0"
 >
 <span className="text-xs text-muted-foreground/50 flex items-center gap-1.5">
 {row.icon} {row.label}
 </span>
 <span className="text-sm font-medium text-foreground">
 {row.getValue(school)}
 </span>
 </div>
 ))}
 </div>
 {(school.static.specializations?.length ?? 0) > 0 && (
 <div className="mt-3 pt-2 flex flex-wrap gap-1">
 {school.static.specializations.slice(0, 4).map((spec) => (
 <span
 key={spec}
 className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 font-bold uppercase tracking-widest"
 >
 {spec}
 </span>
 ))}
 </div>
 )}
 </div>
 ))}
 </div>

 {/* Section D: Deadlines */}
 {compared.some(
 (s) => s.static.deadlines && s.static.deadlines.length > 0
 ) && (
 <div className="bg-card border border-border/10 p-4 md:p-6">
 <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/40 mb-4">
 Application Deadlines
 </h2>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 {compared.map((s) => (
 <div key={s.school_id}>
 <h4 className="text-sm font-bold text-foreground mb-2">
 {s.name}
 </h4>
 {s.static.deadlines && s.static.deadlines.length > 0 ? (
 <div className="space-y-1">
 {s.static.deadlines.map((d, i) => (
 <div
 key={i}
 className="flex justify-between text-xs"
 >
 <span className="text-muted-foreground/50">
 {d.round}
 </span>
 <span className="font-medium text-foreground">
 {d.deadline}
 </span>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-xs text-muted-foreground/30">
 No deadline data
 </p>
 )}
 </div>
 ))}
 </div>
 </div>
 )}

 {/* CTA: Add to Tracker */}
 <div className="bg-foreground text-white p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
 <div>
 <h3 className="font-bold text-sm">Ready to apply?</h3>
 <p className="text-white/50 text-xs mt-1">Add these schools to your tracker to stay on top of deadlines and essays.</p>
 </div>
 <div className="flex gap-3 flex-wrap">
 {compared.map((s) => (
 <a
 key={s.school_id}
 href={`/my-schools`}
 className="bg-primary text-foreground px-4 py-2 text-xs font-bold hover:bg-primary/80 transition-colors whitespace-nowrap"
 >
 Track {s.name.split("").slice(0, 2).join("")}
 </a>
 ))}
 </div>
 </div>
 </motion.div>
 </UsageGate>
 )}

 {/* Empty state - no schools selected */}
 {compared.length === 0 && selectedIds.length === 0 && !loading && (
 <div className="max-w-md mx-auto text-center py-16">
 <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
 <GraduationCap size={36} className="text-primary"/>
 </div>
 <h2 className="heading-serif text-2xl text-foreground mb-2">
 Compare programs head-to-head
 </h2>
 <p className="text-foreground/50 mb-6">
 Pick 2-4 schools to see GMAT/GPA distributions, admit rates, top
 industries, and your percentile fit - powered by 12K real
 decisions.
 </p>
 <button
 onClick={() => setShowPicker(true)}
 className="bg-foreground text-white px-6 py-3 font-bold hover:bg-foreground/80 transition-colors inline-flex items-center gap-2"
 >
 <Plus size={16} /> Add Your First School
 </button>
 </div>
 )}

 {/* Hint - 1 school selected, need at least 2 */}
 {selectedIds.length === 1 && compared.length === 0 && !loading && (
 <EmptyState
 icon={Plus}
 title="Add one more school to compare"
 description="Select at least 2 schools to see a side-by-side comparison of outcomes, stats, and deadlines."
 />
 )}

 {/* Hint - 2+ selected but not yet compared */}
 {selectedIds.length >= 2 && compared.length === 0 && !loading && !error && (
 <EmptyState
 icon={ArrowRight}
 title="Ready to compare"
 description="Hit the Compare button above to see side-by-side outcomes."
 />
 )}
 <EmailCapture variant="contextual"source="compare"/>
 <ToolCrossLinks current="/compare"/>
 </main>
 </div>
 );
}
