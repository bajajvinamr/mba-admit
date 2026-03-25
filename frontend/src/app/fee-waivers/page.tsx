"use client";

import { useState, useEffect } from"react";
import { DollarSign, CheckCircle2, Shield, Users } from"lucide-react";
import Link from"next/link";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import { EmailCapture } from"@/components/EmailCapture";

type WaiverResult = {
 school_id: string;
 school_name: string;
 waivers: string[];
 consortium: boolean;
 auto_waiver: boolean;
 qualifies_military: boolean;
 qualifies_consortium: boolean;
};

type WaiverResponse = {
 waivers: WaiverResult[];
 total_schools: number;
 consortium_eligible: number;
 military_eligible: number;
};

const M7 = ["hbs","gsb","wharton","booth","kellogg","cbs","sloan"];
const T15 = [...M7,"tuck","haas","ross","fuqua","darden","stern","yale_som","anderson"];

export default function FeeWaiverPage() {
 const [results, setResults] = useState<WaiverResponse | null>(null);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [isMilitary, setIsMilitary] = useState(false);
 const [isConsortium, setIsConsortium] = useState(false);
 const [preset, setPreset] = useState<"m7"|"t15"|"all">("t15");

 const fetchWaivers = () => {
 setLoading(true);
 const ids = preset ==="m7" ? M7 : preset ==="t15" ? T15 : undefined;
 const params = new URLSearchParams();
 if (ids) params.set("school_ids", ids.join(","));
 if (isMilitary) params.set("is_military","true");
 if (isConsortium) params.set("is_consortium","true");
 setError(null);
 apiFetch<WaiverResponse>(`/api/fee-waivers?${params}`)
 .then(setResults)
 .catch(() => setError("Failed to load fee waivers. Please refresh."))
 .finally(() => setLoading(false));
 };

 useEffect(() => { fetchWaivers(); }, [preset, isMilitary, isConsortium]);

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-4xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Fee Waiver Finder
 </h1>
 <p className="text-white/70 text-lg">Find application fee waivers for top MBA programs.</p>
 </div>
 </section>

 <div className="max-w-4xl mx-auto px-6 py-10">
 {/* Filters */}
 <div className="editorial-card p-6 mb-8">
 <div className="flex flex-wrap gap-3 mb-4">
 <span className="text-xs font-bold text-foreground/40 uppercase tracking-widest self-center">Schools:</span>
 {(["m7","t15","all"] as const).map((p) => (
 <button key={p} onClick={() => setPreset(p)}
 className={`px-4 py-1.5 text-xs font-bold rounded-full border transition-colors ${
 preset === p ?"bg-foreground text-white border-border":"border-border/10 text-foreground/50 hover:border-border/30"
 }`}>
 {p ==="all" ?"All Available": p.toUpperCase()}
 </button>
 ))}
 </div>
 <div className="flex flex-wrap gap-4">
 <label className="flex items-center gap-2 text-sm cursor-pointer">
 <input type="checkbox" checked={isMilitary} onChange={(e) => setIsMilitary(e.target.checked)}
 className="rounded border-border/20"/>
 <Shield size={14} className="text-emerald-600"/>
 Military / Service
 </label>
 <label className="flex items-center gap-2 text-sm cursor-pointer">
 <input type="checkbox" checked={isConsortium} onChange={(e) => setIsConsortium(e.target.checked)}
 className="rounded border-border/20"/>
 <Users size={14} className="text-blue-600"/>
 Consortium Member
 </label>
 </div>
 </div>

 {/* Stats */}
 {results && (
 <div className="grid grid-cols-3 gap-4 mb-8">
 <div className="editorial-card p-4 text-center">
 <p className="text-3xl font-bold text-primary">{results.total_schools}</p>
 <p className="text-xs text-foreground/40">Schools</p>
 </div>
 <div className="editorial-card p-4 text-center">
 <p className="text-3xl font-bold text-emerald-600">{results.military_eligible}</p>
 <p className="text-xs text-foreground/40">Military Eligible</p>
 </div>
 <div className="editorial-card p-4 text-center">
 <p className="text-3xl font-bold text-blue-600">{results.consortium_eligible}</p>
 <p className="text-xs text-foreground/40">Consortium Eligible</p>
 </div>
 </div>
 )}

 {error && (
 <div className="editorial-card p-4 mb-6 border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
 )}

 {loading && (
 <div className="text-center py-16">
 <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"/>
 </div>
 )}

 {/* Results */}
 {results && !loading && (
 <div className="space-y-3">
 {results.waivers.map((w) => (
 <div key={w.school_id} className="editorial-card p-5">
 <div className="flex items-center gap-3 mb-3">
 <Link href={`/school/${w.school_id}`}
 className="font-semibold text-foreground hover:text-primary transition-colors">
 {w.school_name}
 </Link>
 {w.auto_waiver && (
 <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold">Auto Waiver</span>
 )}
 {w.consortium && (
 <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-bold">Consortium</span>
 )}
 {w.qualifies_military && (
 <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold">You Qualify (Military)</span>
 )}
 {w.qualifies_consortium && (
 <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-bold">You Qualify (Consortium)</span>
 )}
 </div>
 <ul className="space-y-1">
 {w.waivers.map((waiver, i) => (
 <li key={i} className="flex items-start gap-2 text-sm text-foreground/70">
 <CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0"/>
 {waiver}
 </li>
 ))}
 </ul>
 </div>
 ))}
 </div>
 )}

 <EmailCapture variant="contextual"source="fee-waivers"/>
 <ToolCrossLinks current="/fee-waivers"/>
 </div>
 </main>
 );
}
