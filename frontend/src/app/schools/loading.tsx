export default function SchoolsLoading() {
 return (
 <div className="min-h-screen bg-cream">
 <div className="max-w-7xl mx-auto px-6 py-12">
 {/* Header */}
 <div className="mb-10">
 <div className="h-10 w-72 bg-foreground/5 rounded mb-3 animate-pulse"/>
 <div className="h-5 w-96 bg-foreground/5 rounded animate-pulse"/>
 </div>

 {/* Search + filters bar */}
 <div className="flex flex-wrap gap-3 mb-8">
 <div className="h-10 w-64 bg-foreground/5 border border-border/10 rounded animate-pulse"/>
 <div className="h-10 w-32 bg-foreground/5 border border-border/10 rounded animate-pulse"/>
 <div className="h-10 w-32 bg-foreground/5 border border-border/10 rounded animate-pulse"/>
 <div className="h-10 w-28 bg-foreground/5 border border-border/10 rounded animate-pulse"/>
 </div>

 {/* School cards grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {Array.from({ length: 9 }).map((_, i) => (
 <div
 key={i}
 className="bg-card border border-border/5 p-5 space-y-3"
 >
 <div className="flex justify-between items-start">
 <div className="h-6 w-40 bg-foreground/5 rounded animate-pulse"/>
 <div className="h-5 w-12 bg-primary/20 rounded animate-pulse"/>
 </div>
 <div className="h-4 w-32 bg-foreground/5 rounded animate-pulse"/>
 <div className="flex gap-4 pt-2">
 <div className="h-4 w-20 bg-foreground/5 rounded animate-pulse"/>
 <div className="h-4 w-20 bg-foreground/5 rounded animate-pulse"/>
 <div className="h-4 w-20 bg-foreground/5 rounded animate-pulse"/>
 </div>
 <div className="flex gap-2 pt-2">
 <div className="h-6 w-16 bg-foreground/5 rounded-full animate-pulse"/>
 <div className="h-6 w-20 bg-foreground/5 rounded-full animate-pulse"/>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 );
}
