"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XCircle, Search, AlertTriangle, ChevronRight, Loader2,
  Target, RotateCcw, ArrowRight, School,
} from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { track } from "@/lib/analytics";

/* ── Types ─────────────────────────────────────────────────────────── */

type LikelyReason = {
  reason: string;
  probability: "high" | "medium" | "low";
  detail: string;
};

type ReapplyAction = {
  action: string;
  priority: number;
  detail: string;
};

type AltSchool = {
  slug: string;
  name: string;
  why: string;
};

type DingResult = {
  likely_reasons: LikelyReason[];
  if_reapplying: ReapplyAction[];
  alternative_schools: AltSchool[];
  reapplication_timing: string;
};

type SchoolOption = { id: string; name: string };

/* ── Constants ─────────────────────────────────────────────────────── */

const ROUNDS = ["R1", "R2", "R3", "ED", "Rolling"];

const INDUSTRIES = [
  "Consulting", "Finance / IB", "Tech / Software", "Healthcare",
  "Energy", "Nonprofit", "Military", "Government", "Real Estate",
  "Manufacturing", "Retail / CPG", "Media / Entertainment",
  "Education", "Legal", "PE / VC", "Other",
];

/* ── Component ─────────────────────────────────────────────────────── */

export default function DingAnalysisPage() {
  const [schoolSearch, setSchoolSearch] = useState("");
  const [schoolResults, setSchoolResults] = useState<SchoolOption[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<SchoolOption | null>(null);
  const [round, setRound] = useState("R1");

  const [profile, setProfile] = useState({
    gmat: "",
    gpa: "",
    gpa_scale: "4.0",
    industry: "",
    years_experience: "",
    undergrad_tier: "",
    leadership_roles: "",
    intl_experience: false,
    community_service: false,
    career_goal: "",
    nationality: "",
  });
  const [essaySummary, setEssaySummary] = useState("");

  const [result, setResult] = useState<DingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // School search
  useEffect(() => {
    if (!schoolSearch.trim()) { setSchoolResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch<SchoolOption[]>(
          "/api/schools?limit=8&q=" + encodeURIComponent(schoolSearch)
        );
        setSchoolResults(Array.isArray(res) ? res : []);
      } catch {
        setSchoolResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [schoolSearch]);

  function updateProfile(field: string, value: string | boolean) {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSchool) { setError("Please select a school."); return; }
    if (!profile.gpa || !profile.industry || !profile.years_experience) {
      setError("GPA, industry, and years of experience are required.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    track("ding_analysis_submit", { school: selectedSchool.id, round });

    try {
      const payload = {
        school_slug: selectedSchool.id,
        round,
        profile: {
          gmat: profile.gmat ? parseInt(profile.gmat) : null,
          gpa: parseFloat(profile.gpa),
          gpa_scale: profile.gpa_scale,
          industry: profile.industry,
          years_experience: parseInt(profile.years_experience),
          undergrad_tier: profile.undergrad_tier,
          leadership_roles: profile.leadership_roles,
          intl_experience: profile.intl_experience,
          community_service: profile.community_service,
          career_goal: profile.career_goal,
          nationality: profile.nationality,
        },
        essay_summary: essaySummary || undefined,
      };
      const data = await apiFetch<DingResult>("/api/profile/ding-analysis", {
        method: "POST",
        body: JSON.stringify(payload),
        timeoutMs: 60_000,
      });
      setResult(data);
      track("ding_analysis_result", { school: selectedSchool.id, reasons: data.likely_reasons.length });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const probColor = (p: string) => {
    if (p === "high") return "bg-red-100 text-red-800 border-red-200";
    if (p === "medium") return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-blue-100 text-blue-800 border-blue-200";
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-foreground text-white py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
            Ding Analysis
          </h1>
          <p className="text-white/70 text-lg">
            Understand why you were rejected and build a reapplication strategy.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* School + Round */}
            <div className="editorial-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">School & Round</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="relative">
                  <label className="text-xs text-muted-foreground block mb-1">School *</label>
                  {selectedSchool ? (
                    <div className="flex items-center justify-between px-3 py-2 border border-border/10 rounded-lg bg-card">
                      <span className="text-sm font-medium text-foreground">{selectedSchool.name}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedSchool(null)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Search size={14} className="text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search for the school that dinged you..."
                          value={schoolSearch}
                          onChange={(e) => setSchoolSearch(e.target.value)}
                          className="w-full px-3 py-2 border border-border/10 rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                      {schoolResults.length > 0 && (
                        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-border/10 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {schoolResults.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setSelectedSchool(s);
                                setSchoolSearch("");
                                setSchoolResults([]);
                              }}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-foreground/5 text-foreground"
                            >
                              {s.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Round *</label>
                  <select
                    value={round}
                    onChange={(e) => setRound(e.target.value)}
                    className="w-full px-3 py-2 border border-border/10 rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none"
                  >
                    {ROUNDS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Profile */}
            <div className="editorial-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Your Profile</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">GMAT</label>
                  <input
                    type="number"
                    placeholder="730"
                    value={profile.gmat}
                    onChange={(e) => updateProfile("gmat", e.target.value)}
                    className="w-full px-3 py-2 border border-border/10 rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">GPA *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="3.5"
                    value={profile.gpa}
                    onChange={(e) => updateProfile("gpa", e.target.value)}
                    className="w-full px-3 py-2 border border-border/10 rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Industry *</label>
                  <select
                    value={profile.industry}
                    onChange={(e) => updateProfile("industry", e.target.value)}
                    className="w-full px-3 py-2 border border-border/10 rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none"
                    required
                  >
                    <option value="">Select</option>
                    {INDUSTRIES.map((i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Years Experience *</label>
                  <input
                    type="number"
                    placeholder="5"
                    value={profile.years_experience}
                    onChange={(e) => updateProfile("years_experience", e.target.value)}
                    className="w-full px-3 py-2 border border-border/10 rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Nationality</label>
                  <input
                    type="text"
                    placeholder="e.g., Indian"
                    value={profile.nationality}
                    onChange={(e) => updateProfile("nationality", e.target.value)}
                    className="w-full px-3 py-2 border border-border/10 rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Career Goal</label>
                  <input
                    type="text"
                    placeholder="Post-MBA goal"
                    value={profile.career_goal}
                    onChange={(e) => updateProfile("career_goal", e.target.value)}
                    className="w-full px-3 py-2 border border-border/10 rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </div>

            {/* Essay Summary */}
            <div className="editorial-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-2">What happened?</h2>
              <p className="text-xs text-muted-foreground mb-3">
                Optional: summarize your essays or any context about your application.
              </p>
              <textarea
                placeholder="Briefly describe your essays, interview experience, or anything you think might have affected the outcome..."
                value={essaySummary}
                onChange={(e) => setEssaySummary(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-border/10 rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none resize-none placeholder:text-muted-foreground"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-foreground text-white rounded-lg font-semibold text-sm hover:bg-foreground/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Analyzing rejection...
                </>
              ) : (
                <>
                  <XCircle size={18} />
                  Analyze My Ding
                </>
              )}
            </button>
          </form>
        ) : (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Likely Reasons */}
              <div className="editorial-card p-6">
                <h2 className="heading-serif text-xl mb-4 font-[family-name:var(--font-heading)] text-foreground flex items-center gap-2">
                  <AlertTriangle size={20} className="text-red-500" />
                  Likely Rejection Reasons
                </h2>
                <div className="space-y-3">
                  {result.likely_reasons
                    .sort((a, b) => {
                      const order = { high: 0, medium: 1, low: 2 };
                      return order[a.probability] - order[b.probability];
                    })
                    .map((r, i) => (
                      <div key={i} className={`p-4 border rounded-lg ${probColor(r.probability)}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold">{r.reason}</span>
                          <span className="text-[10px] uppercase font-bold opacity-60">
                            {r.probability} likelihood
                          </span>
                        </div>
                        <p className="text-xs">{r.detail}</p>
                      </div>
                    ))}
                </div>
              </div>

              {/* If Reapplying */}
              <div className="editorial-card p-6">
                <h2 className="heading-serif text-xl mb-4 font-[family-name:var(--font-heading)] text-foreground flex items-center gap-2">
                  <RotateCcw size={20} className="text-primary" />
                  If Reapplying
                </h2>
                <p className="text-sm text-muted-foreground mb-4">{result.reapplication_timing}</p>
                <div className="space-y-3">
                  {result.if_reapplying
                    .sort((a, b) => a.priority - b.priority)
                    .map((a, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-foreground/[0.02] rounded-lg">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                          {a.priority}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{a.action}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{a.detail}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Alternative Schools */}
              <div className="editorial-card p-6">
                <h2 className="heading-serif text-xl mb-4 font-[family-name:var(--font-heading)] text-foreground flex items-center gap-2">
                  <School size={20} className="text-primary" />
                  Alternative Schools to Consider
                </h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {result.alternative_schools.map((s, i) => (
                    <Link
                      key={i}
                      href={`/school/${s.slug}`}
                      className="p-4 bg-foreground/[0.02] rounded-lg hover:bg-foreground/[0.04] transition-colors group"
                    >
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                        {s.name} <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.why}</p>
                    </Link>
                  ))}
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => { setResult(null); setError(""); }}
                  className="px-4 py-2 border border-border/10 rounded-lg text-sm font-medium text-foreground hover:bg-foreground/5 transition-colors"
                >
                  Analyze Another School
                </button>
                <Link
                  href="/profile-review"
                  className="px-4 py-2 bg-foreground text-white rounded-lg text-sm font-medium hover:bg-foreground/90 transition-colors flex items-center gap-1"
                >
                  Profile Review <ArrowRight size={14} />
                </Link>
                <Link
                  href="/strategy"
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1"
                >
                  Build Reapplication Strategy <ArrowRight size={14} />
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </main>
  );
}
