"use client";

import { useState, useRef, useEffect } from"react";
import { motion, AnimatePresence } from"framer-motion";
import {
 MessageSquare, Lock, Send, CheckCircle2, FileText,
 Sparkles, ChevronUp, ChevronDown, Copy, Check,
} from"lucide-react";
import type { SchoolData, AppState } from"./types";

type Props = {
 school: SchoolData;
 appState: AppState | null;
 onStartSession: (form: QuickFormData) => Promise<void>;
 onSendChat: (message: string) => Promise<void>;
 onUnlock: () => Promise<void>;
};

export type QuickFormData = {
 name: string; gmat: string; gpa: string; industry: string;
 undergrad_tier: string; leadership_roles: string; target_intake: string;
 intl_experience: boolean; community_service: boolean; publications: boolean;
};

function QuickProfileForm({ school, onSubmit }: { school: SchoolData; onSubmit: (form: QuickFormData) => void }) {
 const [form, setForm] = useState<QuickFormData>({
 name:"", gmat:"", gpa:"", industry:"",
 undergrad_tier:"", leadership_roles:"", target_intake:"",
 intl_experience: false, community_service: false, publications: false,
 });
 const [showAdvanced, setShowAdvanced] = useState(false);

 return (
 <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="w-full max-w-md text-left space-y-4">
 <h3 className="heading-serif text-2xl mb-2">Quick Profile</h3>
 <p className="text-sm text-muted-foreground/50 mb-6">Just the essentials. Takes 10 seconds.</p>
 <input type="text" required placeholder="First Name" value={form.name}
 onChange={e => setForm({ ...form, name: e.target.value })}
 className="w-full border border-border/10 px-4 py-3 focus:outline-none focus:border-border transition-colors"/>
 <div className="grid grid-cols-2 gap-4">
 <input type="number" required placeholder="GMAT" value={form.gmat}
 onChange={e => setForm({ ...form, gmat: e.target.value })}
 className="border border-border/10 px-4 py-3 focus:outline-none focus:border-border transition-colors"/>
 <input type="number" step="0.01" required placeholder="GPA" value={form.gpa}
 onChange={e => setForm({ ...form, gpa: e.target.value })}
 className="border border-border/10 px-4 py-3 focus:outline-none focus:border-border transition-colors"/>
 </div>

 <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
 className="flex items-center gap-2 text-sm text-primary hover:text-primary-light transition-colors mt-2">
 {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
 {showAdvanced ?"Hide Advanced Criteria":"Add More Details for Better Results"}
 </button>

 {showAdvanced && (
 <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height:"auto"}} className="grid grid-cols-2 gap-4 pt-2">
 <select value={form.undergrad_tier} onChange={e => setForm({ ...form, undergrad_tier: e.target.value })}
 className="w-full border border-border/10 px-4 py-3 focus:outline-none focus:border-border transition-colors text-muted-foreground text-sm">
 <option value="">Undergrad Tier</option>
 <option value="top_10">Top 10 Globally (IIT, MIT...)</option>
 <option value="top_50">Top 50 Globally</option>
 <option value="top_100">Top 100 / NIT / BITS</option>
 <option value="other">Other</option>
 </select>
 <select value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })}
 className="w-full border border-border/10 px-4 py-3 focus:outline-none focus:border-border transition-colors text-muted-foreground text-sm">
 <option value="">Industry</option>
 <option value="consulting">Management Consulting</option>
 <option value="finance">Finance / IB / PE</option>
 <option value="tech">Tech / Product</option>
 <option value="engineering">Engineering</option>
 <option value="military">Military</option>
 <option value="other">Other</option>
 </select>
 <select value={form.leadership_roles} onChange={e => setForm({ ...form, leadership_roles: e.target.value })}
 className="w-full border border-border/10 px-4 py-3 focus:outline-none focus:border-border transition-colors text-muted-foreground text-sm">
 <option value="">Leadership</option>
 <option value="cxo">Founder / CXO</option>
 <option value="manager">Manager / Lead</option>
 <option value="ic">Individual Contributor</option>
 </select>
 <select value={form.target_intake} onChange={e => setForm({ ...form, target_intake: e.target.value })}
 className="w-full border border-border/10 px-4 py-3 focus:outline-none focus:border-border transition-colors text-muted-foreground text-sm">
 <option value="">Intake Year</option>
 <option value="2026">Fall 2026</option>
 <option value="2027">Fall 2027</option>
 <option value="2028">Fall 2028</option>
 </select>
 <div className="col-span-2 flex flex-wrap gap-4 pt-2">
 {[
 { key:"intl_experience"as const, label:"Intl. Experience"},
 { key:"community_service"as const, label:"Volunteering"},
 { key:"publications"as const, label:"Publications"},
 ].map(({ key, label }) => (
 <label key={key} className="flex items-center gap-2 text-xs text-muted-foreground/60 cursor-pointer hover:text-muted-foreground/80 transition-colors">
 <input type="checkbox" checked={form[key] as boolean}
 onChange={e => setForm({ ...form, [key]: e.target.checked })}
 className="w-3 h-3 accent-primary text-white"/>
 {label}
 </label>
 ))}
 </div>
 </motion.div>
 )}
 <button type="submit" className="btn-primary w-full mt-4">Begin Deep Interview →</button>
 </form>
 );
}

