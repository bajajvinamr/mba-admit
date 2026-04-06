"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserCheck, AlertTriangle, TrendingUp, Shield,
  Loader2, ChevronRight, Target, Zap, Eye,
} from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { track } from "@/lib/analytics";

/* ── Types ─────────────────────────────────────────────────────────── */

type Strength = { area: string; detail: string };
type Weakness = { area: string; detail: string; severity: "critical" | "moderate" | "minor" };
type ReviewResult = {
  honest_assessment: string;
  strengths: Strength[];
  weaknesses: Weakness[];
  realistic_odds: { m7: string; t15: string; t25: string };
  game_changers: string[];
  archetype: string;
  overrepresented: boolean;
  bottom_line: string;
};

/* ── Constants ─────────────────────────────────────────────────────── */

const INDUSTRIES = [
  "Consulting", "Finance / IB", "Tech / Software", "Healthcare",
  "Energy", "Nonprofit", "Military", "Government", "Real Estate",
  "Manufacturing", "Retail / CPG", "Media / Entertainment",
  "Education", "Legal", "PE / VC", "Other",
];

const UNDERGRAD_TIERS = [
  "Ivy League / Top 10", "Top 25", "Top 50", "Top 100",
  "Regional / State School", "International Top Tier", "International Mid-Tier",
];

/* ── Component ─────────────────────────────────────────────────────── */

