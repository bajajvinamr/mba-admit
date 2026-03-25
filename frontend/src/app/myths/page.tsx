"use client";

import { useState } from"react";
import { XCircle, CheckCircle2, ChevronDown, ChevronUp } from"lucide-react";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type Myth = {
 id: string;
 myth: string;
 verdict:"busted"|"partially_true"|"confirmed";
 reality: string;
 evidence: string;
 category: string;
};

const MYTHS: Myth[] = [
 {
 id:"gmat-everything", myth:"Your GMAT score is the most important factor", verdict:"busted",
 reality:"GMAT is a threshold, not a differentiator. Once you're above a school's median, additional points have diminishing returns. Work experience, essays, and fit matter far more.",
 evidence:"HBS class data shows GMAT range of 620-790 in recent classes. Many 780+ scorers are rejected while 680 scorers with compelling stories are admitted.",
 category:"Testing",
 },
 {
 id:"need-760", myth:"You need a 760+ GMAT for M7 schools", verdict:"busted",
 reality:"The median GMAT at most M7 schools is 730-740. A 720+ puts you in competitive range. Retaking from 730 to 750 is rarely worth the effort - spend that time on essays.",
 evidence:"Stanford GSB median: 738. HBS median: 740. Wharton median: 733. Many admits below these numbers.",
 category:"Testing",
 },
 {
 id:"consulting-only", myth:"MBA is only worth it if you go into consulting or finance", verdict:"busted",
 reality:"While consulting and finance are the top recruiters, tech PM roles, entrepreneurship, and impact careers all have strong MBA ROI. The network value alone lasts a lifetime.",
 evidence:"GSB: 35% tech, only 15% consulting. Booth: growing PM placement. Yale SOM: 30%+ social impact.",
 category:"Career",
 },
 {
 id:"too-old", myth:"I'm too old to apply at 30+", verdict:"busted",
 reality:"The average age at most programs is 27-28, but there's no hard cutoff. Older applicants bring valuable experience. INSEAD's average age is 29. Many programs welcome 30+ applicants.",
 evidence:"HBS class range: 24-37. INSEAD median age: 29. Booth and Sloan regularly admit 30+ candidates.",
 category:"Profile",
 },
 {
 id:"need-banking", myth:"You need finance or consulting experience to get in", verdict:"busted",
 reality:"Top programs actively seek diverse backgrounds. Engineers, military, nonprofit, healthcare, and government professionals all get admitted. Diversity of experience strengthens your class.",
 evidence:"HBS class composition: ~25% pre-MBA consultants, ~25% finance, ~50% from all other industries.",
 category:"Profile",
 },
 {
 id:"r1-better", myth:"Round 1 is always better than Round 2", verdict:"partially_true",
 reality:"R1 has more seats available, but R2 applicants are often stronger (they used the extra months to improve). The acceptance rate difference is small - maybe 1-2 percentage points.",
 evidence:"Most schools fill 40-50% of their class in R1, 40-45% in R2, and 5-10% in R3. R2 is highly competitive.",
 category:"Application",
 },
 {
 id:"need-ivy", myth:"You need an Ivy League undergrad degree", verdict:"busted",
 reality:"Top MBA programs admit from hundreds of different undergrad institutions. What matters is your GPA relative to your school's rigor, not the school name itself.",
 evidence:"GSB admits from 200+ undergrad institutions. State schools, international universities, and LACs are well-represented.",
 category:"Profile",
 },
 {
 id:"expensive", myth:"MBA is too expensive - the debt isn't worth it", verdict:"partially_true",
 reality:"At sticker price, MBA is expensive ($200K+ for 2 years). But ~60% of students receive scholarships. And median post-MBA salaries ($150K-180K) typically yield 3-5 year payback.",
 evidence:"Average scholarship at Booth: $40K. Consortium fellows: full tuition. Median HBS salary: $175K base + $30K bonus.",
 category:"Financial",
 },
 {
 id:"admissions-consultant", myth:"You need an admissions consultant to get in", verdict:"busted",
 reality:"Most admitted students don't use consultants. Self-aware applicants who do thorough research, get honest feedback from peers, and invest time in their essays can succeed without one.",
 evidence:"No school tracks or favors consultant-assisted applications. Many consultants charge $5K-$15K with no guarantee.",
 category:"Application",
 },
 {
 id:"yield-protection", myth:"Schools practice yield protection", verdict:"partially_true",
 reality:"Most schools deny this, but some data suggests it exists at certain T15/T25 schools. At M7 level, it's less of a factor because these schools already have high yield.",
 evidence:"Anecdotal: High-stat applicants rejected by T15 schools but admitted at M7. However, 'overqualified' rejections may simply be due to poor fit or weak essays.",
 category:"Application",
 },
 {
 id:"extracurriculars", myth:"You need unique extracurriculars (like climbing Everest)", verdict:"busted",
 reality:"Sustained community involvement matters more than one-off adventures. Coaching a youth sports team for 5 years is more impressive than a one-week volunteer trip.",
 evidence:"AdCom interviews consistently emphasize depth over breadth. Consistent commitment > flashy one-offs.",
 category:"Profile",
 },
 {
 id:"gpa-cant-fix", myth:"A low GPA means you can't get into a top school", verdict:"busted",
 reality:"A sub-3.0 GPA makes it harder but not impossible. Strong GMAT, additional coursework (HBX, Wharton Online), and a compelling explanation can overcome GPA concerns.",
 evidence:"HBS GPA range includes sub-3.0 admits. Many schools offer 'additional information' sections to explain academic anomalies.",
 category:"Profile",
 },
];

