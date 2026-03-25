"use client";

import { useState, useEffect, useCallback } from"react";
import { motion, AnimatePresence } from"framer-motion";
import {
 FileText, Plus, Trash2, Clock, Save, ChevronDown,
 ArrowRight, Edit3, CheckCircle2, X, Copy,
} from"lucide-react";
import Link from"next/link";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import { EmailCapture } from"@/components/EmailCapture";

/* ── Types ─────────────────────────────────────────────────────────── */

type Draft = {
 id: string;
 school: string;
 prompt: string;
 content: string;
 wordCount: number;
 updatedAt: string;
 createdAt: string;
};

const STORAGE_KEY ="admitcompass_essay_drafts";

function genId() {
 return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function countWords(text: string) {
 return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function EssayDraftsPage() {
 const [drafts, setDrafts] = useState<Draft[]>([]);
 const [editing, setEditing] = useState<string | null>(null);
 const [showNew, setShowNew] = useState(false);
 const [newSchool, setNewSchool] = useState("");
 const [newPrompt, setNewPrompt] = useState("");

 // Load
 useEffect(() => {
 const raw = localStorage.getItem(STORAGE_KEY);
 if (raw) setDrafts(JSON.parse(raw));
 }, []);

 // Save
 const persist = useCallback((d: Draft[]) => {
 setDrafts(d);
 localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
 }, []);

 const addDraft = () => {
 if (!newSchool.trim() || !newPrompt.trim()) return;
 const now = new Date().toISOString();
 const draft: Draft = {
 id: genId(), school: newSchool.trim(), prompt: newPrompt.trim(),
 content:"", wordCount: 0, updatedAt: now, createdAt: now,
 };
 persist([draft, ...drafts]);
 setNewSchool("");
 setNewPrompt("");
 setShowNew(false);
 setEditing(draft.id);
 };

 const updateContent = (id: string, content: string) => {
 persist(drafts.map((d) =>
 d.id === id
 ? { ...d, content, wordCount: countWords(content), updatedAt: new Date().toISOString() }
 : d
 ));
 };

 const deleteDraft = (id: string) => {
 persist(drafts.filter((d) => d.id !== id));
 if (editing === id) setEditing(null);
 };

 const copyToClipboard = (text: string) => {
 navigator.clipboard.writeText(text);
 };

 const activeDraft = drafts.find((d) => d.id === editing);

 const bySchool = drafts.reduce<Record<string, Draft[]>>((acc, d) => {
 (acc[d.school] = acc[d.school] || []).push(d);
 return acc;
 }, {});

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-4xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Essay Draft Manager
 </h1>
 <p className="text-white/70 text-lg">
 Organize all your essay drafts in one place. Saved locally - always available.
 </p>
 </div>
 </section>

 <div className="max-w-4xl mx-auto px-6 py-10">
 <div className="flex items-center justify-between mb-6">
 <p className="text-sm text-muted-foreground">{drafts.length} draft{drafts.length !== 1 ?"s":""}</p>
 <button
 onClick={() => setShowNew(!showNew)}
 className="flex items-center gap-1.5 px-4 py-2 bg-foreground text-white text-sm font-medium rounded-lg hover:bg-foreground/80"
 >
 <Plus size={14} /> New Draft
 </button>
 </div>

 {/* New Draft Form */}
 <AnimatePresence>
 {showNew && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height:"auto", opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 className="overflow-hidden mb-6"
 >
 <div className="editorial-card p-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
 <div>
 <label className="text-xs font-medium text-muted-foreground block mb-1">School</label>
 <input type="text" placeholder="e.g., Harvard Business School"
 value={newSchool} onChange={(e) => setNewSchool(e.target.value)}
 className="w-full px-3 py-2 border border-border/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"/>
 </div>
 <div>
 <label className="text-xs font-medium text-muted-foreground block mb-1">Essay Prompt</label>
 <input type="text" placeholder="e.g., What more would you like us to know?"
 value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)}
 className="w-full px-3 py-2 border border-border/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"/>
 </div>
 </div>
 <div className="flex gap-2">
 <button onClick={addDraft}
 className="px-4 py-2 bg-primary text-foreground text-sm font-semibold rounded hover:bg-primary/90">
 Create Draft
 </button>
 <button onClick={() => setShowNew(false)}
 className="px-4 py-2 text-muted-foreground text-sm hover:text-muted-foreground">
 Cancel
 </button>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
 {/* Sidebar - Draft List */}
 <div className="space-y-4">
 {Object.entries(bySchool).map(([school, schoolDrafts]) => (
 <div key={school}>
 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">
 {school}
 </p>
 <div className="space-y-1">
 {schoolDrafts.map((d) => (
 <button
 key={d.id}
 onClick={() => setEditing(d.id)}
 className={`w-full text-left p-3 rounded-lg transition-colors ${
 editing === d.id
 ?"bg-primary/10 border border-primary/20"
 :"bg-card border border-border/5 hover:border-border/15"
 }`}
 >
 <p className="text-sm font-medium text-foreground line-clamp-1">{d.prompt}</p>
 <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
 <span>{d.wordCount} words</span>
 <span>·</span>
 <span>{new Date(d.updatedAt).toLocaleDateString()}</span>
 </div>
 </button>
 ))}
 </div>
 </div>
 ))}

 {drafts.length === 0 && (
 <div className="text-center py-12 text-muted-foreground">
 <FileText size={32} className="mx-auto mb-3 opacity-30"/>
 <p className="text-sm">No drafts yet</p>
 </div>
 )}
 </div>

 {/* Editor */}
 <div>
 {activeDraft ? (
 <motion.div
 key={activeDraft.id}
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="editorial-card overflow-hidden"
 >
 <div className="px-6 py-4 border-b border-border/5 flex items-center justify-between">
 <div>
 <p className="text-xs text-primary font-medium">{activeDraft.school}</p>
 <p className="text-sm font-semibold text-foreground mt-0.5">{activeDraft.prompt}</p>
 </div>
 <div className="flex items-center gap-2">
 <button onClick={() => copyToClipboard(activeDraft.content)}
 className="p-2 text-muted-foreground hover:text-muted-foreground transition-colors" title="Copy">
 <Copy size={14} />
 </button>
 <button onClick={() => deleteDraft(activeDraft.id)}
 className="p-2 text-red-400 hover:text-red-600 transition-colors" title="Delete">
 <Trash2 size={14} />
 </button>
 </div>
 </div>
 <textarea
 value={activeDraft.content}
 onChange={(e) => updateContent(activeDraft.id, e.target.value)}
 placeholder="Start writing your essay..."
 className="w-full min-h-[400px] p-6 text-[15px] leading-relaxed text-foreground bg-card resize-y focus:outline-none placeholder:text-muted-foreground"
 />
 <div className="px-6 py-3 bg-foreground/3 border-t border-border/5 flex items-center justify-between text-xs text-muted-foreground">
 <span>{activeDraft.wordCount} words · {activeDraft.content.length} characters</span>
 <div className="flex items-center gap-3">
 <span className="flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-500"/> Auto-saved</span>
 <Link href="/essay-length-optimizer" className="text-primary hover:text-primary/80 flex items-center gap-1">
 Word Limits <ArrowRight size={10} />
 </Link>
 <Link href="/evaluator" className="text-primary hover:text-primary/80 flex items-center gap-1">
 Evaluate <ArrowRight size={10} />
 </Link>
 </div>
 </div>
 </motion.div>
 ) : (
 <div className="editorial-card p-16 text-center text-muted-foreground">
 <Edit3 size={32} className="mx-auto mb-3 opacity-30"/>
 <p className="text-sm">Select a draft or create a new one</p>
 </div>
 )}
 </div>
 </div>

 <EmailCapture variant="contextual"source="essay-drafts"/>
 <ToolCrossLinks current="/essay-drafts"/>
 </div>
 </main>
 );
}
