"use client";

import { useTheme } from"next-themes";
import { Sun, Moon } from"lucide-react";
import { useEffect, useState } from"react";

export function ThemeToggle() {
 const { theme, setTheme } = useTheme();
 const [mounted, setMounted] = useState(false);

 // Avoid hydration mismatch — only render after mount
 useEffect(() => setMounted(true), []);

 if (!mounted) {
 return (
 <button
 className="p-2 rounded-md border border-border/10 text-muted-foreground/40"
 aria-label="Toggle theme"
 >
 <Sun className="size-3.5"/>
 </button>
 );
 }

 const isDark = theme ==="dark";

 return (
 <button
 onClick={() => setTheme(isDark ?"light":"dark")}
 className="p-2 rounded-md border border-border/10 text-muted-foreground/60 hover:text-foreground hover:border-border/20 transition-colors"
 aria-label={isDark ?"Switch to light mode":"Switch to dark mode"}
 title={isDark ?"Light mode":"Dark mode"}
 >
 {isDark ? <Sun className="size-3.5"/> : <Moon className="size-3.5"/>}
 </button>
 );
}
