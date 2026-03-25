"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type FilterChipProps = {
  label: string;
  onRemove: () => void;
  className?: string;
};

export function FilterChip({ label, onRemove, className }: FilterChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium transition-colors hover:bg-primary/20",
        className,
      )}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20 transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        <X className="size-3" />
      </button>
    </span>
  );
}
