"use client";

import { useState } from"react";
import { FileText, Copy, Check, ChevronDown, ChevronUp } from"lucide-react";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type Template = {
 name: string;
 category: string;
 description: string;
 structure: { section: string; wordPct: number; guidance: string }[];
 example_opening: string;
 bestFor: string;
};

const TEMPLATES: Template[] = [
 {
 name:"The Career Arc",
 category:"Goals Essay",
 description:"Classic past → present → future narrative for 'Why MBA?' and career goals essays.",
 structure: [
 { section:"Hook", wordPct: 10, guidance:"Start with a specific moment that shaped your career direction."},
 { section:"Professional Journey", wordPct: 30, guidance:"Trace your career path with 2-3 key milestones. Show growth and pattern."},
 { section:"The Gap", wordPct: 15, guidance:"Articulate what you cannot achieve without an MBA. Be specific about skills or network."},
 { section:"Why This School", wordPct: 25, guidance:"Name 2-3 specific resources (courses, clubs, professors, alumni) and connect each to your gap."},
 { section:"Long-Term Vision", wordPct: 20, guidance:"Paint a vivid picture of your 10-year impact. Make it ambitious but credible."},
 ],
 example_opening:"When I watched my first startup fail because we couldn't scale past 50 employees, I realized that vision without management skills is just a dream.",
 bestFor:"HBS, Stanford, Wharton career goals prompts",
 },
 {
 name:"The Leadership Crucible",
 category:"Leadership Essay",
 description:"Showcase leadership through a challenging situation using the STAR+ framework.",
 structure: [
 { section:"The Stakes", wordPct: 15, guidance:"Set up the situation - what was at risk and why it mattered."},
 { section:"Your Role", wordPct: 10, guidance:"Clarify your specific position and why leadership fell to you."},
 { section:"The Challenge", wordPct: 20, guidance:"Describe the core tension - conflicting stakeholders, resource constraints, ethical dilemmas."},
 { section:"Your Actions", wordPct: 30, guidance:"Detail 2-3 specific decisions you made. Include your reasoning, not just what you did."},
 { section:"Impact + Reflection", wordPct: 25, guidance:"Quantify results where possible. Then reflect: what did you learn about your leadership style?"},
 ],
 example_opening:"Three days before our product launch, my lead engineer quit - and I had to decide whether to delay a $2M rollout or ship with known gaps.",
 bestFor:"Kellogg, Tuck, Ross leadership essays",
 },
 {
 name:"The Values Reveal",
 category:"Personal Essay",
 description:"Reveal character and values through a defining personal experience.",
 structure: [
 { section:"The Moment", wordPct: 20, guidance:"Drop the reader into a vivid scene. Use sensory details - sight, sound, emotion."},
 { section:"Context", wordPct: 15, guidance:"Brief background: why were you in this situation? Keep this tight."},
 { section:"The Inner Conflict", wordPct: 20, guidance:"What values were in tension? What made this hard?"},
 { section:"What You Did", wordPct: 20, guidance:"Your choice and actions. Show agency."},
 { section:"Who It Made You", wordPct: 25, guidance:"Connect to your identity. How does this value drive your MBA and career aspirations?"},
 ],
 example_opening:"The interpreter's voice cracked as she translated: 'They said if you leave, the school closes forever.'",
 bestFor:"Stanford 'What matters most?', Yale 'Biggest commitment'",
 },
 {
 name:"The Impact Story",
 category:"Contribution Essay",
 description:"Show how you'll contribute to the MBA community through past evidence of impact.",
 structure: [
 { section:"Community Context", wordPct: 15, guidance:"Describe a community you've meaningfully shaped - workplace, nonprofit, cultural group."},
 { section:"Your Unique Contribution", wordPct: 25, guidance:"What specific role did you play? Focus on what only YOU could bring."},
 { section:"Tangible Impact", wordPct: 20, guidance:"Numbers, outcomes, and testimonials. Show the delta you created."},
 { section:"MBA Community Plan", wordPct: 25, guidance:"Connect to 2-3 specific clubs, initiatives, or traditions at this school."},
 { section:"Ripple Effect", wordPct: 15, guidance:"How will your contribution extend beyond campus into career and society?"},
 ],
 example_opening:"When I noticed that none of our 200 interns came from non-target schools, I built a pipeline that now sources 40% of our class from overlooked universities.",
 bestFor:"Booth, Columbia, Darden contribution essays",
 },
 {
 name:"The Failure Reframe",
 category:"Failure Essay",
 description:"Transform a failure into evidence of growth, resilience, and self-awareness.",
 structure: [
 { section:"The Ambition", wordPct: 15, guidance:"What were you trying to achieve? Show the goal was worthy."},
 { section:"What Went Wrong", wordPct: 20, guidance:"Be honest and specific. Own your part - don't blame circumstances."},
 { section:"The Reckoning", wordPct: 15, guidance:"The moment you realized it had failed. What did you feel?"},
 { section:"Root Cause Analysis", wordPct: 25, guidance:"Go deeper than surface causes. What assumption, blind spot, or behavior was the real issue?"},
 { section:"The Changed Behavior", wordPct: 25, guidance:"Concrete evidence of how you've changed. Ideally, a subsequent success that proved the lesson stuck."},
 ],
 example_opening:"I spent six months building a product that exactly zero customers wanted - and the worst part was, the data told me so on day one.",
 bestFor:"HBS, Kellogg, Haas failure/setback prompts",
 },
 {
 name:"The Why Now",
 category:"Goals Essay",
 description:"Focused structure for 'Why MBA now?' timing justification essays.",
 structure: [
 { section:"Current Momentum", wordPct: 20, guidance:"Show you're on an upward trajectory. You're not running from something - you're accelerating."},
 { section:"The Ceiling", wordPct: 20, guidance:"What specific ceiling have you hit that only an MBA can break through?"},
 { section:"Market Timing", wordPct: 15, guidance:"Why is this the right moment in your industry or personal life?"},
 { section:"The MBA Unlock", wordPct: 25, guidance:"Specific skills, networks, or credentials you'll gain. Be concrete about courses and clubs."},
 { section:"Urgency", wordPct: 20, guidance:"What happens if you wait 2 more years? Why is the cost of delay high?"},
 ],
 example_opening:"After leading three product launches in two years, I keep getting pulled into the same meeting: the one where strategy gets decided, and I'm not at the table.",
 bestFor:"Short-form prompts (250-300 words) asking 'Why now?'",
 },
];

