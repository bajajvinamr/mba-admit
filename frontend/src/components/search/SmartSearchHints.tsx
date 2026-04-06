"use client";

import { Sparkles } from "lucide-react";
import type { SearchFilters } from "@/components/search/FilterPanel";
import { DEFAULT_FILTERS } from "@/components/search/FilterPanel";

type SmartQuery = {
  label: string;
  filters: Partial<SearchFilters>;
  textQuery?: string;
};

const SMART_QUERIES: SmartQuery[] = [
  {
    label: "GMAT under 700 in Europe",
    filters: {
      gmatRange: [400, 700],
      countries: ["United Kingdom", "France", "Spain", "Germany", "Italy", "Netherlands", "Switzerland"],
    },
  },
  {
    label: "Acceptance >30% in USA",
    filters: { acceptanceRange: [30, 100], countries: ["USA"] },
  },
  {
    label: "Part-time MBA",
    filters: { formats: ["part-time"] },
  },
  {
    label: "Tuition under $60K",
    filters: { tuitionRange: [0, 60000] },
  },
  {
    label: "Programs in India",
    filters: { countries: ["India"] },
  },
  {
    label: "Programs in Canada",
    filters: { countries: ["Canada"] },
  },
];

export function SmartSearchHints({
  onSelect,
  onFiltersChange,
}: {
  onSelect: (query: string) => void;
  onFiltersChange?: (filters: SearchFilters) => void;
}) {
  const handleClick = (sq: SmartQuery) => {
    if (onFiltersChange) {
      // Apply structured filters directly
      const newFilters: SearchFilters = { ...DEFAULT_FILTERS, ...sq.filters };
      onFiltersChange(newFilters);
      onSelect(sq.textQuery ?? "");
    } else {
      // Fallback: set as text query
      onSelect(sq.label);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap mt-2">
      <span className="flex items-center gap-1 text-xs text-muted-foreground/40">
        <Sparkles size={10} /> Quick filters:
      </span>
      {SMART_QUERIES.map((sq) => (
        <button
          key={sq.label}
          onClick={() => handleClick(sq)}
          className="text-xs px-2.5 py-1 bg-muted/40 text-muted-foreground hover:bg-primary/5 hover:text-primary border border-transparent hover:border-primary/20 rounded-full transition-all"
        >
          {sq.label}
        </button>
      ))}
    </div>
  );
}
