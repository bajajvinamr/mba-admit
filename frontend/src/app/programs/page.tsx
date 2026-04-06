"use client";

import Link from"next/link";
import { GraduationCap, Briefcase, Globe, Award } from"lucide-react";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

const PROGRAMS = [
 {
 href:"/programs/mba",
 icon: <GraduationCap size={28} />,
 title:"MBA",
 subtitle:"Full-Time MBA",
 count:"220+",
 desc:"The classic 1-2 year MBA for career switchers with 3-7 years of experience. GMAT/GRE required.",
 color:"border-primary/30 hover:border-primary",
 },
 {
 href:"/programs/mim",
 icon: <Globe size={28} />,
 title:"MiM",
 subtitle:"Masters in Management",
 count:"304+",
 desc:"Pre-experience master's for recent graduates (0-2 years). Popular in Europe. Lower tuition than MBA.",
 color:"border-blue-200 hover:border-blue-400",
 },
 {
 href:"/programs/emba",
 icon: <Briefcase size={28} />,
 title:"Executive MBA",
 subtitle:"EMBA",
 count:"256+",
 desc:"Weekend/modular format for senior professionals with 8+ years. Keep your career while studying.",
 color:"border-purple-200 hover:border-purple-400",
 },
 {
 href:"/programs/cat",
 icon: <Award size={28} />,
 title:"MBA (CAT)",
 subtitle:"Indian MBA Programs",
 count:"60+",
 desc:"India's IIMs, ISB, XLRI and more. CAT/XAT admission. World-class education with exceptional ROI.",
 color:"border-orange-200 hover:border-orange-400",
 },
];

export default function ProgramsIndexPage() {
 return (
 <div className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-8">
 <div className="max-w-4xl mx-auto text-center">
 <p className="text-xs uppercase tracking-[0.2em] text-primary mb-4">Choose Your Path</p>
 <h1 className="heading-serif text-4xl md:text-5xl mb-4">Browse by Program Type</h1>
 <p className="text-white/60 text-lg max-w-2xl mx-auto">
 905 programs across MBA, MiM, Executive MBA, and Indian MBA. Find the right program for your career stage.
 </p>
 </div>
 </section>

 <section className="max-w-4xl mx-auto px-8 py-16">
 <div className="grid md:grid-cols-2 gap-6">
 {PROGRAMS.map(p => (
 <Link key={p.href} href={p.href}
 className={`editorial-card p-8 border-2 ${p.color} transition-all group`}>
 <div className="text-primary mb-4">{p.icon}</div>
 <div className="flex items-baseline gap-3 mb-2">
 <h2 className="heading-serif text-2xl group-hover:text-primary transition-colors">{p.title}</h2>
 <span className="text-xs font-bold text-muted-foreground/30 uppercase tracking-wider">{p.count} programs</span>
 </div>
 <p className="text-xs font-bold text-muted-foreground/50 uppercase tracking-wider mb-3">{p.subtitle}</p>
 <p className="text-sm text-muted-foreground/60 leading-relaxed">{p.desc}</p>
 </Link>
 ))}
 </div>
 </section>

 <div className="max-w-4xl mx-auto px-8 pb-16">
 <ToolCrossLinks current="/programs"/>
 </div>
 </div>
 );
}
