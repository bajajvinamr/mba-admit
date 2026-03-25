"use client";

import { motion } from"framer-motion";
import { Check } from"lucide-react";
import { JOURNEY_STAGES, type JourneyStage } from"@/lib/constants";
import { cn } from"@/lib/cn";

interface JourneyProgressProps {
 currentStage: JourneyStage;
}

export function JourneyProgress({ currentStage }: JourneyProgressProps) {
 const currentIndex = JOURNEY_STAGES.findIndex((s) => s.id === currentStage);

 return (
 <motion.div
 initial={{ opacity: 0, y: -8 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.4 }}
 className="w-full"
 >
 {/* Desktop progress bar */}
 <div className="hidden sm:block">
 <div className="flex items-center justify-between relative">
 {/* Background connector line */}
 <div className="absolute top-5 left-0 right-0 h-0.5 bg-border"/>
 <div
 className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
 style={{
 width: `${currentIndex > 0 ? (currentIndex / (JOURNEY_STAGES.length - 1)) * 100 : 0}%`,
 }}
 />

 {JOURNEY_STAGES.map((stage, i) => {
 const isPast = i < currentIndex;
 const isCurrent = i === currentIndex;
 const isFuture = i > currentIndex;

 return (
 <div
 key={stage.id}
 className="flex flex-col items-center gap-2 relative z-10"
 >
 <motion.div
 initial={false}
 animate={{
 scale: isCurrent ? 1.1 : 1,
 }}
 className={cn(
"flex size-10 items-center justify-center rounded-full border-2 transition-colors",
 isPast &&"border-primary bg-primary text-primary-foreground",
 isCurrent &&"border-primary bg-primary text-primary-foreground shadow-primary/25",
 isFuture &&"border-border bg-background text-muted-foreground/40"
 )}
 >
 {isPast ? (
 <Check className="size-4"/>
 ) : (
 <span className="text-xs font-bold font-display">
 {i + 1}
 </span>
 )}
 </motion.div>
 <span
 className={cn(
"text-xs font-medium transition-colors",
 isPast &&"text-foreground",
 isCurrent &&"text-primary font-semibold",
 isFuture &&"text-muted-foreground/40"
 )}
 >
 {stage.label}
 </span>
 </div>
 );
 })}
 </div>
 </div>

 {/* Mobile compact pills */}
 <div className="flex sm:hidden items-center gap-1 overflow-x-auto pb-1">
 {JOURNEY_STAGES.map((stage, i) => {
 const isPast = i < currentIndex;
 const isCurrent = i === currentIndex;

 return (
 <span
 key={stage.id}
 className={cn(
"flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full whitespace-nowrap transition-colors",
 isPast &&"bg-primary/10 text-primary",
 isCurrent &&"bg-primary text-primary-foreground",
 !isPast && !isCurrent &&"bg-muted text-muted-foreground/40"
 )}
 >
 {isPast && <Check className="size-3"/>}
 {stage.label}
 </span>
 );
 })}
 </div>
 </motion.div>
 );
}
