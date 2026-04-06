"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────────

interface SchoolScholarshipStats {
  school_id: string;
  school_slug: string;
  school_name: string;
  total_entries: number;
  admitted_total: number;
  scholarship_entries: number;
  scholarship_rate: number;
  avg_scholarship_gmat: number | null;
  avg_admitted_gmat: number | null;
  avg_scholarship_gpa: number | null;
  avg_scholarship_yoe: number | null;
  dominant_tier: number | null;
  tier_distribution: Record<string, number>;
  top_scholarship_industries: { industry: string; count: number }[];
  top_scholarship_nationalities: { nationality: string; count: number }[];
  scholarship_data_points: number;
}

interface ScholarshipRankingsResponse {
  schools: SchoolScholarshipStats[];
  total_schools: number;
  total_data_points: number;
  tier_legend: Record<string, string>;
}

interface ProfileMatchResult {
  school_id: string;
  school_slug: string;
  school_name: string;
  scholarship_probability_pct: number;
  expected_tier: number;
  confidence: string;
  school_scholarship_rate: number;
  data_points: number;
}

interface ProfileMatchResponse {
  profile: Record<string, unknown>;
  results: ProfileMatchResult[];
  recommendation: {
    summary: string;
    top_picks: string[];
    high_probability_count: number;
    moderate_probability_count: number;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function tierLabel(tier: number): string {
  return ["None", "$", "$$", "$$$", "$$$$"][tier] ?? "?";
}

function tierColor(tier: number): string {
  return [
    "text-muted-foreground",
    "text-amber-600",
    "text-amber-500",
    "text-emerald-600",
    "text-emerald-500",
  ][tier] ?? "text-muted-foreground";
}

function confidenceBadge(confidence: string) {
  const colors: Record<string, string> = {
    high: "bg-emerald-100 text-emerald-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[confidence] ?? "bg-muted text-muted-foreground"}`}>
      {confidence}
    </span>
  );
}

function rateBar(rate: number) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[120px]">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>
      <span className="text-sm font-medium tabular-nums">{rate}%</span>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function ScholarshipIntelContent() {
  const [rankings, setRankings] = useState<ScholarshipRankingsResponse | null>(null);
  const [profileResults, setProfileResults] = useState<ProfileMatchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"rankings" | "profile">("rankings");

  // Profile form
  const [gmat, setGmat] = useState("");
  const [gpa, setGpa] = useState("");
  const [yoe, setYoe] = useState("");
  const [industry, setIndustry] = useState("");
  const [nationality, setNationality] = useState("");

  // Load rankings on mount
  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch<ScholarshipRankingsResponse>(
          "/api/scholarship-intel/schools?min_data_points=5&limit=30"
        );
        setRankings(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load scholarship data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleProfileMatch = useCallback(async () => {
    setProfileLoading(true);
    setError(null);
    try {
      const body = {
        profile: {
          ...(gmat ? { gmat: parseInt(gmat) } : {}),
          ...(gpa ? { gpa: parseFloat(gpa) } : {}),
          ...(yoe ? { years_experience: parseInt(yoe) } : {}),
          ...(industry ? { industry } : {}),
          ...(nationality ? { nationality } : {}),
        },
        school_ids: [],
      };
      const data = await apiFetch<ProfileMatchResponse>(
        "/api/scholarship-intel/profile-match",
        { method: "POST", body: JSON.stringify(body) }
      );
      setProfileResults(data);
      setView("profile");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to match profile");
    } finally {
      setProfileLoading(false);
    }
  }, [gmat, gpa, yoe, industry, nationality]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-72 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Scholarship Intelligence
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Data-driven scholarship analysis from {rankings?.total_data_points?.toLocaleString() ?? "1,600+"}
          {" "}real applicant outcomes. See which schools give the most financial aid and
          estimate your personal scholarship probability.
        </p>
      </div>

      {/* Profile Matcher */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Your Profile
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Enter your stats to see personalized scholarship probability at each school.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">GMAT</label>
            <input
              type="number"
              placeholder="720"
              value={gmat}
              onChange={(e) => setGmat(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">GPA</label>
            <input
              type="number"
              step="0.01"
              placeholder="3.5"
              value={gpa}
              onChange={(e) => setGpa(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Years Exp</label>
            <input
              type="number"
              placeholder="4"
              value={yoe}
              onChange={(e) => setYoe(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Industry</label>
            <input
              type="text"
              placeholder="Consulting"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleProfileMatch}
              disabled={profileLoading || (!gmat && !gpa)}
              className="w-full px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {profileLoading ? "Analyzing..." : "Find My Scholarships"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive text-sm px-4 py-3">
          {error}
        </div>
      )}

      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setView("rankings")}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            view === "rankings"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          School Rankings
        </button>
        {profileResults && (
          <button
            onClick={() => setView("profile")}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              view === "profile"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Your Matches
          </button>
        )}
      </div>

      {/* Rankings View */}
      {view === "rankings" && rankings && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">#</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">School</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Scholarship Rate</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Avg GMAT</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Common Tier</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Full Rides</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Data Pts</th>
                </tr>
              </thead>
              <tbody>
                {rankings.schools.map((school, i) => (
                  <tr
                    key={school.school_id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">
                        {school.school_name || school.school_id.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">{rateBar(school.scholarship_rate)}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {school.avg_scholarship_gmat ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {school.dominant_tier ? (
                        <span className={`font-semibold ${tierColor(school.dominant_tier)}`}>
                          {tierLabel(school.dominant_tier)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {school.tier_distribution.tier_4
                        ? `${school.tier_distribution.tier_4}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {school.scholarship_data_points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-muted/30 text-xs text-muted-foreground border-t border-border">
            Source: GMAT Club Decision Tracker (self-reported). Tier legend: $ = ~25% tuition,
            $$ = ~50%, $$$ = ~75%, $$$$ = full ride.
          </div>
        </div>
      )}

      {/* Profile Match View */}
      {view === "profile" && profileResults && (
        <div className="space-y-4">
          {/* Recommendation */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-medium text-foreground">
              {profileResults.recommendation.summary}
            </p>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span>
                High probability: {profileResults.recommendation.high_probability_count} schools
              </span>
              <span>
                Moderate: {profileResults.recommendation.moderate_probability_count} schools
              </span>
            </div>
          </div>

          {/* Results Table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">School</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Your Probability</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Expected Tier</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">School Rate</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {profileResults.results.map((result) => (
                    <tr
                      key={result.school_id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground">
                          {result.school_name || result.school_id.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">{rateBar(result.scholarship_probability_pct)}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${tierColor(result.expected_tier)}`}>
                          {tierLabel(result.expected_tier)}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {result.school_scholarship_rate}%
                      </td>
                      <td className="px-4 py-3">{confidenceBadge(result.confidence)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
