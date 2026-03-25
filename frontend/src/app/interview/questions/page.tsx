"use client";

import { useState, useEffect, useCallback } from"react";
import { motion, AnimatePresence } from"framer-motion";
import {
 MessageSquare, BookOpen, Shuffle, ChevronDown, ChevronRight,
 Target, Lightbulb, Filter, X, GraduationCap, ArrowRight,
} from"lucide-react";
import Link from"next/link";
import { apiFetch } from"@/lib/api";

/* ── Types ─────────────────────────────────────────────────────────── */

type Question = {
 q: string;
 difficulty:"easy"|"medium"|"hard";
 schools: string[];
 tips: string;
 category?: string;
};

type Category = {
 id: string;
 name: string;
 questions: Question[];
 count: number;
};

type SchoolInfo = {
 format: string;
 interviewer: string;
 prep_tip: string;
};

type QuestionsResponse = {
 categories: Category[];
 total_questions: number;
 school_info: SchoolInfo | null;
};

const SCHOOL_NAMES: Record<string, string> = {
 hbs:"Harvard Business School",
 gsb:"Stanford GSB",
 wharton:"Wharton",
 booth:"Chicago Booth",
 kellogg:"Kellogg",
 sloan:"MIT Sloan",
 cbs:"Columbia Business School",
 tuck:"Dartmouth Tuck",
 haas:"UC Berkeley Haas",
 fuqua:"Duke Fuqua",
 stern:"NYU Stern",
};

const DIFFICULTY_COLORS = {
 easy: { bg:"bg-emerald-50", text:"text-emerald-700", border:"border-emerald-200"},
 medium: { bg:"bg-primary/10", text:"text-primary", border:"border-primary/30"},
 hard: { bg:"bg-red-50", text:"text-red-700", border:"border-red-200"},
};

/* ── Component ─────────────────────────────────────────────────────── */

