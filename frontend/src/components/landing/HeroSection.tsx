"use client";

import { useRef, useEffect, useCallback } from "react";
import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";
import { ArrowRight, CheckCircle2, Shield } from "lucide-react";
import Link from "next/link";
import { track } from "@/lib/analytics";

// ── Animated Counter ────────────────────────────────────────────────────────

function AnimatedCounter({ end, suffix = "", duration = 2.2 }: { end: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString());

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, end, { duration, ease: "easeOut" });
    return controls.stop;
  }, [inView, end, count, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      <motion.span>{rounded}</motion.span>{suffix}
    </span>
  );
}

// ── Social Proof Ticker ─────────────────────────────────────────────────────

const PROOF_ITEMS = [
  "Manish, 710 GMAT → admitted to ISB with 50% scholarship",
  "Priya, 3.2 GPA → admitted to Kellogg R1",
  "Ravi, career switcher → admitted to Booth + Stern",
  "Sneha, non-traditional → admitted to INSEAD with merit aid",
  "Arjun, 740 GMAT → admitted to Wharton R2",
  "Neha, 4 years consulting → admitted to HBS",
  "Aditya, Indian IT → admitted to Ross with full scholarship",
  "Kavya, 690 GMAT → admitted to Fuqua + Darden",
];

function SocialProofTicker() {
  return (
    <div className="relative overflow-hidden">
      <div className="flex gap-8 animate-marquee-left" style={{ animationDuration: "40s" }}>
        {[...PROOF_ITEMS, ...PROOF_ITEMS].map((item, i) => (
          <div key={i} className="flex items-center gap-2 shrink-0">
            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
            <span className="text-sm text-muted-foreground/70 whitespace-nowrap">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Floating School Badges ──────────────────────────────────────────────────

const SCHOOL_BADGES = [
  { name: "HBS", x: 12, y: 15, delay: 0 },
  { name: "Stanford GSB", x: 62, y: 8, delay: 0.8 },
  { name: "Wharton", x: 78, y: 50, delay: 0.4 },
  { name: "INSEAD", x: 20, y: 65, delay: 1.2 },
  { name: "Booth", x: 50, y: 75, delay: 0.6 },
  { name: "ISB", x: 38, y: 30, delay: 1.0 },
  { name: "LBS", x: 72, y: 25, delay: 1.4 },
  { name: "IIM-A", x: 8, y: 42, delay: 0.2 },
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
      el.style.transform = `translate(${x * depth * 15}px, ${y * depth * 15}px)`;
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("mousemove", handleMouseMove);
    return () => el.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[400px]">
      {/* Warm glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute w-[280px] h-[280px] rounded-full opacity-[0.06] blur-[80px]"
          style={{
            background: "radial-gradient(circle, hsl(239 84% 67%), transparent 70%)",
            top: "25%", left: "30%",
            animation: "hero-orb 12s ease-in-out infinite",
          }}
        />
      </div>

      {SCHOOL_BADGES.map((badge) => (
        <motion.div
          key={badge.name}
          data-parallax={1 + badge.delay * 0.4}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 + badge.delay, duration: 0.5, ease: "easeOut" }}
          className="absolute"
          style={{
            left: `${badge.x}%`,
            top: `${badge.y}%`,
            animation: `float-badge ${5 + badge.delay}s ease-in-out infinite`,
          }}
        >
          <div className="px-3.5 py-2 bg-card/90 backdrop-blur-sm border border-border/50 text-foreground/80 text-xs font-medium whitespace-nowrap hover:border-primary/30 hover:text-primary transition-all cursor-default rounded-lg shadow-sm">
            {badge.name}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Main Hero ───────────────────────────────────────────────────────────────

export function HeroSection(_props: {
  showCalc: boolean;
  onToggleCalc: () => void;
}) {
  return (
    <section className="relative bg-background overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-16 sm:pt-20 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left: Copy + CTAs */}
          <div className="lg:col-span-7 text-center lg:text-left">
            {/* Credibility badge - not techy, just confidence */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2.5 mb-8 px-4 py-2 bg-emerald-50 border border-emerald-200/60 rounded-full"
            >
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span className="text-xs font-medium text-emerald-800">
                Trusted by 5,000+ applicants across 56 countries
              </span>
            </motion.div>

            {/* Headline - speaks to the fear */}
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-4xl sm:text-5xl lg:text-[3.4rem] font-semibold leading-[1.1] tracking-[-0.02em] mb-5"
            >
              <span className="text-foreground">Get into your</span>
              <br />
              <span className="text-foreground">dream MBA program.</span>
            </motion.h1>

            {/* Sub - addresses the real pain */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0 leading-relaxed mb-8"
            >
              Know your real chances before you apply. We've analyzed 67,000+
              real admissions outcomes across 905 programs — so you can build the
              right school list, write essays that work, and stop guessing.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="flex flex-col sm:flex-row justify-center lg:justify-start gap-3 mb-5"
            >
              <Link
                href="/simulator"
                onClick={() => track("hero_cta_clicked", { target: "simulator" })}
                className="bg-foreground text-background font-medium px-8 py-3.5 transition-all hover:bg-foreground/90 flex items-center justify-center gap-2 text-sm rounded-lg shadow-sm hover:shadow-md"
              >
                Check My Chances — Free <ArrowRight size={15} />
              </Link>
              <Link
                href="/schools"
                onClick={() => track("hero_cta_clicked", { target: "schools" })}
                className="border border-border text-foreground font-medium px-8 py-3.5 transition-all hover:bg-accent flex items-center justify-center gap-2 text-sm rounded-lg"
              >
                Browse 905 Programs
              </Link>
            </motion.div>

            {/* Trust signals - consultant comparison */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-xs text-muted-foreground/50 mt-2"
            >
              <span className="flex items-center gap-1.5">
                <Shield size={11} /> Free to start
              </span>
              <span>No consultant needed</span>
              <span>Real data, not guesswork</span>
            </motion.div>
          </div>

          {/* Right: Floating school badges */}
          <div className="lg:col-span-5 hidden lg:block">
            <FloatingBadges />
          </div>
        </div>

        {/* Data credibility bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-12 pt-8 border-t border-border/40"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 max-w-3xl mx-auto lg:mx-0 text-center lg:text-left">
            <div>
              <p className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
                <AnimatedCounter end={67856} suffix="" />
              </p>
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground/50 mt-1 font-medium">
                Real decisions analyzed
              </p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
                <AnimatedCounter end={905} suffix="" />
              </p>
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground/50 mt-1 font-medium">
                Programs worldwide
              </p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
                <AnimatedCounter end={56} suffix="" />
              </p>
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground/50 mt-1 font-medium">
                Schools with outcome data
              </p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
                <AnimatedCounter end={341} suffix="" />
              </p>
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground/50 mt-1 font-medium">
                Real essay examples
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Social proof ticker */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="border-t border-border/30 py-4 mt-4 overflow-hidden"
      >
        <SocialProofTicker />
      </motion.div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes hero-orb {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, -15px) scale(1.08); }
        }
        @keyframes float-badge {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </section>
  );
}
