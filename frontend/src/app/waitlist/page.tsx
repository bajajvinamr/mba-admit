"use client";

import { useState, useEffect } from"react";
import { motion, AnimatePresence } from"framer-motion";
import { Hourglass, FileText, ListChecks, ArrowRight, Copy, Check, RefreshCcw, Landmark, Sparkles, MessageSquare } from"lucide-react";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import { useAbortSignal } from"@/hooks/useAbortSignal";
import { useUsage } from"@/hooks/useUsage";
import { UsageGate } from"@/components/UsageGate";

type School = { id: string; name: string };

export default function WaitlistPage() {
 const abortSignal = useAbortSignal();
 const usage = useUsage("waitlist_strategy");
 const [schools, setSchools] = useState<School[]>([]);
 const [selectedSchoolId, setSelectedSchoolId] = useState("");
 const [updates, setUpdates] = useState("");
 const [themes, setThemes] = useState("");
 const [loading, setLoading] = useState(false);
 const [result, setResult] = useState<any>(null);
 const [copied, setCopied] = useState(false);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 apiFetch<School[]>(`/api/schools/names`)
 .then(data => setSchools(data))
 .catch(console.error);
 }, []);

 const handleGenerate = async () => {
 if (!selectedSchoolId || !updates) {
 setError("Please select a school and provide profile updates.");
 return;
 }
 setError(null);
 setLoading(true);
 setResult(null);
 try {
 const data = await apiFetch(`/api/waitlist_strategy`, {
 method:"POST",
 body: JSON.stringify({
 school_id: selectedSchoolId,
 profile_updates: updates,
 previous_essay_themes: themes,
 }),
 noRetry: true,
 timeoutMs: 60_000,
 signal: abortSignal,
 });
 setResult(data);
 usage.recordUse();
 } catch (e) {
 console.error(e);
 setError("Failed to generate waitlist strategy. Please try again.");
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="min-h-screen bg-background py-20 px-8">
 <div className="max-w-5xl mx-auto">
 
 {/* Header */}
 <div className="mb-16 text-center">
 <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 font-bold uppercase tracking-widest text-[10px] mb-6 rounded-full border border-yellow-200">
 <Hourglass size={12} /> Roadmap v6: Waitlist Management
 </div>
 <h1 className="heading-serif text-5xl md:text-6xl text-foreground mb-6">Escape the Waitlist Purgatory</h1>
 <p className="text-muted-foreground/60 text-lg max-w-2xl mx-auto">
 Getting waitlisted is a"maybe,"not a"no."Convert it to a"yes"with a school-specific Letter of Enthusiastic Support and a tactical update plan.
 </p>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
 
 {/* Inputs */}
 <div className="lg:col-span-2 space-y-6">
 <section className="bg-card p-8 border border-border/5 rounded-2xl">
 <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-8 flex items-center gap-2">
 <span className="w-5 h-5 rounded-full bg-foreground text-white flex items-center justify-center text-[10px]">1</span>
 Your Status Update
 </h3>

 <div className="space-y-6">
 <div>
 <label className="block text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold mb-2">Waitlisted School</label>
 <select 
 value={selectedSchoolId}
 onChange={e => setSelectedSchoolId(e.target.value)}
 className="w-full bg-background border border-border/5 px-4 py-3 text-sm focus:border-border focus:outline-none rounded-lg"
 >
 <option value="">Select school...</option>
 {schools.slice(0, 100).map(s => (
 <option key={s.id} value={s.id}>{s.name}</option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold mb-2">Key Profile Updates (Bullet points)</label>
 <textarea 
 value={updates}
 onChange={e => setUpdates(e.target.value)}
 placeholder="e.g. Promoted to Senior Associate, GMAT increased by 20 points, led a new CSR initiative."
 className="w-full bg-background border border-border/5 p-4 text-sm focus:border-border focus:outline-none rounded-lg h-32 resize-none leading-relaxed"
 />
 </div>

 <div>
 <label className="block text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold mb-2">Previous Essay Themes (Optional)</label>
 <textarea 
 value={themes}
 onChange={e => setThemes(e.target.value)}
 placeholder="What did you focus on in your original app? (e.g. Innovation, Resilience)"
 className="w-full bg-background border border-border/5 p-4 text-sm focus:border-border focus:outline-none rounded-lg h-24 resize-none leading-relaxed"
 />
 </div>

 {error && (
 <div className="bg-red-50 border border-red-200 text-red-800 p-4 text-sm rounded-lg">
 {error}
 </div>
 )}

 <button
 onClick={handleGenerate}
 disabled={loading || !selectedSchoolId || !updates}
 className="w-full bg-foreground text-white font-bold uppercase tracking-widest py-5 rounded-lg flex items-center justify-center gap-3 mt-4 hover:bg-foreground/90 transition-all disabled:opacity-50"
 >
 {loading ? (
 <span className="flex flex-col items-center">
 <span className="flex items-center gap-2">Drafting Strategy <RefreshCcw className="animate-spin"size={18} /></span>
 <span className="text-xs text-white/40 mt-1 normal-case tracking-normal font-normal">This usually takes 5-10 seconds</span>
 </span>
 ) : (
 <>Generate LOCI Draft <Sparkles size={18} className="text-primary"/></>
 )}
 </button>
 </div>
 </section>

 <div className="bg-foreground p-6 rounded-2xl text-white">
 <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-3 text-primary">
 <Landmark size={14} /> The Golden Rule
 </h4>
 <p className="text-xs text-white/50 leading-relaxed italic">
"Do not bombard the Adcom. One high-quality update letter 4-6 weeks after the decision is exponentially more effective than weekly 'checking in' emails."
 </p>
 </div>
 </div>

 {/* Results */}
 <div className="lg:col-span-3">
 <AnimatePresence mode="wait">
 {!result ? (
 <motion.div 
 key="empty"
 className="bg-card border-2 border-dashed border-border/10 h-full rounded-2xl flex flex-col items-center justify-center p-12 text-center"
 >
 <FileText size={40} className="text-muted-foreground/10 mb-4"/>
 <p className="text-muted-foreground/30 text-sm font-bold uppercase tracking-widest">Strategy Workspace</p>
 </motion.div>
 ) : (
 <UsageGate feature="waitlist_strategy">
 <motion.div
 key="result"
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 className="space-y-8"
 >
 {/* Analysis Card */}
 <div className="bg-card border border-border/5 p-8 rounded-2xl">
 <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-4 flex items-center gap-2">
 <MessageSquare size={14} /> Waitlist Reality Check
 </h4>
 <p className="text-foreground font-medium leading-relaxed">
"{result.analysis}"
 </p>
 </div>

 {/* Letter Preview */}
 <div className="bg-card border-2 border-border p-10 rounded-2xl shadow-sm relative">
 <div className="flex justify-between items-center mb-6">
 <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Letter of Enthusiastic Support (LOCI)</h4>
 <button 
 onClick={() => { navigator.clipboard.writeText(result.update_letter); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
 className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-foreground flex items-center gap-2 transition-colors"
 >
 {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy Draft</>}
 </button>
 </div>
 <div className="bg-background/30 p-8 rounded-lg border border-border/5 font-display text-sm text-foreground leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto italic">
 {result.update_letter}
 </div>
 </div>

 {/* Tactical Plan */}
 <div className="bg-card border border-border/5 p-8 rounded-2xl">
 <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-6 flex items-center gap-2">
 <ListChecks size={16} /> 30-Day Tactical Plan
 </h4>
 <div className="space-y-4">
 {result.tactical_plan.map((step: string, i: number) => (
 <div key={i} className="flex gap-4 items-start p-4 hover:bg-background transition-colors rounded-lg border border-transparent hover:border-border/5">
 <div className="w-6 h-6 rounded-full bg-foreground text-white flex items-center justify-center text-[10px] font-bold shrink-0">
 {i + 1}
 </div>
 <p className="text-sm text-foreground font-medium">{step}</p>
 </div>
 ))}
 </div>
 </div>

 <div className="text-center">
 <button onClick={() => { setResult(null); setSelectedSchoolId(""); setUpdates(""); setThemes(""); setError(null); }} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 hover:text-foreground flex items-center gap-2 mx-auto">
 <RefreshCcw size={12} /> Start Over
 </button>
 </div>
 </motion.div>
 </UsageGate>
 )}
 </AnimatePresence>
 </div>

 </div>

 <ToolCrossLinks current="/waitlist"/>
 </div>
 </div>
 );
}
