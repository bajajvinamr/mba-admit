"use client";

import { useState, useEffect } from"react";
import { motion, AnimatePresence } from"framer-motion";
import { Send, Coffee, GraduationCap, Building2, MapPin, Copy, Check, ChevronRight, MessageSquareQuote, Info, Sparkles } from"lucide-react";
import { apiFetch } from"@/lib/api";
import { useAbortSignal } from"@/hooks/useAbortSignal";
import { useUsage } from"@/hooks/useUsage";
import { UsageGate } from"@/components/UsageGate";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import { EmailCapture } from"@/components/EmailCapture";

type School = { id: string; name: string };
type Template = { subject: string; body: string; pro_tip: string };

export default function OutreachPage() {
 const abortSignal = useAbortSignal();
 const usage = useUsage("networking_outreach");
 const [schools, setSchools] = useState<School[]>([]);
 const [selectedSchoolId, setSelectedSchoolId] = useState("");
 const [background, setBackground] = useState("Software Engineer at Google, interested in Venture Capital.");
 const [goal, setGoal] = useState("Career Transition Advice");
 const [loading, setLoading] = useState(false);
 const [result, setResult] = useState<any>(null);
 const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 apiFetch<School[]>(`/api/schools/names`)
 .then(data => setSchools(data))
 .catch(console.error);
 }, []);

 const handleGenerate = async () => {
 setError(null);
 setLoading(true);
 setResult(null);
 try {
 const data = await apiFetch(`/api/outreach_strategy`, {
 method:"POST",
 body: JSON.stringify({
 school_id: selectedSchoolId,
 background,
 goal,
 }),
 noRetry: true,
 timeoutMs: 60_000,
 signal: abortSignal,
 });
 setResult(data);
 usage.recordUse();
 } catch (e) {
 console.error(e);
 setError("Failed to generate networking strategy. Please try again.");
 } finally {
 setLoading(false);
 }
 };

 const copyToClipboard = (text: string, index: number) => {
 navigator.clipboard.writeText(text);
 setCopiedIndex(index);
 setTimeout(() => setCopiedIndex(null), 2000);
 };

 return (
 <div className="min-h-screen bg-background py-20 px-8">
 <div className="max-w-5xl mx-auto">
 
 {/* Header */}
 <div className="text-center mb-16">
 <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 font-bold uppercase tracking-widest text-[10px] mb-6 rounded-full">
 <Send size={12} /> Roadmap v5: Alumni Outreach Hub
 </div>
 <h1 className="heading-serif text-5xl md:text-6xl text-foreground mb-6">Master the Art of Networking</h1>
 <p className="text-muted-foreground/60 text-lg max-w-2xl mx-auto">
 Stop sending generic cold emails. Our AI analyzes school culture and your unique background to draft high-conversion templates that actually get coffee chats.
 </p>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
 
 {/* Input Panel */}
 <div className="lg:col-span-2 space-y-8">
 <section className="bg-card p-8 border border-border/10 rounded-2xl">
 <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-8 flex items-center gap-2">
 <span className="w-5 h-5 rounded-full bg-foreground text-white flex items-center justify-center text-[10px]">1</span>
 Networking Strategy
 </h3>

 <div className="space-y-6">
 <div>
 <label className="block text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold mb-2">Target School</label>
 <select 
 value={selectedSchoolId}
 onChange={e => setSelectedSchoolId(e.target.value)}
 className="w-full bg-background border border-border/5 px-4 py-3 text-sm focus:border-border focus:outline-none rounded-lg"
 >
 <option value="">Select a school...</option>
 {schools.slice(0, 100).map(s => (
 <option key={s.id} value={s.id}>{s.name}</option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold mb-2">Your Background Hook</label>
 <textarea 
 value={background}
 onChange={e => setBackground(e.target.value)}
 placeholder="e.g. Lead Engineer at a FinTech startup, first-gen college grad."
 className="w-full bg-background border border-border/5 p-4 text-sm focus:border-border focus:outline-none rounded-lg h-24 resize-none leading-relaxed"
 />
 </div>

 <div>
 <label className="block text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold mb-2">Networking Goal</label>
 <select 
 value={goal}
 onChange={e => setGoal(e.target.value)}
 className="w-full bg-background border border-border/5 px-4 py-3 text-sm focus:border-border focus:outline-none rounded-lg"
 >
 <option>Career Transition Advice</option>
 <option>Specific Club / Community Insight</option>
 <option>General School Culture Coffee Chat</option>
 <option>Application Experience Tips</option>
 </select>
 </div>

 {error && (
 <div className="bg-red-50 border border-red-200 text-red-800 p-4 text-sm rounded-lg flex items-center justify-between">
 <span>{error}</span>
 <button onClick={() => setError(null)} className="ml-3 text-sm font-bold underline">
 Dismiss
 </button>
 </div>
 )}

 <button
 onClick={handleGenerate}
 disabled={loading || !selectedSchoolId}
 className="w-full bg-foreground text-white font-bold uppercase tracking-widest py-5 rounded-lg hover:bg-foreground/90 transition-all disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
 >
 {loading ? (
 <span className="flex flex-col items-center">
 <span className="flex items-center gap-2">Crafting Templates <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/></span>
 <span className="text-xs text-white/40 mt-1 normal-case tracking-normal font-normal">This usually takes 5-10 seconds</span>
 </span>
 ) : (
 <>Draft Outreach <Sparkles size={18} className="text-primary"/></>
 )}
 </button>
 </div>
 </section>
 
 <div className="bg-emerald-50/50 p-6 border border-emerald-100 rounded-2xl flex gap-4">
 <Info className="text-emerald-700 shrink-0"size={20} />
 <p className="text-xs text-emerald-800/80 leading-relaxed italic">
"Networking is not about asking for a favor; it's about asking for perspective. 80% of Adcoms look for genuine engagement with current students."
 </p>
 </div>
 </div>

 {/* Results Panel */}
 <div className="lg:col-span-3">
 <AnimatePresence mode="wait">
 {!result ? (
 <motion.div 
 key="empty"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="bg-card border-2 border-dashed border-border/10 h-full rounded-2xl flex flex-col items-center justify-center p-12 text-center"
 >
 <div className="w-20 h-20 bg-background rounded-full flex items-center justify-center mb-6">
 <MessageSquareQuote size={32} className="text-muted-foreground/20"/>
 </div>
 <h4 className="text-muted-foreground/40 font-bold uppercase tracking-widest text-xs">Awaiting Inputs</h4>
 <p className="text-muted-foreground/30 text-sm mt-2">Select a school and background to see high-reply templates.</p>
 </motion.div>
 ) : (
 <UsageGate feature="networking_outreach">
 <motion.div
 key="result"
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 className="space-y-8"
 >
 {/* Culture Brief */}
 <div className="bg-foreground p-6 rounded-2xl text-white shadow-sm relative overflow-hidden">
 <div className="absolute top-0 right-0 p-4 opacity-10">
 <GraduationCap size={80} />
 </div>
 <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">School Networking Vibe</h4>
 <p className="text-lg font-display italic text-white/90">"{result.school_culture_brief}"</p>
 </div>

 {/* Templates */}
 <div className="space-y-6">
 {result.templates.map((tmpl: Template, idx: number) => (
 <div key={idx} className="bg-card border border-border/5 rounded-2xl overflow-hidden group">
 <div className="p-6 border-b border-border/5 flex justify-between items-center bg-background/30">
 <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Template {idx + 1}</span>
 <div className="flex gap-4">
 <button 
 onClick={() => copyToClipboard(`Subject: ${tmpl.subject}\n\n${tmpl.body}`, idx)}
 className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-foreground transition-colors flex items-center gap-1.5"
 >
 {copiedIndex === idx ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy Email</>}
 </button>
 </div>
 </div>
 <div className="p-8">
 <div className="mb-6">
 <span className="text-[10px] font-bold uppercase text-muted-foreground/30 block mb-1">Subject</span>
 <p className="text-sm font-bold text-foreground">{tmpl.subject}</p>
 </div>
 <div className="bg-background/50 p-6 rounded-lg border border-border/5 relative">
 <p className="text-sm text-muted-foreground italic whitespace-pre-wrap leading-relaxed font-display">
 {tmpl.body}
 </p>
 </div>
 <div className="mt-6 flex items-start gap-3 p-4 bg-primary/5 border border-primary/10 rounded-lg">
 <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
 <Sparkles size={12} className="text-foreground"/>
 </div>
 <p className="text-xs text-foreground leading-relaxed font-medium">
 <span className="font-black uppercase text-[8px] tracking-widest mr-2">Adcom Tip:</span>
 {tmpl.pro_tip}
 </p>
 </div>
 </div>
 </div>
 ))}
 </div>

 <div className="text-center pt-8">
 <p className="text-xs text-muted-foreground/40 italic">
 Remember to personalize the [Placeholders] before sending. Networking is about quality, not quantity.
 </p>
 </div>
 </motion.div>
 </UsageGate>
 )}
 </AnimatePresence>
 </div>

 </div>

 <EmailCapture variant="contextual"source="outreach"/>
 <ToolCrossLinks current="/outreach"/>
 </div>
 </div>
 );
}
