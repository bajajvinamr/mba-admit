"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Target,
  FileText,
  Flame,
  BookOpen,
  Briefcase,
  BarChart3,
  Calendar,
  ClipboardList,
  GraduationCap,
  DollarSign,
  Users,
} from "lucide-react";

// ── Sidebar configs per context ────────────────────────────────────────────

type SidebarLink = {
  href: string;
  label: string;
  icon: React.ElementType;
};

type SidebarConfig = {
  title: string;
  links: SidebarLink[];
};

const DASHBOARD_SIDEBAR: SidebarConfig = {
  title: "Quick Actions",
  links: [
    { href: "/simulator", label: "Odds Calculator", icon: Target },
    { href: "/evaluator", label: "Essay Evaluator", icon: FileText },
    { href: "/roaster", label: "Resume Roaster", icon: Flame },
    { href: "/profile-report", label: "Profile Report", icon: BarChart3 },
    { href: "/compare", label: "Compare Schools", icon: GraduationCap },
    { href: "/roi", label: "ROI Calculator", icon: DollarSign },
  ],
};

const PORTFOLIO_SIDEBAR: SidebarConfig = {
  title: "Portfolio",
  links: [
    { href: "/my-schools", label: "Tracked Schools", icon: ClipboardList },
    { href: "/calendar", label: "Deadlines", icon: Calendar },
    { href: "/checklist", label: "Checklist", icon: ClipboardList },
    { href: "/recommenders", label: "Recommenders", icon: Users },
    { href: "/outreach", label: "Networking", icon: Users },
  ],
};

const ESSAY_SIDEBAR: SidebarConfig = {
  title: "Essay Workspace",
  links: [
    { href: "/essays/coach", label: "AI Coach", icon: BookOpen },
    { href: "/essays/examples", label: "Examples Library", icon: FileText },
    { href: "/essays/themes", label: "Theme Analyzer", icon: BarChart3 },
    { href: "/evaluator", label: "Essay Evaluator", icon: FileText },
    { href: "/storyteller", label: "Storyteller", icon: Briefcase },
    { href: "/goals", label: "Goal Sculptor", icon: Target },
  ],
};

// Pages that should NOT show a sidebar
const NO_SIDEBAR_PATTERNS = [
  "/schools",
  "/school/",
  "/interview",
  "/simulator",
  "/roi",
  "/salary",
  "/pricing",
];

function getSidebarConfig(pathname: string): SidebarConfig | null {
  // No sidebar on specific pages
  if (NO_SIDEBAR_PATTERNS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    // Exception: essay pages under /essays should still get sidebar
    if (!pathname.startsWith("/essays")) {
      return null;
    }
  }

  // Essay workspace
  if (
    pathname.startsWith("/essays") ||
    pathname === "/evaluator" ||
    pathname === "/storyteller" ||
    pathname === "/goals" ||
    pathname === "/essay-drafts"
  ) {
    return ESSAY_SIDEBAR;
  }

  // Portfolio
  if (
    pathname === "/my-schools" ||
    pathname.startsWith("/my-schools/") ||
    pathname === "/calendar" ||
    pathname === "/checklist" ||
    pathname === "/recommenders" ||
    pathname === "/outreach"
  ) {
    return PORTFOLIO_SIDEBAR;
  }

  // Dashboard
  if (pathname === "/dashboard" || pathname === "/") {
    return DASHBOARD_SIDEBAR;
  }

  return null;
}

// ── Sidebar Nav ────────────────────────────────────────────────────────────

function SidebarNav({
  config,
  pathname,
}: {
  config: SidebarConfig;
  pathname: string;
}) {
  return (
    <nav aria-label={config.title} className="flex flex-col gap-1 px-3 py-2">
      {config.links.map((link) => {
        const Icon = link.icon;
        const active = pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// ── Main Sidebar ──────────────────────────────────────────────────────────

interface SidebarProps extends React.ComponentPropsWithRef<"aside"> {
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  ({ className, mobileOpen = false, onMobileOpenChange, ...props }, ref) => {
    const pathname = usePathname();
    const config = getSidebarConfig(pathname);

    // Don't render anything if no sidebar for this context
    if (!config) return null;

    return (
      <>
        {/* Desktop sidebar */}
        <aside
          ref={ref}
          className={cn(
            "hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:bg-background",
            className
          )}
          {...props}
        >
          <div className="flex h-14 items-center px-4">
            <span className="text-lg font-semibold tracking-tight">
              {config.title}
            </span>
          </div>
          <Separator />
          <ScrollArea className="flex-1">
            <SidebarNav config={config} pathname={pathname} />
          </ScrollArea>
        </aside>

        {/* Mobile sidebar (Sheet overlay) */}
        <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="px-4 pt-4">
              <SheetTitle>{config.title}</SheetTitle>
            </SheetHeader>
            <Separator />
            <ScrollArea className="flex-1">
              <SidebarNav config={config} pathname={pathname} />
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </>
    );
  }
);

Sidebar.displayName = "Sidebar";

export { Sidebar, SidebarNav };
export type { SidebarProps, SidebarConfig };
