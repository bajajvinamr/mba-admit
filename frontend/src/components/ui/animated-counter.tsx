"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, animate } from "framer-motion";
import { cn } from "@/lib/utils";

type AnimatedCounterProps = {
  /** Target number to count up to */
  value: number;
  /** Duration of the animation in seconds */
  duration?: number;
  /** Prefix string (e.g., "$") */
  prefix?: string;
  /** Suffix string (e.g., "+", "%") */
  suffix?: string;
  /** Format with locale separators */
  formatLocale?: boolean;
  /** Decimal places */
  decimals?: number;
  className?: string;
};

export function AnimatedCounter({
  value,
  duration = 2,
  prefix = "",
  suffix = "",
  formatLocale = true,
  decimals = 0,
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [displayValue, setDisplayValue] = useState("0");
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }, []);

  useEffect(() => {
    if (!isInView) return;

    if (prefersReducedMotion.current) {
      const formatted = formatLocale
        ? value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
        : value.toFixed(decimals);
      setDisplayValue(formatted);
      return;
    }

    const controls = animate(0, value, {
      duration,
      ease: [0.32, 0.72, 0, 1],
      onUpdate(latest) {
        const formatted = formatLocale
          ? latest.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
          : latest.toFixed(decimals);
        setDisplayValue(formatted);
      },
    });

    return () => controls.stop();
  }, [isInView, value, duration, formatLocale, decimals]);

  return (
    <motion.span
      ref={ref}
      className={cn("tabular-nums", className)}
      initial={{ opacity: 0, y: 8 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
    >
      {prefix}{displayValue}{suffix}
    </motion.span>
  );
}
