"use client";

import { useState, useEffect } from"react";
import { motion } from"framer-motion";
import {
 Newspaper, Tag, Calendar, Filter, Trophy, BookOpen,
 GraduationCap, Users, Briefcase, UserCheck,
} from"lucide-react";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

/* ── Types ─────────────────────────────────────────────────────────── */

type NewsItem = {
 school_id: string;
 school_name: string;
 headline: string;
 summary: string;
 date: string;
 category: string;
};

/* ── Helpers ───────────────────────────────────────────────────────── */

const CATEGORIES = [
 { key:"all", label:"All", icon: Filter },
 { key:"ranking", label:"Rankings", icon: Trophy },
 { key:"curriculum", label:"Curriculum", icon: BookOpen },
 { key:"faculty", label:"Faculty", icon: UserCheck },
 { key:"student_life", label:"Student Life", icon: Users },
 { key:"admissions", label:"Admissions", icon: GraduationCap },
 { key:"career", label:"Careers", icon: Briefcase },
];

function categoryColor(cat: string): string {
 switch (cat) {
 case "ranking": return "bg-amber-50 text-amber-700";
 case "curriculum": return "bg-sky-50 text-sky-700";
 case "faculty": return "bg-violet-50 text-violet-700";
 case "student_life": return "bg-emerald-50 text-emerald-700";
 case "admissions": return "bg-rose-50 text-rose-700";
 case "career": return "bg-indigo-50 text-indigo-700";
 default: return "bg-foreground/5 text-muted-foreground";
 }
}

function categoryLabel(cat: string): string {
 const found = CATEGORIES.find((c) => c.key === cat);
 return found ? found.label : cat;
}

function formatDate(dateStr: string): string {
 const d = new Date(dateStr +"T00:00:00");
 return d.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric"});
}

function daysAgo(dateStr: string): string {
 const now = new Date();
 const d = new Date(dateStr +"T00:00:00");
 const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
 if (diff === 0) return "Today";
 if (diff === 1) return "Yesterday";
 if (diff < 7) return `${diff}d ago`;
 if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
 return formatDate(dateStr);
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function SchoolNewsPage() {
 const [news, setNews] = useState<NewsItem[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [activeCategory, setActiveCategory] = useState("all");

 useEffect(() => {
 setLoading(true);
 apiFetch<{ news: NewsItem[] }>("/api/school-news")
 .then((r) => setNews(r.news))
 .catch(() => setError("Failed to load school news. Please refresh."))
 .finally(() => setLoading(false));
 }, []);

 const filtered = activeCategory ==="all"
 ? news
 : news.filter((n) => n.category === activeCategory);

 const schoolIds = [...new Set(news.map((n) => n.school_id))];

 return (
 <main className="min-h-screen bg-background">
 {/* Hero */}
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-3xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 School News Feed
 </h1>
 <p className="text-white/70 text-lg">
 The latest from top MBA programs - rankings, hires, curriculum changes, and more.
 </p>
 </div>
 </section>

 <div className="max-w-3xl mx-auto px-6 py-10">
 {error && (
 <div className="editorial-card p-4 mb-6 border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
 )}
 {/* Category Filters */}
 <div className="flex gap-2 mb-6 flex-wrap">
 {CATEGORIES.map((cat) => {
 const Icon = cat.icon;
 return (
 <button
 key={cat.key}
 onClick={() => setActiveCategory(cat.key)}
 className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full border transition-colors ${
 activeCategory === cat.key
 ?"bg-foreground text-white border-border"
 :"bg-card border-border/10 hover:border-border/30"
 }`}
 >
 <Icon size={14} />
 {cat.label}
 </button>
 );
 })}
 </div>

 {/* School Tags */}
 <div className="flex gap-1.5 mb-6 flex-wrap">
 {schoolIds.map((sid) => {
 const name = news.find((n) => n.school_id === sid)?.school_name || sid;
 return (
 <span
 key={sid}
 className="text-[10px] bg-primary/10 text-muted-foreground px-2 py-1 rounded-full font-medium"
 >
 {name}
 </span>
 );
 })}
 </div>

 {/* Loading */}
 {loading && (
 <div className="text-center py-8">
 <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"/>
 </div>
 )}

 {/* News Items */}
 {!loading && (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
 {filtered.map((item, i) => (
 <motion.article
 key={`${item.school_id}-${item.date}-${i}`}
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i * 0.04 }}
 className="editorial-card p-6"
 >
 {/* Top row - category + date */}
 <div className="flex items-center justify-between mb-3">
 <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${categoryColor(item.category)}`}>
 {categoryLabel(item.category)}
 </span>
 <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
 <Calendar size={10} />
 <span>{daysAgo(item.date)}</span>
 </div>
 </div>

 {/* Headline */}
 <h2 className="font-semibold text-foreground text-lg mb-2 leading-snug">
 {item.headline}
 </h2>

 {/* Summary */}
 <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
 {item.summary}
 </p>

 {/* School tag */}
 <div className="flex items-center gap-1.5">
 <Tag size={10} className="text-primary"/>
 <span className="text-xs text-muted-foreground font-medium">{item.school_name}</span>
 </div>
 </motion.article>
 ))}

 {filtered.length === 0 && (
 <div className="text-center py-16 text-muted-foreground">
 <Newspaper size={48} className="mx-auto mb-4 opacity-30"/>
 <p>No news in this category</p>
 </div>
 )}

 <ToolCrossLinks current="/school-news"/>
 </motion.div>
 )}
 </div>
 </main>
 );
}
