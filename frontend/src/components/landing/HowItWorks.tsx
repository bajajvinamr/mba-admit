"use client";

import { motion } from"framer-motion";
import { Calculator, MessageSquare, FileText, CheckCircle } from"lucide-react";

const STEPS = [
 { step:"01", icon: <Calculator size={24} strokeWidth={1.5} />, title:"Check Your Odds", desc:"Enter GMAT and GPA. See which schools are reaches, targets, and safeties. Free, no signup needed.", tag:"FREE"},
 { step:"02", icon: <MessageSquare size={24} strokeWidth={1.5} />, title:"Deep Interview", desc:"Our AI interviewer extracts your career story, leadership moments, and goals through a 20-minute structured conversation.", tag:"INTERVIEW"},
 { step:"03", icon: <FileText size={24} strokeWidth={1.5} />, title:"AI Draft + Humanizer", desc:"AI drafts essays tailored to each school, then our humanizer removes all AI tells. No generic, sterile prose.", tag:"AI + HUMANIZER"},
 { step:"04", icon: <CheckCircle size={24} strokeWidth={1.5} />, title:"Review & Refine", desc:"AI evaluates every essay against school-specific criteria. Iterate until your narrative is compelling and authentic.", tag:"AI REVIEW"},
];

export function HowItWorks() {
 return (
 <section className="max-w-7xl mx-auto px-8 py-20 border-b border-border/5">
 <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/40 mb-4 font-medium text-center">How It Works</p>
 <h2 className="heading-serif text-4xl text-center mb-4">From Profile to Polished Essays.</h2>
 <p className="text-center text-muted-foreground/50 max-w-lg mx-auto mb-16">Not a chatbot. Not a templating engine. AI that understands admissions from end to end.</p>

 <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
 {STEPS.map((item, i) => (
 <motion.div
 key={i}
 initial={{ opacity: 0, y: 20 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 transition={{ delay: i * 0.1 }}
 className="text-center"
 >
 <div className="inline-flex items-center justify-center w-14 h-14 bg-background border border-border/10 mb-5">
 {item.icon}
 </div>
 <div className="flex items-center justify-center gap-2 mb-3">
 <p className="text-xs uppercase tracking-widest text-muted-foreground/40 font-bold">{item.step}</p>
 <span className={`text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider ${item.tag ==="FREE" ?"bg-emerald-50 text-emerald-700": item.tag ==="AI REVIEW" ?"bg-primary/20 text-primary":"bg-muted text-muted-foreground"}`}>
 {item.tag}
 </span>
 </div>
 <h3 className="heading-serif text-xl mb-3">{item.title}</h3>
 <p className="text-muted-foreground/60 text-sm leading-relaxed">{item.desc}</p>
 </motion.div>
 ))}
 </div>
 </section>
 );
}
