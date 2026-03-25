"use client";

import * as React from"react";
import { cn } from"@/lib/cn";
import { JOURNEY_STAGES, type JourneyStage } from"@/lib/constants";
import { ScrollArea } from"@/components/ui/scroll-area";
import { Separator } from"@/components/ui/separator";
import {
 Sheet,
 SheetContent,
 SheetHeader,
 SheetTitle,
} from"@/components/ui/sheet";
import {
 Search,
 BookOpen,
 PenTool,
 Mic,
 Scale,
 Users,
 Check,
} from"lucide-react";

const ICON_MAP = {
 Search,
 BookOpen,
 PenTool,
 Mic,
 Scale,
 Users,
} as const;

type StageStatus ="past"|"current"|"future";

function getStageStatus(
 stageId: JourneyStage,
 currentStage: JourneyStage
): StageStatus {
 const currentIndex = JOURNEY_STAGES.findIndex((s) => s.id === currentStage);
 const stageIndex = JOURNEY_STAGES.findIndex((s) => s.id === stageId);

 if (stageIndex < currentIndex) return "past";
 if (stageIndex === currentIndex) return "current";
 return "future";
}

interface SidebarNavProps {
 currentStage: JourneyStage;
 onStageSelect?: (stage: JourneyStage) => void;
}

function SidebarNav({ currentStage, onStageSelect }: SidebarNavProps) {
 return (
 <nav aria-label="Journey stages" className="flex flex-col gap-1 px-3 py-2">
 {JOURNEY_STAGES.map((stage) => {
 const status = getStageStatus(stage.id, currentStage);
 const Icon = ICON_MAP[stage.icon as keyof typeof ICON_MAP];

 return (
 <button
 key={stage.id}
 type="button"
 onClick={() => onStageSelect?.(stage.id)}
 className={cn(
"group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
 status ==="current" &&
"bg-primary/10 text-primary",
 status ==="past" &&
"text-foreground hover:bg-muted",
 status ==="future" &&
"text-muted-foreground/60 hover:bg-muted hover:text-muted-foreground"
 )}
 >
 <span
 className={cn(
"flex size-7 shrink-0 items-center justify-center rounded-full",
 status ==="current" &&"bg-primary text-primary-foreground",
 status ==="past" &&"bg-muted text-foreground",
 status ==="future" &&"bg-muted text-muted-foreground/60"
 )}
 >
 {status ==="past" ? (
 <Check className="size-3.5"/>
 ) : (
 <Icon className="size-3.5"/>
 )}
 </span>

 <div className="flex flex-col items-start gap-0.5">
 <span>{stage.label}</span>
 {status ==="current" && (
 <span className="text-xs font-normal text-muted-foreground">
 {stage.description}
 </span>
 )}
 </div>
 </button>
 );
 })}
 </nav>
 );
}

interface SidebarProps extends React.ComponentPropsWithRef<"aside"> {
 currentStage: JourneyStage;
 onStageSelect?: (stage: JourneyStage) => void;
 mobileOpen?: boolean;
 onMobileOpenChange?: (open: boolean) => void;
}

const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
 (
 {
 className,
 currentStage,
 onStageSelect,
 mobileOpen = false,
 onMobileOpenChange,
 ...props
 },
 ref
 ) => {
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
 Journey
 </span>
 </div>
 <Separator />
 <ScrollArea className="flex-1">
 <SidebarNav
 currentStage={currentStage}
 onStageSelect={onStageSelect}
 />
 </ScrollArea>
 </aside>

 {/* Mobile sidebar (Sheet overlay) */}
 <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
 <SheetContent side="left" className="w-72 p-0">
 <SheetHeader className="px-4 pt-4">
 <SheetTitle>Journey</SheetTitle>
 </SheetHeader>
 <Separator />
 <ScrollArea className="flex-1">
 <SidebarNav
 currentStage={currentStage}
 onStageSelect={(stage) => {
 onStageSelect?.(stage);
 onMobileOpenChange?.(false);
 }}
 />
 </ScrollArea>
 </SheetContent>
 </Sheet>
 </>
 );
 }
);

Sidebar.displayName ="Sidebar";

export { Sidebar, SidebarNav };
export type { SidebarProps, SidebarNavProps };
