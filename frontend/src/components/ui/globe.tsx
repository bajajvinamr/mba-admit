"use client";

import { useEffect, useRef, useCallback } from "react";
import createGlobe, { type COBEOptions } from "cobe";
import { cn } from "@/lib/utils";

// MBA school locations: [lat, lng]
const SCHOOL_MARKERS: [number, number][] = [
  [42.37, -71.12],   // HBS - Boston
  [37.43, -122.17],  // GSB - Stanford
  [39.95, -75.19],   // Wharton - Philadelphia
  [48.40, 2.17],     // INSEAD - Fontainebleau
  [51.52, -0.18],    // LBS - London
  [40.81, -73.96],   // CBS - New York
  [42.06, -87.68],   // Kellogg - Evanston
  [38.03, -78.51],   // Darden - Virginia
  [41.79, -87.60],   // Booth - Chicago
  [35.66, 139.70],   // Keio - Tokyo
  [1.29, 103.85],    // NUS - Singapore
  [19.12, 72.84],    // IIM-A (Mumbai area)
  [-33.87, 151.21],  // AGSM - Sydney
  [49.01, 8.42],     // Mannheim - Germany
  [55.75, 37.62],    // Skolkovo - Moscow
  [31.23, 121.47],   // CEIBS - Shanghai
  [43.66, -79.40],   // Rotman - Toronto
  [-23.56, -46.64],  // Insper - Sao Paulo
  [48.86, 2.35],     // HEC Paris
  [52.52, 13.41],    // ESMT Berlin
];

type GlobeProps = {
  className?: string;
  /** Globe size in pixels. Defaults to 600 */
  size?: number;
};

export function Globe({ className, size = 600 }: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  const phiRef = useRef(0);
  const prefersReducedMotion = useRef(false);
  const globeWidthRef = useRef(size);

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    pointerInteracting.current = e.clientX - pointerInteractionMovement.current;
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
  }, []);

  const onPointerUp = useCallback(() => {
    pointerInteracting.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
  }, []);

  const onPointerOut = useCallback(() => {
    pointerInteracting.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (pointerInteracting.current !== null) {
      const delta = e.clientX - pointerInteracting.current;
      pointerInteractionMovement.current = delta;
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const dpr = window.devicePixelRatio || 1;

    const onResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        // Use the container width if available, otherwise fall back to size prop
        globeWidthRef.current = containerWidth > 0 ? containerWidth : size;
      }
    };
    onResize();
    window.addEventListener("resize", onResize);

    const initialWidth = globeWidthRef.current;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: Math.min(dpr, 2),
      width: initialWidth * 2,
      height: initialWidth * 2,
      phi: 0,
      theta: 0.3,
      dark: 0,
      diffuse: 1.2,
      mapSamples: 20000,
      mapBrightness: 6,
      baseColor: [0.97, 0.96, 0.93],
      markerColor: [0.77, 0.64, 0.35], // #C4A35A gold
      glowColor: [0.95, 0.93, 0.88],
      markers: SCHOOL_MARKERS.map(([lat, lng]) => ({
        location: [lat, lng],
        size: 0.08,
      })),
      onRender: (state: Record<string, unknown>) => {
        if (prefersReducedMotion.current) {
          state.phi = 0.5; // static position
          return;
        }
        if (pointerInteracting.current === null) {
          phiRef.current += 0.003;
        }
        state.phi = phiRef.current + pointerInteractionMovement.current / 200;
        const w = globeWidthRef.current;
        state.width = w * 2;
        state.height = w * 2;
      },
    } as COBEOptions);

    return () => {
      globe.destroy();
      window.removeEventListener("resize", onResize);
    };
  }, [size]);

  return (
    <div
      ref={containerRef}
      className={cn(" relative aspect-square", className)}
      style={{ minWidth: 500, minHeight: 500 }}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerOut={onPointerOut}
        onMouseMove={onMouseMove}
        className="h-full w-full cursor-grab"
        style={{
          width: "100%",
          height: "100%",
        }}
      />
      {/* Gradient fade at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </div>
  );
}
