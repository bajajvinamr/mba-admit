"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type MarqueeProps = {
  children: ReactNode;
  className?: string;
  /** Animation speed in seconds for one full cycle */
  speed?: number;
  /** Direction of scroll */
  direction?: "left" | "right";
  /** Pause on hover */
  pauseOnHover?: boolean;
};

export function Marquee({
  children,
  className,
  speed = 40,
  direction = "left",
  pauseOnHover = true,
}: MarqueeProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    setPrefersReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }, []);

  if (prefersReducedMotion) {
    return (
      <div className={cn("flex gap-4 overflow-hidden", className)}>
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]",
        className
      )}
    >
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex shrink-0 gap-4",
            direction === "left" ? " animate-marquee-left" : " animate-marquee-right",
            pauseOnHover && "group-hover:[animation-play-state:paused]"
          )}
          style={{ animationDuration: `${speed}s` }}
          aria-hidden={i === 1}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
