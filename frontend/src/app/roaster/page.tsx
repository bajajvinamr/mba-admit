"use client";

import { useState } from"react";
import { motion, AnimatePresence } from"framer-motion";
import { Flame, ArrowRight, ShieldAlert, Share2, RefreshCw, CheckCircle2 } from"lucide-react";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import Link from"next/link";
import { apiFetch } from"@/lib/api";
import { useAbortSignal } from"@/hooks/useAbortSignal";
import { resumeRoastSchema } from"@/lib/schemas";
import { useUsage } from"@/hooks/useUsage";
import { UsageGate } from"@/components/UsageGate";
import { EmailCapture } from"@/components/EmailCapture";

type RoastResult = {
 score: number;
 roast: string;
 improvement: string;
};

export default function RoasterPage() {
 const abortSignal = useAbortSignal();
 const usage = useUsage("resume_roaster");
 const [bullet, setBullet] = useState("");
 const [loading, setLoading] = useState(false);
 const [result, setResult] = useState<RoastResult | null>(null);
 const [error, setError] = useState("");
 const [copied, setCopied] = useState(false);

 const handleRoast = async (e: React.FormEvent) => {
 e.preventDefault();

 // Zod validation at form boundary
 const parsed = resumeRoastSchema.safeParse({ bullet });
 if (!parsed.success) {
 setError(parsed.error.issues[0].message);
 return;
 }

 setLoading(true);
 setError("");
 setResult(null);

 try {
 const data = await apiFetch<RoastResult>(`/api/roast_resume`, {
 method:"POST",
 body: JSON.stringify(parsed.data),
 noRetry: true,
 timeoutMs: 60_000,
 signal: abortSignal,
 });
 setResult(data);
 usage.recordUse();
 } catch (err: any) {
 setError(err.message ||"Something went wrong.");
 } finally {
 setLoading(false);
 }
 };

 const getScoreColor = (score: number) => {
 if (score <= 3) return "text-red-600";
 if (score <= 6) return "text-amber-500";
 return "text-emerald-500";
 };

 return (
 <>
 <UsageGate feature="resume_roaster">
 <div className="bg-foreground min-h-screen text-white selection:bg-primary selection:text-foreground">
 {/* ── Hero ──────────────────────────────────────────────────────── */}
 <section className="pt-32 pb-16 px-8 relative overflow-hidden flex flex-col items-center">
 <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900 via-transparent to-transparent pointer-events-none"></div>
 
 <div className="inline-flex items-center gap-2 bg-red-950/50 text-red-400 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-red-900/50 mb-8">
 <Flame size={14} className="animate-pulse"/> 
 The HBS Resume Roaster
 </div>
 
 <h1 className="heading-serif text-5xl md:text-7xl text-center mb-6 max-w-4xl tracking-tight">
 Is your resume actually elite? <br />
 <span className="text-white/30 italic">Let's find out.</span>
 </h1>
 
 <p className="text-lg text-white/50 text-center max-w-2xl font-light mb-12">
 Paste a single bullet point from your resume. Our AI, trained on the harshest M7 admissions directors, will aggressively roast your corporate fluff and rewrite it properly.
 </p>

 {/* ── Input Form ──────────────────────────────────────────────── */}
 <div className="w-full max-w-3xl relative z-10">
 <form onSubmit={handleRoast} className="relative">
 <textarea
 id="roast-bullet"
 aria-label="Resume bullet point to roast"
 required
 value={bullet}
 onChange={(e) => setBullet(e.target.value)}
 placeholder="e.g., 'Managed a team of 5 to synergize cross-functional deliverables, resulting in improved operational efficiency across the Q3 pipeline.'"
 className="w-full h-40 bg-card/5 border-2 border-border p-6 text-lg text-white placeholder-white/30 focus:outline-none focus:border-primary transition-colors resize-none font-light leading-relaxed rounded-lg"
 />
 
 <button
 type="submit"
 disabled={loading || !bullet.trim()}
 className="absolute bottom-4 right-4 bg-primary text-foreground px-6 py-3 font-bold hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
 >
 {loading ? (
 <>
 <RefreshCw className="animate-spin"size={18} /> Roasting...
 </>
 ) : (
 <>
 Roast Me <Flame size={18} />
 </>
 )}
 </button>
 </form>
 {error && (
 <div role="alert" className="mt-4 p-4 bg-red-950/50 border border-red-900 text-red-400 text-sm flex items-center gap-2">
 <ShieldAlert size={16} /> {error}
 </div>
 )}
 </div>
 </section>

 {/* ── Empty State ─────────────────────────────────────────────── */}
 {!result && !loading && !error && (
 <div className="max-w-3xl mx-auto px-8 pb-16 text-center">
 <Flame size={40} className="mx-auto mb-4 text-white/20"/>
 <p className="text-white/30 text-lg">Paste your resume above and click Roast to get AI feedback.</p>
 </div>
 )}

 {/* ── Results Display ───────────────────────────────────────────── */}
 <AnimatePresence>
 {result && (
 <motion.section
 initial={{ opacity: 0, y: 40 }}
 animate={{ opacity: 1, y: 0 }}
 className="max-w-4xl mx-auto px-8 pb-32"
 >
 <div className="bg-card text-foreground p-1 md:p-3 relative">
 <div className="border border-border/10 p-8 md:p-12">
 
 {/* Score Header */}
 <div className="flex flex-col md:flex-row items-baseline gap-6 mb-10 pb-10 border-b border-border/10">
 <div className="shrink-0 text-center md:text-left">
 <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/50 font-bold mb-2">Adcom Score</p>
 <p className={`heading-serif text-8xl md:text-9xl leading-none tracking-tighter ${getScoreColor(result.score)}`}>
 {result.score}<span className="text-4xl text-foreground/20 font-sans">/10</span>
 </p>
 </div>
 <div className="flex-1">
 <p className="text-xs uppercase tracking-[0.2em] text-red-600 font-bold mb-3 flex items-center gap-2">
 <Flame size={14} /> The Roast
 </p>
 <p className="font-display text-xl md:text-2xl leading-relaxed text-foreground">
 &ldquo;{result.roast}&rdquo;
 </p>
 </div>
 </div>

 {/* Rewrite */}
 <div>
 <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 font-bold mb-3 flex items-center gap-2">
 <CheckCircle2 size={14} /> The M7 Rewrite
 </p>
 <div className="bg-emerald-50 border border-emerald-100 p-6">
 <p className="text-lg font-medium text-emerald-950 leading-relaxed">
 {result.improvement}
 </p>
 </div>
 <div className="flex items-center justify-between mt-3">
 <p className="text-xs text-muted-foreground/50 font-medium">Notice the difference? Action verb + specific context + quantified business impact.</p>
 <button
 onClick={() => { navigator.clipboard.writeText(result.improvement); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
 className="text-xs font-bold px-4 py-2 bg-emerald-700 text-white hover:bg-emerald-800 transition-colors flex items-center gap-2 shrink-0 ml-4"
 >
 {copied ? <><CheckCircle2 size={14} /> Copied!</> :"Copy Rewrite"}
 </button>
 </div>
 </div>

 {/* Viral CTA */}
 <div className="mt-12 pt-8 border-t border-border/10 flex flex-col md:flex-row items-center justify-between gap-6">
 <div className="flex gap-3">
 <a
 href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Just got my resume absolutely roasted by Admit Compass AI. Scored a ${result.score}/10. Try it if you dare: https://admitcompass.ai/roaster`)}`}
 target="_blank"
 rel="noopener noreferrer"
 className="text-xs font-bold px-4 py-2 bg-foreground text-white hover:bg-foreground/80 transition-colors flex items-center gap-2"
 >
 <Share2 size={14} /> Share on X
 </a>
 </div>
 <div className="text-center md:text-right">
 <p className="text-sm font-bold text-foreground mb-1">Tired of getting roasted?</p>
 <Link href="/#consult" className="text-sm text-primary-dark hover:underline flex items-center gap-1 justify-center md:justify-end">
 Let our mentors rewrite your whole resume <ArrowRight size={14} />
 </Link>
 </div>
 </div>

 </div>
 </div>
 </motion.section>
 )}
 </AnimatePresence>
 </div>
 </UsageGate>

 <div className="max-w-4xl mx-auto px-6 pb-8">
 <EmailCapture variant="contextual"source="roaster"/>
 <ToolCrossLinks current="/roaster"/>
 </div>
 </>
 );
}
