export default function DashboardLoading() {
 return (
 <div className="min-h-screen bg-cream">
 <div className="max-w-7xl mx-auto px-6 py-12">
 {/* Header */}
 <div className="mb-10">
 <div className="h-10 w-56 bg-foreground/5 rounded mb-3 animate-pulse"/>
 <div className="h-5 w-80 bg-foreground/5 rounded animate-pulse"/>
 </div>

 {/* Profile card */}
 <div className="bg-card border border-border/5 p-6 mb-8">
 <div className="flex items-center gap-4 mb-4">
 <div className="h-12 w-12 bg-foreground/5 rounded-full animate-pulse"/>
 <div className="space-y-2">
 <div className="h-5 w-40 bg-foreground/5 rounded animate-pulse"/>
 <div className="h-4 w-56 bg-foreground/5 rounded animate-pulse"/>
 </div>
 </div>
 <div className="flex gap-6">
 {[1, 2, 3, 4].map((i) => (
 <div key={i} className="text-center space-y-1">
 <div className="h-6 w-12 bg-foreground/5 rounded animate-pulse mx-auto"/>
 <div className="h-3 w-16 bg-foreground/5 rounded animate-pulse"/>
 </div>
 ))}
 </div>
 </div>

 {/* Recommendations row */}
 <div className="mb-8">
 <div className="h-6 w-48 bg-foreground/5 rounded mb-4 animate-pulse"/>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 {[1, 2, 3, 4].map((i) => (
 <div
 key={i}
 className="bg-card border border-border/5 p-5 space-y-3"
 >
 <div className="h-5 w-32 bg-foreground/5 rounded animate-pulse"/>
 <div className="h-4 w-24 bg-foreground/5 rounded animate-pulse"/>
 <div className="h-8 w-full bg-primary/10 rounded animate-pulse"/>
 </div>
 ))}
 </div>
 </div>

 {/* Tracked schools */}
 <div>
 <div className="h-6 w-36 bg-foreground/5 rounded mb-4 animate-pulse"/>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {[1, 2, 3].map((i) => (
 <div
 key={i}
 className="bg-card border border-border/5 p-5 space-y-3"
 >
 <div className="h-5 w-36 bg-foreground/5 rounded animate-pulse"/>
 <div className="h-4 w-28 bg-foreground/5 rounded animate-pulse"/>
 <div className="flex gap-2">
 <div className="h-6 w-20 bg-foreground/5 rounded-full animate-pulse"/>
 <div className="h-6 w-16 bg-foreground/5 rounded-full animate-pulse"/>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 );
}
