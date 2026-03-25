"use client";

import { useMemo } from"react";
import { Card, CardHeader, CardTitle, CardContent } from"@/components/ui/card";
import { Badge } from"@/components/ui/badge";
import { AlertTriangle, CheckCircle, Eye } from"lucide-react";
import { cn } from"@/lib/cn";

type PatternMatch = {
 text: string;
 type:"cliche"|"ai-pattern"|"vague";
 index: number;
};

type ToneAnalysis = {
 authenticityScore: number;
 patterns: PatternMatch[];
};

const CLICHE_PATTERNS = [
"passionate about",
"my passion for",
"ever since I was a child",
"it was then that I realized",
"changed my life forever",
"taught me the importance of",
"a pivotal moment",
"truly believe",
"my dream has always been",
];

const AI_PATTERNS = [
"leveraging my experience",
"in today's fast-paced world",
"in an increasingly",
"holistic approach",
"multifaceted",
"synergies between",
"delve into",
"navigate the complexities",
"at the intersection of",
"transformative impact",
"uniquely positioned",
];

const VAGUE_PATTERNS = [
"make a difference",
"give back to society",
"change the world",
"diverse perspectives",
"global mindset",
"thought leader",
" value-add",
" actionable insights",
];

function analyzeText(text: string): ToneAnalysis {
 const lower = text.toLowerCase();
 const patterns: PatternMatch[] = [];

 const checkPatterns = (
 list: string[],
 type: PatternMatch["type"]
 ) => {
 for (const pattern of list) {
 let searchStart = 0;
 let idx = lower.indexOf(pattern, searchStart);
 while (idx !== -1) {
 patterns.push({
 text: text.slice(idx, idx + pattern.length),
 type,
 index: idx,
 });
 searchStart = idx + pattern.length;
 idx = lower.indexOf(pattern, searchStart);
 }
 }
 };

 checkPatterns(CLICHE_PATTERNS,"cliche");
 checkPatterns(AI_PATTERNS,"ai-pattern");
 checkPatterns(VAGUE_PATTERNS,"vague");

 // Score: start at 85, subtract per pattern found
 const penalty = patterns.length * 8;
 const score = Math.max(0, Math.min(100, 85 - penalty));

 return { authenticityScore: score, patterns };
}

const TYPE_CONFIG = {
 cliche: {
 label:"Cliche",
 color:"bg-yellow-500",
 textColor:"text-yellow-700 dark:text-yellow-400",
 bgColor:"bg-yellow-50 dark:bg-yellow-950/30",
 },
"ai-pattern": {
 label:"AI Pattern",
 color:"bg-red-500",
 textColor:"text-red-700 dark:text-red-400",
 bgColor:"bg-red-50 dark:bg-red-950/30",
 },
 vague: {
 label:"Vague",
 color:"bg-blue-500",
 textColor:"text-blue-700 dark:text-blue-400",
 bgColor:"bg-blue-50 dark:bg-blue-950/30",
 },
} as const;

type ToneCheckerProps = {
 text: string;
};

export function ToneChecker({ text }: ToneCheckerProps) {
 const analysis = useMemo(() => analyzeText(text), [text]);

 const grouped = useMemo(() => {
 const map: Record<PatternMatch["type"], PatternMatch[]> = {
 cliche: [],
"ai-pattern": [],
 vague: [],
 };
 for (const p of analysis.patterns) {
 map[p.type].push(p);
 }
 return map;
 }, [analysis.patterns]);

 const scoreColor =
 analysis.authenticityScore >= 70
 ?"text-green-600 dark:text-green-400"
 : analysis.authenticityScore >= 40
 ?"text-yellow-600 dark:text-yellow-400"
 :"text-red-600 dark:text-red-400";

 const scoreTrackColor =
 analysis.authenticityScore >= 70
 ?"bg-green-500"
 : analysis.authenticityScore >= 40
 ?"bg-yellow-500"
 :"bg-red-500";

 if (!text.trim()) {
 return (
 <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
 <Eye className="size-8"/>
 <p className="text-sm">Start writing to see tone analysis</p>
 </div>
 );
 }

 return (
 <div className="flex flex-col gap-4">
 {/* Authenticity Gauge */}
 <Card size="sm">
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium">
 Authenticity Score
 </CardTitle>
 </CardHeader>
 <CardContent className="flex flex-col gap-3 px-4 pb-4">
 <div className="flex items-end gap-2">
 <span className={cn("text-3xl font-bold tabular-nums", scoreColor)}>
 {analysis.authenticityScore}
 </span>
 <span className="mb-1 text-sm text-muted-foreground">/ 100</span>
 </div>
 <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
 <div
 className={cn("h-full rounded-full transition-all duration-500", scoreTrackColor)}
 style={{ width: `${analysis.authenticityScore}%` }}
 />
 </div>
 <p className="text-xs text-muted-foreground">
 {analysis.authenticityScore >= 70
 ?"Your writing sounds authentic and personal."
 : analysis.authenticityScore >= 40
 ?"Some phrases could sound more genuine. Review highlights below."
 :"Multiple generic patterns detected. Consider rewriting flagged sections."}
 </p>
 </CardContent>
 </Card>

 {/* Pattern Highlights */}
 {analysis.patterns.length > 0 ? (
 <Card size="sm">
 <CardHeader className="pb-2">
 <div className="flex items-center justify-between">
 <CardTitle className="text-sm font-medium">
 Flagged Patterns
 </CardTitle>
 <Badge variant="outline" className="text-xs">
 {analysis.patterns.length} found
 </Badge>
 </div>
 </CardHeader>
 <CardContent className="flex flex-col gap-3 px-4 pb-4">
 {(["cliche","ai-pattern","vague"] as const).map((type) => {
 const items = grouped[type];
 if (items.length === 0) return null;
 const cfg = TYPE_CONFIG[type];
 return (
 <div key={type} className="flex flex-col gap-1.5">
 <div className="flex items-center gap-2">
 <div className={cn("size-2 rounded-full", cfg.color)} />
 <span className="text-xs font-medium">{cfg.label}</span>
 </div>
 <div className="flex flex-wrap gap-1.5">
 {items.map((p, i) => (
 <span
 key={`${p.text}-${i}`}
 className={cn(
"rounded px-1.5 py-0.5 text-xs font-mono",
 cfg.bgColor,
 cfg.textColor
 )}
 >
 &ldquo;{p.text}&rdquo;
 </span>
 ))}
 </div>
 </div>
 );
 })}
 </CardContent>
 </Card>
 ) : (
 <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 dark:border-green-900 dark:bg-green-950/30">
 <CheckCircle className="size-4 text-green-600 dark:text-green-400"/>
 <span className="text-sm text-green-700 dark:text-green-300">
 No generic patterns detected. Nice work!
 </span>
 </div>
 )}

 {/* Legend */}
 <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
 <span className="flex items-center gap-1">
 <span className="inline-block size-2 rounded-full bg-yellow-500"/>
 Cliche
 </span>
 <span className="flex items-center gap-1">
 <span className="inline-block size-2 rounded-full bg-red-500"/>
 AI Pattern
 </span>
 <span className="flex items-center gap-1">
 <span className="inline-block size-2 rounded-full bg-blue-500"/>
 Vague
 </span>
 </div>
 </div>
 );
}
