"use client";

import { useState } from"react";
import { ArrowRight, RotateCcw, GraduationCap } from"lucide-react";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type Question = {
 text: string;
 options: { label: string; scores: Record<string, number> }[];
};

type SchoolProfile = {
 id: string;
 name: string;
 tagline: string;
 traits: string[];
 color: string;
};

const SCHOOL_PROFILES: SchoolProfile[] = [
 { id:"collaborative", name:"Kellogg / Tuck / Fuqua", tagline:"Team-first, relationship-driven, community-oriented", traits: ["Collaborative","Supportive","Team-based learning","Social","Inclusive"], color:"text-blue-600"},
 { id:"analytical", name:"Booth / Sloan / Stern", tagline:"Data-driven, intellectually rigorous, flexible curriculum", traits: ["Analytical","Quantitative","Flexible","Independent","Rigorous"], color:"text-purple-600"},
 { id:"entrepreneurial", name:"Stanford GSB / Haas / Babson", tagline:"Innovation-focused, risk-taking, Silicon Valley mindset", traits: ["Entrepreneurial","Innovative","Risk-taking","Creative","West Coast"], color:"text-emerald-600"},
 { id:"case_method", name:"HBS / Darden / Ivey", tagline:"Discussion-based learning, leadership-focused, high-energy", traits: ["Case Method","Leadership","High-energy","Competitive","General Management"], color:"text-primary"},
 { id:"global", name:"INSEAD / LBS / IESE", tagline:"International perspective, cross-cultural, accelerated pace", traits: ["Global","Diverse","Fast-paced","Cross-cultural","International"], color:"text-red-600"},
];

const QUESTIONS: Question[] = [
 {
 text:"When working on a group project, you typically:",
 options: [
 { label:"Take charge and delegate tasks", scores: { case_method: 3, collaborative: 1, analytical: 0, entrepreneurial: 1, global: 1 } },
 { label:"Focus on building consensus and ensuring everyone contributes", scores: { collaborative: 3, case_method: 1, analytical: 0, entrepreneurial: 0, global: 1 } },
 { label:"Dive deep into the data and build the analytical framework", scores: { analytical: 3, entrepreneurial: 1, collaborative: 0, case_method: 0, global: 0 } },
 { label:"Challenge the problem definition and propose unconventional solutions", scores: { entrepreneurial: 3, analytical: 1, collaborative: 0, case_method: 1, global: 1 } },
 ],
 },
 {
 text:"Your ideal learning environment is:",
 options: [
 { label:"Lively classroom debates where you think on your feet", scores: { case_method: 3, global: 1, collaborative: 1, analytical: 0, entrepreneurial: 0 } },
 { label:"Structured lectures with deep quantitative analysis", scores: { analytical: 3, case_method: 0, collaborative: 0, entrepreneurial: 0, global: 0 } },
 { label:"Hands-on projects with real startups and companies", scores: { entrepreneurial: 3, collaborative: 1, analytical: 0, case_method: 0, global: 1 } },
 { label:"Small team workshops with diverse global perspectives", scores: { global: 3, collaborative: 2, entrepreneurial: 0, analytical: 0, case_method: 0 } },
 ],
 },
 {
 text:"What matters most to you in a post-MBA career?",
 options: [
 { label:"Leading large teams at a major corporation", scores: { case_method: 3, collaborative: 1, analytical: 0, entrepreneurial: 0, global: 1 } },
 { label:"Building something from scratch - my own company", scores: { entrepreneurial: 3, case_method: 0, collaborative: 0, analytical: 1, global: 0 } },
 { label:"Making data-driven decisions at a high level", scores: { analytical: 3, case_method: 1, collaborative: 0, entrepreneurial: 0, global: 0 } },
 { label:"Working across borders on global challenges", scores: { global: 3, collaborative: 1, entrepreneurial: 1, analytical: 0, case_method: 0 } },
 ],
 },
 {
 text:"On a Saturday night during business school, you'd rather:",
 options: [
 { label:"Host a dinner party for your section mates", scores: { collaborative: 3, case_method: 1, global: 1, analytical: 0, entrepreneurial: 0 } },
 { label:"Attend a pitch competition or hackathon", scores: { entrepreneurial: 3, analytical: 1, global: 0, collaborative: 0, case_method: 0 } },
 { label:"Go to a formal networking event with alumni", scores: { case_method: 2, global: 2, collaborative: 1, analytical: 0, entrepreneurial: 0 } },
 { label:"Work on a side project or personal research", scores: { analytical: 3, entrepreneurial: 1, collaborative: 0, case_method: 0, global: 0 } },
 ],
 },
 {
 text:"When facing a major decision, you:",
 options: [
 { label:"Build a spreadsheet model to analyze all scenarios", scores: { analytical: 3, case_method: 0, collaborative: 0, entrepreneurial: 0, global: 0 } },
 { label:"Talk it through with trusted friends and mentors", scores: { collaborative: 3, case_method: 1, global: 1, analytical: 0, entrepreneurial: 0 } },
 { label:"Go with your gut after quick research - speed matters", scores: { entrepreneurial: 3, global: 1, case_method: 1, collaborative: 0, analytical: 0 } },
 { label:"Study what leaders in similar situations have done", scores: { case_method: 3, analytical: 1, global: 0, collaborative: 0, entrepreneurial: 0 } },
 ],
 },
 {
 text:"Your biggest strength is:",
 options: [
 { label:"Making people feel heard and building strong relationships", scores: { collaborative: 3, global: 1, case_method: 0, analytical: 0, entrepreneurial: 0 } },
 { label:"Seeing patterns in complex data that others miss", scores: { analytical: 3, entrepreneurial: 1, collaborative: 0, case_method: 0, global: 0 } },
 { label:"Adapting quickly to new environments and cultures", scores: { global: 3, entrepreneurial: 1, collaborative: 1, analytical: 0, case_method: 0 } },
 { label:"Commanding a room and motivating people to act", scores: { case_method: 3, collaborative: 1, entrepreneurial: 1, analytical: 0, global: 0 } },
 ],
 },
];