function TypingIndicator() {
 return (
 <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
 <div className="bg-background border border-border/5 rounded-r-2xl rounded-tl-2xl px-5 py-4 flex items-center gap-1.5">
 {[0, 1, 2].map(i => (
 <motion.span key={i} className="w-2 h-2 bg-muted/30 rounded-full"
 animate={{ y: [0, -6, 0] }}
 transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
 ))}
 </div>
 </motion.div>
 );
}

function ChatInterface({ appState, onSendChat }: { appState: AppState; onSendChat: (msg: string) => Promise<void> }) {
 const [chatInput, setChatInput] = useState("");
 const [sending, setSending] = useState(false);
 const bottomRef = useRef<HTMLDivElement>(null);
 const history = appState.interview_history;

 useEffect(() => {
 bottomRef.current?.scrollIntoView({ behavior:"smooth"});
 }, [history, sending]);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!chatInput.trim() || sending) return;
 const msg = chatInput;
 setChatInput("");
 setSending(true);
 try { await onSendChat(msg); } finally { setSending(false); }
 };

 return (
 <>
 <div className="flex-1 overflow-y-auto p-8 space-y-5">
 <AnimatePresence>
 {history.map((msg, i) => (
 <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
 className={`flex ${msg.role ==="user" ?"justify-end":"justify-start"}`}>
 <div className={`max-w-[80%] px-5 py-4 text-[15px] leading-relaxed
 ${msg.role ==="user"
 ?"bg-foreground text-white rounded-l-2xl rounded-tr-2xl"
 :"bg-background border border-border/5 text-muted-foreground rounded-r-2xl rounded-tl-2xl"}`}>
 {msg.content}
 </div>
 </motion.div>
 ))}
 {sending && <TypingIndicator />}
 </AnimatePresence>
 <div ref={bottomRef} />
 </div>
 <div className="p-5 border-t border-border/5 bg-background/50">
 <form onSubmit={handleSubmit} className="relative">
 <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
 placeholder={sending ?"Thinking…":"Share your story…"}
 disabled={sending}
 className="w-full bg-card border border-border/10 pl-5 pr-14 py-4 focus:outline-none focus:border-border transition-colors disabled:opacity-60"/>
 <button type="submit" disabled={!chatInput.trim() || sending}
 className="absolute right-2 top-1/2 -translate-y-1/2 bg-foreground text-white w-10 h-10 flex items-center justify-center hover:bg-foreground/80 disabled:opacity-30 transition-colors">
 <Send size={14} />
 </button>
 </form>
 <p className="text-[10px] text-muted-foreground/30 mt-2 text-center">
 {history.length} messages · Step {Math.min(Math.ceil(history.length / 2), 5)} of 5
 </p>
 </div>
 </>
 );
}

function EssayUnlock({ school, onUnlock }: { school: SchoolData; onUnlock: () => void }) {
 return (
 <div className="h-full flex flex-col items-center justify-center text-center py-16">
 <Lock size={40} className="text-muted-foreground/20 mb-6"strokeWidth={1.5} />
 <h2 className="heading-serif text-3xl mb-3">Unlock Your Essays</h2>
 <p className="text-muted-foreground/50 max-w-sm mx-auto mb-10">
 Complete the Deep Interview, then unlock AI-generated humanized essays tailored to {school.name}&apos;s exact prompts.
 </p>
 <div className="border border-border/10 p-8 w-full max-w-sm bg-card">
 <div className="flex items-end justify-center gap-1 mb-6">
 <span className="text-xl text-muted-foreground/50">₹</span>
 <span className="text-5xl heading-serif">2,499</span>
 </div>
 <ul className="space-y-3 text-left text-sm text-muted-foreground/70 mb-8">
 <li className="flex items-center gap-3"><CheckCircle2 size={14} className="text-success shrink-0"/> All Essays for {school.name}</li>
 <li className="flex items-center gap-3"><CheckCircle2 size={14} className="text-success shrink-0"/> Humanizer Anti-AI Audit Pass</li>
 <li className="flex items-center gap-3"><CheckCircle2 size={14} className="text-success shrink-0"/> Targeted Resume Rewrite</li>
 </ul>
 <button onClick={onUnlock} className="btn-primary w-full">
 Unlock Application, ₹2,499
 </button>
 </div>
 <p className="text-xs text-muted-foreground/30 mt-6">or save with the <span className="font-bold">M7 Bundle · ₹6,999 for 4 schools</span></p>
 </div>
 );
}

