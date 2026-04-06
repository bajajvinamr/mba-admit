"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DollarSign, Zap, TrendingUp, ArrowRight } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface InsightData {
  scholarship: { top_school: string; rate: number } | null;
  sprint: { essays_left: number; nearest_days: number | null } | null;
  ml: { top_school: string; probability: number } | null;
}

export function QuickInsights({
  gmat,
  gpa,
  yoe,
  schoolIds,
}: {
  gmat?: number;
  gpa?: number;
  yoe?: number;
  schoolIds?: string[];
}) {
  const [data, setData] = useState<InsightData>({ scholarship: null, sprint: null, ml: null });

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      // Scholarship insight
      if (gmat) {
        try {
          const res = await apiFetch<{
            results: Array<{ school_id: string; scholarship_probability_pct: number }>;
          }>("/api/scholarship-intel/profile-match", {
            method: "POST",
            body: JSON.stringify({ profile: { gmat, gpa, years_experience: yoe }, school_ids: [] }),
            signal: controller.signal,
          });
          const top = res.results[0];
          if (top) {
            setData((d) => ({
              ...d,
              scholarship: {
                top_school: top.school_id.replace(/_/g, " "),
                rate: top.scholarship_probability_pct,
              },
            }));
          }
        } catch {}
      }

      // ML prediction insight
      if (gmat && schoolIds && schoolIds.length > 0) {
        try {
          const res = await apiFetch<{
            predictions: Array<{ school_id: string; probability_pct: number | null }>;
          }>("/api/ml/predict", {
            method: "POST",
            body: JSON.stringify({ school_ids: schoolIds.slice(0, 5), gmat, gpa: gpa ?? 3.5, yoe: yoe ?? 4, app_round: "R2" }),
            signal: controller.signal,
          });
          const best = res.predictions.filter((p) => p.probability_pct !== null).sort((a, b) => (b.probability_pct ?? 0) - (a.probability_pct ?? 0))[0];
          if (best && best.probability_pct) {
            setData((d) => ({
              ...d,
              ml: { top_school: best.school_id.replace(/_/g, " "), probability: best.probability_pct! },
            }));
          }
        } catch {}
      }
    }

    load();
    return () => controller.abort();
  }, [gmat, gpa, yoe, schoolIds]);

  const hasAny = data.scholarship || data.ml;
  if (!hasAny) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
      {data.scholarship && (
        <Link href="/finances?tab=scholarship-intel" className="group bg-card border border-border/50 rounded-lg p-4 hover:border-primary/20 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={14} className="text-emerald-600" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">Scholarship Chance</span>
          </div>
          <p className="text-lg font-semibold text-foreground">{data.scholarship.rate}%</p>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">Best: {data.scholarship.top_school}</p>
          <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-2">
            See all schools <ArrowRight size={10} />
          </span>
        </Link>
      )}

      {data.ml && (
        <Link href="/simulator" className="group bg-card border border-border/50 rounded-lg p-4 hover:border-primary/20 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-primary" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">ML Admit Prediction</span>
          </div>
          <p className="text-lg font-semibold text-foreground">{data.ml.probability}%</p>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">Best: {data.ml.top_school}</p>
          <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-2">
            Run full simulation <ArrowRight size={10} />
          </span>
        </Link>
      )}

      <Link href="/sprint-plan" className="group bg-card border border-border/50 rounded-lg p-4 hover:border-primary/20 transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={14} className="text-amber-500" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">Sprint Planner</span>
        </div>
        <p className="text-sm font-medium text-foreground">Build your action plan</p>
        <p className="text-xs text-muted-foreground mt-0.5">Deadlines, essays, milestones</p>
        <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-2">
          Create sprint plan <ArrowRight size={10} />
        </span>
      </Link>
    </div>
  );
}
