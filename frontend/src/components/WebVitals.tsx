"use client";

/**
 * Web Vitals reporter - tracks Core Web Vitals (LCP, FID, CLS, TTFB, INP)
 * and sends them through our analytics pipeline.
 *
 * Renders nothing - drop into layout.tsx to enable.
 *
 * In dev mode: logs to console.
 * In prod: sends to /api/analytics/event via our track() function.
 */

import { useReportWebVitals } from "next/web-vitals";
import { track } from "@/lib/analytics";

const GOOD_THRESHOLDS: Record<string, number> = {
  LCP: 2500,   // ms - Largest Contentful Paint
  FID: 100,    // ms - First Input Delay
  CLS: 0.1,    // unitless - Cumulative Layout Shift
  TTFB: 800,   // ms - Time to First Byte
  INP: 200,    // ms - Interaction to Next Paint
};

export function WebVitals() {
  useReportWebVitals((metric) => {
    const rating =
      metric.value <= (GOOD_THRESHOLDS[metric.name] ?? Infinity)
        ? "good"
        : metric.value <= (GOOD_THRESHOLDS[metric.name] ?? Infinity) * 2.5
          ? "needs-improvement"
          : "poor";

    track("web_vital", {
      name: metric.name,
      value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
      rating,
      navigationType: metric.navigationType ?? "unknown",
    });
  });

  return null;
}
