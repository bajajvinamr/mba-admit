"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Search, Scale, Trophy, Clock, AlertTriangle,
  Sliders, DollarSign, MapPin, Users, TrendingUp, GraduationCap,
  ChevronDown, ChevronUp, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { ToolCrossLinks } from "@/components/ToolCrossLinks";
import { EmailCapture } from "@/components/EmailCapture";

/* ── Types ─────────────────────────────────────────────────────────── */

type School = { id: string; name: string };

type SchoolData = {
  id: string;
  name: string;
  tuition_usd?: number;
  median_salary_usd?: number;
  employment_rate_pct?: number;
  location?: string;
  class_size?: number;
  acceptance_rate?: number;
};

type AdmitEntry = {
  schoolId: string;
  schoolData: SchoolData | null;
  financialAid: number;
  depositDeadline: string;
  status: "admitted" | "waitlisted";
  waitlistStrategy: string;
};

type Dimension = {
  key: string;
  label: string;
  icon: React.ReactNode;
  weight: number;
  getValue: (s: SchoolData, aid: number) => number;
  format: (v: number) => string;
  higherIsBetter: boolean;
};

const EMPTY_ENTRY: AdmitEntry = {
  schoolId: "",
  schoolData: null,
  financialAid: 0,
  depositDeadline: "",
  status: "admitted",
  waitlistStrategy: "",
};

/* ── Dimensions ───────────────────────────────────────────────────── */

const DIMENSIONS: Dimension[] = [
  {
    key: "net_cost",
    label: "Net Cost (2yr)",
    icon: <DollarSign size={16} />,
    weight: 25,
    getValue: (s, aid) => Math.max(0, (s.tuition_usd || 150000) - aid),
    format: (v) => `$${(v / 1000).toFixed(0)}k`,
    higherIsBetter: false,
  },
  {
    key: "median_salary",
    label: "Median Salary",
    icon: <TrendingUp size={16} />,
    weight: 25,
    getValue: (s) => s.median_salary_usd || 0,
    format: (v) => v ? `$${(v / 1000).toFixed(0)}k` : "N/A",
    higherIsBetter: true,
  },
  {
    key: "employment",
    label: "Employment Rate",
    icon: <Users size={16} />,
    weight: 20,
    getValue: (s) => s.employment_rate_pct || 0,
    format: (v) => v ? `${v.toFixed(0)}%` : "N/A",
    higherIsBetter: true,
  },
  {
    key: "acceptance_rate",
    label: "Selectivity",
    icon: <Trophy size={16} />,
    weight: 15,
    getValue: (s) => 100 - (s.acceptance_rate || 50),
    format: (v) => `${(100 - v).toFixed(0)}%`,
    higherIsBetter: true,
  },
  {
    key: "class_size",
    label: "Class Size",
    icon: <GraduationCap size={16} />,
    weight: 15,
    getValue: (s) => s.class_size || 0,
    format: (v) => v ? v.toFixed(0) : "N/A",
    higherIsBetter: true,
  },
];

/* ── Helpers ──────────────────────────────────────────────────────── */

