"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  FileText,
  Mic,
  MoreHorizontal,
  DollarSign,
  Briefcase,
  BookOpen,
  Compass,
  Users,
  User,
  Settings,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const PRIMARY_TABS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/schools", label: "Schools", icon: GraduationCap },
  { href: "/essays/examples", label: "Essays", icon: FileText },
  { href: "/interview", label: "Interview", icon: Mic },
] as const;

const MORE_ITEMS = [
  { href: "/roi", label: "Finances", icon: DollarSign },
  { href: "/my-schools", label: "Portfolio", icon: Briefcase },
  { href: "/test-prep", label: "Test Prep", icon: BookOpen },
  { href: "/mba-in/us", label: "Guides", icon: Compass },
  { href: "/mentors", label: "Community", icon: Users },
  { href: "/profile-report", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function MobileTabBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  // Check if any "more" item is active
  const moreActive = MORE_ITEMS.some((item) => isActive(item.href));

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="grid grid-cols-5 h-14">
          {PRIMARY_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground/40"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 1.5} />
                <span className="text-[9px] font-bold uppercase tracking-wider">
                  {tab.label}
                </span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
              moreActive ? "text-primary" : "text-muted-foreground/40"
            }`}
          >
            <MoreHorizontal size={18} strokeWidth={moreActive ? 2.5 : 1.5} />
            <span className="text-[9px] font-bold uppercase tracking-wider">
              More
            </span>
          </button>
        </div>
      </nav>

      {/* More sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="pb-safe">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2 py-4">
            {MORE_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
