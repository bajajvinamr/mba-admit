"use client";

import { useState } from"react";
import { ArrowRight, ArrowLeft, RefreshCw, TrendingUp, AlertTriangle, CheckCircle2 } from"lucide-react";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type Answer = { label: string; score: number };
type Q = { question: string; answers: Answer[] };

const QUESTIONS: Q[] = [
 {
 question:"How many years of full-time work experience do you have?",
 answers: [
 { label:"0-2 years", score: 1 },
 { label:"3-5 years", score: 3 },
 { label:"6-8 years", score: 2 },
 { label:"9+ years", score: 1 },
 ],
 },
 {
 question:"How different is your target industry from your current one?",
 answers: [
 { label:"Same industry, different function", score: 3 },
 { label:"Adjacent industry (e.g., consulting → tech)", score: 3 },
 { label:"Completely different (e.g., military → finance)", score: 2 },
 { label:"I'm not sure what I want to switch to yet", score: 1 },
 ],
 },
 {
 question:"What's your primary motivation for the MBA?",
 answers: [
 { label:"Career acceleration (same field, faster growth)", score: 2 },
 { label:"Career pivot (new industry/function entirely)", score: 3 },
 { label:"Credential/network for entrepreneurship", score: 2 },
 { label:"Personal growth / explore options", score: 1 },
 ],
 },
 {
 question:"How strong is your quantitative background?",
 answers: [
 { label:"Strong (STEM degree, finance, engineering)", score: 3 },
 { label:"Moderate (some quant courses, data work)", score: 2 },
 { label:"Limited (humanities, arts, social sciences)", score: 1 },
 { label:"Weak but willing to supplement (CFA, online courses)", score: 2 },
 ],
 },
 {
 question:"Do you have leadership experience (formal or informal)?",
 answers: [
 { label:"Yes, managed teams of 5+ people", score: 3 },
 { label:"Led projects or initiatives without formal title", score: 3 },
 { label:"Some volunteer/club leadership", score: 2 },
 { label:"Not really - individual contributor role", score: 1 },
 ],
 },
 {
 question:"What's your GMAT/GRE readiness?",
 answers: [
 { label:"Already scored 700+ (or GRE equivalent)", score: 3 },
 { label:"Practice tests around 680-710", score: 2 },
 { label:"Haven't started studying yet", score: 1 },
 { label:"Planning to take GRE instead", score: 2 },
 ],
 },
 {
 question:"Can you afford 2 years without income?",
 answers: [
 { label:"Yes - savings + scholarships likely", score: 3 },
 { label:"Tight but manageable with loans", score: 2 },
 { label:"Would need significant scholarship", score: 1 },
 { label:"Considering part-time/exec MBA instead", score: 2 },
 ],
 },
 {
 question:"How clear is your post-MBA career story?",
 answers: [
 { label:"Very clear - specific role, company, industry", score: 3 },
 { label:"General direction (e.g., 'product management in tech')", score: 2 },
 { label:"Multiple options, still deciding", score: 1 },
 { label:"Not clear at all - hoping MBA helps me figure it out", score: 0 },
 ],
 },
];

const TARGETS = [
 { industry:"Management Consulting", switchDifficulty:"Medium", mbaValue:"Very High", topSchools:"HBS, Booth, Kellogg, Wharton", note:"MBA is practically required for most MBB entry. Case interviews are learnable."},
 { industry:"Investment Banking", switchDifficulty:"High", mbaValue:"Very High", topSchools:"Wharton, CBS, Stern, Booth", note:"Age matters - most banks prefer candidates under 30. Pre-MBA finance helps."},
 { industry:"Product Management (Tech)", switchDifficulty:"Medium", mbaValue:"High", topSchools:"GSB, Haas, Sloan, Kellogg", note:"MBA opens doors but competing with engineers. Side projects help."},
 { industry:"Private Equity / VC", switchDifficulty:"Very High", mbaValue:"High", topSchools:"HBS, GSB, Wharton", note:"Extremely competitive. Pre-MBA banking/consulting experience almost required."},
 { industry:"Entrepreneurship", switchDifficulty:"Low", mbaValue:"Medium", topSchools:"GSB, HBS, Sloan, Haas", note:"MBA provides network and skills, but not required. Opportunity cost is real."},
 { industry:"Non-Profit / Social Impact", switchDifficulty:"Low", mbaValue:"Medium", topSchools:"HBS, Yale SOM, Haas, GSB", note:"MBA helps for leadership roles. Many schools offer loan forgiveness."},
];

