"use client";

import { useState } from"react";
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight } from"lucide-react";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import { EmailCapture } from"@/components/EmailCapture";

type Factor = { label: string; options: { text: string; r1: number; r2: number; r3: number }[] };

const FACTORS: Factor[] = [
 {
 label:"How ready is your GMAT/GRE score?",
 options: [
 { text:"Already have my target score", r1: 3, r2: 2, r3: 1 },
 { text:"Taking the test this month", r1: 2, r2: 3, r3: 1 },
 { text:"Still studying, test in 2-3 months", r1: 0, r2: 3, r3: 2 },
 { text:"Haven't started yet", r1: 0, r2: 1, r3: 3 },
 ],
 },
 {
 label:"How polished are your essays?",
 options: [
 { text:"Drafted and reviewed by multiple readers", r1: 3, r2: 2, r3: 1 },
 { text:"First draft done, needs editing", r1: 2, r2: 3, r3: 1 },
 { text:"Started brainstorming", r1: 0, r2: 3, r3: 2 },
 { text:"Haven't started", r1: 0, r2: 2, r3: 3 },
 ],
 },
 {
 label:"Have you secured recommenders?",
 options: [
 { text:"Yes, they've agreed and are briefed", r1: 3, r2: 2, r3: 1 },
 { text:"Asked but not briefed yet", r1: 2, r2: 3, r3: 1 },
 { text:"Know who to ask, haven't asked yet", r1: 0, r2: 3, r3: 2 },
 { text:"Haven't figured out who to ask", r1: 0, r2: 1, r3: 3 },
 ],
 },
 {
 label:"What's your profile competitiveness?",
 options: [
 { text:"Strong: GMAT 730+, top company, leadership stories", r1: 3, r2: 2, r3: 1 },
 { text:"Solid: GMAT 700+, good experience, decent stories", r1: 2, r2: 3, r3: 1 },
 { text:"Developing: working on strengthening weak areas", r1: 0, r2: 2, r3: 3 },
 { text:"Uncertain: don't know where I stand", r1: 1, r2: 2, r3: 2 },
 ],
 },
 {
 label:"Are you applying for scholarships?",
 options: [
 { text:"Yes, maximizing my chances", r1: 3, r2: 2, r3: 0 },
 { text:"Would be nice but not critical", r1: 2, r2: 3, r3: 1 },
 { text:"Not a factor in my decision", r1: 1, r2: 2, r3: 2 },
 ],
 },
 {
 label:"How many schools are you applying to?",
 options: [
 { text:"1-3 schools", r1: 3, r2: 2, r3: 1 },
 { text:"4-6 schools", r1: 2, r2: 3, r3: 1 },
 { text:"7+ schools", r1: 1, r2: 2, r3: 3 },
 ],
 },
];