function EssayDraft({ title, content }: { title: string; content: string }) {
 const [copied, setCopied] = useState(false);
 const wordCount = content.split(/\s+/).filter(Boolean).length;

 const handleCopy = async () => {
 try {
 await navigator.clipboard.writeText(content);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 } catch { /* clipboard not available */ }
 };

 return (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border border-border/10 p-8">
 <div className="flex items-start justify-between mb-4 pb-4 border-b border-border/5">
 <div>
 <h3 className="heading-serif text-xl">{title}</h3>
 <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold mt-1">{wordCount} words</p>
 </div>
 <button onClick={handleCopy}
 className="flex items-center gap-1.5 text-xs text-muted-foreground/40 hover:text-foreground transition-colors px-3 py-1.5 border border-border/10 hover:border-border/30">
 {copied ? <><Check size={12} className="text-emerald-600"/> Copied</> : <><Copy size={12} /> Copy</>}
 </button>
 </div>
 <pre className="whitespace-pre-wrap font-sans text-sm text-muted-foreground/80 leading-relaxed">{content}</pre>
 </motion.div>
 );
}

export function ApplicationSection({ school, appState, onStartSession, onSendChat, onUnlock }: Props) {
 const [showQuickForm, setShowQuickForm] = useState(false);
 const [activeTab, setActiveTab] = useState<"chat"|"apply">("chat");

 if (!appState) {
 return (
 <div className="editorial-card min-h-[500px] flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
 {!showQuickForm ? (
 <>
 <Sparkles size={36} className="text-primary mb-6"strokeWidth={1.5} />
 <h2 className="heading-serif text-4xl mb-4">Begin Your {school.name} Application</h2>
 <p className="text-muted-foreground/60 max-w-md mb-10">
 Our AI agents will conduct a deep interview to extract your best stories and draft humanized essays tailored to {school.name}&apos;s prompts.
 </p>
 <button onClick={() => setShowQuickForm(true)} className="btn-primary text-lg px-10 py-4">
 Start Deep Interview
 </button>
 </>
 ) : (
 <QuickProfileForm school={school} onSubmit={async (form) => {
 await onStartSession(form);
 setShowQuickForm(false);
 }} />
 )}
 </div>
 );
 }

 return (
 <div className="bg-card border border-border/10 flex flex-col min-h-[600px] max-w-4xl mx-auto">
 {/* Tabs */}
 <div className="flex border-b border-border/5">
 <button onClick={() => setActiveTab("chat")}
 className={`flex-1 py-4 text-xs uppercase tracking-widest font-bold transition-colors flex items-center justify-center gap-2
 ${activeTab ==="chat" ?"border-b-2 border-border text-foreground":"text-muted-foreground/30 hover:text-muted-foreground"}`}>
 <MessageSquare size={14} /> Deep Interview
 </button>
 <button onClick={() => setActiveTab("apply")}
 className={`flex-1 py-4 text-xs uppercase tracking-widest font-bold transition-colors flex items-center justify-center gap-2
 ${activeTab ==="apply" ?"border-b-2 border-primary text-primary":"text-muted-foreground/30 hover:text-muted-foreground"}`}>
 <FileText size={14} /> Generated Essays
 {Object.keys(appState.drafts).length > 0 && (
 <span className="bg-primary text-foreground text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold">
 {Object.keys(appState.drafts).length}
 </span>
 )}
 </button>
 </div>

 {activeTab ==="chat" ? (
 <ChatInterface appState={appState} onSendChat={onSendChat} />
 ) : (
 <div className="flex-1 overflow-y-auto p-8">
 {Object.keys(appState.drafts).length === 0 ? (
 <EssayUnlock school={school} onUnlock={onUnlock} />
 ) : (
 <div className="space-y-8">
 {Object.entries(appState.drafts).map(([title, content]) => (
 <EssayDraft key={title} title={title} content={content} />
 ))}
 </div>
 )}
 </div>
 )}
 </div>
 );
}
