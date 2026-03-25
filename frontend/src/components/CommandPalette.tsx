"use client";

import { useState, useEffect, useRef, useCallback } from"react";
import { useRouter } from"next/navigation";
import { Search, GraduationCap, BarChart3, FileText, ArrowRight } from"lucide-react";
import { apiFetch } from"@/lib/api";

type SchoolResult = {
 id: string;
 name: string;
 location: string;
 country: string;
 degree_type: string;
};

const QUICK_LINKS = [
 { label:"School Directory", href:"/schools", icon: GraduationCap },
 { label:"Compare Schools", href:"/compare", icon: BarChart3 },
 { label:"Community Decisions", href:"/decisions", icon: FileText },
 { label:"Profile Report", href:"/profile-report", icon: BarChart3 },
 { label:"Dashboard", href:"/dashboard", icon: BarChart3 },
];

export function CommandPalette() {
 const [open, setOpen] = useState(false);
 const [query, setQuery] = useState("");
 const [results, setResults] = useState<SchoolResult[]>([]);
 const [selectedIdx, setSelectedIdx] = useState(0);
 const inputRef = useRef<HTMLInputElement>(null);
 const router = useRouter();

 // Cmd+K / Ctrl+K to open
 useEffect(() => {
 const handler = (e: KeyboardEvent) => {
 if ((e.metaKey || e.ctrlKey) && e.key ==="k") {
 e.preventDefault();
 setOpen(v => !v);
 }
 if (e.key ==="Escape") setOpen(false);
 };
 window.addEventListener("keydown", handler);
 return () => window.removeEventListener("keydown", handler);
 }, []);

 // Focus input when opened
 useEffect(() => {
 if (open) {
 inputRef.current?.focus();
 setQuery("");
 setResults([]);
 setSelectedIdx(0);
 }
 }, [open]);

 // Search schools
 useEffect(() => {
 if (!query || query.length < 2) {
 setResults([]);
 return;
 }
 const controller = new AbortController();
 apiFetch<SchoolResult[]>(`/api/schools?q=${encodeURIComponent(query)}&limit=8`, {
 signal: controller.signal,
 })
 .then((data) => {
 setResults(data);
 setSelectedIdx(0);
 })
 .catch(() => {});
 return () => controller.abort();
 }, [query]);

 const navigate = useCallback((href: string) => {
 setOpen(false);
 router.push(href);
 }, [router]);

 // Build combined list for keyboard nav
 const allItems = [
 ...results.map(s => ({ type:"school"as const, label: s.name, sublabel: `${s.location} · ${s.degree_type}`, href: `/school/${s.id}` })),
 ...(query.length < 2 ? QUICK_LINKS.map(l => ({ type:"link"as const, label: l.label, sublabel:"", href: l.href })) : []),
 ];

 const handleKeyDown = (e: React.KeyboardEvent) => {
 if (e.key ==="ArrowDown") {
 e.preventDefault();
 setSelectedIdx(i => Math.min(i + 1, allItems.length - 1));
 } else if (e.key ==="ArrowUp") {
 e.preventDefault();
 setSelectedIdx(i => Math.max(i - 1, 0));
 } else if (e.key ==="Enter" && allItems[selectedIdx]) {
 navigate(allItems[selectedIdx].href);
 }
 };

 if (!open) return null;

 return (
 <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
 onClick={() => setOpen(false)}>
 <div className="absolute inset-0 bg-foreground/40"/>
 <div className="relative w-full max-w-lg bg-card border border-border"
 onClick={e => e.stopPropagation()}>
 <div className="flex items-center gap-3 px-4 border-b border-border/10">
 <Search size={18} className="text-muted-foreground/40 shrink-0"/>
 <input
 ref={inputRef}
 type="text"
 placeholder="Search schools, navigate..."
 className="flex-1 py-4 text-sm focus:outline-none bg-transparent"
 value={query}
 onChange={e => setQuery(e.target.value)}
 onKeyDown={handleKeyDown}
 />
 <kbd className="text-[10px] font-mono text-muted-foreground/30 bg-background px-1.5 py-0.5 border border-border">ESC</kbd>
 </div>

 <div className="max-h-[300px] overflow-y-auto">
 {allItems.length === 0 && query.length >= 2 && (
 <p className="px-4 py-6 text-sm text-muted-foreground/40 text-center">No schools found</p>
 )}
 {allItems.map((item, i) => (
 <button
 key={`${item.type}-${item.href}`}
 onClick={() => navigate(item.href)}
 className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
 i === selectedIdx ?"bg-primary/10":"hover:bg-background"
 }`}
 >
 <div className="flex-1">
 <p className="text-sm font-medium text-foreground">{item.label}</p>
 {item.sublabel && (
 <p className="text-[10px] text-muted-foreground/40">{item.sublabel}</p>
 )}
 </div>
 <ArrowRight size={12} className="text-muted-foreground/20"/>
 </button>
 ))}
 </div>

 <div className="px-4 py-2 border-t border-border/5 flex items-center gap-4 text-[10px] text-muted-foreground/30">
 <span><kbd className="font-mono bg-background px-1 py-0.5 border border-border">↑↓</kbd> navigate</span>
 <span><kbd className="font-mono bg-background px-1 py-0.5 border border-border">↵</kbd> open</span>
 <span><kbd className="font-mono bg-background px-1 py-0.5 border border-border">esc</kbd> close</span>
 </div>
 </div>
 </div>
 );
}
