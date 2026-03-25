"use client";

import { useEffect } from"react";
import { RefreshCw, Home, GraduationCap } from"lucide-react";
import Link from"next/link";
import { track } from"@/lib/analytics";

export default function SchoolsError({
 error,
 reset,
}: {
 error: Error & { digest?: string };
 reset: () => void;
}) {
 useEffect(() => {
 console.error("Schools directory error:", error);
 track("error_page", { route:"/schools", message: error.message });
 }, [error]);

 return (
 <div className="min-h-[60vh] flex items-center justify-center px-8">
 <div className="max-w-lg w-full text-center">
 <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 text-red-500 rounded-full mb-6">
 <GraduationCap size={32} />
 </div>
 <h2 className="heading-serif text-3xl text-foreground mb-3">Couldn&apos;t load schools</h2>
 <p className="text-muted-foreground/60 mb-8 leading-relaxed">
 We&apos;re having trouble loading the school directory. This is usually temporary.
 </p>
 <div className="flex items-center justify-center gap-4">
 <button
 onClick={reset}
 className="flex items-center gap-2 bg-foreground text-white px-6 py-3 font-bold text-sm hover:bg-primary transition-colors"
 >
 <RefreshCw size={16} /> Reload Directory
 </button>
 <Link
 href="/"
 className="flex items-center gap-2 border border-border/20 px-6 py-3 font-bold text-sm text-muted-foreground/60 hover:text-foreground hover:border-border/40 transition-colors"
 >
 <Home size={16} /> Go Home
 </Link>
 </div>
 {error.digest && (
 <p className="mt-6 text-[10px] text-muted-foreground/30 font-mono">Error ID: {error.digest}</p>
 )}
 </div>
 </div>
 );
}
