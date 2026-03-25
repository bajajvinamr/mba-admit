"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from"react";
import { motion, AnimatePresence } from"framer-motion";
import { CheckCircle2, AlertTriangle, X, Info } from"lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type ToastType ="success"|"error"|"info";
type Toast = {
 id: string;
 message: string;
 type: ToastType;
 duration: number;
};

// ── External store (global, framework-agnostic) ─────────────────────────────

const EMPTY_TOASTS: Toast[] = []; // stable reference for SSR
let toasts: Toast[] = EMPTY_TOASTS;
let listeners: Array<() => void> = [];
let counter = 0;

function getSnapshot(): Toast[] {
 return toasts;
}

function getServerSnapshot(): Toast[] {
 return EMPTY_TOASTS;
}

function subscribe(listener: () => void): () => void {
 listeners.push(listener);
 return () => {
 listeners = listeners.filter((l) => l !== listener);
 };
}

function emit() {
 for (const listener of listeners) listener();
}

function addToast(message: string, type: ToastType ="success", duration = 3000) {
 const id = `toast-${++counter}`;
 toasts = [...toasts, { id, message, type, duration }];
 emit();
 setTimeout(() => removeToast(id), duration);
}

function removeToast(id: string) {
 toasts = toasts.filter((t) => t.id !== id);
 emit();
}

// ── Public API ──────────────────────────────────────────────────────────────

export const toast = {
 success: (message: string, duration?: number) => addToast(message,"success", duration),
 error: (message: string, duration?: number) => addToast(message,"error", duration ?? 5000),
 info: (message: string, duration?: number) => addToast(message,"info", duration),
};

// ── Icons ───────────────────────────────────────────────────────────────────

const ICONS: Record<ToastType, React.ReactNode> = {
 success: <CheckCircle2 size={16} className="text-emerald-500 shrink-0"/>,
 error: <AlertTriangle size={16} className="text-red-500 shrink-0"/>,
 info: <Info size={16} className="text-blue-500 shrink-0"/>,
};

const BG: Record<ToastType, string> = {
 success:"bg-card border-emerald-200",
 error:"bg-card border-red-200",
 info:"bg-card border-blue-200",
};

// ── Component ───────────────────────────────────────────────────────────────

export function ToastContainer() {
 const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

 return (
 <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm">
 <AnimatePresence mode="popLayout">
 {items.map((t) => (
 <motion.div
 key={t.id}
 initial={{ opacity: 0, y: 20, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: -10, scale: 0.95 }}
 transition={{ duration: 0.2 }}
 className={`flex items-center gap-3 px-4 py-3 border ${BG[t.type]}`}
 >
 {ICONS[t.type]}
 <p className="text-sm text-foreground flex-1">{t.message}</p>
 <button
 onClick={() => removeToast(t.id)}
 className="text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors shrink-0"
 >
 <X size={14} />
 </button>
 </motion.div>
 ))}
 </AnimatePresence>
 </div>
 );
}
