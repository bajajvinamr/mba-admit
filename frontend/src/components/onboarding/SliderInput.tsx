"use client";

import { cn } from"@/lib/utils";

interface SliderInputProps {
 min: number;
 max: number;
 step: number;
 value: number | null;
 onChange: (value: number) => void;
 label?: string;
 formatValue?: (v: number) => string;
}

export function SliderInput({
 min,
 max,
 step,
 value,
 onChange,
 label,
 formatValue,
}: SliderInputProps) {
 const current = value ?? Math.round((min + max) / 2);
 const pct = ((current - min) / (max - min)) * 100;

 return (
 <div className="flex flex-col items-center gap-6 w-full">
 <div className="text-center">
 <span className="font-display text-5xl font-bold text-foreground tabular-nums">
 {formatValue ? formatValue(current) : current}
 </span>
 {label && (
 <p className="text-muted-foreground text-xs mt-1">{label}</p>
 )}
 </div>
 <div className="w-full px-1">
 <input
 type="range"
 min={min}
 max={max}
 step={step}
 value={current}
 onChange={(e) => onChange(Number(e.target.value))}
 className={cn(
"w-full h-2 rounded-full appearance-none cursor-pointer",
"bg-muted",
"[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]: [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110",
"[&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:"
 )}
 style={{
 background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${pct}%, hsl(var(--muted)) ${pct}%, hsl(var(--muted)) 100%)`,
 }}
 />
 <div className="flex justify-between mt-2 text-xs text-muted-foreground">
 <span>{formatValue ? formatValue(min) : min}</span>
 <span>{formatValue ? formatValue(max) : max}</span>
 </div>
 </div>
 </div>
 );
}
