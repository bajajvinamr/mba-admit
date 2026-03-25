"use client";

import { useState, useEffect } from"react";
import { motion } from"framer-motion";
import { FileText, AlertTriangle, Zap, CheckCircle2, RefreshCcw, Flame } from"lucide-react";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import Link from"next/link";
import { apiFetch } from"@/lib/api";
import { track } from"@/lib/analytics";
import { useAbortSignal } from"@/hooks/useAbortSignal";
import { essayEvaluationSchema } from"@/lib/schemas";
import { useDebounce } from"@/hooks/useDebounce";
import { useUsage } from"@/hooks/useUsage";
import { UsageGate } from"@/components/UsageGate";
import { EmailCapture } from"@/components/EmailCapture";

type School = { id: string; name: string; essay_prompts?: string[] };

export default function EvaluatorPage() {
 const abortSignal = useAbortSignal();
 const usage = useUsage("essay_evaluator");
 const [essayText, setEssayText] = useState("");
 const [schools, setSchools] = useState<School[]>([]);
 const [selectedSchoolId, setSelectedSchoolId] = useState("");
 const [selectedPrompt, setSelectedPrompt] = useState("");
 const [loading, setLoading] = useState(false);
 const [result, setResult] = useState<any>(null);
 const [error, setError] = useState<string | null>(null);

 const debouncedEssay = useDebounce(essayText, 1000);

 // Restore draft or last evaluation from sessionStorage on mount
 useEffect(() => {
 const saved = sessionStorage.getItem("mba_evaluator_result");
 if (saved) {
 try {
 const d = JSON.parse(saved);
 setResult(d.result);
 setEssayText(d.essay ||"");
 if (d.school) setSelectedSchoolId(d.school);
 if (d.prompt) setSelectedPrompt(d.prompt);
 } catch {}
 } else {
 // Restore unsaved draft
 const draft = sessionStorage.getItem("mba_evaluator_draft");
 if (draft) setEssayText(draft);
 }
 }, []);

 // Auto-save draft as user types (debounced to avoid thrashing)
 useEffect(() => {
 if (debouncedEssay) {
 sessionStorage.setItem("mba_evaluator_draft", debouncedEssay);
 }
 }, [debouncedEssay]);

 useEffect(() => {
 apiFetch<School[]>(`/api/schools/names`)
 .then(data => setSchools(data))
 .catch(console.error);
 }, []);

 const selectedSchool = schools.find(s => s.id === selectedSchoolId);
 const prompts = selectedSchool?.essay_prompts || ["General Personal Statement"];

 const handleEvaluate = async (e: React.FormEvent) => {
 e.preventDefault();

 // Zod validation at the form boundary
 const payload = {
 school_id: selectedSchoolId ||"general",
 prompt: selectedPrompt ||"General MBA Personal Statement",
 essay_text: essayText,
 };
 const parsed = essayEvaluationSchema.safeParse(payload);
 if (!parsed.success) {
 setError(parsed.error.issues.map(i => i.message).join("."));
 return;
 }

 setError(null);
 setLoading(true);
 setResult(null);

 try {
 const data = await apiFetch(`/api/evaluate_essay`, {
 method:"POST",
 body: JSON.stringify(parsed.data),
 noRetry: true,
 timeoutMs: 60_000,
 signal: abortSignal,
 });
 setResult(data);
 usage.recordUse();
 track("essay_evaluated", {
 school: selectedSchoolId ||"none",
 word_count: essayText.trim().split(/\s+/).length,
 has_prompt: !!selectedPrompt,
 overall_score: ((data as Record<string, unknown>)?.overall_score as number) ?? null,
 });
 sessionStorage.setItem("mba_evaluator_result", JSON.stringify({ essay: essayText, school: selectedSchoolId, prompt: selectedPrompt, result: data }));
 } catch (e) {
 console.error(e);
 setError("Failed to evaluate. Ensure the backend is running.");
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="min-h-screen bg-background py-20 px-8">
 <div className="max-w-4xl mx-auto">

 <div className="text-center mb-16">
 <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 font-bold uppercase tracking-widest text-[10px] mb-6">
 <AlertTriangle size={12} /> The Adcom B.S. Detector
 </div>
 <h1 className="heading-serif text-5xl md:text-6xl text-foreground mb-6">Will Your Essay Survive Committee?</h1>
 <p className="text-muted-foreground/60 text-lg max-w-2xl mx-auto">
 Paste your draft below. Our strict M7 AI Evaluator will scan it for AI fluff, corporate jargon, and generic clichés that trigger automatic rejections.
 </p>
 </div>

 <UsageGate feature="essay_evaluator">

 {error && (
 <div role="alert" className="bg-red-50 border border-red-200 text-red-800 p-4 text-sm mb-6 flex items-center justify-between">
 <span>{error}</span>
 <button onClick={() => setError(null)} className="ml-3 text-sm font-bold underline">
 Dismiss
 </button>
 </div>
 )}

 {!result && (
 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border/10 p-8">
 <form onSubmit={handleEvaluate}>
 
 {/* Optional Context */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
 <div>
 <label htmlFor="eval-school" className="block text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold mb-2">Target Program (Optional)</label>
 <select
 id="eval-school"
 value={selectedSchoolId}
 onChange={e => { setSelectedSchoolId(e.target.value); setSelectedPrompt(""); }}
 className="w-full border border-border/10 px-4 py-3 text-sm focus:border-border focus:outline-none bg-background"
 >
 <option value="">General Analysis</option>
 {schools.slice(0, 100).map(s => (
 <option key={s.id} value={s.id}>{s.name}</option>
 ))}
 </select>
 </div>
 <div>
 <label htmlFor="eval-prompt" className="block text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold mb-2">Prompt</label>
 <select
 id="eval-prompt"
 value={selectedPrompt}
 onChange={e => setSelectedPrompt(e.target.value)}
 disabled={!selectedSchoolId}
 className="w-full border border-border/10 px-4 py-3 text-sm focus:border-border focus:outline-none bg-background disabled:opacity-50"
 >
 {!selectedSchoolId && <option>Select a school first</option>}
 {selectedSchoolId && prompts.map((p, i) => {
 const text = typeof p ==="string" ? p : (p as Record<string, unknown>)?.prompt ? String((p as Record<string, unknown>).prompt) : String(p);
 return <option key={i} value={text}>{text.length > 50 ? text.substring(0, 50) +"...": text}</option>;
 })}
 </select>
 </div>
 </div>

 {/* Essay Input */}
 <div className="mb-6">
 <label className="block text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold mb-2 flex justify-between">
 <span>Your Draft</span>
 <span className={
 essayText.split(/\s+/).filter(Boolean).length > 800 ?"text-red-500":
 essayText.split(/\s+/).filter(Boolean).length > 500 ?"text-amber-500":
"text-muted-foreground/40"
 }>
 {essayText.split(/\s+/).filter(Boolean).length} Words
 {essayText.split(/\s+/).filter(Boolean).length > 800 &&"(long)"}
 </span>
 </label>
 <textarea
 value={essayText}
 onChange={e => setEssayText(e.target.value)}
 placeholder="Paste your essay draft here... Don't worry, we don't save or train on your data."
 className="w-full h-64 border border-border/10 p-4 focus:border-border focus:outline-none resize-y text-foreground font-display leading-relaxed"
 disabled={loading}
 required
 />
 </div>

 <button 
 type="submit"
 disabled={loading || !essayText.trim()}
 className="w-full bg-foreground text-white font-bold uppercase tracking-widest py-5 hover:bg-foreground/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
 >
 {loading ? (
 <span className="flex flex-col items-center">
 <span className="flex items-center gap-2">Scanning for fluff <RefreshCcw className="animate-spin"size={16} /></span>
 <span className="text-xs text-white/40 mt-1 normal-case tracking-normal font-normal">This usually takes 5-10 seconds</span>
 </span>
 ) : (
 <>Run B.S. Scan <Zap size={16} /></>
 )}
 </button>
 </form>
 </motion.div>
 )}

 {/* Results View */}
 {result && (
 <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border-2 border-border p-8 md:p-12 shadow-md relative overflow-hidden">
 
 {/* Massive Score Graphic */}
 <div className="absolute -top-10 -right-10 w-48 h-48 bg-background rounded-full border border-border/5 flex items-center justify-center -z-0">
 <span className="text-8xl font-black text-foreground/5 tracking-tighter">
 {result.score}
 </span>
 </div>

 <button onClick={() => setResult(null)} className="mb-8 text-xs uppercase tracking-widest text-muted-foreground/40 hover:text-foreground flex items-center gap-2">
 <RefreshCcw size={14} /> Scan Another Draft
 </button>

 <div className="relative z-10 mb-12 flex flex-col md:flex-row gap-8 items-start">
 <div className="flex-1">
 <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground/40 mb-2">Adcom Verdict</h2>
 <div className="text-5xl heading-serif font-bold text-foreground mb-2">
 Score: {result.score}<span className="text-xl text-muted-foreground/30">/100</span>
 </div>
 {result.score >= 80 ? (
 <p className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
 <CheckCircle2 size={14} /> Strong Narrative
 </p>
 ) : result.score >= 60 ? (
 <p className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold uppercase tracking-wider">
 <AlertTriangle size={14} /> Needs Humanization
 </p>
 ) : (
 <p className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 text-xs font-bold uppercase tracking-wider">
 <AlertTriangle size={14} /> Highly Generic / AI
 </p>
 )}
 </div>
 
 <div className="bg-red-50 p-6 border border-red-100 flex-1">
 <h3 className="text-xs font-bold uppercase tracking-widest text-red-800 mb-2 flex items-center gap-2">
 <AlertTriangle size={14} /> Cliche Count
 </h3>
 <div className="text-4xl heading-serif font-bold text-red-900">{result.cliche_count}</div>
 <p className="text-xs text-red-700/80 mt-1">Buzzwords, AI structures, or generic"impact"framing detected.</p>
 </div>
 </div>

 <div className="mb-12">
 <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/40 mb-4">Brutal Feedback</h3>
 <div className="pl-6 border-l-4 border-border">
 <p className="text-xl font-display text-foreground/90 leading-relaxed italic">
"{result.harsh_feedback}"
 </p>
 </div>
 </div>

 <div className="mb-12">
 <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/40 mb-4">Required Improvements</h3>
 <ul className="space-y-3">
 {result.improvements.map((imp: string, index: number) => (
 <li key={index} className="flex gap-3 text-muted-foreground/80 items-start">
 <span className="text-primary font-bold mt-0.5">•</span>
 <span>{imp}</span>
 </li>
 ))}
 </ul>
 </div>

 {/* Journey connectors */}
 <div className="flex flex-wrap gap-3 mb-8">
 <Link href="/roaster" className="text-xs font-bold px-4 py-2 border border-border/10 hover:border-primary hover:text-primary transition-all flex items-center gap-2">
 <Flame size={14} /> Roast Your Resume Too
 </Link>
 <Link href="/interview" className="text-xs font-bold px-4 py-2 border border-border/10 hover:border-primary hover:text-primary transition-all flex items-center gap-2">
 <FileText size={14} /> Practice Mock Interview
 </Link>
 {selectedSchoolId && (
 <Link href={`/school/${selectedSchoolId}`} className="text-xs font-bold px-4 py-2 border border-border/10 hover:border-primary hover:text-primary transition-all flex items-center gap-2">
 <Zap size={14} /> Generate New Essay with AI
 </Link>
 )}
 </div>

 <div className="bg-foreground p-8 text-center text-white">
 <h3 className="heading-serif text-2xl mb-3">Don&apos;t risk an automated ding.</h3>
 <p className="text-white/70 mb-6 text-sm max-w-md mx-auto">
 Admissions committees read thousands of essays. If yours sounds like everyone else's, they stop reading. Let an M7 mentor completely rewrite your narrative.
 </p>
 <Link 
 href="/checkout"
 className="inline-block bg-primary text-foreground px-8 py-4 font-bold uppercase tracking-widest text-sm hover:scale-105 transition-transform"
 >
 Book Consult, ₹1,000
 </Link>
 </div>

 </motion.div>
 )}

 <EmailCapture variant="contextual"source="evaluator"/>

 </UsageGate>

 <ToolCrossLinks current="/evaluator"/>
 </div>
 </div>
 );
}
