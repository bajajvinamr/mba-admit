"use client";

import { Search } from"lucide-react";
import { cn } from"@/lib/utils";

type SearchBarProps = {
 value: string;
 onChange: (value: string) => void;
 className?: string;
};

export function SearchBar({ value, onChange, className }: SearchBarProps) {
 return (
 <div className={cn(" relative w-full", className)}>
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"size={20} />
 <input
 type="text"
 placeholder="Search 1,800+ MBA programs..."
 className="w-full rounded-lg border border-border bg-card pl-12 pr-4 py-3.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
 value={value}
 onChange={(e) => onChange(e.target.value)}
 aria-label="Search MBA programs"
 />
 </div>
 );
}
