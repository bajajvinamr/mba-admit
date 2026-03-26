"use client";

import { useState, useEffect } from"react";
import { Loader2, Target, CheckCircle2, AlertTriangle, AlertCircle, Copy, Check } from"lucide-react";
import Link from 'next/link';
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import { apiFetch } from"@/lib/api";
import { useAbortSignal } from"@/hooks/useAbortSignal";
import { useUsage } from"@/hooks/useUsage";
import { UsageGate } from"@/components/UsageGate";

interface SchoolData {
 id: string;
 name: string;
}

interface SculptedGoal {
 adcom_ready_goal: string;
 the_why: string;
 school_fit_plan: string[];
 red_flags: string[];
}

export default function GoalSculptorPage() {
 const abortSignal = useAbortSignal();
 const usage = useUsage("goal_sculptor");
 const [schools, setSchools] = useState<SchoolData[]>([]);
 const [loadingSchools, setLoadingSchools] = useState(true);

 // Form State
 const [currentRole, setCurrentRole] = useState("");
 const [industry, setIndustry] = useState("");
 const [vagueGoal, setVagueGoal] = useState("");
 const [targetSchoolId, setTargetSchoolId] = useState("");

 // Submission State
 const [isSculpting, setIsSculpting] = useState(false);
 const [result, setResult] = useState<SculptedGoal | null>(null);
 const [error, setError] = useState<string | null>(null);

 // UI state
 const [copied, setCopied] = useState(false);

 // Fetch school list on mount
 useEffect(() => {
 async function fetchSchools() {
 try {
 const data = await apiFetch<SchoolData[]>(`/api/schools/names`);
 const parsedSchools = Array.isArray(data) ? data : [];
 const schoolList = parsedSchools
 .filter((s) => s.name)
 .sort((a, b) => a.name.localeCompare(b.name));
 setSchools(schoolList);
 } catch (err) {
 console.error("Failed to load schools:", err);
 } finally {
 setLoadingSchools(false);
 }
 }
 fetchSchools();
 }, []);

 const handleSculpt = async () => {
 if (!currentRole || !industry || !vagueGoal || !targetSchoolId) {
 setError("Please fill out all fields before sculpting.");
 return;
 }

 setIsSculpting(true);
 setError(null);
 setResult(null);

 try {
 const data = await apiFetch<SculptedGoal>(`/api/goals/sculpt`, {
 method:"POST",
 body: JSON.stringify({
 current_role: currentRole,
 industry,
 vague_goal: vagueGoal,
 target_school_id: targetSchoolId,
 }),
 noRetry: true,
 timeoutMs: 60_000,
 signal: abortSignal,
 });
 setResult(data);
 usage.recordUse();
 } catch (err: any) {
 setError(err.message ||"An error occurred.");
 } finally {
 setIsSculpting(false);
 }
 };

 const handleCopy = () => {
 if (!result) return;
 const textToCopy = `Short/Long-Term Goal:\n${result.adcom_ready_goal}\n\nThe 'Why':\n${result.the_why}`;
 navigator.clipboard.writeText(textToCopy);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 };

 return (
 <>
 <UsageGate feature="goal_sculptor">
 <div className="min-h-screen bg-muted flex flex-col items-center py-24 px-6">
 <div className="max-w-4xl w-full">
 {/* Header */}
 <div className="text-center mb-12">
 <h1 className="text-4xl font-display font-medium text-foreground mb-4 inline-flex items-center gap-3">
 <Target className="w-10 h-10 text-foreground"/> The Career Goal Sculptor
 </h1>
 <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
 AdComs reject generic goals. Transform your vague"I want to do tech"dream into a highly articulated, defensively sound narrative tailored exactly to your target school.
 </p>
 </div>

 {/* Main Content Area */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
 
 {/* Left Column: The Input Form */}
 <div className="border border-black/5 bg-card rounded-lg overflow-hidden">
 <div className="bg-muted/50 border-b p-6">
 <h3 className="text-lg heading-serif text-foreground">Your Raw Ingredients</h3>
 <p className="text-sm text-muted-foreground mt-1">Tell us where you are and broadly where you want to go.</p>
 </div>
 <div className="space-y-6 pt-6 p-6">
 
 <div className="space-y-2">
 <label className="text-sm font-semibold text-gray-700">Current Role</label>
 <input 
 type="text"
 placeholder="e.g., Senior Strategy Analyst"
 value={currentRole}
 onChange={(e: any) => setCurrentRole(e.target.value)}
 className="w-full flex h-10 rounded-md border border-border bg-muted px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
 />
 </div>

 <div className="space-y-2">
 <label className="text-sm font-semibold text-gray-700">Current Industry</label>
 <input 
 type="text"
 placeholder="e.g., CPG / Retail"
 value={industry}
 onChange={(e: any) => setIndustry(e.target.value)}
 className="w-full flex h-10 rounded-md border border-border bg-muted px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
 />
 </div>

 <div className="space-y-2">
 <label className="text-sm font-semibold text-gray-700 mt-2 flex items-center justify-between">
 <span>Your Unfiltered Goal</span>
 <span className="text-xs text-muted-foreground font-normal">Be honest. No jargon needed.</span>
 </label>
 <textarea 
 placeholder="e.g., honestly I just want to switch into a big tech PM role to make more money and build cool products."
 className="w-full flex min-h-[112px] rounded-md border border-border bg-muted px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none transition-all"
 value={vagueGoal}
 onChange={(e: any) => setVagueGoal(e.target.value)}
 />
 </div>

 <div className="space-y-2">
 <label className="text-sm font-semibold text-gray-700">Target School Context</label>
 <select 
 className="w-full flex h-10 rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
 disabled={loadingSchools} 
 value={targetSchoolId} 
 onChange={(e: any) => setTargetSchoolId(e.target.value)}
 >
 <option value="" disabled>{loadingSchools ?"Loading schools...":"Select the school you're writing for..."}</option>
 {schools.map((school) => (
 <option key={school.id} value={school.id}>
 {school.name}
 </option>
 ))}
 </select>
 </div>

 {error && (
 <div className="p-3 bg-red-50 text-red-700 text-sm border border-red-200 rounded-md flex items-start gap-2">
 <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0"/>
 <p className="flex-1">{error}</p>
 <button onClick={() => setError(null)} className="ml-3 text-sm font-bold underline flex-shrink-0">
 Dismiss
 </button>
 </div>
 )}

 </div>
 <div className="bg-muted/50 border-t p-4">
 <button 
 className="w-full flex items-center justify-center bg-black hover:bg-black/90 text-white font-medium h-12 text-md transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
 onClick={handleSculpt}
 disabled={isSculpting}
 >
 {isSculpting ? (
 <span className="flex flex-col items-center">
 <span className="flex items-center"><Loader2 className="w-5 h-5 mr-2 animate-spin"/>Sculpting Narrative...</span>
 <span className="text-xs text-white/40 mt-1 font-normal">This usually takes 5-10 seconds</span>
 </span>
 ) : (
"Sculpt My Goal →"
 )}
 </button>
 </div>
 </div>

 {/* Right Column: The Output */}
 <div className="space-y-6">
 {!result && !isSculpting && (
 <div className="h-full min-h-[400px] border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-center p-8 bg-card/50">
 <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
 <Target className="w-8 h-8 text-gray-300"/>
 </div>
 <h3 className="text-xl font-display text-foreground mb-2">Awaiting Instructions</h3>
 <p className="text-muted-foreground text-sm max-w-xs">
 Fill out the configuration on the left. The AI will forge an elite admissions narrative structured precisely for your target school.
 </p>
 </div>
 )}

 {isSculpting && (
 <div className="h-full min-h-[400px] border border-border rounded-lg flex flex-col items-center justify-center text-center p-8 bg-card">
 <Loader2 className="w-12 h-12 text-foreground animate-spin mb-4"/>
 <h3 className="text-xl font-display text-foreground mb-2 animate-pulse">Forging Your Narrative...</h3>
 <p className="text-muted-foreground text-sm">Cross-referencing school resources and mitigating transition risks.</p>
 <p className="text-xs text-muted-foreground mt-2">This usually takes 5-10 seconds</p>
 </div>
 )}

 {result && !isSculpting && (
 <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in">
 
 {/* The Core Goal */}
 <div className="border border-black rounded-lg overflow-hidden bg-card">
 <div className="bg-black text-white px-6 py-3 flex justify-between items-center">
 <span className="font-semibold tracking-wide text-xs uppercase">AdCom-Ready Narrative</span>
 <button 
 onClick={handleCopy}
 className="flex items-center text-gray-300 hover:text-white hover:bg-card/10 rounded-md h-8 px-2 text-xs transition-colors"
 >
 {copied ? <Check className="w-4 h-4 mr-1"/> : <Copy className="w-4 h-4 mr-1"/>}
 {copied ?"Copied":"Copy Draft"}
 </button>
 </div>
 <div className="p-6 space-y-6">
 <div>
 <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 border-b pb-2">Step 1: The Pitch</h4>
 <p className="text-xl font-medium font-display text-foreground leading-relaxed">
 “{result.adcom_ready_goal}”
 </p>
 </div>
 <div>
 <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 border-b pb-2">Step 2: The 'Why'</h4>
 <p className="text-gray-700 leading-relaxed text-sm">
 {result.the_why}
 </p>
 </div>
 </div>
 </div>

 {/* School Fit Map */}
 <div className="border border-border rounded-lg bg-card overflow-hidden">
 <div className="pb-3 border-b border-border bg-muted p-6">
 <h3 className="text-base font-display flex items-center gap-2 font-semibold text-foreground">
 <CheckCircle2 className="w-5 h-5 text-gray-700"/>
 School Fit Map (Name-Drop These)
 </h3>
 </div>
 <div className="p-6 pt-4">
 <ul className="space-y-3">
 {result.school_fit_plan.map((item, i) => (
 <li key={i} className="flex gap-3 text-sm text-gray-700">
 <span className="text-foreground font-bold opacity-30 mt-0.5">{i+1}.</span>
 <span>{item}</span>
 </li>
 ))}
 </ul>
 </div>
 </div>

 {/* Defense / Red Flags */}
 <div className="border border-red-100 rounded-lg bg-red-50/30 overflow-hidden">
 <div className="p-6 pb-3">
 <h3 className="text-sm font-semibold text-red-800 uppercase tracking-wider flex items-center gap-2">
 <AlertTriangle className="w-4 h-4"/>
 Defend Against These Red Flags
 </h3>
 </div>
 <div className="p-6 pt-2">
 <ul className="space-y-2">
 {result.red_flags.map((item, i) => (
 <li key={i} className="flex gap-2 text-sm text-red-700/80">
 <span className="mr-1 mt-1 block w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0"/>
 {item}
 </li>
 ))}
 </ul>
 </div>
 </div>

 </div>
 )}
 </div>

 </div>

 {/* Global CTA */}
 <div className="mt-20 pt-10 border-t border-border text-center">
 <h3 className="text-2xl font-display text-foreground mb-4">Want a human to review your sculpted goal?</h3>
 <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
 Our AI is powerful, but our former M7 AdComs are unmatched at stress-testing career transitions.
 </p>
 <Link href="/checkout" className="inline-block bg-black hover:bg-black/80 text-white px-8 py-4 text-lg font-medium tracking-wide shadow-sm transition-all hover:scale-[1.02]">
 Book a 1:1 Strategy Call
 </Link>
 </div>

 </div>
 </div>
 </UsageGate>

 <div className="max-w-4xl mx-auto px-6 pb-8">
 <ToolCrossLinks current="/goals"/>
 </div>
 </>
 );
}
