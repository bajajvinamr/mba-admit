"use client";

import { useState, useMemo } from"react";
import { motion, AnimatePresence } from"framer-motion";
import { Search, X } from"lucide-react";
import { Input } from"@/components/ui/input";
import { cn } from"@/lib/utils";

const TOP_SCHOOLS = [
"Harvard Business School",
"Stanford GSB",
"Wharton (UPenn)",
"Booth (Chicago)",
"Kellogg (Northwestern)",
"Columbia Business School",
"MIT Sloan",
"Haas (UC Berkeley)",
"Tuck (Dartmouth)",
"Yale SOM",
"Ross (Michigan)",
"Darden (UVA)",
"Fuqua (Duke)",
"Anderson (UCLA)",
"Stern (NYU)",
"Johnson (Cornell)",
"Tepper (CMU)",
"McCombs (UT Austin)",
"Kenan-Flagler (UNC)",
"Goizueta (Emory)",
"McDonough (Georgetown)",
"Olin (Washington U)",
"Foster (U Washington)",
"Marshall (USC)",
"Kelley (Indiana)",
"Smith (Maryland)",
"Scheller (Georgia Tech)",
"Questrom (Boston U)",
"Mendoza (Notre Dame)",
"Owen (Vanderbilt)",
"INSEAD",
"London Business School",
"IESE",
"IE Business School",
"HEC Paris",
"Cambridge Judge",
"Oxford Said",
"IMD",
"ESADE",
"SDA Bocconi",
"IIM Ahmedabad",
"IIM Bangalore",
"IIM Calcutta",
"ISB Hyderabad",
"NUS Business School",
"HKUST Business School",
"CEIBS",
"Melbourne Business School",
"Rotman (Toronto)",
"Ivey (Western)",
];

interface SchoolPickerProps {
 value: string[];
 onChange: (value: string[]) => void;
}

export function SchoolPicker({ value, onChange }: SchoolPickerProps) {
 const [query, setQuery] = useState("");

 const filtered = useMemo(() => {
 if (!query.trim()) return TOP_SCHOOLS.slice(0, 10);
 const q = query.toLowerCase();
 return TOP_SCHOOLS.filter((s) => s.toLowerCase().includes(q)).slice(0, 8);
 }, [query]);

 const add = (school: string) => {
 if (!value.includes(school)) onChange([...value, school]);
 setQuery("");
 };

 const remove = (school: string) => {
 onChange(value.filter((s) => s !== school));
 };

 return (
 <div className="flex flex-col gap-4 w-full">
 {/* Selected schools */}
 {value.length > 0 && (
 <div className="flex flex-wrap gap-2">
 <AnimatePresence mode="popLayout">
 {value.map((school) => (
 <motion.span
 key={school}
 layout
 initial={{ opacity: 0, scale: 0.8 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.8 }}
 className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary/10 px-3 py-1.5 text-xs font-medium text-foreground"
 >
 {school}
 <button
 type="button"
 onClick={() => remove(school)}
 className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20 transition-colors"
 >
 <X className="h-3 w-3"/>
 </button>
 </motion.span>
 ))}
 </AnimatePresence>
 </div>
 )}

 {/* Search input */}
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
 <Input
 placeholder="Search schools..."
 value={query}
 onChange={(e) => setQuery(e.target.value)}
 className="pl-9 h-10"
 />
 </div>

 {/* Results list */}
 <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto">
 {filtered.map((school) => {
 const selected = value.includes(school);
 return (
 <button
 key={school}
 type="button"
 disabled={selected}
 onClick={() => add(school)}
 className={cn(
"text-left rounded-lg px-4 py-2.5 text-sm transition-colors",
 selected
 ?"bg-muted/50 text-muted-foreground cursor-default"
 :"hover:bg-muted text-foreground"
 )}
 >
 {school}
 {selected && (
 <span className="text-xs text-primary ml-2">Added</span>
 )}
 </button>
 );
 })}
 {filtered.length === 0 && (
 <p className="text-center text-sm text-muted-foreground py-4">
 No schools found
 </p>
 )}
 </div>
 </div>
 );
}