const CATEGORIES = ["All","Testing","Profile","Application","Career","Financial"];

const VERDICT_CFG = {
 busted: { label:"BUSTED", color:"bg-red-50 text-red-600", icon: XCircle },
 partially_true: { label:"PARTIALLY TRUE", color:"bg-primary/10 text-primary", icon: CheckCircle2 },
 confirmed: { label:"CONFIRMED", color:"bg-emerald-50 text-emerald-600", icon: CheckCircle2 },
};

export default function MythsPage() {
 const [category, setCategory] = useState("All");
 const [expandedId, setExpandedId] = useState<string | null>(null);

 const filtered = category ==="All" ? MYTHS : MYTHS.filter((m) => m.category === category);

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-4xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 MBA Myths - Busted
 </h1>
 <p className="text-white/70 text-lg">{MYTHS.length} common admissions myths debunked with data.</p>
 </div>
 </section>

 <div className="max-w-4xl mx-auto px-6 py-10">
 {/* Category filter */}
 <div className="flex flex-wrap gap-2 mb-8">
 {CATEGORIES.map((cat) => (
 <button
 key={cat}
 onClick={() => setCategory(cat)}
 className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
 category === cat ?"bg-foreground text-white":"bg-foreground/5 text-foreground/40 hover:bg-foreground/10"
 }`}
 >
 {cat}
 </button>
 ))}
 </div>

 {/* Myth cards */}
 {filtered.map((myth) => {
 const cfg = VERDICT_CFG[myth.verdict];
 const Icon = cfg.icon;
 const expanded = expandedId === myth.id;
 return (
 <div key={myth.id} className="editorial-card mb-4 overflow-hidden">
 <button
 onClick={() => setExpandedId(expanded ? null : myth.id)}
 className="w-full flex items-start gap-3 px-5 py-4 hover:bg-primary/3 transition-colors text-left"
 >
 <Icon size={18} className={myth.verdict ==="busted" ?"text-red-400":"text-primary"} />
 <div className="flex-1">
 <p className="font-medium text-foreground text-sm">&ldquo;{myth.myth}&rdquo;</p>
 <div className="flex gap-2 mt-1">
 <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${cfg.color}`}>{cfg.label}</span>
 <span className="text-[9px] px-1.5 py-0.5 bg-foreground/5 text-foreground/30 rounded-full font-bold">{myth.category}</span>
 </div>
 </div>
 {expanded ? <ChevronUp size={16} className="text-foreground/20 mt-1"/> : <ChevronDown size={16} className="text-foreground/20 mt-1"/>}
 </button>

 {expanded && (
 <div className="border-t border-border/5 px-5 py-4">
 <p className="text-sm font-medium text-foreground mb-1">Reality:</p>
 <p className="text-xs text-foreground/50 leading-relaxed mb-3">{myth.reality}</p>
 <p className="text-sm font-medium text-foreground mb-1">Evidence:</p>
 <p className="text-xs text-foreground/50 leading-relaxed">{myth.evidence}</p>
 </div>
 )}
 </div>
 );
 })}

 <ToolCrossLinks current="/myths"/>
 </div>
 </main>
 );
}