const CATEGORIES = ["All","Goals Essay","Leadership Essay","Personal Essay","Contribution Essay","Failure Essay"];

export default function EssayTemplatesPage() {
 const [category, setCategory] = useState("All");
 const [expanded, setExpanded] = useState<string | null>(null);
 const [copied, setCopied] = useState<string | null>(null);

 const filtered = category ==="All" ? TEMPLATES : TEMPLATES.filter((t) => t.category === category);

 const handleCopy = (text: string, id: string) => {
 navigator.clipboard.writeText(text);
 setCopied(id);
 setTimeout(() => setCopied(null), 2000);
 };

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-5xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Essay Structure Templates
 </h1>
 <p className="text-white/70 text-lg">Proven frameworks for every MBA essay type - with section-by-section guidance.</p>
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
 {filtered.map((tmpl) => {
 const isOpen = expanded === tmpl.name;
 return (
 <div key={tmpl.name} className="editorial-card overflow-hidden">
 <button onClick={() => setExpanded(isOpen ? null : tmpl.name)}
 className="w-full text-left p-5 flex items-start gap-3">
 <FileText size={18} className="text-primary mt-0.5 shrink-0"/>
 <div className="flex-1">
 <div className="flex items-center justify-between">
 <p className="font-medium text-foreground text-sm">{tmpl.name}</p>
 {isOpen ? <ChevronUp size={16} className="text-foreground/30"/> : <ChevronDown size={16} className="text-foreground/30"/>}
 </div>
 <p className="text-[10px] text-primary font-bold mt-0.5">{tmpl.category}</p>
 <p className="text-xs text-foreground/50 mt-1">{tmpl.description}</p>
 <p className="text-[10px] text-foreground/30 mt-1 italic">Best for: {tmpl.bestFor}</p>
 </div>
 </button>

 {isOpen && (
 <div className="px-5 pb-5 border-t border-border/5">
 {/* Structure breakdown */}
 <div className="mt-4 space-y-3">
 <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">Structure</p>
 {/* Visual bar */}
 <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
 {tmpl.structure.map((s, i) => (
 <div key={s.section} className="h-full rounded-full"
 style={{ width: `${s.wordPct}%`, backgroundColor: `hsl(${40 + i * 50}, 60%, 60%)` }}
 title={`${s.section}: ${s.wordPct}%`} />
 ))}
 </div>
 {tmpl.structure.map((s, i) => (
 <div key={s.section} className="flex items-start gap-2">
 <div className="w-2 h-2 rounded-full mt-1.5 shrink-0"
 style={{ backgroundColor: `hsl(${40 + i * 50}, 60%, 60%)` }} />
 <div className="flex-1">
 <div className="flex items-center gap-2">
 <span className="text-xs font-medium text-foreground">{s.section}</span>
 <span className="text-[10px] text-foreground/30">{s.wordPct}% of word count</span>
 </div>
 <p className="text-xs text-foreground/50 mt-0.5">{s.guidance}</p>
 </div>
 </div>
 ))}
 </div>

 {/* Example opening */}
 <div className="mt-5 p-3 bg-primary/5 rounded-lg border border-primary/10">
 <div className="flex items-center justify-between mb-1">
 <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Example Opening</p>
 <button onClick={() => handleCopy(tmpl.example_opening, tmpl.name)}
 className="text-[10px] text-foreground/30 hover:text-primary flex items-center gap-1 transition-colors">
 {copied === tmpl.name ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
 </button>
 </div>
 <p className="text-xs text-foreground/70 italic leading-relaxed">&ldquo;{tmpl.example_opening}&rdquo;</p>
 </div>
 </div>
 )}
 </div>
 );
 })}
 </div>

 <ToolCrossLinks current="/essay-templates"/>
 </div>
 </main>
 );
}
