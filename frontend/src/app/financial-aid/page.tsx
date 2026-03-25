"use client";

import { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  Plus,
  X,
  Calculator,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Copy,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type School = { id: string; name: string };

type ScholarshipEntry = {
  schoolId: string;
  amount: number;
};

type ComparisonResult = {
  school_id: string;
  name: string;
  country: string;
  tuition: number;
  scholarship: number;
  net_tuition: number;
  living_estimate: number;
  total_cost: number;
  program_years: number;
  median_salary: number;
  roi: {
    total_investment: number;
    annual_salary_gain: number;
    cumulative_10yr_gain: number;
    net_roi: number;
    roi_percentage: number;
    payback_years: number | null;
  };
};

type NegotiationGuide = {
  can_negotiate: boolean;
  best_timing: string;
  steps: string[];
  email_template: string;
  timing_advice: string[];
};

type CompareResponse = {
  comparisons: ComparisonResult[];
  errors: Array<{ school_id: string; error: string }> | null;
  negotiation_guide: NegotiationGuide;
};

function formatUsd(val: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);
}

export default function FinancialAidPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [entries, setEntries] = useState<ScholarshipEntry[]>([
    { schoolId: "", amount: 0 },
    { schoolId: "", amount: 0 },
  ]);
  const [currentSalary, setCurrentSalary] = useState<number>(80000);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    track("financial_aid_viewed");
    apiFetch<School[]>("/api/schools/names")
      .then((data) => setSchools(data))
      .catch(console.error);
  }, []);

  const addSchool = () => {
    if (entries.length < 4) {
      setEntries([...entries, { schoolId: "", amount: 0 }]);
    }
  };

  const removeSchool = (index: number) => {
    if (entries.length > 2) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const updateEntry = (
    index: number,
    field: keyof ScholarshipEntry,
    value: string | number,
  ) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };
    setEntries(updated);
  };

  const canCompare =
    entries.filter((e) => e.schoolId).length >= 2 && !loading;

  const handleCompare = async () => {
    setError(null);
    setLoading(true);
    try {
      const validEntries = entries.filter((e) => e.schoolId);
      const data = await apiFetch<CompareResponse>("/api/financial-aid/compare", {
        method: "POST",
        body: JSON.stringify({
          schools: validEntries.map((e) => ({
            school_id: e.schoolId,
            scholarship_amount: e.amount,
          })),
          current_salary: currentSalary,
        }),
      });
      setResult(data);
      track("financial_aid_compared", { school_count: validEntries.length });
    } catch (e) {
      console.error(e);
      setError("Failed to compare. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const bestRoi = result?.comparisons.reduce((best, c) =>
    c.roi.roi_percentage > (best?.roi.roi_percentage ?? -Infinity) ? c : best,
  );

  const lowestCost = result?.comparisons.reduce((best, c) =>
    c.total_cost < (best?.total_cost ?? Infinity) ? c : best,
  );

  return (
    <div className="min-h-screen bg-background py-20 px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/20 text-foreground font-bold uppercase tracking-widest text-[10px] mb-6 border border-primary/30">
            <DollarSign size={12} /> Financial Aid Comparison
          </div>
          <h1 className="heading-serif text-5xl text-foreground mb-4">
            Scholarship & Financial Aid Comparison
          </h1>
          <p className="text-muted-foreground/60 text-lg max-w-2xl">
            Compare net costs across your admitted schools. Enter your
            scholarship offers, and we will calculate total cost, 10-year ROI,
            and help you negotiate better packages.
          </p>
        </div>

        {/* ── School Picker ──────────────────────────────────────── */}
        <section className="bg-card border border-border/10 p-8 mb-8">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-6 flex items-center gap-2">
            <Calculator size={14} /> Select 2-4 Admitted Schools
          </h2>

          <div className="space-y-4">
            {entries.map((entry, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-[1fr_200px_40px] gap-3 items-end"
              >
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">
                    School {idx + 1}
                  </label>
                  <select
                    value={entry.schoolId}
                    onChange={(e) =>
                      updateEntry(idx, "schoolId", e.target.value)
                    }
                    className="w-full border border-border/15 px-3 py-2.5 text-sm focus:border-primary focus:outline-none bg-background"
                  >
                    <option value="">Select a school...</option>
                    {schools.slice(0, 150).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">
                    Scholarship ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={entry.amount || ""}
                    onChange={(e) =>
                      updateEntry(
                        idx,
                        "amount",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    placeholder="0"
                    className="w-full border border-border/15 px-3 py-2.5 text-sm focus:border-primary focus:outline-none bg-background"
                  />
                </div>
                <div>
                  {entries.length > 2 && (
                    <button
                      onClick={() => removeSchool(idx)}
                      className="text-muted-foreground/30 hover:text-red-500 transition-colors p-2"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 mt-6">
            {entries.length < 4 && (
              <button
                onClick={addSchool}
                className="text-xs font-bold text-primary hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Plus size={14} /> Add School
              </button>
            )}

            <div className="ml-auto flex items-center gap-3">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">
                  Current Salary ($)
                </label>
                <input
                  type="number"
                  min={0}
                  step={5000}
                  value={currentSalary || ""}
                  onChange={(e) =>
                    setCurrentSalary(parseFloat(e.target.value) || 0)
                  }
                  className="w-36 border border-border/15 px-3 py-2.5 text-sm focus:border-primary focus:outline-none bg-background"
                />
              </div>
              <button
                onClick={handleCompare}
                disabled={!canCompare}
                className="bg-foreground text-white font-bold uppercase tracking-widest text-xs px-6 py-3 hover:bg-primary transition-colors disabled:opacity-40 mt-4"
              >
                {loading ? "Comparing..." : "Compare"}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-sm mt-4">{error}</p>
          )}
        </section>

        {/* ── Comparison Results ──────────────────────────────────── */}
        {result && result.comparisons.length > 0 && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {lowestCost && (
                <div className="bg-card border border-border/10 p-6">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">
                    Lowest Total Cost
                  </p>
                  <p className="text-2xl heading-serif text-foreground">
                    {lowestCost.name}
                  </p>
                  <p className="text-primary font-bold text-lg">
                    {formatUsd(lowestCost.total_cost)}
                  </p>
                </div>
              )}
              {bestRoi && (
                <div className="bg-card border border-border/10 p-6">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">
                    Best 10-Year ROI
                  </p>
                  <p className="text-2xl heading-serif text-foreground">
                    {bestRoi.name}
                  </p>
                  <p className="text-emerald-600 font-bold text-lg">
                    {bestRoi.roi.roi_percentage > 0 ? "+" : ""}
                    {bestRoi.roi.roi_percentage}%
                  </p>
                </div>
              )}
            </div>

            {/* Comparison Table */}
            <div className="bg-card border border-border/10 overflow-x-auto mb-8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 border-b border-border/10">
                    <th className="text-left p-4">School</th>
                    <th className="text-right p-4">Tuition</th>
                    <th className="text-right p-4">Scholarship</th>
                    <th className="text-right p-4">Net Tuition</th>
                    <th className="text-right p-4">Living</th>
                    <th className="text-right p-4 font-extrabold">
                      Total Cost
                    </th>
                    <th className="text-right p-4">Post-MBA Salary</th>
                    <th className="text-right p-4">10yr ROI</th>
                    <th className="text-right p-4">Payback</th>
                  </tr>
                </thead>
                <tbody>
                  {result.comparisons.map((c) => {
                    const isBestRoi =
                      c.school_id === bestRoi?.school_id;
                    const isLowest =
                      c.school_id === lowestCost?.school_id;
                    return (
                      <tr
                        key={c.school_id}
                        className={cn(
                          "border-b border-border/5 hover:bg-foreground/[0.02]",
                          isBestRoi && "bg-emerald-50/30",
                        )}
                      >
                        <td className="p-4 font-bold text-foreground">
                          {c.name}
                          {isLowest && (
                            <span className="ml-2 text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full font-bold uppercase">
                              Lowest
                            </span>
                          )}
                          {isBestRoi && !isLowest && (
                            <span className="ml-2 text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold uppercase">
                              Best ROI
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right text-muted-foreground/60">
                          {formatUsd(c.tuition)}
                        </td>
                        <td className="p-4 text-right text-emerald-600 font-medium">
                          {c.scholarship > 0
                            ? `-${formatUsd(c.scholarship)}`
                            : "—"}
                        </td>
                        <td className="p-4 text-right text-foreground">
                          {formatUsd(c.net_tuition)}
                        </td>
                        <td className="p-4 text-right text-muted-foreground/60">
                          {formatUsd(c.living_estimate)}
                        </td>
                        <td className="p-4 text-right font-bold text-foreground">
                          {formatUsd(c.total_cost)}
                        </td>
                        <td className="p-4 text-right text-foreground">
                          {formatUsd(c.median_salary)}
                        </td>
                        <td
                          className={cn(
                            "p-4 text-right font-bold",
                            c.roi.roi_percentage >= 0
                              ? "text-emerald-600"
                              : "text-red-600",
                          )}
                        >
                          {c.roi.roi_percentage > 0 ? "+" : ""}
                          {c.roi.roi_percentage}%
                        </td>
                        <td className="p-4 text-right text-muted-foreground/60">
                          {c.roi.payback_years
                            ? `${c.roi.payback_years}yr`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── 10-Year ROI Detail ──────────────────────────────── */}
            <div className="bg-card border border-border/10 p-8 mb-8">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-6 flex items-center gap-2">
                <TrendingUp size={14} /> 10-Year ROI Breakdown
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {result.comparisons.map((c) => (
                  <div
                    key={c.school_id}
                    className="border border-border/10 p-5"
                  >
                    <p className="font-bold text-foreground text-sm mb-3">
                      {c.name}
                    </p>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground/50">
                          Total Investment
                        </span>
                        <span className="text-foreground font-medium">
                          {formatUsd(c.roi.total_investment)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground/50">
                          Annual Salary Gain
                        </span>
                        <span className="text-emerald-600 font-medium">
                          +{formatUsd(c.roi.annual_salary_gain)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground/50">
                          10yr Cumulative Gain
                        </span>
                        <span className="text-foreground font-medium">
                          {formatUsd(c.roi.cumulative_10yr_gain)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-border/10 pt-2">
                        <span className="text-muted-foreground/50 font-bold">
                          Net ROI
                        </span>
                        <span
                          className={cn(
                            "font-bold",
                            c.roi.net_roi >= 0
                              ? "text-emerald-600"
                              : "text-red-600",
                          )}
                        >
                          {formatUsd(c.roi.net_roi)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Scholarship Negotiation Guide ───────────────────── */}
            <div className="bg-card border border-border/10 mb-8">
              <button
                onClick={() => setShowGuide(!showGuide)}
                className="w-full flex items-center justify-between px-8 py-5 hover:bg-foreground/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <BookOpen size={18} className="text-primary" />
                  <span className="font-display text-lg font-bold">
                    Scholarship Negotiation Guide
                  </span>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold uppercase">
                    Yes, you can negotiate
                  </span>
                </div>
                {showGuide ? (
                  <ChevronUp
                    size={18}
                    className="text-muted-foreground/40"
                  />
                ) : (
                  <ChevronDown
                    size={18}
                    className="text-muted-foreground/40"
                  />
                )}
              </button>

              {showGuide && result.negotiation_guide && (
                <div className="px-8 pb-8 border-t border-border/5 space-y-8">
                  {/* Steps */}
                  <div className="mt-6">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-4">
                      Step-by-Step Guide
                    </h4>
                    <ol className="space-y-3">
                      {result.negotiation_guide.steps.map(
                        (step, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-3 text-sm"
                          >
                            <span className="w-5 h-5 rounded-full bg-foreground text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="text-muted-foreground/70">
                              {step}
                            </span>
                          </li>
                        ),
                      )}
                    </ol>
                  </div>

                  {/* Email Template */}
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-4">
                      Email Template for Negotiation
                    </h4>
                    <pre className="bg-background/50 border border-border/10 p-6 text-sm text-foreground leading-relaxed whitespace-pre-wrap font-display">
                      {result.negotiation_guide.email_template}
                    </pre>
                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(
                          result.negotiation_guide.email_template,
                        )
                      }
                      className="mt-3 text-[10px] font-bold uppercase tracking-widest text-primary hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      <Copy size={12} /> Copy Template
                    </button>
                  </div>

                  {/* Timing Advice */}
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-4">
                      Timing Advice
                    </h4>
                    <ul className="space-y-2">
                      {result.negotiation_guide.timing_advice.map(
                        (tip, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-sm text-muted-foreground/70"
                          >
                            <span className="text-primary mt-1">
                              &bull;
                            </span>
                            {tip}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Errors */}
        {result?.errors && result.errors.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 text-sm mb-8">
            <p className="font-bold mb-1">Some schools could not be compared:</p>
            <ul className="list-disc pl-5">
              {result.errors.map((err, idx) => (
                <li key={idx}>
                  {err.school_id}: {err.error}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
