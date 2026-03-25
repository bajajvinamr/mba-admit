"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { usePageView } from "@/hooks/usePageView";
import Link from "next/link";
import {
  Menu, X, ChevronDown,
  Search, BarChart3, FileText, Mic, Flame, Users, Globe, Target,
  Briefcase, BookOpen, Banknote, Hourglass, CheckCircle2,
  Calendar, DollarSign, MessageSquare, ClipboardList,
  Network, GraduationCap,
} from "lucide-react";
import { AuthButton } from "@/components/AuthButton";
import { ProfilePill } from "@/components/ProfilePill";
import { PlanPill } from "@/components/PlanPill";
import { ThemeToggle } from "@/components/ThemeToggle";

type NavGroup = {
  label: string;
  items: { href: string; label: string; icon: React.ReactNode; desc: string }[];
};

// ── Journey-based navigation ─────────────────────────────────────────────────
// 5 stages that mirror how an MBA aspirant actually thinks:
//   Explore → Build → Apply → Interview → Decide
// Max 6 items per dropdown. Everything else is accessible via ⌘K search.

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Explore",
    items: [
      { href: "/schools", label: "School Directory", icon: <Search size={16} />, desc: "Browse 840+ programs" },
      { href: "/simulator", label: "Odds Calculator", icon: <Target size={16} />, desc: "Your chances at any school" },
      { href: "/decisions", label: "Community Decisions", icon: <Globe size={16} />, desc: "Real admit/deny outcomes" },
      { href: "/compare", label: "Compare Schools", icon: <BarChart3 size={16} />, desc: "Side-by-side analysis" },
      { href: "/profile-report", label: "Profile Report", icon: <Target size={16} />, desc: "Your strengths & gaps" },
      { href: "/rankings", label: "Rankings", icon: <GraduationCap size={16} />, desc: "Sort by GMAT, salary, tier" },
    ],
  },
  {
    label: "Build",
    items: [
      { href: "/evaluator", label: "Essay Evaluator", icon: <FileText size={16} />, desc: "AI essay B.S. detector" },
      { href: "/roaster", label: "Resume Roaster", icon: <Flame size={16} />, desc: "Brutal bullet critique" },
      { href: "/storyteller", label: "Storyteller", icon: <BookOpen size={16} />, desc: "Find your narrative" },
      { href: "/goals", label: "Goal Sculptor", icon: <Briefcase size={16} />, desc: "Post-MBA story" },
      { href: "/essay-drafts", label: "Essay Drafts", icon: <FileText size={16} />, desc: "All your essays" },
    ],
  },
  {
    label: "Apply",
    items: [
      { href: "/my-schools", label: "Application Tracker", icon: <ClipboardList size={16} />, desc: "Track every school" },
      { href: "/calendar", label: "Deadline Calendar", icon: <Calendar size={16} />, desc: "Never miss a deadline" },
      { href: "/checklist", label: "App Checklist", icon: <CheckCircle2 size={16} />, desc: "Requirements per school" },
      { href: "/recommenders", label: "Rec Strategy", icon: <Users size={16} />, desc: "Letter of rec planning" },
      { href: "/outreach", label: "Networking Hub", icon: <Network size={16} />, desc: "Alumni outreach" },
    ],
  },
  {
    label: "Interview",
    items: [
      { href: "/interview", label: "Mock Interview", icon: <Mic size={16} />, desc: "AI interview practice" },
      { href: "/interview/questions", label: "Question Bank", icon: <MessageSquare size={16} />, desc: "100+ curated questions" },
    ],
  },
  {
    label: "Decide",
    items: [
      { href: "/scholarships", label: "Scholarships & Aid", icon: <Banknote size={16} />, desc: "Financial aid strategy" },
      { href: "/waitlist", label: "Waitlist Strategy", icon: <Hourglass size={16} />, desc: "Post-waitlist game plan" },
      { href: "/roi", label: "ROI Calculator", icon: <DollarSign size={16} />, desc: "10-year return analysis" },
      { href: "/salary", label: "Salary Calculator", icon: <DollarSign size={16} />, desc: "Post-MBA salary by role" },
    ],
  },
];

