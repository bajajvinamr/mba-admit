"use client";

import { useState } from"react";
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from"lucide-react";
import { Button } from"@/components/ui/button";
import {
 Sheet,
 SheetContent,
 SheetHeader,
 SheetTitle,
 SheetTrigger,
} from"@/components/ui/sheet";
import { cn } from"@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

export type SearchFilters = {
 gmatRange: [number, number];
 acceptanceRange: [number, number];
 tuitionRange: [number, number];
 countries: string[];
 formats: string[];
 tiers: string[];
 testOptional: boolean;
 scholarshipFriendly: boolean;
};

export const DEFAULT_FILTERS: SearchFilters = {
 gmatRange: [400, 800],
 acceptanceRange: [0, 100],
 tuitionRange: [0, 200000],
 countries: [],
 formats: [],
 tiers: [],
 testOptional: false,
 scholarshipFriendly: false,
};

type FilterPanelProps = {
 filters: SearchFilters;
 onFiltersChange: (filters: SearchFilters) => void;
 availableCountries: string[];
 className?: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const FORMAT_OPTIONS = ["full-time","part-time","online","executive"];
const TIER_OPTIONS = ["M7","T15","T25","T50","T100"];

function hasActiveFilters(filters: SearchFilters): boolean {
 return (
 filters.gmatRange[0] !== 400 ||
 filters.gmatRange[1] !== 800 ||
 filters.acceptanceRange[0] !== 0 ||
 filters.acceptanceRange[1] !== 100 ||
 filters.tuitionRange[0] !== 0 ||
 filters.tuitionRange[1] !== 200000 ||
 filters.countries.length > 0 ||
 filters.formats.length > 0 ||
 filters.tiers.length > 0 ||
 filters.testOptional ||
 filters.scholarshipFriendly
 );
}

function countActiveFilters(filters: SearchFilters): number {
 let count = 0;
 if (filters.gmatRange[0] !== 400 || filters.gmatRange[1] !== 800) count++;
 if (filters.acceptanceRange[0] !== 0 || filters.acceptanceRange[1] !== 100) count++;
 if (filters.tuitionRange[0] !== 0 || filters.tuitionRange[1] !== 200000) count++;
 if (filters.countries.length > 0) count++;
 if (filters.formats.length > 0) count++;
 if (filters.tiers.length > 0) count++;
 if (filters.testOptional) count++;
 if (filters.scholarshipFriendly) count++;
 return count;
}

// ── Range Slider (dual-thumb via two inputs) ─────────────────────────────────

function DualRangeSlider({
 min,
 max,
 step,
 value,
 onChange,
 formatValue,
}: {
 min: number;
 max: number;
 step: number;
 value: [number, number];
 onChange: (val: [number, number]) => void;
 formatValue?: (v: number) => string;
}) {
 const fmt = formatValue ?? ((v: number) => String(v));
 const pctLow = ((value[0] - min) / (max - min)) * 100;
 const pctHigh = ((value[1] - min) / (max - min)) * 100;

 return (
 <div className="space-y-2">
 <div className="flex items-center justify-between text-xs text-muted-foreground">
 <span>{fmt(value[0])}</span>
 <span>{fmt(value[1])}</span>
 </div>
 <div className="relative h-5 flex items-center">
 {/* Track */}
 <div className="absolute inset-x-0 h-1.5 rounded-full bg-muted"/>
 {/* Active track */}
 <div
 className="absolute h-1.5 rounded-full bg-primary"
 style={{ left: `${pctLow}%`, right: `${100 - pctHigh}%` }}
 />
 {/* Low thumb */}
 <input
 type="range"
 min={min}
 max={max}
 step={step}
 value={value[0]}
 onChange={(e) => {
 const v = Number(e.target.value);
 if (v <= value[1]) onChange([v, value[1]]);
 }}
 className="absolute inset-x-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]: [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]: [&::-moz-range-thumb]:cursor-pointer"
 aria-label="Minimum value"
 />
 {/* High thumb */}
 <input
 type="range"
 min={min}
 max={max}
 step={step}
 value={value[1]}
 onChange={(e) => {
 const v = Number(e.target.value);
 if (v >= value[0]) onChange([value[0], v]);
 }}
 className="absolute inset-x-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]: [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]: [&::-moz-range-thumb]:cursor-pointer"
 aria-label="Maximum value"
 />
 </div>
 </div>
 );
}

// ── Collapsible Section ──────────────────────────────────────────────────────

function FilterSection({
 title,
 children,
 defaultOpen = true,
}: {
 title: string;
 children: React.ReactNode;
 defaultOpen?: boolean;
}) {
 const [open, setOpen] = useState(defaultOpen);

 return (
 <div className="border-b border-border pb-4 mb-4 last:border-0 last:pb-0 last:mb-0">
 <button
 type="button"
 onClick={() => setOpen(!open)}
 className="flex w-full items-center justify-between text-sm font-medium text-foreground mb-2"
 >
 {title}
 {open ? (
 <ChevronUp className="size-4 text-muted-foreground"/>
 ) : (
 <ChevronDown className="size-4 text-muted-foreground"/>
 )}
 </button>
 {open && <div className="space-y-2">{children}</div>}
 </div>
 );
}

// ── Checkbox ─────────────────────────────────────────────────────────────────

function Checkbox({
 checked,
 onChange,
 label,
}: {
 checked: boolean;
 onChange: (checked: boolean) => void;
 label: string;
}) {
 return (
 <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground hover:text-primary transition-colors">
 <input
 type="checkbox"
 checked={checked}
 onChange={(e) => onChange(e.target.checked)}
 className="size-4 rounded border-border text-primary accent-primary focus:ring-primary/50"
 />
 <span className="capitalize">{label}</span>
 </label>
 );
}

// ── Multi-select checkboxes ──────────────────────────────────────────────────

function MultiCheckbox({
 options,
 selected,
 onChange,
}: {
 options: string[];
 selected: string[];
 onChange: (selected: string[]) => void;
}) {
 const toggle = (opt: string) => {
 const next = selected.includes(opt)
 ? selected.filter((s) => s !== opt)
 : [...selected, opt];
 onChange(next);
 };

 return (
 <div className="space-y-1.5">
 {options.map((opt) => (
 <Checkbox
 key={opt}
 checked={selected.includes(opt)}
 onChange={() => toggle(opt)}
 label={opt}
 />
 ))}
 </div>
 );
}

// ── Country Multi-Select (scrollable) ────────────────────────────────────────

function CountrySelect({
 countries,
 selected,
 onChange,
}: {
 countries: string[];
 selected: string[];
 onChange: (selected: string[]) => void;
}) {
 const [search, setSearch] = useState("");
 const filtered = search
 ? countries.filter((c) => c.toLowerCase().includes(search.toLowerCase()))
 : countries;

 const toggle = (country: string) => {
 const next = selected.includes(country)
 ? selected.filter((s) => s !== country)
 : [...selected, country];
 onChange(next);
 };

 return (
 <div className="space-y-2">
 <input
 type="text"
 placeholder="Search countries..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
 />
 <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
 {filtered.slice(0, 50).map((c) => (
 <Checkbox
 key={c}
 checked={selected.includes(c)}
 onChange={() => toggle(c)}
 label={c}
 />
 ))}
 {filtered.length === 0 && (
 <p className="text-xs text-muted-foreground py-1">No countries found</p>
 )}
 </div>
 </div>
 );
}

// ── Filter Content (shared between sidebar + mobile sheet) ───────────────────

function FilterContent({
 filters,
 onFiltersChange,
 availableCountries,
}: Omit<FilterPanelProps,"className">) {
 const update = <K extends keyof SearchFilters>(key: K, val: SearchFilters[K]) => {
 onFiltersChange({ ...filters, [key]: val });
 };

 return (
 <div className="space-y-0">
 <FilterSection title="GMAT Range">
 <DualRangeSlider
 min={400}
 max={800}
 step={10}
 value={filters.gmatRange}
 onChange={(val) => update("gmatRange", val)}
 />
 </FilterSection>

 <FilterSection title="Acceptance Rate">
 <DualRangeSlider
 min={0}
 max={100}
 step={1}
 value={filters.acceptanceRange}
 onChange={(val) => update("acceptanceRange", val)}
 formatValue={(v) => `${v}%`}
 />
 </FilterSection>

 <FilterSection title="Tuition">
 <DualRangeSlider
 min={0}
 max={200000}
 step={5000}
 value={filters.tuitionRange}
 onChange={(val) => update("tuitionRange", val)}
 formatValue={(v) => (v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${v}`)}
 />
 </FilterSection>

 <FilterSection title="Location">
 <CountrySelect
 countries={availableCountries}
 selected={filters.countries}
 onChange={(val) => update("countries", val)}
 />
 </FilterSection>

 <FilterSection title="Format">
 <MultiCheckbox
 options={FORMAT_OPTIONS}
 selected={filters.formats}
 onChange={(val) => update("formats", val)}
 />
 </FilterSection>

 <FilterSection title="Ranking Tier">
 <MultiCheckbox
 options={TIER_OPTIONS}
 selected={filters.tiers}
 onChange={(val) => update("tiers", val)}
 />
 </FilterSection>

 <FilterSection title="Quick Filters"defaultOpen={false}>
 <Checkbox
 checked={filters.testOptional}
 onChange={(v) => update("testOptional", v)}
 label="Test-optional"
 />
 <Checkbox
 checked={filters.scholarshipFriendly}
 onChange={(v) => update("scholarshipFriendly", v)}
 label="Scholarship-friendly"
 />
 </FilterSection>

 {hasActiveFilters(filters) && (
 <Button
 variant="ghost"
 size="sm"
 className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 mt-2"
 onClick={() => onFiltersChange({ ...DEFAULT_FILTERS })}
 >
 <X className="size-3.5 mr-1"/> Clear All Filters
 </Button>
 )}
 </div>
 );
}

// ── Desktop Sidebar ──────────────────────────────────────────────────────────

export function FilterPanel({
 filters,
 onFiltersChange,
 availableCountries,
 className,
}: FilterPanelProps) {
 const activeCount = countActiveFilters(filters);

 return (
 <aside
 className={cn(
"hidden lg:block w-64 shrink-0 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto pr-4 bg-card border-r border-border",
 className,
 )}
 >
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
 <SlidersHorizontal className="size-4"/> Filters
 {activeCount > 0 && (
 <span className="inline-flex items-center justify-center size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
 {activeCount}
 </span>
 )}
 </h2>
 </div>
 <FilterContent
 filters={filters}
 onFiltersChange={onFiltersChange}
 availableCountries={availableCountries}
 />
 </aside>
 );
}

// ── Mobile Filter Sheet ──────────────────────────────────────────────────────

export function MobileFilterTrigger({
 filters,
 onFiltersChange,
 availableCountries,
}: Omit<FilterPanelProps,"className">) {
 const activeCount = countActiveFilters(filters);

 return (
 <div className="lg:hidden">
 <Sheet>
 <SheetTrigger
 className={cn(
"inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
 activeCount > 0 &&"border-primary text-primary",
 )}
 >
 <SlidersHorizontal className="size-4"/>
 Filters
 {activeCount > 0 && (
 <span className="inline-flex items-center justify-center size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
 {activeCount}
 </span>
 )}
 </SheetTrigger>
 <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl px-5 pt-6 pb-8">
 <SheetHeader className="px-0">
 <SheetTitle>Filters</SheetTitle>
 </SheetHeader>
 <div className="mt-4">
 <FilterContent
 filters={filters}
 onFiltersChange={onFiltersChange}
 availableCountries={availableCountries}
 />
 </div>
 </SheetContent>
 </Sheet>
 </div>
 );
}

export { hasActiveFilters, countActiveFilters };
