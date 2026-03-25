"use client";

import { useState } from "react";
import {
  TrendingUp,
  DollarSign,
  Clock,
  ArrowRight,
  ChevronDown,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { apiFetch } from "@/lib/api";
import { ToolCrossLinks } from "@/components/ToolCrossLinks";

// ── Types ──────────────────────────────────────────────────────────────────

type CareerPath = { title: string; year: number; salary: number };

type TrajectoryOutput = {
  year_1_salary: number;
  year_5_salary: number;
  year_10_salary: number;
  career_paths: CareerPath[];
  yearly_salaries: number[];
};

type MBACostBreakdown = {
  tuition_range: string;
  living_cost: number;
  opportunity_cost: number;
  total: number;
};

type SimulateResponse = {
  with_mba: TrajectoryOutput;
  without_mba: TrajectoryOutput;
  mba_cost: MBACostBreakdown;
  breakeven_years: number;
  roi_10yr: number;
  confidence: "high" | "medium" | "low";
  data_sources: string[];
};

type IndustryOption = { key: string; label: string; base_salary: number };

// ── Constants ──────────────────────────────────────────────────────────────

const INDUSTRIES: IndustryOption[] = [
  { key: "consulting", label: "Consulting", base_salary: 175000 },
  { key: "consumer_goods", label: "Consumer Goods / CPG", base_salary: 135000 },
  { key: "energy", label: "Energy", base_salary: 145000 },
  { key: "finance", label: "Finance / Banking", base_salary: 165000 },
  { key: "government", label: "Government / Public Sector", base_salary: 100000 },
  { key: "healthcare", label: "Healthcare", base_salary: 140000 },
  { key: "investment_banking", label: "Investment Banking", base_salary: 185000 },
  { key: "manufacturing", label: "Manufacturing", base_salary: 130000 },
  { key: "media", label: "Media / Entertainment", base_salary: 130000 },
  { key: "nonprofit", label: "Nonprofit / Social Impact", base_salary: 95000 },
  { key: "private_equity", label: "Private Equity / VC", base_salary: 200000 },
  { key: "real_estate", label: "Real Estate", base_salary: 140000 },
  { key: "technology", label: "Technology", base_salary: 160000 },
  { key: "other", label: "Other", base_salary: 130000 },
];

const COUNTRIES = [
  { key: "us", label: "United States" },
  { key: "uk", label: "United Kingdom" },
  { key: "canada", label: "Canada" },
  { key: "france", label: "France" },
  { key: "spain", label: "Spain" },
  { key: "germany", label: "Germany" },
  { key: "singapore", label: "Singapore" },
  { key: "india", label: "India" },
  { key: "china", label: "China" },
  { key: "australia", label: "Australia" },
];

const TIERS = [
  { key: "m7", label: "M7 (HBS, GSB, Wharton...)" },
  { key: "t15", label: "Top 15" },
  { key: "t25", label: "Top 25" },
  { key: "t50", label: "Top 50" },
  { key: "other", label: "Other" },
];

// ── Formatters ─────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtFull(n: number): string {
  return `$${n.toLocaleString()}`;
}

// ── Confidence Badge ───────────────────────────────────────────────────────

