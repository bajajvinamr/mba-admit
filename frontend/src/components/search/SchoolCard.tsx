"use client";

import Link from"next/link";
import { Bookmark, MapPin, Users, GraduationCap, Clock } from"lucide-react";
import { cva, type VariantProps } from"class-variance-authority";
import { cn } from"@/lib/utils";
import { Badge } from"@/components/ui/badge";

// ── Types ────────────────────────────────────────────────────────────────────

export type SchoolSearchResult = {
 id: string;
 name: string;
 country: string;
 location: string;
 gmat_avg: number | null;
 acceptance_rate: number | null;
 tuition_usd: number | null;
 tier: string | null;
 formats: string[];
 concentrations: string[];
 test_optional: boolean;
 program_format: string | null;
 class_size: number | null;
 median_salary: string | null;
};

// ── Card Variants ────────────────────────────────────────────────────────────

const schoolCardVariants = cva(
"group relative flex flex-col rounded-lg border bg-card text-card-foreground transition-all",
 {
 variants: {
 variant: {
 default:
"border-border shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:border-primary/30",
 compact:"border-border/60 hover:border-primary/40",
 featured:
"border-primary/20 bg-accent/30 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]",
 },
 },
 defaultVariants: {
 variant:"default",
 },
 },
);

type SchoolCardProps = VariantProps<typeof schoolCardVariants> & {
 school: SchoolSearchResult;
 className?: string;
 onBookmark?: (id: string) => void;
 isBookmarked?: boolean;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
 return name
 .split(/[\s-]+/)
 .filter((w) => w.length > 0 && w[0] === w[0].toUpperCase())
 .slice(0, 2)
 .map((w) => w[0])
 .join("");
}

function formatCurrency(value: number): string {
 if (value >= 1000) {
 return `$${Math.round(value / 1000)}K`;
 }
 return `$${value}`;
}

function tierColor(tier: string | null): string {
 switch (tier) {
 case "M7":
 return "bg-primary/10 text-primary border-primary/20";
 case "T15":
 return "bg-indigo-50 text-indigo-700 border-indigo-200";
 case "T25":
 return "bg-violet-50 text-violet-700 border-violet-200";
 case "T50":
 return "bg-blue-50 text-blue-700 border-blue-200";
 case "T100":
 return "bg-sky-50 text-sky-700 border-sky-200";
 default:
 return "bg-muted text-muted-foreground border-border";
 }
}

// ── Component ────────────────────────────────────────────────────────────────

export function SchoolCard({
 school,
 variant,
 className,
 onBookmark,
 isBookmarked = false,
}: SchoolCardProps) {
 const initials = getInitials(school.name);

 return (
 <Link
 href={`/school/${school.id}`}
 className={cn(schoolCardVariants({ variant }), className)}
 >
 <div className="p-5">
 {/* Bookmark button */}
 {onBookmark && (
 <button
 type="button"
 onClick={(e) => {
 e.preventDefault();
 e.stopPropagation();
 onBookmark(school.id);
 }}
 className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted transition-colors z-10"
 aria-label={isBookmarked ?"Remove bookmark":"Bookmark school"}
 >
 <Bookmark
 className={cn(
"size-4 transition-colors",
 isBookmarked
 ?"fill-primary text-primary"
 :"text-muted-foreground group-hover:text-foreground",
 )}
 />
 </button>
 )}

 {/* School name + avatar */}
 <div className="flex items-start gap-3 mb-3 pr-8">
 <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">
 {initials}
 </div>
 <div className="min-w-0">
 <h3 className="heading-serif text-base leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-2">
 {school.name}
 </h3>
 <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
 <MapPin className="size-3 shrink-0"/>
 <span className="truncate">{school.location}</span>
 </p>
 </div>
 </div>

 {/* Format badges + tier */}
 <div className="flex flex-wrap gap-1.5 mb-4">
 {school.tier && (
 <span
 className={cn(
"inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
 tierColor(school.tier),
 )}
 >
 {school.tier}
 </span>
 )}
 {school.formats.slice(0, 2).map((fmt) => (
 <Badge key={fmt} variant="secondary" className="text-[10px] capitalize">
 {fmt}
 </Badge>
 ))}
 {school.test_optional && (
 <Badge variant="outline" className="text-[10px] text-success border-success/30">
 Test Optional
 </Badge>
 )}
 </div>

 {/* Key stats row */}
 <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3">
 <div className="text-center">
 <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 flex items-center justify-center gap-0.5">
 <GraduationCap className="size-3"/> GMAT
 </p>
 <p className="text-sm font-semibold text-foreground">
 {school.gmat_avg ??"\u2014"}
 </p>
 </div>
 <div className="text-center border-x border-border/50">
 <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
 Accept
 </p>
 <p className="text-sm font-semibold text-foreground">
 {school.acceptance_rate != null
 ? `${school.acceptance_rate}%`
 :"\u2014"}
 </p>
 </div>
 <div className="text-center">
 <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 flex items-center justify-center gap-0.5">
 <Users className="size-3"/> Class
 </p>
 <p className="text-sm font-semibold text-foreground">
 {school.class_size ??"\u2014"}
 </p>
 </div>
 </div>

 {/* Tuition */}
 {school.tuition_usd != null && (
 <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
 <Clock className="size-3"/>
 Tuition: {formatCurrency(school.tuition_usd)}
 </p>
 )}
 </div>
 </Link>
 );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

export function SchoolCardSkeleton() {
 return (
 <div className="rounded-lg border border-border bg-card p-5 animate-pulse">
 <div className="flex items-start gap-3 mb-3">
 <div className="size-10 rounded-lg bg-muted"/>
 <div className="flex-1">
 <div className="h-4 w-3/4 bg-muted rounded mb-1.5"/>
 <div className="h-3 w-1/2 bg-muted/70 rounded"/>
 </div>
 </div>
 <div className="flex gap-1.5 mb-4">
 <div className="h-5 w-12 bg-muted rounded-full"/>
 <div className="h-5 w-16 bg-muted rounded-full"/>
 </div>
 <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3">
 <div className="text-center">
 <div className="h-2 w-8 bg-muted rounded mx-auto mb-1.5"/>
 <div className="h-4 w-10 bg-muted rounded mx-auto"/>
 </div>
 <div className="text-center border-x border-border/50">
 <div className="h-2 w-8 bg-muted rounded mx-auto mb-1.5"/>
 <div className="h-4 w-10 bg-muted rounded mx-auto"/>
 </div>
 <div className="text-center">
 <div className="h-2 w-8 bg-muted rounded mx-auto mb-1.5"/>
 <div className="h-4 w-10 bg-muted rounded mx-auto"/>
 </div>
 </div>
 </div>
 );
}
