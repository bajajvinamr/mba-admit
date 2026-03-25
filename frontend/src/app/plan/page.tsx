"use client";

import { useState } from"react";
import { Calendar, CheckCircle2, Clock, ArrowRight } from"lucide-react";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import { EmailCapture } from"@/components/EmailCapture";

type TimelineEvent = { month: string; title: string; desc: string; category: string };

const ROUND_TIMELINES: Record<string, TimelineEvent[]> = {
 R1: [
 { month:"Mar–Apr", title:"Research Schools", desc:"Build your school list, attend webinars, connect with alumni", category:"research"},
 { month:"Apr–May", title:"Take GMAT/GRE", desc:"Target score finalized, retake if needed", category:"test"},
 { month:"May–Jun", title:"Draft Essays", desc:"Start 'Why MBA' and school-specific essays", category:"essay"},
 { month:"Jun–Jul", title:"Request Recommendations", desc:"Brief your recommenders, share talking points", category:"rec"},
 { month:"Jul–Aug", title:"Finalize Essays", desc:"Polish, get feedback, iterate. Multiple drafts.", category:"essay"},
 { month:"Aug", title:"Complete Applications", desc:"Fill out forms, upload documents, proofread everything", category:"app"},
 { month:"Sep", title:"Submit R1", desc:"Most R1 deadlines fall in September", category:"submit"},
 { month:"Oct–Nov", title:"Interviews", desc:"Prepare, mock interview, follow up", category:"interview"},
 { month:"Dec", title:"Decisions", desc:"R1 results typically arrive in December", category:"decision"},
 ],
 R2: [
 { month:"Jun–Jul", title:"Research Schools", desc:"Finalize school list, attend events", category:"research"},
 { month:"Jul–Aug", title:"Take GMAT/GRE", desc:"Complete testing with buffer for retakes", category:"test"},
 { month:"Aug–Sep", title:"Draft Essays", desc:"Start with core essays, adapt per school", category:"essay"},
 { month:"Sep–Oct", title:"Request Recommendations", desc:"Give recommenders 6+ weeks", category:"rec"},
 { month:"Oct–Nov", title:"Finalize Essays", desc:"Polish all essays, multiple review rounds", category:"essay"},
 { month:"Nov–Dec", title:"Complete Applications", desc:"Final review and submission", category:"app"},
 { month:"Jan", title:"Submit R2", desc:"Most R2 deadlines in January", category:"submit"},
 { month:"Feb–Mar", title:"Interviews", desc:"Interview invites and preparation", category:"interview"},
 { month:"Mar–Apr", title:"Decisions", desc:"R2 results and deposit deadlines", category:"decision"},
 ],
 R3: [
 { month:"Oct–Nov", title:"Research & Test", desc:"Compressed timeline - finalize GMAT and school list", category:"research"},
 { month:"Dec–Jan", title:"Essays & Recs", desc:"Parallel track: draft essays while briefing recommenders", category:"essay"},
 { month:"Feb–Mar", title:"Submit R3", desc:"Most R3 deadlines in March/April", category:"submit"},
 { month:"Apr–May", title:"Interviews & Decisions", desc:"Quick turnaround - results by May/June", category:"decision"},
 ],
};

const CATEGORY_COLORS: Record<string, string> = {
 research:"bg-blue-50 text-blue-600 border-blue-200",
 test:"bg-purple-50 text-purple-600 border-purple-200",
 essay:"bg-primary/10 text-primary border-primary/30",
 rec:"bg-emerald-50 text-emerald-600 border-emerald-200",
 app:"bg-orange-50 text-orange-600 border-orange-200",
 submit:"bg-red-50 text-red-600 border-red-200",
 interview:"bg-indigo-50 text-indigo-600 border-indigo-200",
 decision:"bg-green-50 text-green-700 border-green-200",
};

export default function PlanPage() {
 const [round, setRound] = useState<"R1"|"R2"|"R3">("R1");
 const events = ROUND_TIMELINES[round];

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-4xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Application Timeline Planner
 </h1>
 <p className="text-white/70 text-lg">Month-by-month roadmap for your target round.</p>
 </div>
 </section>

 <div className="max-w-3xl mx-auto px-6 py-10">
 {/* Round selector */}
 <div className="flex gap-3 mb-8 justify-center">
 {(["R1","R2","R3"] as const).map((r) => (
 <button key={r} onClick={() => setRound(r)}
 className={`px-6 py-2 text-sm font-bold rounded-full border transition-all ${
 round === r ?"bg-foreground text-white border-border":"border-border/10 text-foreground/50 hover:border-border/30"
 }`}>
 {r} Timeline
 </button>
 ))}
 </div>

 {/* Timeline */}
 <div className="relative">
 {/* Vertical line */}
 <div className="absolute left-6 top-0 bottom-0 w-px bg-foreground/10"/>

 <div className="space-y-6">
 {events.map((event, i) => (
 <div key={i} className="flex gap-4 relative">
 {/* Dot */}
 <div className="w-12 flex-shrink-0 flex items-start justify-center pt-1">
 <div className="w-3 h-3 rounded-full bg-primary border-2 border-white z-10"/>
 </div>

 {/* Card */}
 <div className="editorial-card p-4 flex-1">
 <div className="flex items-center gap-2 mb-1">
 <span className="text-xs font-bold text-primary">{event.month}</span>
 <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${CATEGORY_COLORS[event.category]}`}>
 {event.category}
 </span>
 </div>
 <h3 className="font-semibold text-foreground text-sm">{event.title}</h3>
 <p className="text-xs text-foreground/50 mt-1">{event.desc}</p>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Tips */}
 <div className="editorial-card p-6 mt-8">
 <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-3">Pro Tips for {round}</h3>
 <ul className="space-y-2 text-sm text-foreground/70">
 {round ==="R1" && (
 <>
 <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0"/>R1 has the highest acceptance rate at most schools - worth the effort.</li>
 <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0"/>Start essay brainstorming before you finish testing.</li>
 <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0"/>Brief recommenders 8+ weeks before the deadline.</li>
 </>
 )}
 {round ==="R2" && (
 <>
 <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0"/>R2 is the largest pool - competition is fierce but seats are available.</li>
 <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0"/>Use holiday break to finalize essays without work distractions.</li>
 <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0"/>Apply to 4-6 schools - don't spread too thin.</li>
 </>
 )}
 {round ==="R3" && (
 <>
 <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0"/>R3 is competitive - only apply with a strong GMAT and clear story.</li>
 <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0"/>Focus on 1-2 schools max in R3.</li>
 <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0"/>Some schools actively fill seats in R3 - research which ones.</li>
 </>
 )}
 </ul>
 </div>

 <EmailCapture variant="contextual"source="plan"/>
 <ToolCrossLinks current="/plan"/>
 </div>
 </main>
 );
}
