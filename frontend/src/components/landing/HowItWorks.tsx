"use client";

import { motion } from "framer-motion";
import { Search, Target, FileText, Trophy } from "lucide-react";

const STEPS = [
  {
    step: "01",
    icon: <Search size={22} strokeWidth={1.6} />,
    title: "Know Your Real Chances",
    desc: "Enter your GMAT and GPA. See which schools are reaches, targets, and safeties — based on 67,000+ real outcomes, not guesswork.",
    tag: "FREE",
    tagColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    step: "02",
    icon: <Target size={22} strokeWidth={1.6} />,
    title: "Build the Right School List",
    desc: "Compare 905 programs side-by-side. Filter by scholarship generosity, class profile, ROI, and career outcomes. Find your best fit.",
    tag: "DATA-DRIVEN",
    tagColor: "bg-primary/5 text-primary border-primary/20",
  },
  {
    step: "03",
    icon: <FileText size={22} strokeWidth={1.6} />,
    title: "Write Essays That Get You In",
    desc: "Study 340+ real successful essays. Get feedback on structure, authenticity, and school-specific fit. Sound like yourself, not ChatGPT.",
    tag: "341 REAL ESSAYS",
    tagColor: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    step: "04",
    icon: <Trophy size={22} strokeWidth={1.6} />,
    title: "Maximize Your Scholarship",
    desc: "See which schools actually give money to profiles like yours. Tepper gives aid to 89% of admits. Harvard gives almost none. We show you the data.",
    tag: "EXCLUSIVE DATA",
    tagColor: "bg-violet-50 text-violet-700 border-violet-200",
  },
];

export function HowItWorks() {
  return (
    <section className="max-w-6xl mx-auto px-6 lg:px-8 py-20">
      <div className="text-center mb-14">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/40 mb-3 font-semibold">
          How It Works
        </p>
        <h2 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight mb-3">
          Everything consultants charge lakhs for.
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          The same research, strategy, and essay support — powered by real admissions data
          instead of one person's opinion.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {STEPS.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className="group relative p-6 bg-card border border-border/50 rounded-xl hover:border-border transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-muted/50 rounded-lg shrink-0 group-hover:bg-primary/5 transition-colors">
                {item.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">
                    {item.step}
                  </span>
                  <span className={`text-[9px] px-2 py-0.5 font-semibold uppercase tracking-wider border rounded-full ${item.tagColor}`}>
                    {item.tag}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1.5">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