export default function RoundStrategyPage() {
 const [answers, setAnswers] = useState<number[]>(new Array(FACTORS.length).fill(-1));

 const handleSelect = (factorIdx: number, optionIdx: number) => {
 const next = [...answers];
 next[factorIdx] = optionIdx;
 setAnswers(next);
 };

 const allAnswered = answers.every((a) => a >= 0);

 const totals = { r1: 0, r2: 0, r3: 0 };
 answers.forEach((optIdx, fIdx) => {
 if (optIdx >= 0) {
 const opt = FACTORS[fIdx].options[optIdx];
 totals.r1 += opt.r1;
 totals.r2 += opt.r2;
 totals.r3 += opt.r3;
 }
 });

 const max = Math.max(totals.r1, totals.r2, totals.r3);
 const recommendation = totals.r1 === max ?"Round 1": totals.r2 === max ?"Round 2":"Round 3";

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-3xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">Round Strategy</h1>
 <p className="text-white/70 text-lg">Which application round is best for your situation?</p>
 </div>
 </section>

 <div className="max-w-3xl mx-auto px-6 py-10">
 <div className="space-y-6 mb-8">
 {FACTORS.map((f, fIdx) => (
 <div key={f.label} className="editorial-card p-5">
 <h3 className="text-sm font-medium text-foreground mb-3">{fIdx + 1}. {f.label}</h3>
 <div className="space-y-1.5">
 {f.options.map((opt, oIdx) => (
 <button key={opt.text} onClick={() => handleSelect(fIdx, oIdx)}
 className={`w-full text-left p-3 rounded-lg text-xs transition-all border-2 ${answers[fIdx] === oIdx ?"border-primary bg-primary/5":"border-transparent bg-foreground/[0.02] hover:bg-foreground/[0.04]"}`}>
 {opt.text}
 </button>
 ))}
 </div>
 </div>
 ))}
 </div>

 {allAnswered && (
 <div className="editorial-card p-6 mb-6">
 <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Recommendation</h2>
 <div className="text-center mb-6">
 <p className="text-3xl font-bold text-foreground mb-1">{recommendation}</p>
 <p className="text-xs text-muted-foreground">Based on your current readiness across {FACTORS.length} factors</p>
 </div>
 <div className="grid grid-cols-3 gap-3">
 {[
 { label:"Round 1", score: totals.r1, icon: totals.r1 === max ? CheckCircle2 : totals.r1 >= max * 0.7 ? AlertTriangle : XCircle, color: totals.r1 === max ?"text-emerald-600":"text-muted-foreground"},
 { label:"Round 2", score: totals.r2, icon: totals.r2 === max ? CheckCircle2 : totals.r2 >= max * 0.7 ? AlertTriangle : XCircle, color: totals.r2 === max ?"text-emerald-600":"text-muted-foreground"},
 { label:"Round 3", score: totals.r3, icon: totals.r3 === max ? CheckCircle2 : totals.r3 >= max * 0.7 ? AlertTriangle : XCircle, color: totals.r3 === max ?"text-emerald-600":"text-muted-foreground"},
 ].map((r) => (
 <div key={r.label} className="text-center p-4 rounded-lg bg-foreground/[0.02]">
 <r.icon size={24} className={`mx-auto mb-1 ${r.color}`} />
 <p className="text-xs font-medium text-foreground">{r.label}</p>
 <p className="text-lg font-bold text-foreground">{r.score}</p>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Round comparison table */}
 <div className="editorial-card p-5">
 <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Round Comparison</h3>
 <div className="overflow-x-auto">
 <table className="w-full text-xs">
 <thead>
 <tr className="border-b border-border/10">
 <th className="py-2 px-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Factor</th>
 <th className="py-2 px-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">R1</th>
 <th className="py-2 px-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">R2</th>
 <th className="py-2 px-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">R3</th>
 </tr>
 </thead>
 <tbody>
 {[
 { factor:"Acceptance Rate", r1:"Highest", r2:"High", r3:"Lowest"},
 { factor:"Scholarship Odds", r1:"Best", r2:"Good", r3:"Limited"},
 { factor:"Typical Deadline", r1:"Sep", r2:"Jan", r3:"Mar-Apr"},
 { factor:"Prep Time", r1:"Least", r2:"Moderate", r3:"Most"},
 { factor:"Class Spots Left", r1:"Most", r2:"Many", r3:"Few"},
 { factor:"Best For", r1:"Ready applicants", r2:"Most applicants", r3:"Late deciders"},
 ].map((row) => (
 <tr key={row.factor} className="border-b border-border/5">
 <td className="py-2 px-3 text-muted-foreground">{row.factor}</td>
 <td className="py-2 px-3 text-center text-muted-foreground">{row.r1}</td>
 <td className="py-2 px-3 text-center text-muted-foreground">{row.r2}</td>
 <td className="py-2 px-3 text-center text-muted-foreground">{row.r3}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 <EmailCapture variant="contextual"source="round-strategy"/>
 <ToolCrossLinks current="/round-strategy"/>
 </div>
 </main>
 );
}
