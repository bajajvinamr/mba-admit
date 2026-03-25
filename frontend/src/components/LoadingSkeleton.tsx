export function LoadingSkeleton() {
 return (
 <div className="min-h-[60vh] flex items-center justify-center">
 <div className="flex flex-col items-center gap-4">
 <div className="w-10 h-10 border-4 border-border/5 border-t-primary rounded-full animate-spin"/>
 <p className="text-xs uppercase tracking-widest text-muted-foreground/30 font-medium">Loading...</p>
 </div>
 </div>
 );
}