export default function CultureQuizPage() {
 const [step, setStep] = useState(0);
 const [scores, setScores] = useState<Record<string, number>>({ collaborative: 0, analytical: 0, entrepreneurial: 0, case_method: 0, global: 0 });
 const [showResults, setShowResults] = useState(false);

 const answer = (optionScores: Record<string, number>) => {
 const next = { ...scores };
 Object.entries(optionScores).forEach(([k, v]) => { next[k] = (next[k] || 0) + v; });
 setScores(next);
 if (step + 1 >= QUESTIONS.length) {
 setShowResults(true);
 } else {
 setStep(step + 1);
 }
 };

 const reset = () => {
 setStep(0);
 setScores({ collaborative: 0, analytical: 0, entrepreneurial: 0, case_method: 0, global: 0 });
 setShowResults(false);
 };

 const ranked = SCHOOL_PROFILES.slice()
 .map((p) => ({ ...p, score: scores[p.id] || 0 }))
 .sort((a, b) => b.score - a.score);
 const maxScore = ranked[0]?.score || 1;

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-4xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 School Culture Quiz
 </h1>
 <p className="text-white/70 text-lg">6 questions to find your best-fit MBA culture.</p>
 </div>
 </section>

 <div className="max-w-3xl mx-auto px-6 py-10">
 {!showResults ? (
 <>
 {/* Progress */}
 <div className="flex items-center gap-3 mb-8">
 <div className="flex-1 bg-foreground/5 rounded-full h-2">
 <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(step / QUESTIONS.length) * 100}%` }} />
 </div>
 <span className="text-xs text-foreground/30 font-bold">{step + 1}/{QUESTIONS.length}</span>
 </div>

 {/* Question */}
 <div className="editorial-card p-8 mb-6">
 <p className="text-lg font-medium text-foreground mb-6">{QUESTIONS[step].text}</p>
 <div className="space-y-3">
 {QUESTIONS[step].options.map((opt, i) => (
 <button
 key={i}
 onClick={() => answer(opt.scores)}
 className="w-full text-left px-5 py-4 border border-border/10 rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-sm text-foreground/70 hover:text-foreground flex items-center justify-between group"
 >
 {opt.label}
 <ArrowRight size={14} className="text-foreground/10 group-hover:text-primary transition-colors"/>
 </button>
 ))}
 </div>
 </div>
 </>
 ) : (
 <>
 {/* Results */}
 <div className="editorial-card p-8 text-center mb-8">
 <GraduationCap size={32} className="mx-auto text-primary mb-3"/>
 <p className="text-xs font-bold uppercase tracking-widest text-foreground/30 mb-2">Your Best-Fit Culture</p>
 <p className={`text-2xl font-bold ${ranked[0].color}`}>{ranked[0].name}</p>
 <p className="text-sm text-foreground/50 mt-2">{ranked[0].tagline}</p>
 </div>

 {/* All results */}
 {ranked.map((profile, i) => (
 <div key={profile.id} className={`editorial-card p-5 mb-3 ${i === 0 ?"border-l-2 border-primary":""}`}>
 <div className="flex items-center justify-between mb-2">
 <div>
 <p className={`font-medium text-sm ${i === 0 ? profile.color :"text-foreground"}`}>
 {i === 0 &&"🏆"}{profile.name}
 </p>
 <p className="text-[10px] text-foreground/40">{profile.tagline}</p>
 </div>
 <span className="text-xs font-bold text-foreground/30">{Math.round((profile.score / maxScore) * 100)}%</span>
 </div>
 <div className="w-full bg-foreground/5 rounded-full h-2 mb-2">
 <div className={`h-full rounded-full transition-all ${i === 0 ?"bg-primary":"bg-foreground/15"}`}
 style={{ width: `${(profile.score / maxScore) * 100}%` }} />
 </div>
 <div className="flex flex-wrap gap-1">
 {profile.traits.map((t) => (
 <span key={t} className="text-[9px] px-1.5 py-0.5 bg-foreground/5 rounded-full text-foreground/40 font-bold">{t}</span>
 ))}
 </div>
 </div>
 ))}

 <button onClick={reset} className="mt-6 px-4 py-2 border border-border/10 text-sm text-foreground/50 rounded-lg hover:border-border/30 flex items-center gap-1 mx-auto">
 <RotateCcw size={14} /> Retake Quiz
 </button>
 </>
 )}

 <ToolCrossLinks current="/culture-quiz"/>
 </div>
 </main>
 );
}
