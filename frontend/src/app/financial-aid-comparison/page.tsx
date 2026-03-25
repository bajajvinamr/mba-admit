"use client";

import { useState } from"react";
import { Plus, Trash2, DollarSign, TrendingDown, Award } from"lucide-react";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type AidPackage = {
 id: string;
 school: string;
 tuition: number;
 livingCost: number;
 scholarship: number;
 grants: number;
 loans: number;
 stipend: number;
 medianSalary: number;
};

const BLANK: Omit<AidPackage,"id"> = { school:"", tuition: 0, livingCost: 0, scholarship: 0, grants: 0, loans: 0, stipend: 0, medianSalary: 0 };

const PRESETS: Record<string, Omit<AidPackage,"id"|"scholarship"|"grants"|"loans"|"stipend">> = {
"HBS": { school:"Harvard Business School", tuition: 115200, livingCost: 54000, medianSalary: 175000 },
"GSB": { school:"Stanford GSB", tuition: 119400, livingCost: 56000, medianSalary: 180000 },
"Wharton": { school:"Wharton", tuition: 115738, livingCost: 48000, medianSalary: 175000 },
"Booth": { school:"Chicago Booth", tuition: 113100, livingCost: 42000, medianSalary: 175000 },
"Kellogg": { school:"Kellogg", tuition: 110850, livingCost: 44000, medianSalary: 170000 },
"CBS": { school:"Columbia Business School", tuition: 116544, livingCost: 52000, medianSalary: 175000 },
"Sloan": { school:"MIT Sloan", tuition: 112800, livingCost: 50000, medianSalary: 175000 },
};

function fmt(n: number) { return "$"+ n.toLocaleString(); }

let nextId = 1;

