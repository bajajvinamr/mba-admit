import Link from"next/link";

/**
 * School-specific 404 page.
 * Shows when a school ID doesn't match any program in the database.
 * Suggests popular schools and provides a search link.
 */

const SUGGESTED_SCHOOLS = [
 { id:"hbs", name:"Harvard Business School"},
 { id:"gsb", name:"Stanford GSB"},
 { id:"wharton", name:"Wharton"},
 { id:"insead", name:"INSEAD"},
 { id:"lbs", name:"London Business School"},
 { id:"iima", name:"IIM Ahmedabad"},
];

export default function SchoolNotFound() {
 return (
 <div className="min-h-screen bg-background flex items-center justify-center px-8">
 <div className="text-center max-w-lg">
 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 mb-4">
 School Not Found
 </p>
 <h1 className="heading-serif text-4xl text-foreground mb-4">
 We couldn&apos;t find that program
 </h1>
 <p className="text-muted-foreground/60 mb-8">
 The school you&apos;re looking for may have been removed, renamed, or doesn&apos;t exist in our database of 840+ programs.
 </p>

 <div className="mb-8">
 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 mb-3">
 Try one of these instead
 </p>
 <div className="grid grid-cols-2 gap-2">
 {SUGGESTED_SCHOOLS.map((s) => (
 <Link
 key={s.id}
 href={`/school/${s.id}`}
 className="p-3 bg-card border border-border/5 text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors text-left"
 >
 {s.name}
 </Link>
 ))}
 </div>
 </div>

 <div className="flex flex-col sm:flex-row gap-3 justify-center">
 <Link
 href="/schools"
 className="bg-foreground text-white px-6 py-3 text-sm font-bold hover:bg-foreground/90 transition-colors"
 >
 Browse All Schools
 </Link>
 <Link
 href="/"
 className="border border-border/10 px-6 py-3 text-sm font-bold text-foreground hover:bg-background transition-colors"
 >
 Go Home
 </Link>
 </div>
 </div>
 </div>
 );
}