export default function ProfileReviewPage() {
  const [form, setForm] = useState({
    gmat: "",
    gpa: "",
    gpa_scale: "4.0",
    industry: "",
    years_experience: "",
    undergrad_tier: "",
    undergrad_major: "",
    leadership_roles: "",
    intl_experience: false,
    community_service: false,
    career_goal: "",
    nationality: "",
    gender: "",
    work_company_type: "",
    extracurriculars: "",
  });
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.gpa || !form.industry || !form.years_experience) {
      setError("GPA, industry, and years of experience are required.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    track("profile_review_submit", { gmat: form.gmat, industry: form.industry });

    try {
      const payload = {
        gmat: form.gmat ? parseInt(form.gmat) : null,
        gpa: parseFloat(form.gpa),
        gpa_scale: form.gpa_scale,
        industry: form.industry,
        years_experience: parseInt(form.years_experience),
        undergrad_tier: form.undergrad_tier,
        undergrad_major: form.undergrad_major,
        leadership_roles: form.leadership_roles,
        intl_experience: form.intl_experience,
        community_service: form.community_service,
        career_goal: form.career_goal,
        nationality: form.nationality,
        gender: form.gender,
        work_company_type: form.work_company_type,
        extracurriculars: form.extracurriculars,
      };
      const data = await apiFetch<ReviewResult>("/api/profile/honest-review", {
        method: "POST",
        body: JSON.stringify(payload),
        timeoutMs: 60_000,
      });
      setResult(data);
      track("profile_review_result", { archetype: data.archetype, overrepresented: data.overrepresented });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const severityColor = (s: string) => {
    if (s === "critical") return "bg-red-100 text-red-800 border-red-200";
    if (s === "moderate") return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-blue-100 text-blue-800 border-blue-200";
  };

  const severityLabel = (s: string) => {
    if (s === "critical") return "Critical";
    if (s === "moderate") return "Moderate";
    return "Minor";
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-foreground text-white py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
            Honest Profile Assessment
          </h1>
          <p className="text-white/70 text-lg">
            No sugarcoating. Get a brutally honest evaluation of your MBA candidacy.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Stats Row */}
            <div className="editorial-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Academic & Test Scores</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">GMAT / GRE Score</label>
                  <input
                    type="number"
                    placeholder="730"
                    value={form.gmat}
                    onChange={(e) => updateField("gmat", e.target.value)}
                    className="w-full px-3 py-2 border border-border/10 rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">GPA *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="3.5"
                    value={form.gpa}
                    onChange={(e) => updateField("gpa", e.target.value)}
                    className="w-full px-3 py-2 border border-border/10 rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">GPA Scale</label>
                  <select
                    value={form.gpa_scale}
                    onChange={(e) => updateField("gpa_scale", e.target.value)}
                    className="w-full px-3 py-2 border border-border/10 rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none"
                  >
                    <option value="4.0">4.0 Scale</option>
                    <option value="10.0">10.0 Scale</option>
                    <option value="5.0">5.0 Scale</option>
                    <option value="percentage">Percentage</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Professional Background */}
            <div className="editorial-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Professional Background</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Industry *</label>
                  <select
                    value={form.industry}
                    onChange={(e) => updateField("industry", e.target.value)}
                    className="w-full px-3 py-2 border border-border/10 rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none"
                    required
                  >
                    <option value="">Select industry</option>
                    {INDUSTRIES.map((i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Years of Experience *</label>
                  <input
                    type="number"
                    placeholder="5"
                    value={form.years_experience}
                    onChange={(e) => updateField("years_experience", e.target.value)}
                    className="w-full px-3 py-2 border border-border/10 rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Company Type</label>
                  <input
                    type="text"
                    placeholder="MBB, Big 4, FAANG, Startup..."
                    value={form.work_company_type}
                    onChange={(e) => updateField("work_company_type", e.target.value)}
                    className="w-full px-3 py-2 border border-border/10 rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Nationality</label>
                  <input
                    type="text"
                    placeholder="e.g., Indian, American..."
                    value={form.nationality}
                    onChange={(e) => updateField("nationality", e.target.value)}
                    className="w-full px-3 py-2 border border-border/10 rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </div>

            {/* Education & Profile */}
            <div className="editorial-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Education & Profile</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Undergrad Tier</label>
                  <select
                    value={form.undergrad_tier}
                    onChange={(e) => updateField("undergrad_tier", e.target.value)}
                    className="w-full px-3 py-2 border border-border/10 rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none"
                  >
                    <option value="">Select tier</option>
                    {UNDERGRAD_TIERS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Major</label>
                  <input
                    type="text"
                    placeholder="Economics, Engineering..."
                    value={form.undergrad_major}
                    onChange={(e) => updateField("undergrad_major", e.target.value)}
                    className="w-full px-3 py-2 border border-border/10 rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Gender</label>
                  <select
                    value={form.gender}
                    onChange={(e) => updateField("gender", e.target.value)}
                    className="w-full px-3 py-2 border border-border/10 rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-6 mt-4">
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.intl_experience}
                    onChange={(e) => updateField("intl_experience", e.target.checked)}
                    className="rounded border-border/30 text-primary focus:ring-primary/50"
                  />
                  International experience
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.community_service}
                    onChange={(e) => updateField("community_service", e.target.checked)}
                    className="rounded border-border/30 text-primary focus:ring-primary/50"
                  />
                  Community service
                </label>
              </div>
            </div>

            {/* Narrative */}
            <div className="editorial-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Story & Goals</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Career Goal</label>
                  <textarea
                    placeholder="What do you want to do post-MBA? Be specific."
                    value={form.career_goal}
                    onChange={(e) => updateField("career_goal", e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-border/10 rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none resize-none placeholder:text-muted-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Leadership Roles</label>
                  <textarea
                    placeholder="List key leadership positions and impact..."
                    value={form.leadership_roles}
                    onChange={(e) => updateField("leadership_roles", e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-border/10 rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none resize-none placeholder:text-muted-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Extracurriculars</label>
                  <textarea
                    placeholder="Hobbies, volunteer work, personal projects..."
                    value={form.extracurriculars}
                    onChange={(e) => updateField("extracurriculars", e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-border/10 rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none resize-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>
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
                  Analyzing your profile...
                </>
              ) : (
                <>
                  <Eye size={18} />
                  Get Honest Assessment
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
              {/* Archetype + Bottom Line */}
              <div className="editorial-card p-6 border-l-4 border-primary">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck size={20} className="text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                    Your Archetype
                  </span>
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">{result.archetype}</h2>
                {result.overrepresented && (
                  <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full font-medium mb-3">
                    Overrepresented Pool
                  </span>
                )}
                <p className="text-foreground/80 text-sm leading-relaxed whitespace-pre-line">
                  {result.honest_assessment}
                </p>
                <div className="mt-4 p-3 bg-foreground/[0.03] rounded-lg">
                  <p className="text-sm font-semibold text-foreground">
                    Bottom Line: <span className="font-normal">{result.bottom_line}</span>
                  </p>
                </div>
              </div>

              {/* Realistic Odds */}
              <div className="editorial-card p-6">
                <h2 className="heading-serif text-xl mb-4 font-[family-name:var(--font-heading)] text-foreground flex items-center gap-2">
                  <Target size={20} className="text-primary" />
                  Realistic Odds
                </h2>
                <div className="grid gap-4 md:grid-cols-3">
                  {(["m7", "t15", "t25"] as const).map((tier) => {
                    const label = tier === "m7" ? "M7" : tier === "t15" ? "T15" : "T25";
                    const odds = result.realistic_odds[tier];
                    const numericOdds = parseInt(odds);
                    const barColor = numericOdds >= 50
                      ? "bg-emerald-500"
                      : numericOdds >= 25
                        ? "bg-amber-500"
                        : "bg-red-500";
                    return (
                      <div key={tier} className="p-4 bg-foreground/[0.02] rounded-lg">
                        <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
                        <p className="text-2xl font-bold text-foreground">{odds}</p>
                        <div className="mt-2 h-2 bg-foreground/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor} transition-all`}
                            style={{ width: `${Math.min(numericOdds || 30, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Strengths & Weaknesses Grid */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="editorial-card p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Shield size={18} className="text-emerald-600" />
                    Strengths
                  </h3>
                  <div className="space-y-3">
                    {result.strengths.map((s, i) => (
                      <div key={i} className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <p className="text-sm font-semibold text-emerald-800">{s.area}</p>
                        <p className="text-xs text-emerald-700 mt-0.5">{s.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="editorial-card p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-red-500" />
                    Weaknesses
                  </h3>
                  <div className="space-y-3">
                    {result.weaknesses.map((w, i) => (
                      <div key={i} className={`p-3 border rounded-lg ${severityColor(w.severity)}`}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold">{w.area}</p>
                          <span className="text-[10px] uppercase font-bold opacity-70">
                            {severityLabel(w.severity)}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5">{w.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Game Changers */}
              <div className="editorial-card p-6">
                <h2 className="heading-serif text-xl mb-4 font-[family-name:var(--font-heading)] text-foreground flex items-center gap-2">
                  <Zap size={20} className="text-primary" />
                  Game Changers
                </h2>
                <p className="text-xs text-muted-foreground mb-3">
                  Prioritized actions that would most improve your chances, biggest levers first.
                </p>
                <ol className="space-y-2">
                  {result.game_changers.map((gc, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 p-3 bg-foreground/[0.02] rounded-lg"
                    >
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <p className="text-sm text-foreground">{gc}</p>
                    </li>
                  ))}
                </ol>
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => { setResult(null); setError(""); }}
                  className="px-4 py-2 border border-border/10 rounded-lg text-sm font-medium text-foreground hover:bg-foreground/5 transition-colors"
                >
                  Review Another Profile
                </button>
                <Link
                  href="/ding-analysis"
                  className="px-4 py-2 bg-foreground text-white rounded-lg text-sm font-medium hover:bg-foreground/90 transition-colors flex items-center gap-1"
                >
                  Ding Analysis <ChevronRight size={14} />
                </Link>
                <Link
                  href="/recommendations"
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1"
                >
                  Get School Recs <ChevronRight size={14} />
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </main>
  );
}
