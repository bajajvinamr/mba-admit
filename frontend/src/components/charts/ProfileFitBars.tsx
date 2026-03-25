"use client";

type ProfileFit = {
 gmat_percentile: number;
 gpa_percentile: number;
 yoe_percentile: number;
 verdict: string;
};

type Props = {
 fits: { schoolId: string; name: string; fit: ProfileFit }[];
};

function pctColor(pct: number): string {
 if (pct >= 60) return "bg-green-600";
 if (pct >= 40) return "bg-amber-500";
 return "bg-red-400";
}

function pctLabel(pct: number): string {
 if (pct >= 70) return "Strong";
 if (pct >= 50) return "Competitive";
 if (pct >= 30) return "Below avg";
 return "Low";
}

export function ProfileFitBars({ fits }: Props) {
 const metrics = [
 { label:"GMAT", key:"gmat_percentile"as const },
 { label:"GPA", key:"gpa_percentile"as const },
 { label:"YOE", key:"yoe_percentile"as const },
 ];

 return (
 <div className="space-y-8">
 {fits.map(({ schoolId, name, fit }) => (
 <div key={schoolId}>
 <h4 className="font-bold text-sm text-foreground mb-3">{name}</h4>
 <div className="space-y-2">
 {metrics.map(({ label, key }) => {
 const pct = fit[key];
 return (
 <div key={label} className="flex items-center gap-3">
 <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/40 w-10">
 {label}
 </span>
 <div className="flex-1 h-4 bg-foreground/5 relative overflow-hidden">
 <div
 className={`h-full ${pctColor(pct)} transition-all duration-500`}
 style={{ width: `${Math.max(pct, 3)}%` }}
 />
 </div>
 <span className="text-xs font-bold text-foreground w-20 text-right">
 {pct}% - {pctLabel(pct)}
 </span>
 </div>
 );
 })}
 </div>
 <p className="text-xs text-muted-foreground/50 mt-2 leading-relaxed">
 {fit.verdict}
 </p>
 </div>
 ))}
 </div>
 );
}
