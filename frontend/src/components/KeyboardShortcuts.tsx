"use client";

/**
 * Keyboard shortcuts help modal - shows available shortcuts.
 * Triggered by pressing" ?"anywhere on the page.
 * Auto-dismissed on ESC or clicking outside.
 */

import { useState, useEffect, useCallback } from"react";
import { motion, AnimatePresence } from"framer-motion";

type Shortcut = {
 keys: string[];
 description: string;
};

const SHORTCUTS: Shortcut[] = [
 { keys: ["⌘","K"], description:"Open search"},
 { keys: [" ?"], description:"Show keyboard shortcuts"},
 { keys: ["G","H"], description:"Go to home"},
 { keys: ["G","S"], description:"Go to schools"},
 { keys: ["G","D"], description:"Go to dashboard"},
 { keys: ["G","C"], description:"Go to compare"},
 { keys: ["Esc"], description:"Close modal / overlay"},
];

export function KeyboardShortcuts() {
 const [open, setOpen] = useState(false);

 const handleKeyDown = useCallback((e: KeyboardEvent) => {
 // Don't trigger in inputs
 const tag = (e.target as HTMLElement).tagName;
 if (tag ==="INPUT" || tag ==="TEXTAREA" || tag ==="SELECT") return;

 if (e.key ===" ?") {
 e.preventDefault();
 setOpen(v => !v);
 }
 if (e.key ==="Escape") setOpen(false);
 }, []);

 useEffect(() => {
 window.addEventListener("keydown", handleKeyDown);
 return () => window.removeEventListener("keydown", handleKeyDown);
 }, [handleKeyDown]);

 // Navigation shortcuts (G + key combos)
 useEffect(() => {
 let gPressed = false;
 let timer: ReturnType<typeof setTimeout>;

 function handleNav(e: KeyboardEvent) {
 const tag = (e.target as HTMLElement).tagName;
 if (tag ==="INPUT" || tag ==="TEXTAREA" || tag ==="SELECT") return;

 if (e.key ==="g" && !e.metaKey && !e.ctrlKey) {
 gPressed = true;
 clearTimeout(timer);
 timer = setTimeout(() => { gPressed = false; }, 1000);
 return;
 }

 if (gPressed) {
 gPressed = false;
 switch (e.key) {
 case "h": window.location.href ="/"; break;
 case "s": window.location.href ="/schools"; break;
 case "d": window.location.href ="/dashboard"; break;
 case "c": window.location.href ="/compare"; break;
 }
 }
 }

 window.addEventListener("keydown", handleNav);
 return () => {
 window.removeEventListener("keydown", handleNav);
 clearTimeout(timer);
 };
 }, []);

 return (
 <AnimatePresence>
 {open && (
 <>
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 bg-foreground/40 z-[60]"
 onClick={() => setOpen(false)}
 />
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 10 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 10 }}
 className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] bg-card border border-border w-full max-w-md"
 >
 <div className="p-6">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/40">Keyboard Shortcuts</h2>
 <button
 onClick={() => setOpen(false)}
 className="text-muted-foreground/30 hover:text-foreground transition-colors text-lg"
 >
 ✕
 </button>
 </div>
 <div className="space-y-3">
 {SHORTCUTS.map((s, i) => (
 <div key={i} className="flex items-center justify-between">
 <span className="text-sm text-muted-foreground/70">{s.description}</span>
 <div className="flex gap-1">
 {s.keys.map((key, j) => (
 <kbd
 key={j}
 className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 text-xs font-mono font-bold bg-background border border-border text-foreground rounded"
 >
 {key}
 </kbd>
 ))}
 </div>
 </div>
 ))}
 </div>
 <p className="text-[10px] text-muted-foreground/30 mt-6 text-center">
 Press <kbd className="px-1 py-0.5 bg-background border border-border/10 rounded text-[10px] font-mono">?</kbd> to toggle this dialog
 </p>
 </div>
 </motion.div>
 </>
 )}
 </AnimatePresence>
 );
}
