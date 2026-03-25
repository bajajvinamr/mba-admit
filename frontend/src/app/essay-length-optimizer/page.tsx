"use client";

import { useState } from"react";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type EssayLimit = { school: string; prompt: string; limit: number };

const LIMITS: EssayLimit[] = [
 { school:"HBS", prompt:"What more would you like us to know?", limit: 900 },
 { school:"Stanford GSB", prompt:"What matters most to you, and why?", limit: 650 },
 { school:"Stanford GSB", prompt:"Why Stanford?", limit: 400 },
 { school:"Wharton", prompt:"What do you hope to gain professionally?", limit: 500 },
 { school:"Wharton", prompt:"Describe an impactful experience.", limit: 400 },
 { school:"Booth", prompt:"How will Chicago Booth help you achieve your goals?", limit: 250 },
 { school:"Kellogg", prompt:"Kellogg's purpose is to educate, equip...", limit: 450 },
 { school:"CBS", prompt:"What is your immediate post-MBA goal?", limit: 200 },
 { school:"CBS", prompt:"Through your resume we can see what you've done. Tell us who you are.", limit: 500 },
 { school:"MIT Sloan", prompt:"MIT Sloan seeks students who will...", limit: 300 },
 { school:"Tuck", prompt:"Why is an MBA a critical next step?", limit: 300 },
 { school:"Haas", prompt:"What makes you feel alive?", limit: 300 },
 { school:"Yale SOM", prompt:"Describe the biggest commitment you've made.", limit: 500 },
 { school:"Ross", prompt:"What is your short-term career goal?", limit: 300 },
 { school:"Fuqua", prompt:"25 Random Things About Yourself.", limit: 500 },
];

export default function EssayLengthOptimizerPage() {
 const [text, setText] = useState("");
 const [selectedSchool, setSelectedSchool] = useState("All");
 const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

 const schools = ["All", ...new Set(LIMITS.map((l) => l.school))];
 const filtered = selectedSchool ==="All" ? LIMITS : LIMITS.filter((l) => l.school === selectedSchool);

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-4xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">Essay Length Optimizer</h1>
 <p className="text-white/70 text-lg">Check your essay against school-specific word limits in real time.</p>
 </div>
 </section>

 <div className="max-w-4xl mx-auto px-6 py-10">
 <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste your essay here..."
 className="w-full h-40 p-4 rounded-lg border border-border/10 bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y mb-2"/>
 <div className="flex items-center justify-between mb-6">
 <p className="text-sm font-bold text-foreground">{wordCount} words</p>
 <div className="flex gap-1">
 {schools.map((s) => (
 <button key={s} onClick={() => setSelectedSchool(s)}
 className={`text-[10px] px-2 py-1 rounded-full ${selectedSchool === s ?"bg-foreground text-white":"bg-foreground/5 text-muted-foreground"}`}>{s}</button>
 ))}
 </div>
 </div>

 <div className="space-y-2">
 {filtered.map((l, i) => {
 const pct = wordCount > 0 ? Math.round((wordCount / l.limit) * 100) : 0;
 const status = wordCount === 0 ?"empty": wordCount <= l.limit * 0.8 ?"short": wordCount <= l.limit ?"good": wordCount <= l.limit * 1.05 ?"close":"over";
 const colors: Record<string, string> = { empty:"bg-foreground/10", short:"bg-amber-400", good:"bg-emerald-500", close:"bg-amber-500", over:"bg-red-500"};
 const labels: Record<string, string> = { empty:"-", short:"Under", good:"Good", close:"Close", over:"Over"};
 return (
 <div key={i} className="editorial-card p-4">
 <div className="flex items-center justify-between mb-1">
 <div>
 <span className="text-[10px] font-bold text-primary mr-2">{l.school}</span>
 <span className="text-xs text-muted-foreground">{l.prompt.slice(0, 60)}{l.prompt.length > 60 ?"...":""}</span>
 </div>
 <div className="flex items-center gap-2">
 <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${status ==="over" ?"bg-red-100 text-red-600": status ==="good" ?"bg-emerald-100 text-emerald-600":"bg-foreground/5 text-muted-foreground"}`}>
 {labels[status]}
 </span>
 <span className="text-xs font-bold text-foreground tabular-nums">{wordCount}/{l.limit}</span>
 </div>
 </div>
 <div className="h-2 bg-foreground/5 rounded-full overflow-hidden">
 <div className={`h-full rounded-full transition-all ${colors[status]}`} style={{ width: `${Math.min(pct, 100)}%` }} />
 </div>
 </div>
 );
 })}
 </div>

 <ToolCrossLinks current="/essay-length-optimizer"/>
 </div>
 </main>
 );
}
