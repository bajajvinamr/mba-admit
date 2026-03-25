"use client";

import { useState, useRef, useEffect } from"react";
import { useProfile } from"@/hooks/useProfile";
import { User, X, Check, Trash2 } from"lucide-react";

export function ProfilePill() {
 const { profile, updateProfile, resetProfile, hasProfile } = useProfile();
 const [open, setOpen] = useState(false);
 const [form, setForm] = useState({ gmat:"", gpa:"", yoe:""});
 const ref = useRef<HTMLDivElement>(null);

 // Sync form from profile when opening
 useEffect(() => {
 if (open) {
 setForm({
 gmat: profile.gmat ? String(profile.gmat) :"",
 gpa: profile.gpa ? String(profile.gpa) :"",
 yoe: profile.yoe ? String(profile.yoe) :"",
 });
 }
 }, [open, profile.gmat, profile.gpa, profile.yoe]);

 // Close on outside click
 useEffect(() => {
 const handler = (e: MouseEvent) => {
 if (ref.current && !ref.current.contains(e.target as Node)) {
 setOpen(false);
 }
 };
 document.addEventListener("mousedown", handler);
 return () => document.removeEventListener("mousedown", handler);
 }, []);

 const handleSave = () => {
 updateProfile({
 gmat: form.gmat ? parseInt(form.gmat) : null,
 gpa: form.gpa ? parseFloat(form.gpa) : null,
 yoe: form.yoe ? parseInt(form.yoe) : null,
 });
 setOpen(false);
 };

 const handleClear = () => {
 resetProfile();
 setOpen(false);
 };

 // Compact stats display
 const stats: string[] = [];
 if (profile.gmat) stats.push(`${profile.gmat}`);
 if (profile.gpa) stats.push(`${profile.gpa}`);
 if (profile.yoe) stats.push(`${profile.yoe}y`);

 return (
 <div className="relative" ref={ref}>
 <button
 onClick={() => setOpen(!open)}
 className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full transition-all ${
 hasProfile
 ?"bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
 :"bg-foreground/5 text-muted-foreground/40 border border-border/10 hover:bg-foreground/10 hover:text-muted-foreground/60"
 }`}
 title={hasProfile ?"Your saved profile":"Add your stats for personalized results"}
 >
 <User size={12} />
 {hasProfile ? (
 <span className="tracking-wide">{stats.join("·")}</span>
 ) : (
 <span className="tracking-wider uppercase text-[10px]">My Stats</span>
 )}
 </button>

 {open && (
 <div className="absolute top-full right-0 mt-2 w-72 bg-card border border-border p-4 animate-in fade-in slide-in-from-top-1 duration-150 z-50">
 <div className="flex items-center justify-between mb-3">
 <p className="text-[10px] uppercase tracking-[0.15em] font-black text-muted-foreground/40">
 Your Profile
 </p>
 <button
 onClick={() => setOpen(false)}
 className="p-1 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
 >
 <X size={14} />
 </button>
 </div>

 <div className="space-y-3">
 <div>
 <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground/40 mb-1">
 GMAT Score
 </label>
 <input
 type="number"
 min={200}
 max={800}
 value={form.gmat}
 onChange={(e) => setForm({ ...form, gmat: e.target.value })}
 placeholder="e.g. 730"
 className="w-full border border-border/10 px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors rounded"
 />
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground/40 mb-1">
 GPA
 </label>
 <input
 type="number"
 step={0.01}
 min={0}
 max={4}
 value={form.gpa}
 onChange={(e) => setForm({ ...form, gpa: e.target.value })}
 placeholder="3.8"
 className="w-full border border-border/10 px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors rounded"
 />
 </div>
 <div>
 <label className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground/40 mb-1">
 Years Exp
 </label>
 <input
 type="number"
 min={0}
 max={30}
 value={form.yoe}
 onChange={(e) => setForm({ ...form, yoe: e.target.value })}
 placeholder="4"
 className="w-full border border-border/10 px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors rounded"
 />
 </div>
 </div>
 </div>

 <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/5">
 <button
 onClick={handleSave}
 className="flex-1 flex items-center justify-center gap-1.5 bg-foreground text-white text-xs font-bold py-2 rounded hover:bg-primary transition-colors"
 >
 <Check size={12} /> Save
 </button>
 {hasProfile && (
 <button
 onClick={handleClear}
 className="flex items-center justify-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-bold py-2 px-3 rounded border border-red-100 hover:border-red-200 transition-colors"
 >
 <Trash2 size={12} /> Clear
 </button>
 )}
 </div>

 <p className="text-[10px] text-muted-foreground/30 mt-3 leading-relaxed">
 Saved locally. Used across all tools for personalized results.
 </p>
 </div>
 )}
 </div>
 );
}
