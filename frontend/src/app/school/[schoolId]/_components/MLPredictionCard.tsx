"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Brain, ArrowRight } from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useProfile } from "@/hooks/useProfile";

interface PredictionResult {
  school_id: string;
  probability_pct: number;
  confidence: string;
  model_stats: {
    samples: number;
    admit_rate: number;
    avg_gmat_admitted: number | null;
  };
}

export function MLPredictionCard({ schoolId }: { schoolId: string }) {
  const { profile, hasProfile } = useProfile();
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile.gmat) return;

    const controller = new AbortController();
    setLoading(true);

    apiFetch<PredictionResult>(
      `/api/ml/predict/${schoolId}?gmat=${profile.gmat}&gpa=${profile.gpa ?? 3.5}&yoe=${profile.yoe ?? 4}`,
      { signal: controller.signal }
    )
      .then(setPrediction)
      .catch(() => {}) // ML prediction is optional
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [schoolId, profile.gmat, profile.gpa, profile.yoe]);

  if (!profile.gmat || loading) return null;
  if (!prediction) return null;

  const prob = prediction.probability_pct;
  const color = prob >= 60 ? "text-emerald-600" : prob >= 35 ? "text-amber-600" : "text-red-500";
  const bg = prob >= 60 ? "bg-emerald-50 border-emerald-200" : prob >= 35 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
  const label = prob >= 60 ? "Strong Chance" : prob >= 35 ? "Competitive" : "Reach";

  return (
    <div className={`rounded-lg border p-5 ${bg} mt-4`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Brain size={14} className="text-primary" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              ML Prediction for Your Profile
            </span>
            <span className="text-[9px] px-1.5 py-0.5 bg-violet-100 text-violet-700 border border-violet-200 rounded-full font-semibold">
              ML
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className={`text-3xl font-bold ${color}`}>{prob}%</span>
            <span className={`text-sm font-medium ${color}`}>{label}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Based on your GMAT {profile.gmat}
            {profile.gpa ? `, GPA ${profile.gpa}` : ""}
            {profile.yoe ? `, ${profile.yoe} years exp` : ""}
            {" "}— trained on {prediction.model_stats.samples.toLocaleString()} real decisions.
          </p>
        </div>
        <Link
          href="/simulator"
          className="text-xs text-primary flex items-center gap-1 hover:underline shrink-0"
        >
          Full simulation <ArrowRight size={10} />
        </Link>
      </div>

      {/* Context stats */}
      <div className="flex gap-6 mt-3 pt-3 border-t border-current/10 text-xs text-muted-foreground">
        <span>
          School admit rate: <strong>{prediction.model_stats.admit_rate}%</strong>
        </span>
        {prediction.model_stats.avg_gmat_admitted && (
          <span>
            Avg GMAT (admitted): <strong>{prediction.model_stats.avg_gmat_admitted}</strong>
          </span>
        )}
        <span>
          Confidence: <strong className="capitalize">{prediction.confidence}</strong>
        </span>
      </div>
    </div>
  );
}