export default function FinancialAidComparisonPage() {
 const [packages, setPackages] = useState<AidPackage[]>([
 { ...BLANK, id:"p0", school:"School A"},
 { ...BLANK, id:"p1", school:"School B"},
 ]);

 const addPackage = () => setPackages([...packages, { ...BLANK, id: `p${nextId++}`, school: `School ${String.fromCharCode(65 + packages.length)}` }]);
 const removePackage = (id: string) => setPackages(packages.filter((p) => p.id !== id));

 const update = (id: string, field: keyof AidPackage, value: string | number) => {
 setPackages(packages.map((p) => p.id === id ? { ...p, [field]: value } : p));
 };

 const applyPreset = (id: string, key: string) => {
 const preset = PRESETS[key];
 if (!preset) return;
 setPackages(packages.map((p) => p.id === id ? { ...p, ...preset } : p));
 };

 const calc = (p: AidPackage) => {
 const totalCost = (p.tuition + p.livingCost) * 2;
 const totalAid = (p.scholarship + p.grants + p.stipend) * 2;
 const netCost = totalCost - totalAid;
 const totalDebt = p.loans * 2;
 const opportunityCost = p.medianSalary * 2;
 const totalInvestment = netCost + opportunityCost;
 const paybackYears = p.medianSalary > 0 ? Math.round((netCost / (p.medianSalary * 0.3)) * 10) / 10 : 0;
 return { totalCost, totalAid, netCost, totalDebt, opportunityCost, totalInvestment, paybackYears };
 };

 const numField = (id: string, field: keyof AidPackage, label: string) => (
 <div>
 <label className="text-[10px] text-foreground/40 block mb-0.5">{label}</label>
 <input type="number" value={(packages.find((p) => p.id === id)?.[field] as number) ||""} onChange={(e) => update(id, field, Number(e.target.value))}
 className="w-full px-2 py-1.5 border border-border/10 rounded text-xs text-foreground bg-card"/>
 </div>
 );

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-6xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">Financial Aid Comparison</h1>
 <p className="text-white/70 text-lg">Compare MBA financial aid packages side by side.</p>
 </div>
 </section>

 <div className="max-w-6xl mx-auto px-6 py-10">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
 {packages.map((p) => {
 const c = calc(p);
 return (
 <div key={p.id} className="editorial-card p-5">
 <div className="flex items-center justify-between mb-3">
 <input type="text" value={p.school} onChange={(e) => update(p.id,"school", e.target.value)}
 className="text-sm font-medium text-foreground bg-transparent border-b border-border/10 focus:border-primary outline-none w-full mr-2"/>
 {packages.length > 2 && (
 <button onClick={() => removePackage(p.id)} className="text-foreground/20 hover:text-red-400"><Trash2 size={14} /></button>
 )}
 </div>

 <div className="flex flex-wrap gap-1 mb-3">
 {Object.keys(PRESETS).map((key) => (
 <button key={key} onClick={() => applyPreset(p.id, key)} className="text-[9px] px-2 py-0.5 bg-foreground/5 hover:bg-foreground/10 rounded-full text-foreground/50">{key}</button>
 ))}
 </div>

 <div className="grid grid-cols-2 gap-2 mb-4">
 {numField(p.id,"tuition","Tuition/year")}
 {numField(p.id,"livingCost","Living cost/year")}
 {numField(p.id,"scholarship","Scholarship/year")}
 {numField(p.id,"grants","Grants/year")}
 {numField(p.id,"loans","Loans/year")}
 {numField(p.id,"stipend","Stipend/year")}
 {numField(p.id,"medianSalary","Post-MBA salary")}
 </div>

 <div className="space-y-2 pt-3 border-t border-border/5">
 <div className="flex justify-between text-xs"><span className="text-foreground/40">Total Cost (2yr)</span><span className="font-bold text-foreground">{fmt(c.totalCost)}</span></div>
 <div className="flex justify-between text-xs"><span className="text-foreground/40">Total Aid (2yr)</span><span className="font-bold text-emerald-600">-{fmt(c.totalAid)}</span></div>
 <div className="flex justify-between text-xs border-t border-border/5 pt-2"><span className="text-foreground/60 font-medium">Net Cost</span><span className="font-bold text-foreground text-sm">{fmt(c.netCost)}</span></div>
 <div className="flex justify-between text-xs"><span className="text-foreground/40">Debt at grad</span><span className="text-foreground/70">{fmt(c.totalDebt)}</span></div>
 <div className="flex justify-between text-xs"><span className="text-foreground/40">Payback period</span><span className="text-foreground/70">{c.paybackYears} years</span></div>
 </div>
 </div>
 );
 })}

 {packages.length < 5 && (
 <button onClick={addPackage} className="editorial-card p-5 flex items-center justify-center gap-2 text-foreground/30 hover:text-foreground/60 hover:border-border/20 border-2 border-dashed border-border/10 transition-colors min-h-[200px]">
 <Plus size={20} /> Add School
 </button>
 )}
 </div>

 {/* Summary comparison */}
 {packages.some((p) => p.tuition > 0) && (
 <div className="editorial-card p-6">
 <h2 className="text-xs font-bold uppercase tracking-widest text-foreground/30 mb-4">Comparison Summary</h2>
 <div className="overflow-x-auto">
 <table className="w-full text-xs">
 <thead>
 <tr className="border-b border-border/10">
 <th className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-foreground/40">Metric</th>
 {packages.map((p) => <th key={p.id} className="text-right py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-foreground/40">{p.school}</th>)}
 </tr>
 </thead>
 <tbody>
 {[
 { label:"Total Cost", fn: (p: AidPackage) => fmt(calc(p).totalCost) },
 { label:"Scholarship", fn: (p: AidPackage) => fmt(p.scholarship * 2) },
 { label:"Net Cost", fn: (p: AidPackage) => fmt(calc(p).netCost) },
 { label:"Debt", fn: (p: AidPackage) => fmt(calc(p).totalDebt) },
 { label:"Payback", fn: (p: AidPackage) => `${calc(p).paybackYears}yr` },
 { label:"Post-MBA Salary", fn: (p: AidPackage) => fmt(p.medianSalary) },
 ].map((row) => (
 <tr key={row.label} className="border-b border-border/5">
 <td className="py-2 px-3 text-foreground/60">{row.label}</td>
 {packages.map((p) => <td key={p.id} className="py-2 px-3 text-right font-medium text-foreground">{row.fn(p)}</td>)}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}

 <ToolCrossLinks current="/financial-aid-comparison"/>
 </div>
 </main>
 );
}
