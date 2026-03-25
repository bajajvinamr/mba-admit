"use client";

import { useState } from"react";
import { DollarSign, ChevronDown, ChevronUp, Target, AlertTriangle, Zap, TrendingUp } from"lucide-react";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type NegTip = {
 title: string;
 stage: string;
 situation: string;
 strategy: string;
 script: string;
 mistake: string;
};

const TIPS: NegTip[] = [
 {
 title:"Never Name a Number First",
 stage:"Initial Offer",
 situation:"The recruiter asks 'What are your salary expectations?' before extending an offer.",
 strategy:"Deflect the question back. Let them anchor first. If pressed, give a range based on market data, not your current salary.",
 script:"I'm really excited about this role and confident we can find a number that works for both sides. Could you share the range you have budgeted for this position? I'd love to evaluate the full compensation package together.",
 mistake:"Naming a number below the company's range. You'll never know how much was left on the table.",
 },
 {
 title:"Negotiate Base Salary Before Bonus",
 stage:"Counter Offer",
 situation:"You receive an offer with base salary + signing bonus + performance bonus.",
 strategy:"Base salary compounds forever - a $10K increase today is worth $200K+ over a 20-year career. Prioritize base over one-time signing bonuses.",
 script:"Thank you for this offer - I'm very excited. I'd like to discuss the base salary. Based on my research on comparable roles at [peer companies], and the specialized skills I bring from my MBA in [concentration], I believe a base of $[X] better reflects the market and my contributions.",
 mistake:"Accepting a high signing bonus in lieu of higher base. The bonus is one-time; the base salary gap compounds every year.",
 },
 {
 title:"Use Competing Offers Strategically",
 stage:"Leverage",
 situation:"You have offers from multiple companies.",
 strategy:"Don't bluff - but do communicate that you have options. Frame it as wanting to make the right choice, not as a threat.",
 script:"I want to be transparent - I'm fortunate to have another offer that's competitive. I'm genuinely more excited about this role because of [specific reason], and I'd love to find a way to make the total comp more aligned so I can accept with full confidence.",
 mistake:"Using competing offers as threats. Companies will withdraw offers from candidates who negotiate aggressively without genuine interest.",
 },
 {
 title:"Negotiate Beyond Salary",
 stage:"Full Package",
 situation:"The company says base salary is firm / at band maximum.",
 strategy:"Pivot to other levers: signing bonus, relocation, start date, title, remote flexibility, education stipend, accelerated review timeline, equity (if applicable).",
 script:"I understand the base salary reflects the band for this level. Could we explore a signing bonus to bridge the gap? I'd also love to discuss [remote work flexibility / accelerated performance review at 6 months / additional PTO]. These would make a meaningful difference in my decision.",
 mistake:"Hearing 'the salary is firm' and stopping the negotiation. There are always other levers.",
 },
 {
 title:"Post-MBA Consulting Negotiation",
 stage:"Industry-Specific",
 situation:"You receive a standard MBB or Big 4 consulting offer.",
 strategy:"Top consulting firms have standardized offers with little salary flex. Focus on: office location (some pay more), signing bonus timing, start date, relocation support, and practice group placement.",
 script:"I'm thrilled about the offer to join [Firm]. I understand comp is standardized, so I'd love to discuss office placement - I'm particularly interested in [City] where I can leverage my [industry] network. Could we also discuss the timing of the signing bonus relative to my start date?",
 mistake:"Trying to negotiate base salary at MBB. It signals you don't understand the industry. Focus on location, practice, and sign-on.",
 },
 {
 title:"Post-MBA Tech Negotiation",
 stage:"Industry-Specific",
 situation:"You receive a tech PM or strategy role offer with RSUs.",
 strategy:"Tech comp is base + RSUs + sign-on. RSUs vest over 4 years (often with a 1-year cliff). Negotiate RSU grants AND refresher grants. Understand the stock's trajectory.",
 script:"I appreciate the offer. I'd like to discuss the equity component - given my MBA focus on [product/strategy] and my [X] years in [related field], I believe an additional [Y] RSUs would better reflect the value I'll bring in year 2+. Could we also discuss the refresher grant timeline?",
 mistake:"Ignoring RSU vesting schedules. A 4-year vest with 1-year cliff means you get nothing if you leave before year 1.",
 },
 {
 title:"The 48-Hour Rule",
 stage:"Timing",
 situation:"You receive a verbal or written offer.",
 strategy:"Always take at least 48 hours before responding. Even if you love it, this signals professionalism and gives you time to research, compare, and prepare your counter.",
 script:"Thank you so much - I'm genuinely excited about this opportunity. I'd like to take a couple of days to review the full package and discuss with my family. Could I get back to you by [specific date]? I want to make sure I can commit with full enthusiasm.",
 mistake:"Accepting on the spot. You lose all negotiating leverage the moment you say yes.",
 },
];