export default function InterviewQuestionsPage() {
 const [categories, setCategories] = useState<Category[]>([]);
 const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
 const [total, setTotal] = useState(0);
 const [loading, setLoading] = useState(true);

 // Filters
 const [schoolFilter, setSchoolFilter] = useState("");
 const [difficultyFilter, setDifficultyFilter] = useState("");
 const [categoryFilter, setCategoryFilter] = useState("");

 // Practice mode
 const [practiceMode, setPracticeMode] = useState(false);
 const [practiceQuestions, setPracticeQuestions] = useState<Question[]>([]);
 const [currentQ, setCurrentQ] = useState(0);
 const [showTip, setShowTip] = useState(false);
 const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

 const fetchQuestions = useCallback(async () => {
 setLoading(true);
 try {
 const params = new URLSearchParams();
 if (schoolFilter) params.set("school_id", schoolFilter);
 if (difficultyFilter) params.set("difficulty", difficultyFilter);
 if (categoryFilter) params.set("category", categoryFilter);
 const data = await apiFetch<QuestionsResponse>(`/api/interview/questions?${params}`);
 setCategories(data.categories);
 setTotal(data.total_questions);
 setSchoolInfo(data.school_info);
 // Auto-expand all categories
 setExpandedCats(new Set(data.categories.map(c => c.id)));
 } catch {
 setCategories([]);
 setTotal(0);
 } finally {
 setLoading(false);
 }
 }, [schoolFilter, difficultyFilter, categoryFilter]);

 useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

 const startPractice = async () => {
 try {
 const params = new URLSearchParams();
 if (schoolFilter) params.set("school_id", schoolFilter);
 params.set("count","10");
 const data = await apiFetch<{ questions: Question[]; count: number }>(
 `/api/interview/questions/random?${params}`
 );
 setPracticeQuestions(data.questions);
 setCurrentQ(0);
 setShowTip(false);
 setPracticeMode(true);
 } catch {
 console.error("Failed to load practice questions");
 }
 };

 const toggleCat = (id: string) => {
 const next = new Set(expandedCats);
 next.has(id) ? next.delete(id) : next.add(id);
 setExpandedCats(next);
 };

 /* ── Practice Mode ───────────────────────────────────────────────── */
 if (practiceMode && practiceQuestions.length > 0) {
 const q = practiceQuestions[currentQ];
 const progress = ((currentQ + 1) / practiceQuestions.length) * 100;

 return (
 <div className="bg-background min-h-screen">
 <section className="bg-foreground text-primary-foreground py-8 px-8">
 <div className="max-w-3xl mx-auto">
 <div className="flex items-center justify-between mb-4">
 <button
 onClick={() => setPracticeMode(false)}
 className="text-xs text-white/50 hover:text-white transition-colors"
 aria-label="Exit practice mode and return to question bank"
 >
 &larr; Back to Question Bank
 </button>
 <span className="text-xs text-white/40">
 {currentQ + 1} / {practiceQuestions.length}
 </span>
 </div>
 <div className="w-full bg-card/10 h-1 mb-6">
 <div className="bg-primary h-1 transition-all duration-300" style={{ width: `${progress}%` }} />
 </div>
 </div>
 </section>

 <section className="max-w-3xl mx-auto px-8 py-12">
 <AnimatePresence mode="wait">
 <motion.div
 key={currentQ}
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -20 }}
 transition={{ duration: 0.2 }}
 >
 <div className="flex items-center gap-3 mb-4">
 <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-full border ${DIFFICULTY_COLORS[q.difficulty].bg} ${DIFFICULTY_COLORS[q.difficulty].text} ${DIFFICULTY_COLORS[q.difficulty].border}`}>
 {q.difficulty}
 </span>
 {q.category && (
 <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold">
 {q.category}
 </span>
 )}
 </div>

 <h2 className="heading-serif text-3xl md:text-4xl mb-8 leading-tight">{q.q}</h2>

 <div className="mb-8">
 <p className="text-xs text-muted-foreground/40 mb-2">Appears at:</p>
 <div className="flex flex-wrap gap-1.5">
 {q.schools.map(s => (
 <span key={s} className="bg-muted text-foreground text-[10px] font-bold px-2 py-1 uppercase tracking-wider">
 {SCHOOL_NAMES[s] || s}
 </span>
 ))}
 </div>
 </div>

 <button
 onClick={() => setShowTip(!showTip)}
 className="flex items-center gap-2 text-sm font-bold text-primary hover:text-foreground transition-colors mb-4"
 >
 <Lightbulb size={16} />
 {showTip ?"Hide Tip":"Show Tip"}
 </button>

 <AnimatePresence>
 {showTip && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height:"auto", opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 className="overflow-hidden"
 >
 <div className="bg-primary/5 border border-primary/20 p-4 mb-6">
 <p className="text-sm text-muted-foreground/70 leading-relaxed">{q.tips}</p>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </motion.div>
 </AnimatePresence>

 <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/10">
 <button
 onClick={() => { setCurrentQ(Math.max(0, currentQ - 1)); setShowTip(false); }}
 disabled={currentQ === 0}
 className="px-4 py-2 text-sm font-bold border border-border/10 disabled:opacity-30 hover:bg-muted transition-colors"
 >
 Previous
 </button>
 {currentQ < practiceQuestions.length - 1 ? (
 <button
 onClick={() => { setCurrentQ(currentQ + 1); setShowTip(false); }}
 className="px-6 py-2 text-sm font-bold bg-foreground text-primary-foreground hover:bg-primary transition-colors flex items-center gap-2"
 >
 Next Question <ArrowRight size={14} />
 </button>
 ) : (
 <button
 onClick={() => setPracticeMode(false)}
 className="px-6 py-2 text-sm font-bold bg-primary text-foreground hover:bg-foreground hover:text-white transition-colors"
 >
 Finish Practice
 </button>
 )}
 </div>
 </section>
 </div>
 );
 }

 /* ── Browse Mode ─────────────────────────────────────────────────── */
 return (
 <div className="bg-background min-h-screen">
 {/* Header */}
 <section className="bg-foreground text-primary-foreground pt-4 pb-16 px-8 relative overflow-hidden">
 <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-gold via-transparent to-transparent"/>
 <div className="max-w-5xl mx-auto relative z-10 text-center">
 <h1 className="heading-serif text-5xl md:text-6xl mb-4">Interview Question Bank</h1>
 <p className="text-lg text-white/60 max-w-2xl mx-auto mb-8">
 {total} real MBA interview questions across {categories.length} categories.
 Filter by school, difficulty, or jump into practice mode.
 </p>

 <div className="flex items-center justify-center gap-4 flex-wrap">
 <button
 onClick={startPractice}
 className="bg-primary text-foreground px-6 py-3 font-bold flex items-center gap-2 hover:bg-card transition-colors"
 >
 <Shuffle size={18} /> Start Practice Mode
 </button>
 <Link
 href="/interview"
 className="border border-white/20 text-white px-6 py-3 font-bold flex items-center gap-2 hover:bg-card/10 transition-colors"
 >
 <MessageSquare size={18} /> Live Interview Sim
 </Link>
 </div>
 </div>
 </section>

 <section className="max-w-5xl mx-auto px-8 py-12 -mt-8 relative z-20">
 {/* School info card */}
 {schoolInfo && (
 <div className="bg-card border-2 border-primary/30 p-5 mb-6">
 <div className="flex items-start gap-4">
 <GraduationCap size={24} className="text-primary shrink-0 mt-1"/>
 <div>
 <h3 className="font-bold text-foreground mb-1">{SCHOOL_NAMES[schoolFilter] || schoolFilter} Interview Format</h3>
 <p className="text-sm text-muted-foreground/60 mb-2">
 <strong>Format:</strong> {schoolInfo.format} &bull; <strong>Interviewer:</strong> {schoolInfo.interviewer}
 </p>
 <p className="text-sm text-muted-foreground/50">{schoolInfo.prep_tip}</p>
 </div>
 </div>
 </div>
 )}

 {/* Filters */}
 <div className="bg-card border border-border/10 p-4 mb-6">
 <div className="flex flex-wrap items-center gap-3">
 <Filter size={16} className="text-muted-foreground/40"/>
 <select
 value={schoolFilter}
 onChange={e => setSchoolFilter(e.target.value)}
 aria-label="Filter by school"
 className="border border-border/10 px-3 py-2 text-sm focus:border-border focus:outline-none bg-card"
 >
 <option value="">All Schools</option>
 {Object.entries(SCHOOL_NAMES).map(([id, name]) => (
 <option key={id} value={id}>{name}</option>
 ))}
 </select>
 <select
 value={difficultyFilter}
 onChange={e => setDifficultyFilter(e.target.value)}
 aria-label="Filter by difficulty"
 className="border border-border/10 px-3 py-2 text-sm focus:border-border focus:outline-none bg-card"
 >
 <option value="">All Difficulties</option>
 <option value="easy">Easy</option>
 <option value="medium">Medium</option>
 <option value="hard">Hard</option>
 </select>
 <select
 value={categoryFilter}
 onChange={e => setCategoryFilter(e.target.value)}
 aria-label="Filter by category"
 className="border border-border/10 px-3 py-2 text-sm focus:border-border focus:outline-none bg-card"
 >
 <option value="">All Categories</option>
 {categories.map(cat => (
 <option key={cat.id} value={cat.id}>{cat.name}</option>
 ))}
 </select>
 {(schoolFilter || difficultyFilter || categoryFilter) && (
 <button
 onClick={() => { setSchoolFilter(""); setDifficultyFilter(""); setCategoryFilter(""); }}
 className="text-xs text-muted-foreground/40 hover:text-foreground flex items-center gap-1"
 aria-label="Clear all filters"
 >
 <X size={12} /> Clear
 </button>
 )}
 <span className="text-xs text-muted-foreground/40 ml-auto">{total} questions</span>
 </div>
 </div>

 {/* Categories */}
 {loading ? (
 <div className="flex items-center justify-center py-24">
 <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"/>
 </div>
 ) : (
 <div className="space-y-4">
 {categories.map(cat => (
 <div key={cat.id} className="bg-card border border-border/10">
 <button
 onClick={() => toggleCat(cat.id)}
 aria-expanded={expandedCats.has(cat.id)}
 className="w-full flex items-center justify-between px-5 py-4 hover:bg-accent/50 transition-colors"
 >
 <div className="flex items-center gap-3">
 <BookOpen size={18} className="text-primary"/>
 <span className="font-display font-bold text-lg">{cat.name}</span>
 <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold bg-muted px-2 py-0.5">
 {cat.count} questions
 </span>
 </div>
 {expandedCats.has(cat.id) ? <ChevronDown size={18} className="text-muted-foreground/40"/> : <ChevronRight size={18} className="text-muted-foreground/40"/>}
 </button>

 <AnimatePresence>
 {expandedCats.has(cat.id) && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height:"auto", opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 transition={{ duration: 0.2 }}
 className="overflow-hidden"
 >
 <div className="border-t border-border/5">
 {cat.questions.map((q, i) => (
 <div key={i} className="px-5 py-4 border-b border-border/5 last:border-b-0 hover:bg-primary/[0.02] transition-colors">
 <div className="flex items-start gap-3">
 <span className="text-muted-foreground/20 font-mono text-sm mt-0.5 w-6 shrink-0">{i + 1}</span>
 <div className="flex-1">
 <p className="font-bold text-foreground mb-2">{q.q}</p>
 <div className="flex items-center gap-2 flex-wrap mb-2">
 <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-full border ${DIFFICULTY_COLORS[q.difficulty].bg} ${DIFFICULTY_COLORS[q.difficulty].text} ${DIFFICULTY_COLORS[q.difficulty].border}`}>
 {q.difficulty}
 </span>
 {q.schools.slice(0, 5).map(s => (
 <span key={s} className="text-[9px] text-muted-foreground/40 uppercase tracking-wider">
 {SCHOOL_NAMES[s] || s}
 </span>
 ))}
 {q.schools.length > 5 && (
 <span className="text-[9px] text-muted-foreground/30">+{q.schools.length - 5} more</span>
 )}
 </div>
 <p className="text-xs text-muted-foreground/50 leading-relaxed">
 <Lightbulb size={11} className="inline mr-1 text-primary"/>
 {q.tips}
 </p>
 </div>
 </div>
 </div>
 ))}
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 ))}
 </div>
 )}
 </section>

 {/* CTA */}
 <section className="bg-success/10 text-foreground py-16 px-8 text-center border-t border-border/10">
 <div className="max-w-2xl mx-auto">
 <h2 className="heading-serif text-3xl mb-4">Ready to practice?</h2>
 <p className="text-muted-foreground/80 mb-6">
 Get random questions and practice answering them under pressure.
 </p>
 <div className="flex items-center justify-center gap-4 flex-wrap">
 <button
 onClick={startPractice}
 className="bg-foreground text-primary-foreground px-6 py-3 font-bold hover:bg-primary hover:text-foreground transition-colors flex items-center gap-2"
 >
 <Shuffle size={18} /> Start Practice
 </button>
 <Link href="/interview" className="border-2 border-border text-foreground px-6 py-3 font-bold hover:bg-foreground hover:text-white transition-colors flex items-center gap-2">
 <MessageSquare size={18} /> AI Interview Sim
 </Link>
 </div>
 </div>
 </section>
 </div>
 );
}
