"use client";

import { motion } from"framer-motion";
import { cn } from"@/lib/utils";

interface QuestionCardProps {
 title: string;
 subtitle?: string;
 children: React.ReactNode;
 className?: string;
}

export function QuestionCard({
 title,
 subtitle,
 children,
 className,
}: QuestionCardProps) {
 return (
 <motion.div
 initial={{ opacity: 0, x: 40 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -40 }}
 transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
 className={cn(
"flex flex-col items-center w-full max-w-xl mx-auto px-4",
 className
 )}
 >
 <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground text-center leading-snug mb-2">
 {title}
 </h2>
 {subtitle && (
 <p className="text-muted-foreground text-sm text-center mb-8">
 {subtitle}
 </p>
 )}
 {!subtitle && <div className="mb-8"/>}
 <div className="w-full">{children}</div>
 </motion.div>
 );
}
