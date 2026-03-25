"use client";

import { useState } from"react";
import { Globe, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Plane, DollarSign, FileText, Briefcase } from"lucide-react";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type Section = {
 title: string;
 icon: typeof Globe;
 category: string;
 overview: string;
 keyPoints: string[];
 tips: string[];
 warning: string;
};

const SECTIONS: Section[] = [
 {
 title:"Visa Process (F-1 / J-1)",
 icon: FileText,
 category:"Legal",
 overview:"International MBA students in the US typically need an F-1 (student) or J-1 (exchange visitor) visa. The process takes 2-4 months from I-20 receipt to visa stamp.",
 keyPoints: [
"Request I-20 from your school as soon as you accept admission",
"Pay the SEVIS fee ($350 for F-1) before your embassy interview",
"Book embassy appointment 2-3 months before program start",
"Prepare proof of funds: tuition + living expenses for first year minimum",
"F-1 allows 12 months OPT + 24 months STEM extension at some schools",
 ],
 tips: [
"Apply for the visa in your home country - don't try third-country nationals processing",
"Practice your interview answers: 'Why this school?', 'What will you study?', 'Plans after graduation?'",
"Bring ALL documents even if not required - bank statements, employer letter, school transcripts",
 ],
 warning:"J-1 visa holders face a 2-year home-country residency requirement. Choose F-1 if you plan to work in the US post-MBA.",
 },
 {
 title:"Funding & Financial Aid",
 icon: DollarSign,
 category:"Financial",
 overview:"International students have fewer federal loan options but more scholarship opportunities than they realize. Start early and cast a wide net.",
 keyPoints: [
"Apply for school-specific scholarships - many are available to internationals",
"Explore Prodigy Finance, MPOWER, and other international student lenders",
"Some schools offer need-blind international aid (check each school's policy)",
"Look into home-country government scholarships (Fulbright, Chevening, etc.)",
"Budget $80-120K/year for US MBA programs (tuition + living expenses)",
 ],
 tips: [
"Apply for fellowships separately from admission - Forté, Toigo, Consortium",
"Some employers offer sponsorship with return obligations - weigh the trade-offs",
"Open a US bank account immediately upon arrival for easier financial management",
 ],
 warning:"International students cannot access US federal student loans. Factor this into your school selection and have your funding plan ready before matriculation.",
 },
 {
 title:"GMAT/GRE for International Applicants",
 icon: FileText,
 category:"Testing",
 overview:"International applicants are held to the same GMAT/GRE standards. If English is not your first language, you'll also need TOEFL/IELTS.",
 keyPoints: [
"Target at or above the school's median GMAT/GRE - no 'international discount'",
"TOEFL: most schools require 100+ iBT; some waive if you have English-medium degree",
"IELTS: typically 7.0+ overall with no band below 6.5",
"Some schools accept Duolingo English Test (120+) as alternative",
"Plan to take GMAT 4-6 months before application deadline",
 ],
 tips: [
"Verbal/AWA scores matter more for internationals - it signals English proficiency",
"If your TOEFL is borderline, consider retaking before the school has to waive it",
"PTE Academic is increasingly accepted - check your target schools",
 ],
 warning:"Don't assume your undergraduate English-medium education automatically waives TOEFL. Each school has its own policy - verify before applying.",
 },
 {
 title:"Post-MBA Work Authorization",
 icon: Briefcase,
 category:"Career",
 overview:"Your work authorization pathway determines which careers and geographies are realistic post-MBA. Plan this before you even apply.",
 keyPoints: [
"OPT: 12 months automatic work authorization post-graduation (F-1 visa)",
"STEM OPT Extension: Additional 24 months if your MBA has a STEM designation",
"H-1B lottery: ~30% chance per year. Most employers sponsor, but it's uncertain",
"Many consulting and banking firms sponsor H-1B for MBA hires",
"Alternative: O-1 visa (extraordinary ability) or L-1 (intracompany transfer)",
 ],
 tips: [
"Prioritize schools with STEM-designated MBA programs for 36 months total OPT",
"Target industries with strong H-1B sponsorship track records (consulting, tech, banking)",
"Network with international alumni who successfully navigated the visa process",
 ],
 warning:"Tech companies have reduced H-1B sponsorship in recent years. Have a Plan B geography (home country, Canada, UK, Singapore) where you have work rights.",
 },
 {
 title:"Cultural Adjustment & Networking",
 icon: Globe,
 category:"Life",
 overview:"The social and cultural aspects of MBA life can be just as challenging as academics. Proactively building your network is critical.",
 keyPoints: [
"Join the international student association and country-specific clubs",
"Attend pre-MBA meetups in your home city - many schools organize these",
"American classroom culture rewards participation - practice speaking up",
"Case method schools expect you to contribute to 40%+ of class discussions",
"Form study groups with a mix of domestic and international students",
 ],
 tips: [
"Don't self-segregate into home-country friend groups - diversify your network",
"Host a 'culture night' - it's the fastest way to build community capital",
"American business communication is direct. Don't read negative intent into directness.",
 ],
 warning:"Many international students report feeling isolated in the first 3 months. This is normal. Push through by saying yes to every social invitation in month 1.",
 },
 {
 title:"Housing & Logistics",
 icon: Plane,
 category:"Life",
 overview:"Moving to a new country for MBA requires careful logistical planning. Start 3-4 months before arrival.",
 keyPoints: [
"Apply for on-campus housing early - it's usually cheaper and simpler for internationals",
"Get international health insurance (required at most US schools)",
"Bring enough cash for first 2 weeks before your bank account is set up",
"Get a US phone number on arrival - Google Fi or T-Mobile prepaid work internationally",
"Obtain an SSN (Social Security Number) if you plan to work on campus",
 ],
 tips: [
"Ship heavy items via sea freight 6-8 weeks before departure - much cheaper than excess luggage",
"Join admitted student housing groups on Facebook for roommate matching",
"Bring formal business attire - you'll need it for recruiting events starting week 1",
 ],
 warning:"Don't sign a 12-month lease if your program is 10 months. Negotiate MBA-friendly lease terms or choose school housing.",
 },
];

