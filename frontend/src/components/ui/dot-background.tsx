"use client";

import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

type DotBackgroundProps = {
  children: ReactNode;
  className?: string;
  /** Dot color. Defaults to a subtle gray */
  dotColor?: string;
  /** Dot size in px */
  dotSize?: number;
  /** Gap between dots in px */
  gap?: number;
  /** Whether to apply a radial fade from center */
  fade?: boolean;
};

export function DotBackground({
  children,
  className,
  dotColor = "rgba(196, 163, 90, 0.12)",
  dotSize = 1,
  gap = 24,
  fade = true,
}: DotBackgroundProps) {
  return (
    <div className={cn(" relative", className)}>
      {/* Dot pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, ${dotColor} ${dotSize}px, transparent ${dotSize}px)`,
          backgroundSize: `${gap}px ${gap}px`,
        }}
      />
      {/* Optional radial fade */}
      {fade && (
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_20%,var(--color-background)_70%)]" />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
