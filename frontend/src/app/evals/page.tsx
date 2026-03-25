"use client";

import { useState } from"react";
import { useSession } from"next-auth/react";
import { useRouter } from"next/navigation";
import { PlayCircle, CheckCircle, AlertTriangle, Activity, BarChart2, ShieldX } from"lucide-react";
import { apiFetch } from"@/lib/api";

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ||"").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);

export default function EvalsDashboard() {
 const { data: session, status } = useSession();
 const router = useRouter();
 const [isRunning, setIsRunning] = useState(false);
 const [results, setResults] = useState<any>(null);
 const [error, setError] = useState("");

 // Auth gate - redirect unauthenticated users
 if (status ==="unauthenticated") {
 if (typeof window !=="undefined") router.push("/auth/signin?callbackUrl=/evals");
 return null;
 }

 // Admin gate - only allow admin emails (or all in dev when no admins configured)
 const userEmail = session?.user?.email?.toLowerCase() ||"";
 const isAdmin = ADMIN_EMAILS.length === 0 || ADMIN_EMAILS.includes(userEmail);

 if (status ==="authenticated" && !isAdmin) {
 return (
 <div className="min-h-screen bg-muted pt-24 pb-12 flex items-center justify-center">
 <div className="text-center max-w-md">
 <ShieldX className="w-16 h-16 text-red-400 mx-auto mb-6"/>
 <h1 className="text-2xl font-display font-bold text-foreground mb-3">Access Denied</h1>
 <p className="text-muted-foreground mb-6">This dashboard is restricted to administrators. Your account ({userEmail}) does not have access.</p>
 <button onClick={() => router.push("/")} className="px-6 py-3 bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors">
 Back to Home
 </button>
 </div>
 </div>
 );
 }

 if (status ==="loading") {
 return (
 <div className="min-h-screen bg-muted pt-24 pb-12 flex items-center justify-center">
 <div className="w-8 h-8 border-2 border-border border-t-slate-900 rounded-full animate-spin"/>
 </div>
 );
 }

 const runEvaluations = async () => {
 setIsRunning(true);
 setError("");
 setResults(null);
 
 try {
 const data = await apiFetch<{ data: any }>(`/api/eval/run`, {
 method:"POST",
 noRetry: true,
 });

 setResults(data.data);
 } catch (err: any) {
 setError(err.message);
 } finally {
 setIsRunning(false);
 }
 };

 return (
 <div className="min-h-screen bg-muted pt-24 pb-12">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 
 {/* Header */}
 <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
 <div>
 <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">CTO Dashboard: LLM Judge</h1>
 <p className="mt-2 text-muted-foreground max-w-2xl">
 Internal tool for automated regression testing. The LLM Judge evaluates the performance of the Consultant, Interviewer, and Writer agents against synthetic user profiles.
 </p>
 </div>
 
 <div className="mt-6 md:mt-0 flex flex-col items-end">
 <button
 onClick={runEvaluations}
 disabled={isRunning}
 className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-colors ${isRunning ? 'opacity-70 cursor-not-allowed' : ''}`}
 >
 {isRunning ? (
 <>
 <div className="w-5 h-5 border-2 border-slate-400 border-t-white rounded-full animate-spin mr-3"></div>
 Running Pipeline...
 </>
 ) : (
 <>
 <PlayCircle className="h-5 w-5 mr-3"/>
 Run Full Evaluation
 </>
 )}
 </button>
 <p className="mt-2 text-xs text-muted-foreground font-mono">POST /api/eval/run</p>
 </div>
 </div>

 {/* Error State */}
 {error && (
 <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8">
 <div className="flex">
 <div className="flex-shrink-0">
 <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true"/>
 </div>
 <div className="ml-3">
 <p className="text-sm text-red-700">{error}</p>
 </div>
 </div>
 </div>
 )}

 {/* Results Area */}
 {results && (
 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
 
 {/* Global Stats Scorecards */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="bg-card p-6 rounded-lg border border-border">
 <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center"><Activity className="w-4 h-4 mr-2"/> Profiles Tested</div>
 <div className="text-3xl font-bold font-mono text-foreground">{results.profiles_tested}</div>
 </div>
 <div className="bg-card p-6 rounded-lg border border-border relative overflow-hidden">
 <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500"></div>
 <div className="text-sm font-medium text-muted-foreground mb-1">Consultant Avg Score</div>
 <div className="flex items-baseline">
 <div className="text-3xl font-bold font-mono text-foreground">{results.averages.consultant}</div>
 <div className="ml-2 text-sm text-muted-foreground">/ 5</div>
 </div>
 </div>
 <div className="bg-card p-6 rounded-lg border border-border relative overflow-hidden">
 <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500"></div>
 <div className="text-sm font-medium text-muted-foreground mb-1">Interviewer Avg Score</div>
 <div className="flex items-baseline">
 <div className="text-3xl font-bold font-mono text-foreground">{results.averages.interviewer}</div>
 <div className="ml-2 text-sm text-muted-foreground">/ 5</div>
 </div>
 </div>
 <div className="bg-card p-6 rounded-lg border border-border relative overflow-hidden">
 <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500"></div>
 <div className="text-sm font-medium text-muted-foreground mb-1">Writer Avg Score</div>
 <div className="flex items-baseline">
 <div className="text-3xl font-bold font-mono text-foreground">{results.averages.writer}</div>
 <div className="ml-2 text-sm text-muted-foreground">/ 5</div>
 </div>
 </div>
 </div>

 {/* Detailed Logs per Profile */}
 <h2 className="text-xl font-bold font-display text-foreground flex items-center"><BarChart2 className="w-5 h-5 mr-2"/> Output Feedback Logs</h2>
 <div className="space-y-6">
 {results.logs.map((log: any, idx: number) => (
 <div key={idx} className="bg-card rounded-lg border border-border overflow-hidden">
 <div className="bg-muted border-b border-border px-6 py-4 flex items-center justify-between">
 <h3 className="text-lg font-medium text-foreground font-mono">TestCase: {log.profile_id}</h3>
 <CheckCircle className="w-5 h-5 text-emerald-500"/>
 </div>
 
 <div className="p-6">
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 
 {/* Consultant Score */}
 <div className="p-4 rounded-lg bg-muted border border-slate-100">
 <div className="uppercase tracking-wider text-xs font-bold text-muted-foreground mb-3">Consultant Agent</div>
 <div className="flex items-center mb-3">
 <span className="text-2xl font-bold font-mono text-foreground">{log.scores.consultant?.score}</span>
 <span className="text-sm text-muted-foreground ml-1">/ 5</span>
 </div>
 <p className="text-sm text-muted-foreground leading-relaxed italic border-l-2 border-border pl-3">
"{log.scores.consultant?.reasoning}"
 </p>
 </div>

 {/* Interviewer Score */}
 <div className="p-4 rounded-lg bg-muted border border-slate-100">
 <div className="uppercase tracking-wider text-xs font-bold text-muted-foreground mb-3">Interviewer Agent</div>
 <div className="flex items-center mb-3">
 <span className="text-2xl font-bold font-mono text-foreground">{log.scores.interviewer?.score}</span>
 <span className="text-sm text-muted-foreground ml-1">/ 5</span>
 </div>
 <p className="text-sm text-muted-foreground leading-relaxed italic border-l-2 border-border pl-3">
"{log.scores.interviewer?.reasoning}"
 </p>
 </div>

 {/* Writer Score */}
 <div className="p-4 rounded-lg bg-muted border border-slate-100">
 <div className="uppercase tracking-wider text-xs font-bold text-muted-foreground mb-3">Writer Agent</div>
 <div className="flex items-center mb-3">
 <span className="text-2xl font-bold font-mono text-foreground">{log.scores.writer?.score}</span>
 <span className="text-sm text-muted-foreground ml-1">/ 5</span>
 </div>
 <p className="text-sm text-muted-foreground leading-relaxed italic border-l-2 border-border pl-3">
"{log.scores.writer?.reasoning}"
 </p>
 </div>

 </div>
 </div>
 </div>
 ))}
 </div>

 </div>
 )}

 </div>
 </div>
 );
}
