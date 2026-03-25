"use client";

import { useState, useEffect, useMemo } from"react";
import { MapPin, Calendar, Plus, X, CheckCircle2, ExternalLink } from"lucide-react";
import { useSchoolNames } from"@/hooks/useSchoolNames";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type Visit = {
 school_id: string;
 school_name: string;
 visit_date: string;
 visit_type: string;
 notes: string;
 confirmed: boolean;
};

const VISIT_TYPES = ["Campus Tour","Class Visit","Info Session","Coffee Chat","Diversity Event","Webinar","Club Event"];
const STORAGE_KEY ="ac_visit_planner";

function load(): Visit[] {
 if (typeof window ==="undefined") return [];
 try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ||"[]"); } catch { return []; }
}
function save(visits: Visit[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(visits)); }

export default function VisitPlannerPage() {
 const { schools: rawSchools, error: schoolsError } = useSchoolNames();
 const schools = useMemo(
 () => rawSchools.filter((s) => s.name).sort((a, b) => a.name.localeCompare(b.name)),
 [rawSchools],
 );
 const [visits, setVisits] = useState<Visit[]>([]);
 const [showAdd, setShowAdd] = useState(false);
 const [search, setSearch] = useState("");
 const [newVisit, setNewVisit] = useState({ school_id:"", visit_date:"", visit_type:"Campus Tour", notes:""});

 useEffect(() => { setVisits(load()); }, []);

 const update = (v: Visit[]) => { setVisits(v); save(v); };

 const addVisit = () => {
 const school = schools.find((s) => s.id === newVisit.school_id);
 if (!school || !newVisit.visit_date) return;
 update([...visits, { ...newVisit, school_name: school.name, confirmed: false }]);
 setNewVisit({ school_id:"", visit_date:"", visit_type:"Campus Tour", notes:""});
 setShowAdd(false);
 };

 const toggleConfirm = (i: number) => {
 const next = [...visits];
 next[i].confirmed = !next[i].confirmed;
 update(next);
 };

 const removeVisit = (i: number) => update(visits.filter((_, idx) => idx !== i));

 const upcoming = visits.filter((v) => v.visit_date >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.visit_date.localeCompare(b.visit_date));
 const past = visits.filter((v) => v.visit_date < new Date().toISOString().slice(0, 10));

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-4xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 School Visit Planner
 </h1>
 <p className="text-white/70 text-lg">Plan and track campus visits, info sessions, and events.</p>
 </div>
 </section>

 <div className="max-w-4xl mx-auto px-6 py-10">
 <button onClick={() => setShowAdd(!showAdd)}
 className="mb-6 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-1">
 <Plus size={14} /> Add Visit
 </button>

 {showAdd && (
 <div className="editorial-card p-6 mb-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="text-xs font-medium text-foreground/60 block mb-1">School</label>
 {schoolsError && <p className="text-red-500 text-xs mb-1">{schoolsError}</p>}
 <select value={newVisit.school_id} onChange={(e) => setNewVisit({ ...newVisit, school_id: e.target.value })}
 className="w-full px-3 py-2 border border-border/10 rounded text-sm">
 <option value="">Select school...</option>
 {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
 </select>
 </div>
 <div>
 <label className="text-xs font-medium text-foreground/60 block mb-1">Date</label>
 <input type="date" value={newVisit.visit_date} onChange={(e) => setNewVisit({ ...newVisit, visit_date: e.target.value })}
 className="w-full px-3 py-2 border border-border/10 rounded text-sm"/>
 </div>
 <div>
 <label className="text-xs font-medium text-foreground/60 block mb-1">Type</label>
 <select value={newVisit.visit_type} onChange={(e) => setNewVisit({ ...newVisit, visit_type: e.target.value })}
 className="w-full px-3 py-2 border border-border/10 rounded text-sm">
 {VISIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
 </select>
 </div>
 <div>
 <label className="text-xs font-medium text-foreground/60 block mb-1">Notes</label>
 <input type="text" placeholder="Optional notes..." value={newVisit.notes}
 onChange={(e) => setNewVisit({ ...newVisit, notes: e.target.value })}
 className="w-full px-3 py-2 border border-border/10 rounded text-sm"/>
 </div>
 </div>
 <button onClick={addVisit} disabled={!newVisit.school_id || !newVisit.visit_date}
 className="mt-4 px-4 py-2 bg-foreground text-white text-sm font-medium rounded-lg disabled:opacity-50">
 Save Visit
 </button>
 </div>
 )}

 {/* Upcoming */}
 {upcoming.length > 0 && (
 <div className="mb-8">
 <h2 className="heading-serif text-xl font-[family-name:var(--font-heading)] text-foreground mb-4">Upcoming Visits</h2>
 <div className="space-y-3">
 {upcoming.map((v, i) => {
 const realIdx = visits.indexOf(v);
 return (
 <div key={i} className="editorial-card p-4 flex items-center gap-4">
 <button onClick={() => toggleConfirm(realIdx)}
 className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
 v.confirmed ?"bg-emerald-500 border-emerald-500":"border-border/20"
 }`}>
 {v.confirmed && <CheckCircle2 size={14} className="text-white"/>}
 </button>
 <div className="flex-1">
 <div className="flex items-center gap-2">
 <span className="font-semibold text-foreground text-sm">{v.school_name}</span>
 <span className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full font-bold">{v.visit_type}</span>
 </div>
 <div className="flex items-center gap-3 mt-1">
 <span className="text-xs text-foreground/40"><Calendar size={10} className="inline mr-1"/>{v.visit_date}</span>
 {v.notes && <span className="text-xs text-foreground/30">{v.notes}</span>}
 </div>
 </div>
 <button onClick={() => removeVisit(realIdx)} className="text-foreground/20 hover:text-red-400"><X size={14} /></button>
 </div>
 );
 })}
 </div>
 </div>
 )}

 {/* Past */}
 {past.length > 0 && (
 <div className="mb-8">
 <h2 className="text-xs font-bold uppercase tracking-widest text-foreground/30 mb-3">Past Visits ({past.length})</h2>
 <div className="space-y-2 opacity-60">
 {past.map((v, i) => (
 <div key={i} className="editorial-card p-3 flex items-center gap-3">
 <CheckCircle2 size={14} className="text-foreground/20"/>
 <span className="text-sm text-foreground/50">{v.school_name} - {v.visit_type} ({v.visit_date})</span>
 </div>
 ))}
 </div>
 </div>
 )}

 {visits.length === 0 && (
 <div className="text-center py-16 text-foreground/20">
 <MapPin size={48} className="mx-auto mb-4 opacity-30"/>
 <p>No visits planned yet. Click"Add Visit"to get started.</p>
 </div>
 )}

 <ToolCrossLinks current="/visit-planner"/>
 </div>
 </main>
 );
}