const CATEGORIES = ["All","Legal","Financial","Testing","Career","Life"];

export default function InternationalGuidePage() {
 const [category, setCategory] = useState("All");
 const [expanded, setExpanded] = useState<string | null>(null);

 const filtered = category ==="All" ? SECTIONS : SECTIONS.filter((s) => s.category === category);

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-5xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 International Student Guide
 </h1>
 <p className="text-white/70 text-lg">Visa, funding, testing, career, and cultural advice for international MBA applicants.</p>
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
 {filtered.map((section) => {
 const isOpen = expanded === section.title;
 const Icon = section.icon;
 return (
 <div key={section.title} className="editorial-card overflow-hidden">
 <button onClick={() => setExpanded(isOpen ? null : section.title)}
 className="w-full text-left p-5 flex items-start gap-3">
 <Icon size={18} className="text-primary mt-0.5 shrink-0"/>
 <div className="flex-1">
 <div className="flex items-center justify-between">
 <p className="font-medium text-foreground text-sm">{section.title}</p>
 {isOpen ? <ChevronUp size={16} className="text-foreground/30"/> : <ChevronDown size={16} className="text-foreground/30"/>}
 </div>
 <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-bold">{section.category}</span>
 <p className="text-xs text-foreground/50 mt-2">{section.overview}</p>
 </div>
 </button>

 {isOpen && (
 <div className="px-5 pb-5 border-t border-border/5 space-y-4">
 <div className="mt-4">
 <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/30 mb-2">Key Points</p>
 <div className="space-y-1.5">
 {section.keyPoints.map((p, i) => (
 <div key={i} className="flex items-start gap-2">
 <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0"/>
 <p className="text-xs text-foreground/60">{p}</p>
 </div>
 ))}
 </div>
 </div>
 <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
 <p className="text-[10px] font-bold text-primary mb-2">Pro Tips</p>
 <ul className="space-y-1">
 {section.tips.map((t) => (
 <li key={t} className="text-xs text-foreground/60 flex items-start gap-1.5">
 <span className="text-primary mt-0.5">*</span> {t}
 </li>
 ))}
 </ul>
 </div>
 <div className="p-3 bg-rose-50/50 rounded-lg">
 <p className="text-[10px] font-bold text-rose-700 mb-1 flex items-center gap-1"><AlertTriangle size={10} /> Warning</p>
 <p className="text-xs text-foreground/60">{section.warning}</p>
 </div>
 </div>
 )}
 </div>
 );
 })}
 </div>

 <ToolCrossLinks current="/international-guide"/>
 </div>
 </main>
 );
}