const STAGES = ["All","Initial Offer","Counter Offer","Leverage","Full Package","Industry-Specific","Timing"];

export default function SalaryNegotiationPage() {
 const [stage, setStage] = useState("All");
 const [expanded, setExpanded] = useState<string | null>(null);

 const filtered = stage ==="All" ? TIPS : TIPS.filter((t) => t.stage === stage);

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-5xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Salary Negotiation Guide
 </h1>
 <p className="text-white/70 text-lg">Scripts and strategies for negotiating your post-MBA compensation.</p>
 </div>
 </section>

 <div className="max-w-5xl mx-auto px-6 py-10">
 <div className="flex flex-wrap gap-2 mb-8">
 {STAGES.map((s) => (
 <button key={s} onClick={() => setStage(s)}
 className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${stage === s ?"bg-foreground text-white":"bg-foreground/5 text-muted-foreground hover:bg-foreground/10"}`}>
 {s}
 </button>
 ))}
 </div>

 <div className="space-y-4">
 {filtered.map((tip) => {
 const isOpen = expanded === tip.title;
 return (
 <div key={tip.title} className="editorial-card overflow-hidden">
 <button onClick={() => setExpanded(isOpen ? null : tip.title)}
 className="w-full text-left p-5 flex items-start gap-3">
 <DollarSign size={18} className="text-primary mt-0.5 shrink-0"/>
 <div className="flex-1">
 <div className="flex items-center justify-between">
 <p className="font-medium text-foreground text-sm">{tip.title}</p>
 {isOpen ? <ChevronUp size={16} className="text-muted-foreground"/> : <ChevronDown size={16} className="text-muted-foreground"/>}
 </div>
 <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-bold">{tip.stage}</span>
 <p className="text-xs text-muted-foreground mt-2">{tip.situation}</p>
 </div>
 </button>

 {isOpen && (
 <div className="px-5 pb-5 border-t border-border/5 space-y-4">
 <div className="mt-4 p-3 bg-blue-50/50 rounded-lg">
 <p className="text-[10px] font-bold text-blue-700 mb-1 flex items-center gap-1"><Target size={10} /> Strategy</p>
 <p className="text-xs text-muted-foreground leading-relaxed">{tip.strategy}</p>
 </div>
 <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
 <p className="text-[10px] font-bold text-primary mb-1 flex items-center gap-1"><Zap size={10} /> What to Say</p>
 <p className="text-xs text-muted-foreground italic leading-relaxed">&ldquo;{tip.script}&rdquo;</p>
 </div>
 <div className="p-3 bg-rose-50/50 rounded-lg">
 <p className="text-[10px] font-bold text-rose-700 mb-1 flex items-center gap-1"><AlertTriangle size={10} /> Common Mistake</p>
 <p className="text-xs text-muted-foreground leading-relaxed">{tip.mistake}</p>
 </div>
 </div>
 )}
 </div>
 );
 })}
 </div>

 <ToolCrossLinks current="/salary-negotiation"/>
 </div>
 </main>
 );
}