function ConfidenceBadge({ level }: { level: "high" | "medium" | "low" }) {
  const config = {
    high: { icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50", label: "High confidence" },
    medium: { icon: Info, color: "text-amber-600 bg-amber-50", label: "Medium confidence" },
    low: { icon: AlertTriangle, color: "text-red-500 bg-red-50", label: "Low confidence" },
  };
  const { icon: Icon, color, label } = config[level];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${color}`}>
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}

// ── Page Component ─────────────────────────────────────────────────────────

export default function CareerSimulatorPage() {
  const [currentRole, setCurrentRole] = useState("");
  const [currentIndustry, setCurrentIndustry] = useState("");
  const [currentSalary, setCurrentSalary] = useState(80000);
  const [yearsExp, setYearsExp] = useState(4);
  const [targetRole, setTargetRole] = useState("");
  const [targetIndustry, setTargetIndustry] = useState("");
  const [country, setCountry] = useState("us");
  const [schoolTier, setSchoolTier] = useState("t15");
  const [result, setResult] = useState<SimulateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSimulate() {
    if (!currentRole || !currentIndustry || !targetRole || !targetIndustry) {
      setError("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<SimulateResponse>("/api/career/simulate", {
        method: "POST",
        body: JSON.stringify({
          current_role: currentRole,
          current_industry: currentIndustry,
          current_salary: currentSalary,
          years_experience: yearsExp,
          target_role: targetRole,
          target_industry: targetIndustry,
          country,
          school_tier: schoolTier,
        }),
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Build chart data from result
  const chartData = result
    ? Array.from({ length: 10 }, (_, i) => ({
        year: `Year ${i + 1}`,
        "With MBA": result.with_mba.yearly_salaries[i] ?? 0,
        "Without MBA": result.without_mba.yearly_salaries[i] ?? 0,
      }))
    : [];

  const earningsGain = result
    ? result.with_mba.yearly_salaries.reduce((a, b) => a + b, 0) -
      result.without_mba.yearly_salaries.reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">
            Career Path Simulator
          </h1>
          <p className="mt-2 text-muted-foreground">
            Model your 10-year salary trajectory with and without an MBA. See ROI, breakeven, and career progression side by side.
          </p>
        </div>

        {/* Input Form */}
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8 mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-6">Your Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Current Role */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Current Role</label>
              <input
                type="text"
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value)}
                placeholder="e.g., Software Engineer"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* Current Industry */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Current Industry</label>
              <div className="relative">
                <select
                  value={currentIndustry}
                  onChange={(e) => setCurrentIndustry(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2.5 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Select industry</option>
                  {INDUSTRIES.map((i) => (
                    <option key={i.key} value={i.key}>{i.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-3 size-4 text-muted-foreground" />
              </div>
            </div>

            {/* Current Salary */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Current Salary: {fmtFull(currentSalary)}
              </label>
              <input
                type="range"
                min={20000}
                max={500000}
                step={5000}
                value={currentSalary}
                onChange={(e) => setCurrentSalary(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>$20K</span>
                <span>$500K</span>
              </div>
            </div>

            {/* Years Experience */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Years of Experience: {yearsExp}
              </label>
              <input
                type="range"
                min={0}
                max={25}
                step={1}
                value={yearsExp}
                onChange={(e) => setYearsExp(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0</span>
                <span>25</span>
              </div>
            </div>

            {/* Target Role */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Target Post-MBA Role</label>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g., Product Manager"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* Target Industry */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Target Industry</label>
              <div className="relative">
                <select
                  value={targetIndustry}
                  onChange={(e) => setTargetIndustry(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2.5 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Select target industry</option>
                  {INDUSTRIES.map((i) => (
                    <option key={i.key} value={i.key}>{i.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-3 size-4 text-muted-foreground" />
              </div>
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Country</label>
              <div className="relative">
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2.5 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-3 size-4 text-muted-foreground" />
              </div>
            </div>

            {/* School Tier */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Target School Tier</label>
              <div className="relative">
                <select
                  value={schoolTier}
                  onChange={(e) => setSchoolTier(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2.5 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {TIERS.map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-3 size-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-600">{error}</p>
          )}

          <button
            onClick={handleSimulate}
            disabled={loading}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-foreground px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <TrendingUp className="size-4" />}
            {loading ? "Simulating..." : "Simulate Career Path"}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-8">
            {/* Salary Trajectory Chart */}
            <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-foreground">10-Year Salary Trajectory</h2>
                <ConfidenceBadge level={result.confidence} />
              </div>
              <div className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis
                      tickFormatter={(v: number) => fmtCurrency(v)}
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip
                      formatter={(value) => [fmtFull(Number(value)), undefined]}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--card))",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="With MBA"
                      stroke="#b8860b"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Without MBA"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Cost Breakdown Table */}
            <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-foreground mb-4">MBA Cost Breakdown</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-3 font-medium text-muted-foreground">Component</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="py-3 text-foreground flex items-center gap-2">
                        <DollarSign className="size-4 text-muted-foreground" />
                        Tuition
                      </td>
                      <td className="py-3 text-foreground text-right">{result.mba_cost.tuition_range}</td>
                    </tr>
                    <tr>
                      <td className="py-3 text-foreground flex items-center gap-2">
                        <DollarSign className="size-4 text-muted-foreground" />
                        Living Costs (2 years)
                      </td>
                      <td className="py-3 text-foreground text-right">{fmtFull(result.mba_cost.living_cost)}</td>
                    </tr>
                    <tr>
                      <td className="py-3 text-foreground flex items-center gap-2">
                        <Clock className="size-4 text-muted-foreground" />
                        Opportunity Cost (forgone salary)
                      </td>
                      <td className="py-3 text-foreground text-right">{fmtFull(result.mba_cost.opportunity_cost)}</td>
                    </tr>
                    <tr className="font-semibold">
                      <td className="py-3 text-foreground">Total Investment</td>
                      <td className="py-3 text-foreground text-right">{fmtFull(result.mba_cost.total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ROI Verdict Card */}
            <div className="rounded-xl border-2 border-[#b8860b]/30 bg-primary/5 p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <TrendingUp className="size-6 text-[#b8860b]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-foreground mb-2">ROI Verdict</h2>
                  <p className="text-foreground leading-relaxed">
                    Based on your profile, an MBA would{" "}
                    {earningsGain > 0 ? "increase" : "decrease"} your 10-year earnings by{" "}
                    <span className="font-bold text-[#b8860b]">{fmtFull(Math.abs(earningsGain))}</span>.
                    Breakeven in{" "}
                    <span className="font-bold text-[#b8860b]">{result.breakeven_years} years</span>.
                    10-year ROI:{" "}
                    <span className="font-bold text-[#b8860b]">{(result.roi_10yr * 100).toFixed(0)}%</span>.
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground tabular-nums">
                        {fmtCurrency(result.with_mba.year_1_salary)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Year 1 Post-MBA</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground tabular-nums">
                        {fmtCurrency(result.with_mba.year_5_salary)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Year 5 Salary</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground tabular-nums">
                        {fmtCurrency(result.with_mba.year_10_salary)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Year 10 Salary</p>
                    </div>
                  </div>

                  <Link
                    href="/schools"
                    className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                  >
                    Ready to explore schools?
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Data Sources */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Data Sources:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {result.data_sources.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="mt-12">
          <ToolCrossLinks current="/career-simulator" />
        </div>
      </div>
    </div>
  );
}
