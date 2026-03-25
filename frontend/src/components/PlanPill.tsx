"use client";

import { useState, useEffect } from"react";
import Link from"next/link";
import { Zap } from"lucide-react";
import type { Tier } from"@/hooks/useUsage";

const TIER_DISPLAY: Record<Tier, { label: string; color: string; bgColor: string }> = {
 free: { label:"Free", color:"text-muted-foreground/50", bgColor:"bg-foreground/5"},
 pro: { label:"Pro", color:"text-primary", bgColor:"bg-primary/10"},
 premium: { label:"Premium", color:"text-purple-600", bgColor:"bg-purple-50"},
};

export function PlanPill() {
 const [tier, setTier] = useState<Tier>("free");

 useEffect(() => {
 const saved = localStorage.getItem("ac_tier") as Tier | null;
 if (saved && ["free","pro","premium"].includes(saved)) {
 setTier(saved);
 }
 }, []);

 const display = TIER_DISPLAY[tier];

 // Free users see a subtle upgrade nudge; paid users see their plan badge
 if (tier ==="free") {
 return (
 <Link
 href="/pricing"
 className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
 title="Upgrade to Pro"
 >
 <Zap size={10} />
 Upgrade
 </Link>
 );
 }

 return (
 <Link
 href="/pricing"
 className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-colors ${display.bgColor} ${display.color} hover:opacity-80`}
 title="Manage plan"
 >
 {display.label}
 </Link>
 );
}
