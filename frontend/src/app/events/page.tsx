"use client";

import { useState, useEffect, useMemo } from"react";
import { Calendar, Globe, MapPin, Monitor, Filter } from"lucide-react";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type MBAEvent = {
 title: string;
 type: string;
 frequency: string;
 format: string;
 description: string;
 registration_url?: string;
 school_id: string | null;
 school_name: string | null;
 scope:"school_specific"|"general";
};

type EventsResponse = {
 events: MBAEvent[];
 total: number;
 event_types: string[];
 formats: string[];
};

const TYPE_LABELS: Record<string, string> = {
 info_session:"Info Session",
 campus_visit:"Campus Visit",
 webinar:"Webinar",
 coffee_chat:"Coffee Chat",
 conference:"Conference",
 alumni_mixer:"Alumni Mixer",
};

const FORMAT_ICONS: Record<string, typeof Globe> = {
 online: Monitor,
 in_person: MapPin,
 hybrid: Globe,
};

const FORMAT_COLORS: Record<string, string> = {
 online:"bg-blue-50 text-blue-600",
 in_person:"bg-emerald-50 text-emerald-700",
 hybrid:"bg-purple-50 text-purple-600",
};

export default function EventsPage() {
 const [data, setData] = useState<EventsResponse | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [typeFilter, setTypeFilter] = useState("all");
 const [formatFilter, setFormatFilter] = useState("all");

 useEffect(() => {
 apiFetch<EventsResponse>("/api/networking-events")
 .then(setData)
 .catch(() => setError("Failed to load events. Please refresh."))
 .finally(() => setLoading(false));
 }, []);

 const filtered = useMemo(() => {
 if (!data) return [];
 return data.events.filter((e) => {
 if (typeFilter !=="all" && e.type !== typeFilter) return false;
 if (formatFilter !=="all" && e.format !== formatFilter) return false;
 return true;
 });
 }, [data, typeFilter, formatFilter]);

 const schoolEvents = filtered.filter((e) => e.scope ==="school_specific");
 const generalEvents = filtered.filter((e) => e.scope ==="general");

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-5xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Networking Events
 </h1>
 <p className="text-white/70 text-lg">Info sessions, campus visits, and MBA conferences to connect with top programs.</p>
 </div>
 </section>

 <div className="max-w-5xl mx-auto px-6 py-10">
 {error && (
 <div className="editorial-card p-4 mb-6 border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
 )}

 {loading && (
 <div className="text-center py-16">
 <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"/>
 </div>
 )}

 {data && (
 <>
 {/* Filters */}
 <div className="flex flex-wrap gap-3 mb-8">
 <div className="flex items-center gap-2">
 <Filter size={14} className="text-foreground/30"/>
 <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
 className="px-3 py-1.5 border border-border/10 rounded text-sm bg-card">
 <option value="all">All Types</option>
 {(data.event_types || []).map((t) => (
 <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>
 ))}
 </select>
 </div>
 <select value={formatFilter} onChange={(e) => setFormatFilter(e.target.value)}
 className="px-3 py-1.5 border border-border/10 rounded text-sm bg-card">
 <option value="all">All Formats</option>
 <option value="online">Online</option>
 <option value="in_person">In Person</option>
 <option value="hybrid">Hybrid</option>
 </select>
 <span className="text-xs text-foreground/30 self-center">{filtered.length} events</span>
 </div>

 {/* School-specific events */}
 {schoolEvents.length > 0 && (
 <>
 <h2 className="text-xs font-bold uppercase tracking-widest text-foreground/30 mb-4">School Events</h2>
 <div className="grid md:grid-cols-2 gap-4 mb-10">
 {schoolEvents.map((ev, i) => {
 const FormatIcon = FORMAT_ICONS[ev.format] || Globe;
 return (
 <div key={i} className="editorial-card p-5">
 <div className="flex items-start justify-between mb-2">
 <div>
 <p className="font-medium text-foreground text-sm">{ev.title}</p>
 <p className="text-[10px] text-primary font-bold">{ev.school_name}</p>
 </div>
 <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${FORMAT_COLORS[ev.format] ||"bg-foreground/5 text-foreground/40"}`}>
 <FormatIcon size={10} className="inline mr-0.5"/>
 {ev.format ==="in_person" ?"In Person": ev.format ==="online" ?"Online":"Hybrid"}
 </span>
 </div>
 <p className="text-xs text-foreground/50 mb-3">{ev.description}</p>
 <div className="flex items-center justify-between">
 <div className="flex gap-2">
 <span className="text-[10px] px-2 py-0.5 bg-foreground/5 rounded-full text-foreground/40 font-bold">
 {TYPE_LABELS[ev.type] || ev.type}
 </span>
 <span className="text-[10px] text-foreground/30 flex items-center gap-1">
 <Calendar size={10} />{ev.frequency}
 </span>
 </div>
 {ev.registration_url && (
 <a href={ev.registration_url} target="_blank" rel="noopener noreferrer"
 className="text-[10px] text-primary font-bold hover:text-primary/80">
 Register →
 </a>
 )}
 </div>
 </div>
 );
 })}
 </div>
 </>
 )}

 {/* General events */}
 {generalEvents.length > 0 && (
 <>
 <h2 className="text-xs font-bold uppercase tracking-widest text-foreground/30 mb-4">Conferences & Fairs</h2>
 <div className="grid md:grid-cols-2 gap-4">
 {generalEvents.map((ev, i) => (
 <div key={i} className="editorial-card p-5 border-l-2 border-primary">
 <p className="font-medium text-foreground text-sm mb-1">{ev.title}</p>
 <p className="text-xs text-foreground/50 mb-3">{ev.description}</p>
 <div className="flex gap-2">
 <span className="text-[10px] px-2 py-0.5 bg-primary/10 rounded-full text-primary font-bold">
 {TYPE_LABELS[ev.type] || ev.type}
 </span>
 <span className="text-[10px] text-foreground/30 flex items-center gap-1">
 <Calendar size={10} />{ev.frequency}
 </span>
 <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${FORMAT_COLORS[ev.format] ||"bg-foreground/5 text-foreground/40"}`}>
 {ev.format ==="in_person" ?"In Person": ev.format ==="online" ?"Online":"Hybrid"}
 </span>
 </div>
 </div>
 ))}
 </div>
 </>
 )}
 </>
 )}

 <ToolCrossLinks current="/events"/>
 </div>
 </main>
 );
}
