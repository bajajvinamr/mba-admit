"use client";

import { AnimatedCounter } from "@/components/ui/animated-counter";

const STATS = [
  { value: 0, suffix: "+", label: "Programs", dynamic: true },
  { value: 67856, suffix: "+", label: "Real Decisions", dynamic: false },
  { value: 56, suffix: "", label: "Schools Tracked", dynamic: false },
  { value: 100, suffix: "+", label: "Tools", dynamic: false },
] as const;

export function TrustBar({ totalSchools }: { totalSchools: number }) {
  return (
    <section className="bg-background text-foreground py-6 px-8 border-t border-border">
      <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-x-12 gap-y-3 text-center">
        {STATS.map((stat, i) => (
          <div key={i} className="min-w-[120px]">
            <p className="text-xl heading-serif text-primary">
              <AnimatedCounter
                value={stat.dynamic ? totalSchools : stat.value}
                suffix={stat.suffix}
                duration={1.8}
              />
            </p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
