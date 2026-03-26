"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { cn } from "@/lib/utils";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
  maxLife: number;
};

const CONFETTI_COLORS = [
  "#6366F1", // indigo (primary)
  "#818CF8", // indigo-light
  "#4F46E5", // indigo-dark
  "#C7D2FE", // indigo-pale
  "#3D7A5F", // sage
  "#F59E0B", // amber-500
  "#EC4899", // pink-500
  "#F97316", // orange-500
];

type ConfettiProps = {
  /** Trigger the confetti burst */
  active: boolean;
  /** Number of particles */
  particleCount?: number;
  /** Duration in ms before cleanup */
  duration?: number;
  className?: string;
};

export function Confetti({
  active,
  particleCount = 100,
  duration = 3000,
  className,
}: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [show, setShow] = useState(false);

  const createParticles = useCallback((): Particle[] => {
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * (canvasRef.current?.width ?? 400),
        y: -10,
        vx: (Math.random() - 0.5) * 8,
        vy: Math.random() * -4 - 2,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: Math.random() * 6 + 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        life: 0,
        maxLife: 60 + Math.random() * 60,
      });
    }
    return particles;
  }, [particleCount]);

  useEffect(() => {
    if (!active) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    setShow(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    const particles = createParticles();
    const gravity = 0.15;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      for (const p of particles) {
        p.life++;
        if (p.life > p.maxLife) continue;
        alive = true;

        p.vy += gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        const alpha = 1 - p.life / p.maxLife;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }

      if (alive) {
        animationRef.current = requestAnimationFrame(render);
      }
    };

    animationRef.current = requestAnimationFrame(render);

    const timeout = setTimeout(() => setShow(false), duration);

    return () => {
      cancelAnimationFrame(animationRef.current);
      clearTimeout(timeout);
    };
  }, [active, createParticles, duration]);

  if (!show && !active) return null;

  return (
    <canvas
      ref={canvasRef}
      className={cn("pointer-events-none fixed inset-0 z-50", className)}
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