function daysUntil(dateStr: string): number {
  if (!dateStr) return Infinity;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function computeWeightedScore(
  school: SchoolData,
  aid: number,
  dimensions: Dimension[],
): number {
  const totalWeight = dimensions.reduce((s, d) => s + d.weight, 0);
  if (totalWeight === 0) return 0;

  let score = 0;
  const values = dimensions.map((d) => d.getValue(school, aid));
  const maxValues = dimensions.map((d) => {
    // Use reasonable max baselines
    switch (d.key) {
      case "net_cost": return 200000;
      case "median_salary": return 200000;
      case "employment": return 100;
      case "acceptance_rate": return 100;
      case "class_size": return 1000;
      default: return 100;
    }
  });

  for (let i = 0; i < dimensions.length; i++) {
    const d = dimensions[i];
    const raw = values[i];
    const max = maxValues[i];
    const normalized = max > 0 ? raw / max : 0;
    const adjusted = d.higherIsBetter ? normalized : 1 - normalized;
    score += adjusted * (d.weight / totalWeight);
  }

  return Math.round(score * 100);
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function DecidePage() {
  const [entries, setEntries] = useState<AdmitEntry[]>([{ ...EMPTY_ENTRY }]);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [schoolResults, setSchoolResults] = useState<School[]>([]);
  const [searchingIdx, setSearchingIdx] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState(DIMENSIONS);
  const [showWeights, setShowWeights] = useState(false);

  // Search schools
  useEffect(() => {
    if (!schoolSearch.trim() || searchingIdx === null) {
      setSchoolResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch<School[]>("/api/schools?limit=10&q=" + encodeURIComponent(schoolSearch));
        setSchoolResults(Array.isArray(res) ? res : []);
      } catch {
        setSchoolResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [schoolSearch, searchingIdx]);

  async function selectSchool(idx: number, school: School) {
    try {
      const data = await apiFetch<SchoolData>(`/api/schools/${school.id}`);
      setEntries((prev) =>
        prev.map((e, i) =>
          i === idx ? { ...e, schoolId: school.id, schoolData: data } : e,
        ),
      );
    } catch {
      setEntries((prev) =>
        prev.map((e, i) =>
          i === idx
            ? { ...e, schoolId: school.id, schoolData: { id: school.id, name: school.name } }
            : e,
        ),
      );
    }
    setSchoolSearch("");
    setSearchingIdx(null);
    setSchoolResults([]);
  }

  function updateEntry(idx: number, field: keyof AdmitEntry, value: unknown) {
    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)),
    );
  }

  function removeEntry(idx: number) {
    if (entries.length > 1) setEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  function addEntry() {
    if (entries.length < 6) setEntries((prev) => [...prev, { ...EMPTY_ENTRY }]);
  }

  function updateWeight(dimKey: string, newWeight: number) {
    setDimensions((prev) =>
      prev.map((d) => (d.key === dimKey ? { ...d, weight: newWeight } : d)),
    );
  }

  // Scored entries (admitted only)
  const scored = useMemo(() => {
    return entries
      .filter((e) => e.schoolData && e.status === "admitted")
      .map((e) => ({
        ...e,
        score: computeWeightedScore(e.schoolData!, e.financialAid, dimensions),
      }))
      .sort((a, b) => b.score - a.score);
  }, [entries, dimensions]);

  const waitlisted = entries.filter((e) => e.status === "waitlisted" && e.schoolData);
  const topPick = scored[0];

  // Nearest deadline
  const nearestDeadline = entries
    .filter((e) => e.depositDeadline)
    .sort((a, b) => daysUntil(a.depositDeadline) - daysUntil(b.depositDeadline))[0];

  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-foreground text-white py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
            Decision Matrix
          </h1>
          <p className="text-white/70 text-lg">
            Compare your admits side-by-side. Set importance weights. Make a data-driven decision.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* School Entry Cards */}
        <div className="space-y-4 mb-8">
          {entries.map((entry, idx) => (
            <div key={idx} className="editorial-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Scale size={16} className="text-primary" />
                  <span className="text-sm font-semibold text-muted-foreground">
                    School {idx + 1}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={entry.status}
                    onChange={(e) => updateEntry(idx, "status", e.target.value)}
                    className="text-xs px-2 py-1 border border-border/10 rounded bg-card text-foreground"
                  >
                    <option value="admitted">Admitted</option>
                    <option value="waitlisted">Waitlisted</option>
                  </select>
                  {entries.length > 1 && (
                    <button
                      onClick={() => removeEntry(idx)}
                      className="text-muted-foreground hover:text-red-500"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {!entry.schoolData ? (
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <Search size={16} className="text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search for a school..."
                      value={searchingIdx === idx ? schoolSearch : ""}
                      onFocus={() => setSearchingIdx(idx)}
                      onChange={(e) => {
                        setSearchingIdx(idx);
                        setSchoolSearch(e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-border/10 rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                  {searchingIdx === idx && schoolResults.length > 0 && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-border/10 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {schoolResults.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => selectSchool(idx, s)}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-foreground/5 text-foreground"
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-foreground">{entry.schoolData.name}</h3>
                    <button
                      onClick={() => updateEntry(idx, "schoolData", null)}
                      className="text-xs text-muted-foreground hover:text-muted-foreground"
                    >
                      Change
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">
                        Financial Aid / Scholarship
                      </label>
                      <div className="relative">
                        <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="number"
                          placeholder="0"
                          value={entry.financialAid || ""}
                          onChange={(e) =>
                            updateEntry(idx, "financialAid", parseInt(e.target.value) || 0)
                          }
                          className="w-full pl-8 pr-3 py-2 border border-border/10 rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">
                        Deposit Deadline
                      </label>
                      <input
                        type="date"
                        value={entry.depositDeadline}
                        onChange={(e) => updateEntry(idx, "depositDeadline", e.target.value)}
                        className="w-full px-3 py-2 border border-border/10 rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none"
                      />
                    </div>
                    {entry.status === "waitlisted" && (
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">
                          Waitlist Notes
                        </label>
                        <input
                          type="text"
                          placeholder="Strategy notes..."
                          value={entry.waitlistStrategy}
                          onChange={(e) => updateEntry(idx, "waitlistStrategy", e.target.value)}
                          className="w-full px-3 py-2 border border-border/10 rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {entries.length < 6 && (
            <button
              onClick={addEntry}
              className="flex items-center gap-2 px-4 py-2.5 border border-border/10 rounded-lg text-sm font-medium text-muted-foreground hover:border-border/30 transition-colors bg-card w-full justify-center"
            >
              <Plus size={16} /> Add School
            </button>
          )}
        </div>

        {/* Deadline Countdown */}
        {nearestDeadline && daysUntil(nearestDeadline.depositDeadline) < 60 && (
          <motion.div
            className="editorial-card p-5 border-l-4 border-amber-400 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-amber-500" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Nearest Deposit Deadline:{" "}
                  {nearestDeadline.schoolData?.name || nearestDeadline.schoolId}
                </p>
                <p className="text-xs text-muted-foreground">
                  {daysUntil(nearestDeadline.depositDeadline) > 0
                    ? `${daysUntil(nearestDeadline.depositDeadline)} days remaining`
                    : "Deadline has passed!"}
                  {" - "}
                  {new Date(nearestDeadline.depositDeadline).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Weight Sliders */}
        <div className="editorial-card p-6 mb-8">
          <button
            onClick={() => setShowWeights(!showWeights)}
            className="flex items-center gap-2 w-full text-left"
          >
            <Sliders size={18} className="text-primary" />
            <h2 className="heading-serif text-xl font-[family-name:var(--font-heading)] text-foreground flex-1">
              Importance Weights
            </h2>
            {showWeights ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          <AnimatePresence>
            {showWeights && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-4 mt-4">
                  {dimensions.map((d) => (
                    <div key={d.key} className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground w-36 shrink-0 flex items-center gap-2">
                        {d.icon} {d.label}
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={50}
                        value={d.weight}
                        onChange={(e) => updateWeight(d.key, parseInt(e.target.value))}
                        className="flex-1 accent-primary"
                      />
                      <span className="text-sm font-semibold text-foreground w-10 text-right">
                        {d.weight}%
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Comparison Table */}
        {scored.length >= 2 && (
          <motion.div
            className="editorial-card p-6 mb-8"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="heading-serif text-2xl mb-6 font-[family-name:var(--font-heading)] text-foreground flex items-center gap-2">
              <Trophy size={22} className="text-primary" />
              Side-by-Side Comparison
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Dimension</th>
                    {scored.map((e) => (
                      <th
                        key={e.schoolId}
                        className="text-center py-2 px-4 text-muted-foreground font-medium min-w-[120px]"
                      >
                        {e.schoolData?.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dimensions.map((dim) => {
                    const values = scored.map((e) => dim.getValue(e.schoolData!, e.financialAid));
                    const best = dim.higherIsBetter
                      ? Math.max(...values)
                      : Math.min(...values);

                    return (
                      <tr key={dim.key} className="border-t border-border/5">
                        <td className="py-3 pr-4 text-muted-foreground flex items-center gap-2">
                          {dim.icon} {dim.label}
                        </td>
                        {scored.map((e, i) => {
                          const val = values[i];
                          const isBest = val === best && val > 0;
                          return (
                            <td
                              key={e.schoolId}
                              className={`py-3 px-4 text-center ${
                                isBest
                                  ? "bg-emerald-50 dark:bg-emerald-900/20 font-semibold text-emerald-700 dark:text-emerald-400"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {dim.format(val)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {/* Weighted Score Row */}
                  <tr className="border-t-2 border-primary/20">
                    <td className="py-3 pr-4 font-bold text-foreground">Weighted Score</td>
                    {scored.map((e) => (
                      <td
                        key={e.schoolId}
                        className={`py-3 px-4 text-center font-bold text-lg ${
                          e === topPick
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      >
                        {e.score}/100
                        {e === topPick && (
                          <span className="block text-xs text-primary/70 font-normal mt-0.5">
                            Recommended
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {scored.length === 1 && (
          <div className="editorial-card p-6 mb-8 text-center text-muted-foreground text-sm">
            Add at least 2 admitted schools to see the comparison table.
          </div>
        )}

        {/* Waitlist Section */}
        {waitlisted.length > 0 && (
          <motion.div
            className="editorial-card p-6 mb-8"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="heading-serif text-xl mb-4 font-[family-name:var(--font-heading)] text-foreground flex items-center gap-2">
              <AlertTriangle size={20} className="text-amber-500" />
              Waitlisted Schools
            </h2>
            <div className="space-y-3">
              {waitlisted.map((e) => (
                <div
                  key={e.schoolId}
                  className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg"
                >
                  <div>
                    <p className="font-semibold text-foreground text-sm">
                      {e.schoolData?.name}
                    </p>
                    {e.waitlistStrategy && (
                      <p className="text-xs text-muted-foreground mt-0.5">{e.waitlistStrategy}</p>
                    )}
                  </div>
                  <Link
                    href="/waitlist"
                    className="text-xs text-primary font-medium flex items-center gap-1"
                  >
                    Strategy Tips <ArrowRight size={12} />
                  </Link>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-foreground/[0.02] rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Waitlist tips:</strong> Send a letter of continued interest. Update the
                school on any new achievements. Visit campus if possible. Do not contact admissions
                excessively.
              </p>
            </div>
          </motion.div>
        )}

        <EmailCapture variant="contextual" source="decision-matrix" />
        <ToolCrossLinks current="/decide" />
      </div>
    </main>
  );
}
