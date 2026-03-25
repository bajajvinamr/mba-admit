"use client";

import { useState, useEffect } from"react";
import { Users, Plus, Trash2, Star, Shuffle, BookOpen } from"lucide-react";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type Member = {
 id: string;
 name: string;
 strengths: string[];
 weaknesses: string[];
 availability: string;
};

const STRENGTH_OPTIONS = ["Accounting","Finance","Marketing","Operations","Strategy","Quant/Analytics","Leadership","Technology","Economics","Communication"];
const AVAILABILITY_OPTIONS = ["Mornings","Afternoons","Evenings","Weekends","Flexible"];

const STORAGE_KEY ="ac_study_group";

function genId() { return Math.random().toString(36).slice(2, 10); }

function getGroupScore(members: Member[]): { score: number; coverage: string[]; gaps: string[] } {
 const allStrengths = new Set(members.flatMap((m) => m.strengths));
 const coverage = [...allStrengths];
 const gaps = STRENGTH_OPTIONS.filter((s) => !allStrengths.has(s));
 const score = Math.round((coverage.length / STRENGTH_OPTIONS.length) * 100);
 return { score, coverage, gaps };
}

export default function StudyGroupPage() {
 const [members, setMembers] = useState<Member[]>([]);
 const [showAdd, setShowAdd] = useState(false);
 const [name, setName] = useState("");
 const [strengths, setStrengths] = useState<string[]>([]);
 const [weaknesses, setWeaknesses] = useState<string[]>([]);
 const [availability, setAvailability] = useState("Flexible");

 useEffect(() => {
 try {
 const saved = localStorage.getItem(STORAGE_KEY);
 if (saved) setMembers(JSON.parse(saved));
 } catch {}
 }, []);

 const save = (items: Member[]) => {
 setMembers(items);
 localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
 };

 const addMember = () => {
 if (!name.trim() || strengths.length === 0) return;
 save([...members, { id: genId(), name: name.trim(), strengths, weaknesses, availability }]);
 setName(""); setStrengths([]); setWeaknesses([]); setAvailability("Flexible"); setShowAdd(false);
 };

 const remove = (id: string) => save(members.filter((m) => m.id !== id));

 const toggleArr = (arr: string[], item: string, setter: (v: string[]) => void) => {
 setter(arr.includes(item) ? arr.filter((a) => a !== item) : [...arr, item]);
 };

 const { score, coverage, gaps } = getGroupScore(members);

 const idealSize = 4;
 const suggestedRecruit = gaps.length > 0 ? `Look for someone strong in ${gaps.slice(0, 2).join("and")}` :"Great coverage! Consider diversity in industry backgrounds.";

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-5xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Study Group Builder
 </h1>
 <p className="text-white/70 text-lg">Build a balanced study group by mapping strengths and gaps.</p>
 </div>
 </section>

 <div className="max-w-5xl mx-auto px-6 py-10">
 {/* Group Score */}
 <div className="editorial-card p-6 mb-8">
 <div className="flex items-center justify-between mb-4">
 <div>
 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Group Skill Coverage</p>
 <p className="text-3xl font-bold text-primary">{score}%</p>
 <p className="text-[10px] text-muted-foreground">{members.length} members · Ideal: {idealSize}-5</p>
 </div>
 <div className="w-24 h-24 relative">
 <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
 <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
 fill="none"stroke="currentColor"strokeWidth="3" className="text-muted-foreground"/>
 <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
 fill="none"stroke="currentColor"strokeWidth="3" className="text-primary"
 strokeDasharray={`${score}, 100`} />
 </svg>
 </div>
 </div>
 {gaps.length > 0 && (
 <div className="p-3 bg-amber-50/50 rounded-lg">
 <p className="text-[10px] font-bold text-amber-700 mb-1">Skill Gaps</p>
 <div className="flex flex-wrap gap-1">
 {gaps.map((g) => (
 <span key={g} className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">{g}</span>
 ))}
 </div>
 <p className="text-[10px] text-amber-600 mt-2"><Shuffle size={10} className="inline mr-1"/>{suggestedRecruit}</p>
 </div>
 )}
 {gaps.length === 0 && members.length > 0 && (
 <div className="p-3 bg-emerald-50/50 rounded-lg">
 <p className="text-[10px] font-bold text-emerald-700">Full coverage across all skill areas!</p>
 </div>
 )}
 </div>

 {/* Members */}
 <div className="editorial-card p-5 mb-6">
 <div className="flex items-center justify-between mb-4">
 <h2 className="font-medium text-foreground text-sm flex items-center gap-2"><Users size={16} className="text-primary"/> Members</h2>
 <button onClick={() => setShowAdd(!showAdd)}
 className="text-xs px-3 py-1.5 bg-primary text-white rounded-full font-medium hover:bg-primary/90 flex items-center gap-1">
 <Plus size={12} /> Add Member
 </button>
 </div>

 {showAdd && (
 <div className="p-4 bg-foreground/[0.02] rounded-lg mb-4 space-y-3">
 <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name"
 className="text-xs px-3 py-2 border border-border/10 rounded w-full"/>
 <div>
 <p className="text-[10px] font-bold text-muted-foreground mb-1">Strengths (select 2-3)</p>
 <div className="flex flex-wrap gap-1">
 {STRENGTH_OPTIONS.map((s) => (
 <button key={s} onClick={() => toggleArr(strengths, s, setStrengths)}
 className={`text-[10px] px-2 py-1 rounded-full transition-colors ${strengths.includes(s) ?"bg-emerald-500 text-white":"bg-foreground/5 text-muted-foreground"}`}>
 {s}
 </button>
 ))}
 </div>
 </div>
 <div>
 <p className="text-[10px] font-bold text-muted-foreground mb-1">Weaknesses (select 1-2)</p>
 <div className="flex flex-wrap gap-1">
 {STRENGTH_OPTIONS.map((s) => (
 <button key={s} onClick={() => toggleArr(weaknesses, s, setWeaknesses)}
 className={`text-[10px] px-2 py-1 rounded-full transition-colors ${weaknesses.includes(s) ?"bg-rose-500 text-white":"bg-foreground/5 text-muted-foreground"}`}>
 {s}
 </button>
 ))}
 </div>
 </div>
 <div>
 <p className="text-[10px] font-bold text-muted-foreground mb-1">Availability</p>
 <div className="flex flex-wrap gap-1">
 {AVAILABILITY_OPTIONS.map((a) => (
 <button key={a} onClick={() => setAvailability(a)}
 className={`text-[10px] px-2 py-1 rounded-full transition-colors ${availability === a ?"bg-foreground text-white":"bg-foreground/5 text-muted-foreground"}`}>
 {a}
 </button>
 ))}
 </div>
 </div>
 <button onClick={addMember} disabled={!name.trim() || strengths.length === 0}
 className="text-xs px-4 py-2 bg-foreground text-white rounded font-medium disabled:opacity-30">Add to Group</button>
 </div>
 )}

 {members.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No members yet. Add yourself and your classmates.</p>}

 <div className="space-y-3">
 {members.map((m) => (
 <div key={m.id} className="flex items-start justify-between p-3 rounded-lg bg-card">
 <div>
 <p className="text-xs font-medium text-foreground">{m.name}</p>
 <div className="flex flex-wrap gap-1 mt-1">
 {m.strengths.map((s) => (
 <span key={s} className="text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">{s}</span>
 ))}
 {m.weaknesses.map((w) => (
 <span key={w} className="text-[9px] px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded-full">{w}</span>
 ))}
 </div>
 <p className="text-[10px] text-muted-foreground mt-1">{m.availability}</p>
 </div>
 <button onClick={() => remove(m.id)} className="text-muted-foreground hover:text-rose-500"><Trash2 size={14} /></button>
 </div>
 ))}
 </div>
 </div>

 {/* Tips */}
 <div className="editorial-card p-5">
 <h2 className="font-medium text-foreground text-sm mb-3 flex items-center gap-2"><BookOpen size={16} className="text-primary"/> Study Group Best Practices</h2>
 <ul className="space-y-2 text-xs text-muted-foreground">
 <li className="flex items-start gap-2"><Star size={10} className="text-primary mt-1 shrink-0"/> 4-5 members is ideal - enough diversity, small enough to coordinate.</li>
 <li className="flex items-start gap-2"><Star size={10} className="text-primary mt-1 shrink-0"/> Assign roles: timekeeper, note-taker, devil&apos;s advocate. Rotate weekly.</li>
 <li className="flex items-start gap-2"><Star size={10} className="text-primary mt-1 shrink-0"/> Meet 3x/week max. Quality over quantity - burned-out groups disband by midterms.</li>
 <li className="flex items-start gap-2"><Star size={10} className="text-primary mt-1 shrink-0"/> Diverse skills &gt; similar backgrounds. The quant person + the communicator = magic.</li>
 <li className="flex items-start gap-2"><Star size={10} className="text-primary mt-1 shrink-0"/> Set ground rules early: prep expectations, conflict resolution, meeting cadence.</li>
 </ul>
 </div>

 <ToolCrossLinks current="/study-group"/>
 </div>
 </main>
 );
}
