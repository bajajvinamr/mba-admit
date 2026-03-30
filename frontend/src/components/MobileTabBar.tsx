"use client";

import Link from"next/link";
import { usePathname } from"next/navigation";
import { Search, GraduationCap, FileText, LayoutDashboard } from"lucide-react";

const TABS = [
 { href:"/dashboard", label:"Home", icon: LayoutDashboard },
 { href:"/schools", label:"Schools", icon: Search },
 { href:"/evaluator", label:"Essay AI", icon: FileText },
 { href:"/my-schools", label:"My List", icon: GraduationCap },
] as const;

export function MobileTabBar() {
 const pathname = usePathname();

 return (
 <nav
 aria-label="Mobile navigation"
 className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t border-border"
 style={{ paddingBottom:"env(safe-area-inset-bottom, 0px)"}}
 >
 <div className="grid grid-cols-4 h-14">
 {TABS.map((tab) => {
 const Icon = tab.icon;
 const active = pathname === tab.href || pathname.startsWith(tab.href +"/");
 return (
 <Link
 key={tab.href}
 href={tab.href}
 aria-current={active ?"page": undefined}
 className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
 active ?"text-primary":"text-muted-foreground/40"
 }`}
 >
 <Icon size={18} strokeWidth={active ? 2.5 : 1.5} />
 <span className="text-[9px] font-bold uppercase tracking-wider">{tab.label}</span>
 </Link>
 );
 })}
 </div>
 </nav>
 );
}
