"use client";

import { useState, useEffect } from"react";
import Link from"next/link";
import { ArrowRight, Zap } from"lucide-react";

type CrossLink = { href: string; label: string; desc: string; cat: string };

// Canonical tools only - no duplicates, no redirected routes.
// Organized by journey stage: Explore → Build → Apply → Interview → Decide → Utility
const ALL_TOOLS: CrossLink[] = [
 // Explore
 { href:"/schools", label:"School Directory", desc:"Browse 840+ programs", cat:"explore"},
 { href:"/simulator", label:"Odds Calculator", desc:"Your admit chances", cat:"explore"},
 { href:"/decisions", label:"Community Decisions", desc:"Real outcomes", cat:"explore"},
 { href:"/compare", label:"Compare Schools", desc:"Side-by-side analysis", cat:"explore"},
 { href:"/profile-report", label:"Profile Report", desc:"Strengths & fit scores", cat:"explore"},
 { href:"/rankings", label:"Rankings", desc:"Sort by stats", cat:"explore"},
 { href:"/gmat-targets", label:"GMAT Targets", desc:"Score by tier", cat:"explore"},
 { href:"/school-matcher", label:"School Matcher", desc:"Best-fit school finder", cat:"explore"},
 // Build
 { href:"/evaluator", label:"Essay Evaluator", desc:"AI essay feedback", cat:"build"},
 { href:"/roaster", label:"Resume Roaster", desc:"Bullet critique", cat:"build"},
 { href:"/storyteller", label:"Storyteller", desc:"Find your narrative", cat:"build"},
 { href:"/goals", label:"Goal Sculptor", desc:"Post-MBA story", cat:"build"},
 { href:"/essay-drafts", label:"Essay Drafts", desc:"Manage all essays", cat:"build"},
 { href:"/essay-prompts", label:"Essay Prompts", desc:"School-specific prompts", cat:"build"},
 // Apply
 { href:"/my-schools", label:"Application Tracker", desc:"Track every school", cat:"apply"},
 { href:"/deadlines", label:"Deadline Tracker", desc:"Calendar & round tracker", cat:"apply"},
 { href:"/calendar", label:"Deadline Calendar", desc:"Never miss a date", cat:"apply"},
 { href:"/checklist", label:"App Checklist", desc:"Requirements per school", cat:"apply"},
 { href:"/recommenders", label:"Rec Strategy", desc:"Letter planning & tracking", cat:"apply"},
 { href:"/outreach", label:"Networking Hub", desc:"Alumni outreach", cat:"apply"},
 // Interview
 { href:"/interview", label:"Mock Interview", desc:"AI interview practice", cat:"interview"},
 { href:"/interview/questions", label:"Question Bank", desc:"100+ curated questions", cat:"interview"},
 // Decide
 { href:"/scholarships", label:"Scholarships & Aid", desc:"Financial aid strategy", cat:"decide"},
 { href:"/waitlist", label:"Waitlist Strategy", desc:"Post-waitlist plan", cat:"decide"},
 { href:"/roi", label:"ROI Calculator", desc:"10-year returns", cat:"decide"},
 { href:"/salary", label:"Salary Calculator", desc:"Post-MBA pay", cat:"decide"},
 // Utility
 { href:"/score-convert", label:"GMAT↔GRE", desc:"Convert scores", cat:"utility"},
 { href:"/gmat-planner", label:"GMAT Planner", desc:"Study schedule", cat:"utility"},
 { href:"/fee-calculator", label:"Fee Calculator", desc:"Application costs", cat:"utility"},
 { href:"/round-strategy", label:"Round Strategy", desc:"R1 vs R2 vs R3", cat:"utility"},
];

/** Deterministic seeded hash for consistent shuffling per page. */
function hashStr(s: string): number {
 let h = 0;
 for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
 return Math.abs(h);
}

export function ToolCrossLinks({ current, count = 6 }: { current: string; count?: number }) {
 const [isFree, setIsFree] = useState(false);

 useEffect(() => {
 setIsFree((localStorage.getItem("ac_tier") ||"free") ==="free");
 }, []);

 // Filter out current page, pick one tool per category first for diversity
 const pool = ALL_TOOLS.filter((t) => t.href !== current);
 const seed = hashStr(current);

 // Group by category, seeded shuffle within each
 const byCat = new Map<string, CrossLink[]>();
 for (const t of pool) {
 const arr = byCat.get(t.cat) || [];
 arr.push(t);
 byCat.set(t.cat, arr);
 }

 // Pick one from each category (round-robin), seed-deterministic
 const categories = [...byCat.keys()].sort((a, b) => hashStr(a + current) - hashStr(b + current));
 const picked: CrossLink[] = [];
 let round = 0;
 while (picked.length < count && round < 10) {
 for (const cat of categories) {
 if (picked.length >= count) break;
 const items = byCat.get(cat)!;
 if (round < items.length) {
 // Pick the (seed + round)-th item from this category
 const idx = (seed + round) % items.length;
 const item = items[idx];
 if (!picked.some((p) => p.href === item.href)) {
 picked.push(item);
 }
 }
 }
 round++;
 }
 const others = picked;

 return (
 <div className="border-t border-border/5 mt-12 pt-8">
 <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/30 mb-4">More Tools</p>
 <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
 {others.map((t) => (
 <Link
 key={t.href}
 href={t.href}
 className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-primary/5 group transition-colors"
 >
 <div>
 <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{t.label}</p>
 <p className="text-[10px] text-foreground/30">{t.desc}</p>
 </div>
 <ArrowRight size={12} className="text-foreground/10 group-hover:text-primary transition-colors"/>
 </Link>
 ))}
 </div>
 <div className="mt-4 flex items-center justify-center gap-4">
 <Link href="/tools" className="text-xs text-primary hover:text-primary/80 font-medium">
 View all tools →
 </Link>
 {isFree && (
 <Link
 href="/pricing"
 className="flex items-center gap-1 text-xs text-foreground/40 hover:text-primary transition-colors"
 >
 <Zap size={10} /> Unlock unlimited
 </Link>
 )}
 </div>
 </div>
 );
}
