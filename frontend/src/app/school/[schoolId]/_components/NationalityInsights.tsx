"use client";

import { useEffect, useState } from "react";
import { Globe, Users, TrendingUp } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

interface ScholarshipData {
  school_id: string;
  scholarship_rate: number;
  avg_scholarship_gmat: number | null;
  tier_distribution: Record<string, number>;
  scholarship_entries: number;
  top_scholarship_nationalities: Array<{ nationality: string; count: number }>;
}

interface NationalityData {
  nationality: string;
  applicants: number;
  admit_rate: number;
}

export function NationalityInsights({ schoolId }: { schoolId: string }) {
  const [nationalities, setNationalities] = useState<NationalityData[]>([]);
  const [scholarship, setScholarship] = useState<ScholarshipData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      // Fetch scholarship data for this school
      try {
        const res = await apiFetch<{ school: ScholarshipData }>(
          `/api/scholarship-intel/school/${schoolId}`,
          { signal: controller.signal }
        );
        setScholarship(res.school);

        // Extract nationality data from scholarship insights
        if (res.school.top_scholarship_nationalities?.length > 0) {
          setNationalities(
            res.school.top_scholarship_nationalities.map((n) => ({
              nationality: n.nationality,
              applicants: n.count,
              admit_rate: 0, // We don't have per-nationality admit rate from this endpoint
            }))
          );
        }
      } catch {
        // Scholarship data not available for this school
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [schoolId]);

  if (loading || (!scholarship && nationalities.length === 0)) return null;

  return (
    <div className="bg-card border border-border/50 rounded-lg p-5 mt-4">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <Globe size={14} className="text-primary" />
        Data-Driven Insights
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Scholarship rate */}
        {scholarship && scholarship.scholarship_entries > 0 && (
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-2xl font-semibold text-foreground">{scholarship.scholarship_rate}%</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">of admits get scholarships</p>
            <p className="text-[10px] text-muted-foreground/50 mt-1">
              Based on {scholarship.scholarship_entries} reports
            </p>
          </div>
        )}

        {/* Avg GMAT for scholarship */}
        {scholarship?.avg_scholarship_gmat && (
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-2xl font-semibold text-foreground">{scholarship.avg_scholarship_gmat}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Avg GMAT for scholarship</p>
            <p className="text-[10px] text-muted-foreground/50 mt-1">
              Score above this for better odds
            </p>
          </div>
        )}

        {/* Top tier distribution */}
        {scholarship?.tier_distribution && Object.keys(scholarship.tier_distribution).length > 0 && (
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-2xl font-semibold text-foreground">
              {scholarship.tier_distribution.tier_4
                ? `${scholarship.tier_distribution.tier_4}%`
                : scholarship.tier_distribution.tier_2
                  ? `${scholarship.tier_distribution.tier_2}%`
                  : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {scholarship.tier_distribution.tier_4 ? "get full rides" : "get half tuition"}
            </p>
          </div>
        )}
      </div>

      {/* Nationality breakdown */}
      {nationalities.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border/30">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Top nationalities receiving scholarships
          </p>
          <div className="flex flex-wrap gap-2">
            {nationalities.slice(0, 6).map((n) => (
              <span
                key={n.nationality}
                className="text-xs px-2.5 py-1 bg-muted/50 text-muted-foreground rounded-full"
              >
                {n.nationality} ({n.applicants})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
