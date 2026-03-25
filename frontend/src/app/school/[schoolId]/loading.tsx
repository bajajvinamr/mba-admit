export default function SchoolLoading() {
 return (
 <div className="min-h-screen bg-cream">
 {/* Header skeleton */}
 <div className="bg-foreground text-white">
 <div className="max-w-6xl mx-auto px-6 py-12">
 <div className="h-4 w-24 bg-card/10 rounded mb-6 animate-pulse"/>
 <div className="h-10 w-80 bg-card/10 rounded mb-3 animate-pulse"/>
 <div className="flex gap-4 mb-6">
 <div className="h-5 w-32 bg-card/10 rounded animate-pulse"/>
 <div className="h-5 w-24 bg-card/10 rounded animate-pulse"/>
 </div>
 <div className="flex gap-3 flex-wrap">
 {[1, 2, 3, 4, 5].map((i) => (
 <div
 key={i}
 className="h-16 w-36 bg-card/5 border border-border rounded animate-pulse"
 />
 ))}
 </div>
 </div>
 </div>

 {/* Content skeleton */}
 <div className="max-w-6xl mx-auto px-6 py-10">
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 <div className="lg:col-span-2 space-y-6">
 <div className="flex gap-4 border-b border-border/10 pb-3">
 <div className="h-8 w-28 bg-foreground/5 rounded animate-pulse"/>
 <div className="h-8 w-28 bg-foreground/5 rounded animate-pulse"/>
 </div>
 {[1, 2, 3].map((i) => (
 <div
 key={i}
 className="bg-card border border-border/5 p-6 space-y-4"
 >
 <div className="h-5 w-40 bg-foreground/5 rounded animate-pulse"/>
 <div className="h-4 w-full bg-foreground/5 rounded animate-pulse"/>
 <div className="h-4 w-3/4 bg-foreground/5 rounded animate-pulse"/>
 <div className="h-4 w-5/6 bg-foreground/5 rounded animate-pulse"/>
 </div>
 ))}
 </div>
 <div className="space-y-6">
 <div className="bg-card border border-border/5 p-6 space-y-4">
 <div className="h-5 w-32 bg-foreground/5 rounded animate-pulse"/>
 <div className="h-4 w-full bg-foreground/5 rounded animate-pulse"/>
 <div className="h-4 w-2/3 bg-foreground/5 rounded animate-pulse"/>
 <div className="h-10 w-full bg-primary/20 rounded animate-pulse"/>
 </div>
 <div className="bg-card border border-border/5 p-6 space-y-3">
 <div className="h-5 w-36 bg-foreground/5 rounded animate-pulse"/>
 {[1, 2, 3].map((i) => (
 <div key={i} className="flex justify-between">
 <div className="h-4 w-24 bg-foreground/5 rounded animate-pulse"/>
 <div className="h-4 w-16 bg-foreground/5 rounded animate-pulse"/>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}
