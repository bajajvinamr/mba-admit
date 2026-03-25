"use client";

import { motion } from"framer-motion";
import { Check } from"lucide-react";
import { cn } from"@/lib/utils";

interface SingleChoiceProps {
 options: string[];
 value: string;
 onChange: (value: string) => void;
}

export function SingleChoice({ options, value, onChange }: SingleChoiceProps) {
 return (
 <div className="flex flex-col gap-3 w-full">
 {options.map((option, i) => {
 const selected = value === option;
 return (
 <motion.button
 key={option}
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i * 0.05, duration: 0.25 }}
 type="button"
 onClick={() => onChange(option)}
 className={cn(
" relative flex items-center gap-3 rounded-lg border px-5 py-4 text-left text-sm font-medium transition-all",
 selected
 ?"border-primary bg-primary/5 text-foreground ring-2 ring-primary/20"
 :"border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50"
 )}
 >
 <span className="flex-1">{option}</span>
 {selected && (
 <motion.span
 initial={{ scale: 0 }}
 animate={{ scale: 1 }}
 className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white"
 >
 <Check className="h-3 w-3"/>
 </motion.span>
 )}
 </motion.button>
 );
 })}
 </div>
 );
}
