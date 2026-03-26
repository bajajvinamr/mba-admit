"use client";

import { useState } from"react";
import { FileText, Zap, AlertTriangle, CheckCircle2, ArrowRight } from"lucide-react";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type CategoryScore = { score: number; found: string[]; suggested: string[] };
type KeywordResult = {
 overall_score: number;
 word_count: number;
 metrics_count: number;
 categories: Record<string, CategoryScore>;
 weak_verbs_found: string[];
 power_verb_suggestions: string[];
 tips: string[];
};

export default function ResumeKeywordsPage() {
 const [text, setText] = useState("");
 const [result, setResult] = useState<KeywordResult | null>(null);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const analyze = () => {
 if (!text.trim()) return;
 setLoading(true);
 setError(null);
 apiFetch<KeywordResult>("/api/resume/keywords", {
 method:"POST",
 headers: {"Content-Type":"application/json"},
 body: JSON.stringify({ resume_text: text }),
 })
 .then(setResult)
 .catch(() => setError("Failed to analyze resume. Please try again."))
 .finally(() => setLoading(false));
 };

 const scoreColor = (s: number) => s >= 70 ?"text-emerald-600": s >= 40 ?"text-amber-500":"text-red-500";
 const barColor = (s: number) => s >= 70 ?"bg-emerald-500": s >= 40 ?"bg-amber-400":"bg-red-400";

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-4xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Resume Keywords Optimizer
 </h1>
 <p className="text-white/70 text-lg">Analyze your resume for MBA-relevant keywords and power verbs.</p>
 </div>
 </section>

 <div className="max-w-4xl mx-auto px-6 py-10">
 <div className="editorial-card p-6 mb-8">
 <textarea value={text} onChange={(e) => setText(e.target.value)}
 placeholder="Paste your resume text here..."
 className="w-full h-48 px-4 py-3 border border-border/10 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
 />
 <div className="flex items-center justify-between mt-3">
 <span className="text-xs text-muted-foreground">{text.split(/\s+/).filter(Boolean).length} words</span>
 <button onClick={analyze} disabled={loading || !text.trim()}
 className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
 {loading ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"/> : <Zap size={14} />}
 Analyze
 </button>
 </div>
 </div>

 {error && (
 <div className="editorial-card p-4 mb-6 border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
 )}

 {result && (
 <div className="space-y-6">
 {/* Overall score */}
 <div className="grid grid-cols-3 gap-4">
 <div className="editorial-card p-5 text-center">
 <p className={`text-4xl font-bold ${scoreColor(result.overall_score)}`}>{result.overall_score}</p>
 <p className="text-xs text-muted-foreground mt-1">Keyword Score</p>
 </div>
 <div className="editorial-card p-5 text-center">
 <p className="text-4xl font-bold text-foreground">{result.metrics_count}</p>
 <p className="text-xs text-muted-foreground mt-1">Metrics Found</p>
 </div>
 <div className="editorial-card p-5 text-center">
 <p className={`text-4xl font-bold ${result.weak_verbs_found.length > 0 ?"text-red-500":"text-emerald-600"}`}>
 {result.weak_verbs_found.length}
 </p>
 <p className="text-xs text-muted-foreground mt-1">Weak Verbs</p>
 </div>
 </div>

 {/* Category breakdown */}
 <div className="editorial-card p-6">
 <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Theme Coverage</h3>
 <div className="space-y-4">
 {Object.entries(result.categories).sort(([, a], [, b]) => b.score - a.score).map(([name, cat]) => (
 <div key={name}>
 <div className="flex items-center justify-between mb-1">
 <span className="text-sm font-medium text-foreground">{name}</span>
 <span className={`text-sm font-bold ${scoreColor(cat.score)}`}>{cat.score}/100</span>
 </div>
 <div className="w-full bg-foreground/5 rounded-full h-2 mb-2">
 <div className={`h-full rounded-full transition-all ${barColor(cat.score)}`}
 style={{ width: `${cat.score}%` }} />
 </div>
 <div className="flex flex-wrap gap-1">
 {cat.found.map((kw) => (
 <span key={kw} className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">{kw}</span>
 ))}
 {cat.suggested.map((kw) => (
 <span key={kw} className="text-[10px] px-2 py-0.5 bg-foreground/5 text-muted-foreground rounded-full">+ {kw}</span>
 ))}
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Weak verbs */}
 {result.weak_verbs_found.length > 0 && (
 <div className="editorial-card p-6">
 <h3 className="text-xs font-bold uppercase tracking-widest text-red-500 mb-3 flex items-center gap-2">
 <AlertTriangle size={14} /> Weak Verbs to Replace
 </h3>
 <div className="flex flex-wrap gap-2 mb-3">
 {result.weak_verbs_found.map((v) => (
 <span key={v} className="px-3 py-1 bg-red-50 text-red-600 text-xs rounded-full font-medium">{v}</span>
 ))}
 </div>
 <p className="text-xs text-muted-foreground mb-2">Replace with power verbs:</p>
 <div className="flex flex-wrap gap-2">
 {result.power_verb_suggestions.map((v) => (
 <span key={v} className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full font-medium">{v}</span>
 ))}
 </div>
 </div>
 )}

 {/* Tips */}
 {result.tips.length > 0 && (
 <div className="editorial-card p-6">
 <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Recommendations</h3>
 <ul className="space-y-2">
 {result.tips.map((tip, i) => (
 <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
 <CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0"/>
 {tip}
 </li>
 ))}
 </ul>
 </div>
 )}
 </div>
 )}

 <ToolCrossLinks current="/resume-keywords"/>
 </div>
 </main>
 );
}
