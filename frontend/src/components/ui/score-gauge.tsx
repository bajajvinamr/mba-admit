"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

// ── Types ──────────────────────────────────────────────────────────────────

type ScoreGaugeSize = "sm" | "md" | "lg";

interface ScoreGaugeProps {
  score: number; // 0-100
  label: string;
  size?: ScoreGaugeSize;
}

// ── Size config ────────────────────────────────────────────────────────────

const SIZE_CONFIG: Record<
  ScoreGaugeSize,
  { px: number; fontSize: string; labelSize: string }
> = {
  sm: { px: 80, fontSize: "text-lg", labelSize: "text-[9px]" },
  md: { px: 120, fontSize: "text-2xl", labelSize: "text-[10px]" },
  lg: { px: 160, fontSize: "text-3xl", labelSize: "text-xs" },
};

// ── Color by score ─────────────────────────────────────────────────────────

function getColor(score: number): {
  ring: string;
  glow: string;
  glowFilter: string;
} {
  if (score >= 80)
    return {
      ring: "#34D399",
      glow: "rgba(52,211,153,0.35)",
      glowFilter: "drop-shadow(0 0 8px rgba(52,211,153,0.4))",
    };
  if (score >= 60)
    return {
      ring: "hsl(239, 84%, 67%)",
      glow: "rgba(201,169,98,0.35)",
      glowFilter: "drop-shadow(0 0 8px rgba(201,169,98,0.4))",
    };
  return {
    ring: "#EF4444",
    glow: "rgba(239,68,68,0.35)",
    glowFilter: "drop-shadow(0 0 8px rgba(239,68,68,0.4))",
  };
}

// ── Component ──────────────────────────────────────────────────────────────

export function ScoreGauge({ score, label, size = "md" }: ScoreGaugeProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const config = SIZE_CONFIG[size];
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = (1 - clampedScore / 100) * circumference;
  const color = getColor(clampedScore);

  const [dashOffset, setDashOffset] = useState(circumference);
  const [displayNum, setDisplayNum] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);
  const rafRef = useRef<number>(0);

  // IntersectionObserver triggers animation when visible
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;

          const reducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
          ).matches;

          if (reducedMotion) {
            setDashOffset(targetOffset);
            setDisplayNum(clampedScore);
            return;
          }

          // Animate ring (via CSS transition on strokeDashoffset)
          requestAnimationFrame(() => {
            setDashOffset(targetOffset);
          });

          // Count-up number via rAF
          const duration = 1200;
          const start = performance.now();
          function tick(now: number) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayNum(Math.round(eased * clampedScore));
            if (progress < 1) {
              rafRef.current = requestAnimationFrame(tick);
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [clampedScore, circumference, targetOffset]);

  return (
    <div
      ref={containerRef}
      className="inline-flex flex-col items-center gap-1 select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="relative"
        style={{
          width: config.px,
          height: config.px,
          transform: isHovered ? "scale(1.05)" : "scale(1)",
          transition: "transform 0.3s ease",
        }}
      >
        <svg
          width={config.px}
          height={config.px}
          viewBox="0 0 120 120"
          className="block"
          style={{ filter: color.glowFilter }}
        >
          {/* Background ring */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="8"
          />
          {/* Foreground ring */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={color.ring}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 60 60)"
            style={{
              transition:
                "stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "font-display font-bold tabular-nums",
              config.fontSize,
            )}
            style={{ color: color.ring }}
          >
            {displayNum}
          </span>
        </div>
      </div>

      {/* Label below */}
      <span
        className={cn(
          "font-medium uppercase tracking-widest text-white/50",
          config.labelSize,
        )}
      >
        {label}
      </span>
    </div>
  );
}
