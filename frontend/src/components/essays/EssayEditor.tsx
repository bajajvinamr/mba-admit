"use client";

import { useState, useCallback, useRef, useEffect } from"react";
import { Textarea } from"@/components/ui/textarea";
import { CheckCircle, AlertTriangle } from"lucide-react";
import { cn } from"@/lib/cn";

type EssayEditorProps = {
 value: string;
 onChange: (value: string) => void;
 wordLimit: number | null;
 placeholder?: string;
};

function countWords(text: string): number {
 const trimmed = text.trim();
 if (!trimmed) return 0;
 return trimmed.split(/\s+/).length;
}

export function EssayEditor({
 value,
 onChange,
 wordLimit,
 placeholder ="Start writing your essay here...",
}: EssayEditorProps) {
 const [saveState, setSaveState] = useState<" idle"|"saving"|"saved">(" idle");
 const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
 const wordCount = countWords(value);
 const isOverLimit = wordLimit !== null && wordCount > wordLimit;

 const handleChange = useCallback(
 (e: React.ChangeEvent<HTMLTextAreaElement>) => {
 onChange(e.target.value);

 // Mock autosave indicator
 setSaveState("saving");
 if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
 saveTimerRef.current = setTimeout(() => {
 setSaveState("saved");
 }, 800);
 },
 [onChange]
 );

 useEffect(() => {
 return () => {
 if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
 };
 }, []);

 return (
 <div className="flex h-full flex-col gap-2">
 <Textarea
 value={value}
 onChange={handleChange}
 placeholder={placeholder}
 className={cn(
" min-h-0 flex-1 resize-none font-mono text-sm leading-relaxed",
"field-sizing-fixed"
 )}
 />

 {/* Footer: word count + autosave */}
 <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
 <div className="flex items-center gap-1.5">
 {saveState ==="saving" && (
 <span className="text-muted-foreground">Saving...</span>
 )}
 {saveState ==="saved" && (
 <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
 <CheckCircle className="size-3"/>
 Saved
 </span>
 )}
 </div>

 <div
 className={cn(
"flex items-center gap-1 tabular-nums",
 isOverLimit &&"font-medium text-red-600 dark:text-red-400"
 )}
 >
 {isOverLimit && <AlertTriangle className="size-3"/>}
 <span>
 {wordCount}
 {wordLimit !== null && ` / ${wordLimit}`} words
 </span>
 </div>
 </div>
 </div>
 );
}
