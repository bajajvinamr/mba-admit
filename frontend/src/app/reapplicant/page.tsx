"use client";

import { useState } from"react";
import { RefreshCw, CheckCircle2, AlertTriangle, Lightbulb, ChevronDown, ChevronUp } from"lucide-react";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type Section = {
 id: string;
 title: string;
 icon: typeof RefreshCw;
 color: string;
 content: { heading: string; body: string }[];
};

const SECTIONS: Section[] = [
 {
 id:" mindset",
 title:"Reapplicant Mindset",
 icon: Lightbulb,
 color:"text-primary",
 content: [
 { heading:"Rejection is redirection, not a verdict", body:"Schools reject applications, not people. Many successful admits - including Fortune 500 CEOs - were reapplicants. HBS, GSB, and Wharton all actively welcome reapplicants and provide dedicated essay prompts to address what's changed."},
 { heading:"Don't take it personally", body:"Admissions is probabilistic, not deterministic. A 10-15% acceptance rate means 85% of qualified candidates are rejected each cycle. Your candidacy may have been strong but the pool was simply too competitive that year."},
 { heading:"Use the gap year wisely", body:"The 6-12 months between applications is your secret weapon. Demonstrable growth in this period is the single most important factor in reapplication success."},
 ],
 },
 {
 id:"diagnosis",
 title:"Diagnosing What Went Wrong",
 icon: AlertTriangle,
 color:"text-red-500",
 content: [
 { heading:"GMAT/GRE below school median?", body:"If your score was 20+ points below the school's median, this may have been a filter. Consider retaking. A meaningful score improvement (30+ points) sends a powerful signal of commitment and growth."},
 { heading:"Unclear career goals?", body:"Vague or unrealistic post-MBA goals are the #1 essay weakness. Your goals should be specific, achievable, and clearly require an MBA. 'I want to make an impact' is not a goal - 'I want to lead climate tech investments at a growth-stage VC firm' is."},
 { heading:"Weak recommenders?", body:"If your recommenders couldn't provide specific, vivid examples of your leadership and impact, consider switching to people who know your work more intimately - even if they have less impressive titles."},
 { heading:"Not enough 'Why this school'?", body:"Generic 'why school' essays that could apply to any program are a red flag. You need 3-4 school-specific details (courses, clubs, faculty, treks, culture) that connect directly to your goals."},
 { heading:"Profile gaps?", body:"Identify if you had gaps in community involvement, leadership progression, or international exposure. These can be addressed in the reapplication window."},
 ],
 },
 {
 id:"strategy",
 title:"Reapplication Strategy",
 icon: RefreshCw,
 color:"text-blue-600",
 content: [
 { heading:"Show tangible progress", body:"The reapplicant essay is about CHANGE. Document specific, measurable progress: a promotion, new leadership role, GMAT improvement, new extracurricular, or a completed project that demonstrates growth."},
 { heading:"Rewrite essays from scratch", body:"Don't edit last year's essays - start fresh. Your narrative should evolve, not just improve. Show how your self-awareness has deepened and your goals have sharpened with another year of experience."},
 { heading:"Get new recommenders (or rebriefs)", body:"Either get new recommenders who can speak to recent achievements, or thoroughly re-brief existing recommenders with specific stories and themes you want them to highlight."},
 { heading:"Apply to the same school + add safeties", body:"It's perfectly fine to reapply to the same school - they expect it. But also add 2-3 programs you didn't apply to before. This gives you more chances and may reveal a better fit."},
 { heading:"Consider professional consulting", body:"If you can afford it, an admissions consultant who has worked with reapplicants can help identify blind spots in your previous application. Even 2-3 sessions can be transformative."},
 ],
 },
 {
 id:"timeline",
 title:"Reapplication Timeline",
 icon: CheckCircle2,
 color:"text-emerald-600",
 content: [
 { heading:"Month 1-2: Diagnose & Plan", body:"Review your previous application honestly. Request an admissions debrief if the school offers one (Booth, Tuck, and several others do). Identify 2-3 specific areas for improvement."},
 { heading:"Month 3-4: Execute Growth Plan", body:"Take concrete action: retake GMAT if needed, pursue a new leadership role, launch a side project, increase community involvement. Document everything."},
 { heading:"Month 5-6: Start Fresh Essays", body:"Begin drafting new essays from scratch. The reapplicant-specific essay should clearly articulate what changed and why. Get feedback from people who haven't seen your previous essays."},
 { heading:"Month 7-8: Brief Recommenders", body:"Share your updated narrative, career goals, and specific stories. Give them a comparison of what's changed since last year."},
 { heading:"Month 9: Submit & Follow Up", body:"Submit early in R1 if possible - it signals seriousness. After submission, attend info sessions and visit campus to demonstrate continued interest."},
 ],
 },
];

export default function ReapplicantPage() {
 const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set([" mindset"]));

 const toggle = (id: string) => {
 setExpandedSections((prev) => {
 const next = new Set(prev);
 if (next.has(id)) next.delete(id); else next.add(id);
 return next;
 });
 };

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-4xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Reapplicant Guide
 </h1>
 <p className="text-white/70 text-lg">Structured advice to turn a rejection into an admission.</p>
 </div>
 </section>

 <div className="max-w-4xl mx-auto px-6 py-10">
 {/* Quick stats */}
 <div className="grid grid-cols-3 gap-4 mb-8">
 <div className="editorial-card p-5 text-center">
 <p className="text-3xl font-bold text-primary">~30%</p>
 <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest">Reapplicants admitted at top schools</p>
 </div>
 <div className="editorial-card p-5 text-center">
 <p className="text-3xl font-bold text-blue-600">6-12</p>
 <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest">Months to show meaningful growth</p>
 </div>
 <div className="editorial-card p-5 text-center">
 <p className="text-3xl font-bold text-emerald-600">#1</p>
 <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest">Factor: tangible progress since last app</p>
 </div>
 </div>

 {/* Accordion sections */}
 {SECTIONS.map((section) => {
 const Icon = section.icon;
 const isExpanded = expandedSections.has(section.id);
 return (
 <div key={section.id} className="editorial-card mb-4 overflow-hidden">
 <button
 onClick={() => toggle(section.id)}
 className="w-full flex items-center gap-3 px-5 py-4 hover:bg-primary/3 transition-colors"
 >
 <Icon size={18} className={section.color} />
 <p className="font-medium text-foreground text-sm flex-1 text-left">{section.title}</p>
 {isExpanded ? <ChevronUp size={16} className="text-foreground/20"/> : <ChevronDown size={16} className="text-foreground/20"/>}
 </button>

 {isExpanded && (
 <div className="border-t border-border/5 px-5 py-4 space-y-4">
 {section.content.map((item, i) => (
 <div key={i}>
 <p className="text-sm font-medium text-foreground mb-1">{item.heading}</p>
 <p className="text-xs text-foreground/50 leading-relaxed">{item.body}</p>
 </div>
 ))}
 </div>
 )}
 </div>
 );
 })}

 <ToolCrossLinks current="/reapplicant"/>
 </div>
 </main>
 );
}
