"use client";

import { useState } from"react";
import { Award, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, Lightbulb } from"lucide-react";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type Tip = {
 title: string;
 category: string;
 advice: string;
 dos: string[];
 donts: string[];
 example: string;
};

const TIPS: Tip[] = [
 {
 title:"Lead with Impact, Not Need",
 category:"Positioning",
 advice:"Scholarship essays should demonstrate why you deserve funding based on what you'll contribute, not why you need it financially.",
 dos: ["Quantify your community impact","Connect your MBA goals to a larger mission","Show how the scholarship amplifies your existing trajectory"],
 donts: ["Lead with financial hardship","Compare yourself to other applicants","Make it sound transactional"],
 example:"After launching a financial literacy program that reached 500 underserved families, I'm seeking the XYZ Scholarship to scale this impact globally through an MBA in social enterprise.",
 },
 {
 title:"Research School-Specific Awards",
 category:"Strategy",
 advice:"Most schools have 10-30 named scholarships with specific criteria. Tailor your application to match a specific award's mission.",
 dos: ["List all available scholarships before applying","Match your profile to specific award criteria","Mention the scholarship by name if the essay allows"],
 donts: ["Write generic 'I deserve a scholarship' essays","Ignore smaller awards - they add up","Apply only to merit-based if you have need"],
 example:"The Forté Fellowship aligns with my 12-year commitment to advancing women in fintech - from founding a women's investing club to leading DEI initiatives at my firm.",
 },
 {
 title:"Reuse Your 'Why MBA?' - With a Twist",
 category:"Writing",
 advice:"Your scholarship essay should complement your admissions essay, not repeat it. Use the same career arc but emphasize different evidence.",
 dos: ["Reference the same goals with new supporting stories","Highlight leadership that wasn't in your main essays","Show deeper community engagement"],
 donts: ["Copy-paste from your admissions essays","Introduce contradictory career goals","Ignore the scholarship committee's stated values"],
 example:"While my admissions essay focused on my product management trajectory, here I want to highlight the mentoring work that drives my commitment to developing the next generation of tech leaders.",
 },
 {
 title:"Demonstrate Financial Literacy",
 category:"Strategy",
 advice:"Adcoms want to know you've thought seriously about financing your MBA. Show you have a plan, not just a wish.",
 dos: ["Acknowledge the full cost and your plan to cover it","Mention if employer will partially sponsor","Show you've researched loan options and other funding"],
 donts: ["Imply the scholarship is your only hope","Ignore the financial planning aspect entirely","Overstate your financial need if applying merit-based"],
 example:"My financial plan combines personal savings ($40K), an employer contribution ($30K), and federal loans. A $25K scholarship would eliminate the need for private loans and allow me to focus fully on academics.",
 },
 {
 title:"Tell a Story, Not a Resume",
 category:"Writing",
 advice:"The best scholarship essays read like personal narratives. Open with a scene, build tension, resolve with insight.",
 dos: ["Start with a specific moment or scene","Use sensory details and dialogue","End with a forward-looking vision"],
 donts: ["List achievements chronologically","Use bullet points in essay format","Write in the third person"],
 example:"The spreadsheet had 47 rows - one for every family whose electricity was about to be shut off. That night, I rewrote our nonprofit's funding model from scratch.",
 },
 {
 title:"Leverage Diversity Authentically",
 category:"Positioning",
 advice:"If your background brings genuine diversity to the class, don't shy away from it. But lead with what you'll contribute, not just who you are.",
 dos: ["Connect your identity to unique perspectives in class discussions","Share specific examples of bridging cultural gaps","Explain how diversity strengthened your leadership"],
 donts: ["Reduce yourself to demographic checkboxes","Claim diversity without substantive examples","Ignore diversity even if you're from an underrepresented group"],
 example:"Growing up bilingual in a border town taught me that the best business solutions come from translating between worlds - literally and figuratively.",
 },
 {
 title:"Follow Up After Award",
 category:"Strategy",
 advice:"If you receive a scholarship, send a thank-you note to the scholarship committee or donor. This builds relationships for your career.",
 dos: ["Send a handwritten or personal thank-you within a week","Update the committee on your progress during the MBA","Pay it forward by mentoring future applicants"],
 donts: ["Ghost the committee after receiving funds","Only thank them at graduation","Forget to list the scholarship on your resume/LinkedIn"],
 example:"After receiving the Johnson Scholarship, I wrote quarterly updates to the donor family and invited them to my capstone presentation - they're now advisors to my startup.",
 },
];

const CATEGORIES = ["All","Positioning","Strategy","Writing"];

export default function ScholarshipTipsPage() {
 const [category, setCategory] = useState("All");
 const [expanded, setExpanded] = useState<string | null>(null);

 const filtered = category ==="All" ? TIPS : TIPS.filter((t) => t.category === category);

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-5xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Scholarship Essay Tips
 </h1>
 <p className="text-white/70 text-lg">Expert strategies for winning MBA scholarship funding.</p>
 </div>
 </section>

 <div className="max-w-5xl mx-auto px-6 py-10">
 <div className="flex flex-wrap gap-2 mb-8">
 {CATEGORIES.map((cat) => (
 <button key={cat} onClick={() => setCategory(cat)}
 className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${category === cat ?"bg-foreground text-white":"bg-foreground/5 text-foreground/40 hover:bg-foreground/10"}`}>
 {cat}
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
 <Award size={18} className="text-primary mt-0.5 shrink-0"/>
 <div className="flex-1">
 <div className="flex items-center justify-between">
 <p className="font-medium text-foreground text-sm">{tip.title}</p>
 {isOpen ? <ChevronUp size={16} className="text-foreground/30"/> : <ChevronDown size={16} className="text-foreground/30"/>}
 </div>
 <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-bold">{tip.category}</span>
 <p className="text-xs text-foreground/50 mt-2">{tip.advice}</p>
 </div>
 </button>

 {isOpen && (
 <div className="px-5 pb-5 border-t border-border/5 space-y-4">
 <div className="grid md:grid-cols-2 gap-3 mt-4">
 <div className="p-3 bg-emerald-50/50 rounded-lg">
 <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-2 flex items-center gap-1">
 <CheckCircle2 size={10} /> Do
 </p>
 <ul className="space-y-1">
 {tip.dos.map((d) => (
 <li key={d} className="text-xs text-foreground/60 flex items-start gap-1.5">
 <span className="text-emerald-500 mt-0.5">+</span> {d}
 </li>
 ))}
 </ul>
 </div>
 <div className="p-3 bg-rose-50/50 rounded-lg">
 <p className="text-[10px] font-bold uppercase tracking-widest text-rose-700 mb-2 flex items-center gap-1">
 <AlertTriangle size={10} /> Don&apos;t
 </p>
 <ul className="space-y-1">
 {tip.donts.map((d) => (
 <li key={d} className="text-xs text-foreground/60 flex items-start gap-1.5">
 <span className="text-rose-500 mt-0.5">−</span> {d}
 </li>
 ))}
 </ul>
 </div>
 </div>
 <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
 <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1 flex items-center gap-1">
 <Lightbulb size={10} /> Example
 </p>
 <p className="text-xs text-foreground/70 italic leading-relaxed">&ldquo;{tip.example}&rdquo;</p>
 </div>
 </div>
 )}
 </div>
 );
 })}
 </div>

 <ToolCrossLinks current="/scholarship-tips"/>
 </div>
 </main>
 );
}
