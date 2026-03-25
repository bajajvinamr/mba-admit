"use client";

import { useState, useMemo } from"react";
import { DollarSign, Plus, X, Calculator } from"lucide-react";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type BudgetItem = { label: string; amount: number; category: string };

const DEFAULT_ITEMS: BudgetItem[] = [
 { label:"GMAT/GRE Registration", amount: 275, category:"Testing"},
 { label:"GMAT Prep Course", amount: 800, category:"Testing"},
 { label:"Score Reports (5 schools)", amount: 175, category:"Testing"},
 { label:"Application Fees (avg $250 × 5)", amount: 1250, category:"Applications"},
 { label:"Transcript Requests (5)", amount: 50, category:"Applications"},
 { label:"Campus Visit (1 trip)", amount: 600, category:"Travel"},
 { label:"Professional Headshot", amount: 150, category:"Materials"},
 { label:"Resume Editing Service", amount: 200, category:"Materials"},
];

const CATEGORIES = ["Testing","Applications","Travel","Materials","Consulting","Other"];
const CAT_COLORS: Record<string, string> = {
 Testing:"bg-purple-50 text-purple-600",
 Applications:"bg-primary/10 text-primary",
 Travel:"bg-blue-50 text-blue-600",
 Materials:"bg-emerald-50 text-emerald-600",
 Consulting:"bg-orange-50 text-orange-600",
 Other:"bg-foreground/5 text-muted-foreground",
};

export default function BudgetPage() {
 const [items, setItems] = useState<BudgetItem[]>(DEFAULT_ITEMS);
 const [newLabel, setNewLabel] = useState("");
 const [newAmount, setNewAmount] = useState("");
 const [newCategory, setNewCategory] = useState("Other");
 const [showAdd, setShowAdd] = useState(false);

 const total = useMemo(() => items.reduce((s, i) => s + i.amount, 0), [items]);
 const byCategory = useMemo(() => {
 const map: Record<string, number> = {};
 items.forEach((i) => { map[i.category] = (map[i.category] || 0) + i.amount; });
 return Object.entries(map).sort((a, b) => b[1] - a[1]);
 }, [items]);

 const addItem = () => {
 if (!newLabel || !newAmount) return;
 setItems([...items, { label: newLabel, amount: +newAmount, category: newCategory }]);
 setNewLabel(""); setNewAmount(""); setShowAdd(false);
 };

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-4xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Application Budget Calculator
 </h1>
 <p className="text-white/70 text-lg">Know your total cost before you start.</p>
 </div>
 </section>

 <div className="max-w-4xl mx-auto px-6 py-10">
 {/* Total */}
 <div className="editorial-card p-8 text-center mb-8">
 <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Estimated Total Budget</p>
 <p className="text-5xl font-bold text-primary">${total.toLocaleString()}</p>
 </div>

 {/* Category breakdown */}
 <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
 {byCategory.map(([cat, amt]) => (
 <div key={cat} className="editorial-card p-4">
 <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${CAT_COLORS[cat] || CAT_COLORS.Other}`}>{cat}</span>
 <p className="text-xl font-bold text-foreground mt-1">${amt.toLocaleString()}</p>
 <div className="w-full bg-foreground/5 rounded-full h-1.5 mt-2">
 <div className="h-full bg-primary rounded-full" style={{ width: `${(amt / total) * 100}%` }} />
 </div>
 </div>
 ))}
 </div>

 {/* Items list */}
 <div className="editorial-card overflow-hidden mb-6">
 <div className="divide-y divide-jet/5">
 {items.map((item, i) => (
 <div key={i} className="flex items-center gap-3 px-5 py-3">
 <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${CAT_COLORS[item.category] || CAT_COLORS.Other}`}>
 {item.category}
 </span>
 <span className="flex-1 text-sm text-foreground">{item.label}</span>
 <span className="text-sm font-bold text-foreground">${item.amount.toLocaleString()}</span>
 <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-red-400">
 <X size={12} />
 </button>
 </div>
 ))}
 </div>
 </div>

 {/* Add item */}
 <button onClick={() => setShowAdd(!showAdd)}
 className="mb-4 px-4 py-2 border border-border/10 text-sm text-muted-foreground rounded-lg hover:border-border/30 flex items-center gap-1">
 <Plus size={14} /> Add Expense
 </button>

 {showAdd && (
 <div className="editorial-card p-4 mb-6">
 <div className="flex gap-2 flex-wrap">
 <input type="text" placeholder="Description" value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
 className="flex-1 min-w-40 px-3 py-2 border border-border/10 rounded text-sm"/>
 <input type="number" placeholder="Amount" value={newAmount} onChange={(e) => setNewAmount(e.target.value)}
 className="w-28 px-3 py-2 border border-border/10 rounded text-sm"/>
 <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
 className="px-3 py-2 border border-border/10 rounded text-sm">
 {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
 </select>
 <button onClick={addItem} className="px-4 py-2 bg-foreground text-white text-sm rounded font-medium">Add</button>
 </div>
 </div>
 )}

 <ToolCrossLinks current="/budget"/>
 </div>
 </main>
 );
}
