"use client";

import Link from"next/link";
import { motion } from"framer-motion";
import { Calendar, Clock, AlertTriangle } from"lucide-react";
import { cn } from"@/lib/cn";

export interface DeadlineItem {
 school_id: string;
 school_name: string;
 round: string;
 deadline: string;
 days_left: number;
}

interface DeadlineWidgetProps {
 deadlines: DeadlineItem[];
}

function getStatusConfig(daysLeft: number) {
 if (daysLeft <= 7) {
 return {
 label:"Past Due Risk",
 color:"text-destructive",
 bgColor:"bg-destructive/10",
 badgeColor:"bg-destructive text-destructive-foreground",
 icon: AlertTriangle,
 };
 }
 if (daysLeft <= 30) {
 return {
 label:"At Risk",
 color:"text-warning",
 bgColor:"bg-warning/10",
 badgeColor:"bg-warning text-warning-foreground",
 icon: Clock,
 };
 }
 return {
 label:"On Track",
 color:"text-success",
 bgColor:"bg-success/10",
 badgeColor:"bg-success text-success-foreground",
 icon: Calendar,
 };
}

export function DeadlineWidget({ deadlines }: DeadlineWidgetProps) {
 if (deadlines.length === 0) {
 return (
 <motion.div
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.4, delay: 0.15 }}
 className="bg-card border border-border rounded-lg p-6 hover: transition-shadow"
 >
 <div className="flex items-center gap-2 mb-4">
 <Calendar className="size-4 text-muted-foreground"/>
 <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
 Upcoming Deadlines
 </h3>
 </div>
 <p className="text-sm text-muted-foreground">
 No deadlines yet. Track schools to see countdown timers here.
 </p>
 </motion.div>
 );
 }

 const nextDeadline = deadlines[0];
 const config = getStatusConfig(nextDeadline.days_left);

 return (
 <motion.div
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.4, delay: 0.15 }}
 className="bg-card border border-border rounded-lg p-6 hover: transition-shadow"
 >
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2">
 <Calendar className="size-4 text-muted-foreground"/>
 <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
 Deadlines
 </h3>
 </div>
 <span
 className={cn(
"text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
 config.badgeColor
 )}
 >
 {config.label}
 </span>
 </div>

 {/* Hero countdown for nearest deadline */}
 <div className="text-center mb-5">
 <p className="font-display text-4xl font-extrabold tabular-nums text-foreground">
 {nextDeadline.days_left}
 </p>
 <p className="text-xs text-muted-foreground mt-1">
 days until {nextDeadline.school_name}
 </p>
 <p className="text-[10px] text-muted-foreground/60 mt-0.5">
 {nextDeadline.round} &middot; {nextDeadline.deadline}
 </p>
 </div>

 {/* Additional deadlines list */}
 {deadlines.length > 1 && (
 <div className="space-y-2 border-t border-border pt-4">
 {deadlines.slice(1, 4).map((dl) => {
 const dlConfig = getStatusConfig(dl.days_left);
 return (
 <Link
 key={`${dl.school_id}-${dl.round}`}
 href={`/school/${dl.school_id}`}
 className="flex items-center justify-between py-1.5 group"
 >
 <div className="min-w-0 flex-1">
 <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
 {dl.school_name}
 </p>
 <p className="text-[10px] text-muted-foreground">
 {dl.round}
 </p>
 </div>
 <span
 className={cn(
"text-xs font-bold font-display tabular-nums ml-3",
 dlConfig.color
 )}
 >
 {dl.days_left}d
 </span>
 </Link>
 );
 })}
 </div>
 )}
 </motion.div>
 );
}
