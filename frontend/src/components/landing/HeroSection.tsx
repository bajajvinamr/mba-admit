"use client";

import { useRef, useEffect, useCallback } from "react";
import { ArrowRight, BarChart3, Shield } from "lucide-react";
import Link from "next/link";
import { track } from "@/lib/analytics";

const TRUST_STATS = [
  { value: "840+", label: "Programs" },
  { value: "12K+", label: "Real Decisions" },
  { value: "100+", label: "AI Tools" },
  { value: "5K+", label: "Applicants" },
] as const;

const SCHOOL_BADGES = [
  { name: "HBS", x: 15, y: 20, delay: 0 },
  { name: "Stanford GSB", x: 65, y: 12, delay: 0.8 },
  { name: "Wharton", x: 80, y: 55, delay: 0.4 },
  { name: "INSEAD", x: 25, y: 70, delay: 1.2 },
  { name: "Booth", x: 55, y: 80, delay: 0.6 },
  { name: "Kellogg", x: 40, y: 35, delay: 1.0 },
  { name: "LBS", x: 75, y: 30, delay: 1.4 },
  { name: "Sloan", x: 10, y: 50, delay: 0.2 },
] as const;

function FloatingBadges() {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    containerRef.current.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
      const depth = parseFloat(el.dataset.parallax || "1");
      el.style.transform = `translate(${x * depth * 20}px, ${y * depth * 20}px)`;
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("mousemove", handleMouseMove);
    return () => el.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[480px]">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0">
        <div
          className="absolute w-[300px] h-[300px] rounded-full opacity-20 blur-[80px]"
          style={{
            background: "radial-gradient(circle, #C9A962, transparent 70%)",
            top: "20%", left: "30%",
            animation: "orb-float-1 8s ease-in-out infinite",
          }}
        />
        <div
          className="absolute w-[250px] h-[250px] rounded-full opacity-15 blur-[60px]"
          style={{
            background: "radial-gradient(circle, #C9A962, transparent 70%)",
            top: "50%", left: "50%",
            animation: "orb-float-2 10s ease-in-out infinite",
          }}
        />
        <div
          className="absolute w-[200px] h-[200px] rounded-full opacity-10 blur-[50px]"
          style={{
            background: "radial-gradient(circle, #FFFFFF, transparent 70%)",
            top: "30%", left: "60%",
            animation: "orb-float-3 12s ease-in-out infinite",
          }}
        />
      </div>

      {SCHOOL_BADGES.map((badge) => (
        <div
          key={badge.name}
          data-parallax={1 + badge.delay * 0.5}
          className="absolute transition-transform duration-300 ease-out animate-[fade-in_0.6s_ease-out_forwards]"
          style={{
            left: `${badge.x}%`, top: `${badge.y}%`,
            animation: `float-card ${4 + badge.delay}s ease-in-out infinite, fade-in 0.6s ease-out ${0.5 + badge.delay}s forwards`,
            opacity: 0,
          }}
        >
          <div className="px-3 py-1.5 bg-white/[0.06] backdrop-blur-sm border border-white/[0.1] text-white/70 text-xs font-medium whitespace-nowrap hover:bg-white/[0.12] hover:text-white hover:border-[#C9A962]/40 transition-all cursor-default">
            {badge.name}
          </div>
        </div>
      ))}

      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(201,169,98,0.15) 0%, transparent 70%)",
          animation: "glow-pulse 4s ease-in-out infinite",
        }}
      />
    </div>
  );
}

export function HeroSection(_props: {
  showCalc: boolean;
  onToggleCalc: () => void;
}) {
  return (
    <section className="relative bg-[#0A0A0A] overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(201,169,98,0.06) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--background)_75%)]" />

      <div className="relative z-10 max-w-7xl mx-auto px-8 pt-24 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 mb-8 px-4 py-2 border border-[#C9A96240] bg-[#C9A96215] animate-[fade-in_0.5s_ease-out_forwards]"
              style={{ opacity: 0 }}
            >
              <span className="text-xs font-medium tracking-wide text-primary">
                100+ AI Tools &middot; 840+ Programs &middot; Free to Start
              </span>
            </div>

            {/* Headline */}
            <h1
              className="font-display text-5xl lg:text-7xl leading-[1.1] tracking-tight mb-6 animate-[fade-in_0.6s_ease-out_0.1s_forwards]"
              style={{ opacity: 0 }}
            >
              <span className="text-white">Will you get into</span>
              <br />
              <span className="italic text-primary">your dream school?</span>
            </h1>

            {/* Subheadline */}
            <p
              className="text-lg font-sans text-white/50 max-w-xl mx-auto lg:mx-0 leading-relaxed mb-10 animate-[fade-in_0.6s_ease-out_0.2s_forwards]"
              style={{ opacity: 0 }}
            >
              Check your odds against 840+ MBA programs using 12,000+ real
              admissions decisions. AI essay feedback, mock interviews,
              scholarship negotiation - everything from research to admit letter.
            </p>

            {/* CTAs */}
            <div
              className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4 animate-[fade-in_0.6s_ease-out_0.3s_forwards]"
              style={{ opacity: 0 }}
            >
              <Link
                href="/simulator"
                onClick={() => track("hero_cta_clicked", { target: "simulator" })}
                className="bg-[#C9A962] text-[#0A0A0A] font-semibold px-8 py-3.5 transition-colors hover:bg-[#C9A962]/90 flex items-center justify-center gap-2 text-sm tracking-wide"
              >
                Check My Odds - Free <ArrowRight size={16} />
              </Link>
              <Link
                href="/tools"
                onClick={() => track("hero_cta_clicked", { target: "tools" })}
                className="border border-white/20 text-white font-medium px-8 py-3.5 transition-all hover:bg-white/5 flex items-center justify-center gap-2 text-sm tracking-wide"
              >
                <BarChart3 size={16} /> Explore All Tools
              </Link>
            </div>

            {/* Micro-trust */}
            <div
              className="mt-6 flex items-center justify-center lg:justify-start gap-4 text-xs text-[#6A6A6A] animate-[fade-in_0.6s_ease-out_0.4s_forwards]"
              style={{ opacity: 0 }}
            >
              <span className="flex items-center gap-1">
                <Shield size={10} /> No credit card required
              </span>
              <span>&middot;</span>
              <span>12,000+ real decisions</span>
              <span>&middot;</span>
              <span>Used by 5,000+ applicants</span>
            </div>
          </div>

          {/* Right: Floating school badges with parallax + gradient orbs */}
          <div className="hidden lg:block">
            <FloatingBadges />
          </div>
        </div>
      </div>

      {/* Trust Stats Bar */}
      <div className="relative z-10 border-t border-white/10">
        <div className="max-w-5xl mx-auto px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {TRUST_STATS.map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-2xl md:text-3xl text-primary font-semibold">
                {stat.value}
              </p>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