export function Navbar() {
  const pathname = usePathname();
  usePageView(); // Auto-track page views on every route change
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setActiveDropdown(null);
  }, [pathname]);

  // Prevent body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const handleMouseEnter = (label: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveDropdown(label);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setActiveDropdown(null), 150);
  };

  const isActive = (href: string) => pathname === href;
  const isGroupActive = (group: NavGroup) => group.items.some((i) => pathname === i.href);

  return (
    <>
      <nav className={`fixed w-full z-50 transition-all bg-background border-b border-border`} aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className={"font-display text-xl font-semibold tracking-tight transition-colors text-foreground hover:text-foreground/80"}>
              ADMIT COMPASS.
            </Link>
            <span className="text-[9px] bg-muted text-muted-foreground px-2 py-0.5 uppercase tracking-widest font-medium hidden lg:inline border border-border">
              Beta
            </span>
          </div>

          {/* Desktop Nav - Journey-based */}
          <div className="hidden md:flex items-center gap-0.5" ref={dropdownRef}>
            {/* Journey dropdowns */}
            {NAV_GROUPS.map((group) => (
              <div
                key={group.label}
                className="relative"
                onMouseEnter={() => handleMouseEnter(group.label)}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  className={`flex items-center gap-1 px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                    isGroupActive(group) || activeDropdown === group.label
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {group.label}
                  <ChevronDown
                    size={12}
                    className={`transition-transform ${activeDropdown === group.label ? "rotate-180" : ""}`}
                  />
                </button>

                {activeDropdown === group.label && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-muted border border-border py-2 animate-in fade-in slide-in-from-top-1 duration-150">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-start gap-3 px-4 py-2.5 transition-colors ${
                          isActive(item.href)
                            ? "bg-accent text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-background"
                        }`}
                      >
                        <span className="mt-0.5 shrink-0">{item.icon}</span>
                        <div>
                          <p className="text-sm font-semibold">{item.label}</p>
                          <p className="text-[11px] text-muted-foreground/60">{item.desc}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Pricing link */}
            <Link
              href="/pricing"
              className={`px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                pathname === "/pricing"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pricing
            </Link>

            {/* Search - triggers ⌘K */}
            <button
              onClick={() => {
                window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-muted-foreground border border-border hover:border-primary/30 hover:text-foreground transition-colors ml-1"
              title="Search schools (⌘K)"
            >
              <Search size={12} />
              <kbd className="hidden lg:inline text-[10px] bg-muted border border-border px-1.5 py-0.5 font-mono">⌘K</kbd>
            </button>

            <ThemeToggle />

            <div className="w-px h-5 bg-border mx-1.5" />

            {/* Plan + Profile + Auth */}
            <PlanPill />
            <ProfilePill />
            <div className="pl-1">
              <AuthButton />
            </div>
          </div>

          {/* Mobile: Hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 text-foreground hover:text-primary transition-colors"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer - journey-based mobile nav */}
          <div className="absolute top-0 right-0 w-80 max-w-[85vw] h-full bg-muted border-l border-border overflow-y-auto">
            <div className="p-6 pt-20">
              {/* Journey groups */}
              {NAV_GROUPS.map((group) => (
                <div key={group.label} className="mb-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/50 px-3 mb-2">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                          isActive(item.href) ? "bg-accent text-primary" : "text-muted-foreground hover:text-foreground hover:bg-background"
                        }`}
                      >
                        <span className="shrink-0">{item.icon}</span>
                        <div>
                          <p className="font-semibold text-sm">{item.label}</p>
                          <p className="text-[11px] text-muted-foreground/60">{item.desc}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}

              {/* Pricing */}
              <div className="mb-5">
                <Link
                  href="/pricing"
                  className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                    pathname === "/pricing" ? "bg-accent text-primary" : "text-muted-foreground hover:text-foreground hover:bg-background"
                  }`}
                >
                  <DollarSign size={16} />
                  <div>
                    <p className="font-semibold text-sm">Pricing</p>
                    <p className="text-[11px] text-muted-foreground/60">Free, Pro, Premium plans</p>
                  </div>
                </Link>
              </div>

              {/* Profile + Auth */}
              <div className="mt-4 border-t border-border pt-4 space-y-3">
                <div className="px-3 flex items-center gap-2">
                  <PlanPill />
                  <ProfilePill />
                </div>
                <AuthButton />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
