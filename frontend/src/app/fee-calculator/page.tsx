"use client";

import { useState } from"react";
import { DollarSign, Plus, X, Calculator } from"lucide-react";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type SchoolFee = {
 school_id: string;
 school_name: string;
 application_fee: number;
 gmat_score_report_fee: number;
 transcript_fee: number;
 total_per_school: number;
 potential_waivers: string[];
};

type FeeResponse = {
 schools: SchoolFee[];
 grand_total: number;
 total_schools: number;
};

const POPULAR = [
"hbs","gsb","wharton","booth","kellogg","cbs","sloan","tuck",
"haas","ross","fuqua","darden","stern","yale_som","anderson",
];

export default function FeeCalculatorPage() {
 const [selected, setSelected] = useState<string[]>(["hbs","gsb","wharton"]);
 const [data, setData] = useState<FeeResponse | null>(null);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const calculate = () => {
 if (selected.length === 0) return;
 setLoading(true);
 setError(null);
 apiFetch<FeeResponse>("/api/fee-calculator", {
 method:"POST",
 headers: {"Content-Type":"application/json"},
 body: JSON.stringify({ school_ids: selected }),
 })
 .then(setData)
 .catch(() => setError("Could not calculate fees. Please try again."))
 .finally(() => setLoading(false));
 };

 const toggle = (id: string) => {
 setSelected((prev) =>
 prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
 );
 };

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-4xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Application Fee Calculator
 </h1>
 <p className="text-white/70 text-lg">Calculate total costs including fees, score reports, and transcripts.</p>
 </div>
 </section>

 <div className="max-w-4xl mx-auto px-6 py-10">
 {/* School selector */}
 <div className="editorial-card p-5 mb-6">
 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Select Schools</p>
 <div className="flex flex-wrap gap-2 mb-4">
 {POPULAR.map((id) => (
 <button
 key={id}
 onClick={() => toggle(id)}
 aria-pressed={selected.includes(id)}
 className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
 selected.includes(id) ?"bg-foreground text-white":"bg-foreground/5 text-muted-foreground hover:bg-foreground/10"
 }`}
 >
 {id.toUpperCase()}
 </button>
 ))}
 </div>
 <button onClick={calculate} disabled={selected.length === 0}
 className="px-5 py-2 bg-primary text-foreground text-sm font-bold rounded hover:bg-primary/90 disabled:opacity-40 flex items-center gap-2">
 <Calculator size={14} /> Calculate Total
 </button>
 </div>

 {error && (
 <div role="alert" className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg text-sm mb-6 flex justify-between items-center">
 <span>{error}</span>
 <button onClick={() => setError(null)} className="ml-4 text-red-600 font-bold" aria-label="Dismiss error">&times;</button>
 </div>
 )}

 {loading && (
 <div className="text-center py-12">
 <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"/>
 </div>
 )}

 {data && !loading && (
 <>
 {/* Grand total */}
 <div className="editorial-card p-8 text-center mb-8">
 <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Grand Total ({data.total_schools} schools)</p>
 <p className="text-5xl font-bold text-primary">${data.grand_total.toLocaleString()}</p>
 </div>

 {/* Per-school breakdown */}
 <div className="editorial-card overflow-hidden">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-border/10">
 <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">School</th>
 <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">App Fee</th>
 <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">GMAT Report</th>
 <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Transcript</th>
 <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total</th>
 </tr>
 </thead>
 <tbody>
 {data.schools.map((s) => (
 <tr key={s.school_id} className="border-b border-border/5 hover:bg-primary/3">
 <td className="px-4 py-3">
 <p className="font-medium text-foreground">{s.school_name}</p>
 {s.potential_waivers.length > 0 && (
 <p className="text-[9px] text-emerald-600 mt-0.5">Waiver: {s.potential_waivers[0]}</p>
 )}
 </td>
 <td className="px-4 py-3 text-center">${s.application_fee}</td>
 <td className="px-4 py-3 text-center">${s.gmat_score_report_fee}</td>
 <td className="px-4 py-3 text-center">${s.transcript_fee}</td>
 <td className="px-4 py-3 text-center font-bold text-primary">${s.total_per_school}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </>
 )}

 <ToolCrossLinks current="/fee-calculator"/>
 </div>
 </main>
 );
}
