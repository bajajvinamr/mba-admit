"use client";

import { useState } from"react";
import { motion } from"framer-motion";
import {
 ArrowRight, ArrowLeftRight, GraduationCap, TrendingUp,
 Info, CheckCircle2,
} from"lucide-react";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import { EmailCapture } from"@/components/EmailCapture";

type ConvertResult = {
 input_test: string;
 input_score: number;
 converted_test: string;
 converted_score: number;
 percentile_estimate: number;
 note: string;
};

export default function ScoreConvertPage() {
 const [score, setScore] = useState<number | undefined>();
 const [fromTest, setFromTest] = useState<"gmat"|"gre">("gmat");
 const [result, setResult] = useState<ConvertResult | null>(null);
 const [loading, setLoading] = useState(false);

 const convert = async () => {
 if (!score) return;
 setLoading(true);
 try {
 const res = await apiFetch<ConvertResult>(
 `/api/score-convert?score=${score}&from_test=${fromTest}`
 );
 setResult(res);
 } catch {
 setResult(null);
 } finally {
 setLoading(false);
 }
 };

 const swap = () => {
 setFromTest((p) => (p ==="gmat" ?"gre":"gmat"));
 setResult(null);
 setScore(undefined);
 };

 const placeholder = fromTest ==="gmat" ?"740":"330";
 const range = fromTest ==="gmat" ?"200–800":"260–340";

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-3xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 GMAT ↔ GRE Score Converter
 </h1>
 <p className="text-white/70 text-lg">
 Official concordance table - see your equivalent score instantly.
 </p>
 </div>
 </section>

 <div className="max-w-md mx-auto px-6 py-10">
 <div className="editorial-card p-8">
 {/* Test selector */}
 <div className="flex items-center justify-center gap-4 mb-8">
 <div className={`text-center ${fromTest ==="gmat" ?"text-foreground":"text-foreground/30"}`}>
 <p className="text-2xl font-bold">GMAT</p>
 <p className="text-xs">{fromTest ==="gmat" ?"Your score":"Converted"}</p>
 </div>
 <button onClick={swap} className="p-3 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
 <ArrowLeftRight size={20} />
 </button>
 <div className={`text-center ${fromTest ==="gre" ?"text-foreground":"text-foreground/30"}`}>
 <p className="text-2xl font-bold">GRE</p>
 <p className="text-xs">{fromTest ==="gre" ?"Your score":"Converted"}</p>
 </div>
 </div>

 {/* Input */}
 <div className="mb-6">
 <label className="text-xs font-medium text-foreground/40 block mb-2">
 Enter your {fromTest.toUpperCase()} score ({range})
 </label>
 <input
 type="number"
 placeholder={placeholder}
 value={score ??""}
 onChange={(e) => setScore(e.target.value ? +e.target.value : undefined)}
 onKeyDown={(e) => e.key ==="Enter" && convert()}
 className="w-full px-4 py-4 text-3xl text-center font-bold border border-border/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
 />
 </div>

 <button onClick={convert} disabled={!score || loading}
 className="w-full py-3 bg-primary text-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-40 transition-all">
 {loading ?"Converting...":"Convert"}
 </button>
 </div>

 {/* Result */}
 {result && (
 <motion.div
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 className="editorial-card p-8 mt-6 text-center"
 >
 <p className="text-sm text-foreground/40 mb-2">Equivalent {result.converted_test.toUpperCase()} Score</p>
 <p className="text-6xl font-bold text-foreground heading-serif font-[family-name:var(--font-heading)]">
 {result.converted_score}
 </p>
 <div className="mt-4 flex items-center justify-center gap-4 text-sm">
 <span className="flex items-center gap-1 text-emerald-600">
 <TrendingUp size={14} /> {result.percentile_estimate}th percentile
 </span>
 </div>
 <p className="text-[10px] text-foreground/30 mt-4 flex items-center justify-center gap-1">
 <Info size={10} /> {result.note}
 </p>
 </motion.div>
 )}

 {/* Info section */}
 <div className="mt-8 editorial-card p-6 text-xs text-foreground/50 space-y-3">
 <h3 className="font-semibold text-foreground text-sm">About This Tool</h3>
 <p>Based on the official ETS/GMAC concordance table used by admissions committees to compare GMAT and GRE scores.</p>
 <p>Most top MBA programs accept both tests equally. However, some programs may have a slight preference - check each school's policy.</p>
 <div className="flex gap-4 pt-2">
 <a href="/schools" className="text-primary hover:text-primary/80 flex items-center gap-1">
 School Directory <ArrowRight size={10} />
 </a>
 <a href="/fit-score" className="text-primary hover:text-primary/80 flex items-center gap-1">
 Check Fit Score <ArrowRight size={10} />
 </a>
 </div>
 </div>

 <EmailCapture variant="contextual"source="score-convert"/>
 <ToolCrossLinks current="/score-convert"/>
 </div>
 </main>
 );
}