export default function CareerSwitcherPage() {
 const [step, setStep] = useState(0);
 const [answers, setAnswers] = useState<number[]>([]);
 const [showTargets, setShowTargets] = useState(false);

 const done = step >= QUESTIONS.length;
 const total = answers.reduce((a, b) => a + b, 0);
 const max = QUESTIONS.length * 3;
 const pct = Math.round((total / max) * 100);

 const handleAnswer = (score: number) => {
 setAnswers([...answers, score]);
 setStep(step + 1);
 };

 const restart = () => {
 setStep(0);
 setAnswers([]);
 setShowTargets(false);
 };

 const verdict = pct >= 80 ? { label:"Strong Candidate", color:"text-emerald-600", bg:"bg-emerald-50", icon: CheckCircle2, detail:"Your profile aligns well with a career-switch MBA. You have the experience, clarity, and readiness to make the most of it."}
 : pct >= 50 ? { label:"Promising - Gaps to Address", color:"text-amber-600", bg:"bg-amber-50", icon: TrendingUp, detail:"You have a solid foundation but some areas need work. Focus on clarifying your post-MBA story and strengthening weaker dimensions."}
 : { label:"Consider Waiting", color:"text-red-500", bg:"bg-red-50", icon: AlertTriangle, detail:"An MBA might not be the best move right now. Consider gaining more experience, taking the GMAT, or exploring alternative paths first."};

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-3xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Career Switcher Assessment
 </h1>
 <p className="text-white/70 text-lg">Is an MBA the right move for your career transition?</p>
 </div>
 </section>

 <div className="max-w-3xl mx-auto px-6 py-10">
 {!done && (
 <>
 <div className="flex items-center justify-between mb-4">
 <span className="text-xs text-muted-foreground">Question {step + 1} of {QUESTIONS.length}</span>
 {step > 0 && (
 <button onClick={() => { setStep(step - 1); setAnswers(answers.slice(0, -1)); }} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
 <ArrowLeft size={12} /> Back
 </button>
 )}
 </div>
 <div className="h-1 bg-foreground/5 rounded-full mb-6">
 <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }} />
 </div>

 <div className="editorial-card p-6 mb-4">
 <h2 className="text-lg font-medium text-foreground">{QUESTIONS[step].question}</h2>
 </div>

 <div className="space-y-2">
 {QUESTIONS[step].answers.map((a) => (
 <button key={a.label} onClick={() => handleAnswer(a.score)}
 className="editorial-card p-4 w-full text-left hover:border-primary/30 border-2 border-transparent transition-all flex items-center justify-between group">
 <span className="text-sm text-foreground">{a.label}</span>
 <ArrowRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors"/>
 </button>
 ))}
 </div>
 </>
 )}

 {done && !showTargets && (
 <div className="space-y-6">
 <div className={`editorial-card p-8 text-center ${verdict.bg}`}>
 <verdict.icon size={48} className={`mx-auto mb-4 ${verdict.color}`} />
 <h2 className={`text-2xl font-bold mb-2 ${verdict.color}`}>{verdict.label}</h2>
 <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">{verdict.detail}</p>
 <div className="inline-flex items-center gap-2 px-4 py-2 bg-card rounded-full">
 <span className="text-xs text-muted-foreground">Readiness Score:</span>
 <span className="text-lg font-bold text-foreground">{pct}%</span>
 </div>
 </div>

 {/* Score breakdown */}
 <div className="editorial-card p-6">
 <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Score Breakdown</h3>
 <div className="space-y-3">
 {QUESTIONS.map((q, i) => (
 <div key={i} className="flex items-center gap-3">
 <div className="flex-1">
 <p className="text-xs text-muted-foreground truncate">{q.question}</p>
 </div>
 <div className="flex gap-0.5">
 {[1, 2, 3].map((v) => (
 <div key={v} className={`w-4 h-4 rounded-sm ${(answers[i] ?? 0) >= v ?"bg-primary":"bg-foreground/10"}`} />
 ))}
 </div>
 </div>
 ))}
 </div>
 </div>

 <div className="flex gap-3">
 <button onClick={restart} className="flex-1 py-2.5 border border-border/10 text-muted-foreground rounded-full text-sm font-medium hover:bg-foreground/5 transition-colors inline-flex items-center justify-center gap-2">
 <RefreshCw size={14} /> Retake
 </button>
 <button onClick={() => setShowTargets(true)} className="flex-1 py-2.5 bg-foreground text-white rounded-full text-sm font-medium hover:bg-foreground/90 transition-colors">
 View Target Industries →
 </button>
 </div>
 </div>
 )}

 {done && showTargets && (
 <div className="space-y-6">
 <button onClick={() => setShowTargets(false)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
 <ArrowLeft size={12} /> Back to results
 </button>
 <h2 className="text-lg font-medium text-foreground">Career Switch Target Industries</h2>
 <div className="space-y-3">
 {TARGETS.map((t) => (
 <div key={t.industry} className="editorial-card p-5">
 <h3 className="font-medium text-foreground text-sm mb-2">{t.industry}</h3>
 <div className="grid grid-cols-3 gap-4 mb-3">
 <div>
 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Switch Difficulty</p>
 <p className={`text-xs font-medium ${t.switchDifficulty ==="Very High" ?"text-red-500": t.switchDifficulty ==="High" ?"text-amber-600": t.switchDifficulty ==="Medium" ?"text-yellow-600":"text-emerald-600"}`}>{t.switchDifficulty}</p>
 </div>
 <div>
 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">MBA Value</p>
 <p className="text-xs font-medium text-foreground">{t.mbaValue}</p>
 </div>
 <div>
 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Top Schools</p>
 <p className="text-xs text-muted-foreground">{t.topSchools}</p>
 </div>
 </div>
 <p className="text-xs text-muted-foreground">{t.note}</p>
 </div>
 ))}
 </div>
 </div>
 )}

 <ToolCrossLinks current="/career-switcher"/>
 </div>
 </main>
 );
}
