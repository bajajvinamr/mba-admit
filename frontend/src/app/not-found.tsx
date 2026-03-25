import Link from"next/link";
import { Search, Home, GraduationCap, BarChart3 } from"lucide-react";

export default function NotFound() {
 return (
 <div className="min-h-[70vh] flex items-center justify-center px-8">
 <div className="max-w-lg w-full text-center">
 <p className="text-[120px] heading-serif text-foreground/5 leading-none select-none">
 404
 </p>
 <h1 className="heading-serif text-3xl text-foreground -mt-6 mb-3">
 Page not found
 </h1>
 <p className="text-muted-foreground/50 mb-10 leading-relaxed">
 The page you&apos;re looking for doesn&apos;t exist or has been moved.
 Here are some useful starting points:
 </p>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
 <Link
 href="/schools"
 className="group flex flex-col items-center gap-2 p-5 border border-border/5 bg-card hover:border-primary/40 transition-colors"
 >
 <Search
 size={20}
 className="text-muted-foreground/30 group-hover:text-primary transition-colors"
 />
 <span className="text-sm font-semibold text-foreground">
 School Directory
 </span>
 <span className="text-[11px] text-muted-foreground/40">
 Browse 840+ programs
 </span>
 </Link>
 <Link
 href="/dashboard"
 className="group flex flex-col items-center gap-2 p-5 border border-border/5 bg-card hover:border-primary/40 transition-colors"
 >
 <BarChart3
 size={20}
 className="text-muted-foreground/30 group-hover:text-primary transition-colors"
 />
 <span className="text-sm font-semibold text-foreground">Dashboard</span>
 <span className="text-[11px] text-muted-foreground/40">
 Your command center
 </span>
 </Link>
 <Link
 href="/profile-report"
 className="group flex flex-col items-center gap-2 p-5 border border-border/5 bg-card hover:border-primary/40 transition-colors"
 >
 <GraduationCap
 size={20}
 className="text-muted-foreground/30 group-hover:text-primary transition-colors"
 />
 <span className="text-sm font-semibold text-foreground">
 Profile Report
 </span>
 <span className="text-[11px] text-muted-foreground/40">
 Free strength analysis
 </span>
 </Link>
 </div>

 <Link
 href="/"
 className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground/40 hover:text-foreground transition-colors"
 >
 <Home size={14} /> Back to home
 </Link>
 </div>
 </div>
 );
}
