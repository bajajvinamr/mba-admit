"use client";

import { motion } from"framer-motion";
import { Check } from"lucide-react";
import { cn } from"@/lib/utils";

interface MultiSelectProps {
 options: string[];
 value: string[];
 onChange: (value: string[]) => void;
}

export function MultiSelect({ options, value, onChange }: MultiSelectProps) {
 const toggle = (option: string) => {
 const next = value.includes(option)
 ? value.filter((v) => v !== option)
 : [...value, option];
 onChange(next);
 };

 return (
 <div className="flex flex-wrap gap-2.5 justify-center w-full">
 {options.map((option, i) => {
 const selected = value.includes(option);
 return (
 <motion.button
 key={option}
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ delay: i * 0.03, duration: 0.2 }}
 type="button"
 onClick={() => toggle(option)}
 className={cn(
"inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all",
 selected
 ?"border-primary bg-primary/10 text-foreground"
 :"border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted/50"
 )}
 >
 {selected && <Check className="h-3.5 w-3.5 text-primary"/>}
 {option}
 </motion.button>
 );
 })}
 </div>
 );
}
