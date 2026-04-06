"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { usePageView } from "@/hooks/usePageView";
import Link from "next/link";
import { Search, LayoutDashboard, Compass, GraduationCap, FileText, Mic, DollarSign, Bell } from "lucide-react";
import { AuthButton } from "@/components/AuthButton";
import { ProfilePill } from "@/components/ProfilePill";
import { PlanPill } from "@/components/PlanPill";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/schools", label: "Explore", icon: Compass },
  { href: "/essays/examples", label: "Essays", icon: FileText },
  { href: "/interview", label: "Interview", icon: Mic },
  { href: "/finances", label: "Finances", icon: DollarSign },
] as const;

export function Navbar() {
  const pathname = usePathname();
  usePageView();

  // Helper to check active state
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <nav
      className="fixed w-full z-50 bg-background border-b border-border"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-6 py-3.5 flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="font-display text-xl font-semibold tracking-tight text-foreground hover:text-muted-foreground transition-colors"
          >
            ADMIT COMPASS.
          </Link>
          <span className="text-[9px] bg-muted text-muted-foreground px-2 py-0.5 uppercase tracking-widest font-medium hidden lg:inline border border-border">
            Beta
          </span>
        </div>

        {/* Desktop Nav - Direct links */}
        <div className="hidden md:flex items-center gap-0.5">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                  isActive(link.href)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={14} />
                {link.label}
              </Link>
            );
          })}

          {/* Cmd+K search trigger */}
          <button
            onClick={() => {
              window.dispatchEvent(
                new KeyboardEvent("keydown", { key: "k", metaKey: true })
              );
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-muted-foreground border border-border hover:border-primary/30 hover:text-foreground transition-colors ml-1"
            title="Search (⌘K)"
          >
            <Search size={12} />
            <kbd className="hidden lg:inline text-[10px] bg-muted border border-border px-1.5 py-0.5 font-mono">
              ⌘K
            </kbd>
          </button>

          <ThemeToggle />
          <NotificationBell />

          <div className="w-px h-5 bg-border mx-1.5" />

          {/* Plan + Profile + Auth */}
          <PlanPill />
          <ProfilePill />
          <div className="pl-1">
            <AuthButton />
          </div>
        </div>

        {/* Mobile: just show auth (MobileTabBar handles nav) */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <AuthButton />
        </div>
      </div>
    </nav>
  );
}
