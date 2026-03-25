"use client";

import { useState, useEffect, useMemo } from"react";
import { motion } from"framer-motion";
import {
 FileText, Search,
 Copy, CheckCircle2, AlertTriangle,
} from"lucide-react";
import Link from"next/link";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import { EmailCapture } from"@/components/EmailCapture";
import { EmptyState } from"@/components/EmptyState";

type Prompt = {
 school_id: string;
 school_name: string;
 prompt_index: number;
 prompt_text: string;
 word_limit: number | null;
};

type PromptsResponse = {
 prompts: Prompt[];
 total_prompts: number;
 school_count: number;
};

export default function EssayPromptsPage() {
 const [data, setData] = useState<PromptsResponse | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [search, setSearch] = useState("");
 const [schoolFilter, setSchoolFilter] = useState("");
 const [copied, setCopied] = useState<string | null>(null);

 useEffect(() => {
 apiFetch<PromptsResponse>("/api/essay-prompts")
 .then(setData)
 .catch(() => setError("Failed to load essay prompts. Please refresh."))
 .finally(() => setLoading(false));
 }, []);

 const schools = useMemo(() => {
 if (!data) return [];
 const set = new Map<string, string>();
 data.prompts.forEach((p) => set.set(p.school_id, p.school_name));
 return [...set.entries()].sort((a, b) => a[1].localeCompare(b[1]));
 }, [data]);

 const filtered = useMemo(() => {
 if (!data) return [];
 return data.prompts.filter((p) => {
 if (schoolFilter && p.school_id !== schoolFilter) return false;
 if (search && !p.prompt_text.toLowerCase().includes(search.toLowerCase()) &&
 !p.school_name.toLowerCase().includes(search.toLowerCase())) return false;
 return true;
 });
 }, [data, search, schoolFilter]);

 const copyPrompt = (text: string, key: string) => {
 navigator.clipboard.writeText(text);
 setCopied(key);
 setTimeout(() => setCopied(null), 2000);
 };

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-4xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Essay Prompt Library
 </h1>
 <p className="text-white/70 text-lg">
 {data
 ? `${data.total_prompts} prompts from ${data.school_count} schools - browse, search, and start writing.`
 :"Browse essay prompts from top MBA programs."}
 </p>
 </div>
 </section>

 <div className="max-w-4xl mx-auto px-6 py-10">
 {/* Filters */}
 <div className="flex flex-wrap gap-3 mb-8">
 <div className="relative flex-1 min-w-[200px]">
 <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30"/>
 <input type="text" placeholder="Search prompts..."
 value={search} onChange={(e) => setSearch(e.target.value)}
 className="w-full pl-9 pr-4 py-2.5 border border-border/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"/>
 </div>
 <select value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)}
 className="px-4 py-2.5 border border-border/10 rounded-lg text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/50">
 <option value="">All Schools ({schools.length})</option>
 {schools.map(([id, name]) => (
 <option key={id} value={id}>{name}</option>
 ))}
 </select>
 </div>

 <p className="text-xs text-foreground/40 mb-4">{filtered.length} prompts</p>

 {error && (
 <div className="editorial-card p-4 mb-6 border-red-200 bg-red-50 flex items-start gap-3" role="alert">
 <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5"/>
 <div>
 <p className="text-sm font-medium text-red-700">{error}</p>
 <button
 onClick={() => window.location.reload()}
 className="text-xs text-red-500 hover:text-red-700 mt-1 underline"
 >
 Retry
 </button>
 </div>
 </div>
 )}

 {loading && (
 <div className="space-y-4">
 {[...Array(6)].map((_, i) => (
 <div key={i} className="editorial-card p-6 animate-pulse">
 <div className="flex items-center gap-2 mb-3">
 <div className="h-3 w-24 bg-primary/20 rounded"/>
 <div className="h-3 w-14 bg-foreground/5 rounded"/>
 </div>
 <div className="space-y-2">
 <div className="h-4 bg-foreground/5 rounded w-full"/>
 <div className="h-4 bg-foreground/5 rounded w-3/4"/>
 </div>
 </div>
 ))}
 </div>
 )}

 {/* Prompt Cards */}
 <div className="space-y-4">
 {filtered.map((p, i) => {
 const key = `${p.school_id}-${p.prompt_index}`;
 return (
 <motion.div
 key={key}
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: Math.min(i * 0.02, 0.5) }}
 className="editorial-card p-6"
 >
 <div className="flex items-start justify-between gap-4">
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-2">
 <Link href={`/school/${p.school_id}`}
 className="text-xs font-semibold text-primary hover:text-primary/80">
 {p.school_name}
 </Link>
 {p.word_limit && (
 <span className="text-[10px] px-1.5 py-0.5 bg-foreground/5 text-foreground/40 rounded">
 {p.word_limit} words
 </span>
 )}
 </div>
 <p className="text-sm text-foreground leading-relaxed">{p.prompt_text}</p>
 </div>
 <div className="flex items-center gap-2 flex-shrink-0">
 <button
 onClick={() => copyPrompt(p.prompt_text, key)}
 className="p-2 text-foreground/20 hover:text-foreground/60 transition-colors"
 title="Copy prompt"
 >
 {copied === key ? <CheckCircle2 size={14} className="text-emerald-500"/> : <Copy size={14} />}
 </button>
 <Link href={`/essay-drafts`}
 className="p-2 text-foreground/20 hover:text-primary transition-colors" title="Start writing">
 <FileText size={14} />
 </Link>
 </div>
 </div>
 </motion.div>
 );
 })}
 </div>

 {!loading && !error && data && filtered.length === 0 && (
 <EmptyState
 icon={Search}
 title="No prompts match your search"
 description={search || schoolFilter ?"Try adjusting your search terms or clearing the school filter.": undefined}
 />
 )}

 {!loading && !error && !data && (
 <EmptyState
 icon={FileText}
 title="No essay prompts available"
 description="Essay prompt data is not available right now. Please check back later."
 />
 )}

 <EmailCapture variant="contextual"source="essay-prompts"/>
 <ToolCrossLinks current="/essay-prompts"/>
 </div>
 </main>
 );
}
