"use client";

import { Quote } from "lucide-react";
import { Marquee } from "@/components/ui/marquee";

const TESTIMONIALS = [
 {
 quote: "The essay evaluator alone was worth the upgrade. Got into Booth R1.",
 initials: "AK",
 school: "Booth '28",
 tool: "Essay Evaluator",
 },
 {
 quote: "Used the odds calculator for 8 schools. Saved me from wasting applications on reaches.",
 initials: "MR",
 school: "Wharton '28",
 tool: "Odds Calculator",
 },
 {
 quote: "The scholarship negotiator helped me secure $40K more. ROI on Pro was instant.",
 initials: "JL",
 school: "Kellogg '28",
 tool: "Scholarship Negotiator",
 },
 {
 quote: "Mock interviews felt brutally real. Got a callback from my top choice within a week of using it.",
 initials: "SP",
 school: "INSEAD '28",
 tool: "Mock Interview",
 },
 {
 quote: "Went from a vague career goal to a tight narrative in one session with the Storyteller. My essay coach was impressed.",
 initials: "RD",
 school: "HBS '28",
 tool: "Storyteller",
 },
 {
 quote: "School comparison tool made my final decision between Stern and Ross so much clearer. The data was spot on.",
 initials: "NK",
 school: "Ross '28",
 tool: "Compare Schools",
 },
];

function TestimonialCard({ t }: { t: typeof TESTIMONIALS[number] }) {
 return (
 <div className="w-[340px] shrink-0 bg-[#141414] border border-border p-6 flex flex-col">
 <Quote size={16} className="text-primary/30 mb-3" />
 <p className="text-sm text-foreground/70 italic leading-relaxed flex-1">
 &ldquo;{t.quote}&rdquo;
 </p>
 <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 flex items-center justify-center text-[10px] font-bold text-primary bg-primary/10">
 {t.initials}
 </div>
 <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
 {t.school}
 </span>
 </div>
 <span className="text-[9px] font-medium text-primary/80 bg-primary/10 px-2 py-0.5">
 {t.tool}
 </span>
 </div>
 </div>
 );
}

export function TestimonialGrid() {
 const firstRow = TESTIMONIALS.slice(0, 3);
 const secondRow = TESTIMONIALS.slice(3);

 return (
 <section className="bg-background py-20 border-b border-border overflow-hidden">
 <div className="max-w-7xl mx-auto px-8 mb-12">
 <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4 font-medium text-center">
 What Applicants Say
 </p>
 <h2 className="heading-serif text-4xl text-center text-foreground">
 Real Results. Real Stories.
 </h2>
 </div>

 <div className="space-y-4">
 <Marquee speed={35} direction="left" pauseOnHover>
 {firstRow.map((t) => (
 <TestimonialCard key={t.initials} t={t} />
 ))}
 </Marquee>
 <Marquee speed={35} direction="right" pauseOnHover>
 {secondRow.map((t) => (
 <TestimonialCard key={t.initials} t={t} />
 ))}
 </Marquee>
 </div>
 </section>
 );
}
