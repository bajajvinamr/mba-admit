"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, X, Loader2, DollarSign, Copy,
  Shield, AlertTriangle, CheckCircle2, Clock,
  ThumbsUp, ThumbsDown, Zap, Star,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { track } from "@/lib/analytics";

/* ── Types ─────────────────────────────────────────────────────────── */

type SchoolOption = { id: string; name: string };

type AdmittedSchool = {
  slug: string;
  name: string;
  scholarship: number;
};

type LeverageEntry = {
  school: string;
  leverage: "strong" | "moderate" | "weak";
  reason: string;
};

type NegotiationResult = {
  strategy: string;
  email_template: string;
  timing: string;
  expected_outcome: string;
  leverage_analysis: LeverageEntry[];
  dos_and_donts: { dos: string[]; donts: string[] };
};

/* ── Component ─────────────────────────────────────────────────────── */

export default function NegotiateContent() {
  const [schools, setSchools] = useState<AdmittedSchool[]>([
    { slug: "", name: "", scholarship: 0 },
    { slug: "", name: "", scholarship: 0 },
  ]);
  const [preferredSchool, setPreferredSchool] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SchoolOption[]>([]);
  const [searchingIdx, setSearchingIdx] = useState<number | null>(null);

  const [result, setResult] = useState<NegotiationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // School search
  useEffect(() => {
    if (!searchQuery.trim() || searchingIdx === null) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch<SchoolOption[]>(
          "/api/schools?limit=8&q=" + encodeURIComponent(searchQuery)
        );
        setSearchResults(Array.isArray(res) ? res : []);
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchingIdx]);

  function selectSchool(idx: number, school: SchoolOption) {
    setSchools((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, slug: school.id, name: school.name } : s))
    );
    setSearchQuery("");
    setSearchingIdx(null);
    setSearchResults([]);
    // Auto-set preferred school to first one
    if (!preferredSchool && idx === 0) {
      setPreferredSchool(school.id);
    }
  }

  function updateScholarship(idx: number, amount: number) {
    setSchools((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, scholarship: amount } : s))
    );
  }

  function removeSchool(idx: number) {
    if (schools.length <= 2) return;
    const removed = schools[idx];
    setSchools((prev) => prev.filter((_, i) => i !== idx));
    if (preferredSchool === removed.slug) {
      setPreferredSchool("");
    }
  }

  function addSchool() {
    if (schools.length >= 6) return;
    setSchools((prev) => [...prev, { slug: "", name: "", scholarship: 0 }]);
  }

  async function handleSubmit() {
    const validSchools = schools.filter((s) => s.slug);
    if (validSchools.length < 2) {
      setError("Add at least 2 admitted schools.");
      return;
    }
    if (!preferredSchool) {
      setError("Select your preferred school.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    track("negotiation_strategy_submit", { preferred: preferredSchool, count: validSchools.length });

    try {
      const payload = {
        admitted_schools: validSchools.map((s) => ({
          slug: s.slug,
          scholarship_amount: s.scholarship,
        })),
        preferred_school: preferredSchool,
      };
      const data = await apiFetch<NegotiationResult>("/api/financial-aid/negotiation-strategy", {
        method: "POST",
        body: JSON.stringify(payload),
        timeoutMs: 60_000,
      });
      setResult(data);
      track("negotiation_strategy_result", { preferred: preferredSchool });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function copyEmail() {
    if (!result) return;
    navigator.clipboard.writeText(result.email_template);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    track("negotiation_email_copied", {});
  }

  const leverageColor = (l: string) => {
    if (l === "strong") return "bg-emerald-100 text-emerald-800 border-emerald-300";
    if (l === "moderate") return "bg-amber-100 text-amber-800 border-amber-300";
    return "bg-red-100 text-red-800 border-red-300";
  };

  const leverageIcon = (l: string) => {
    if (l === "strong") return <Shield size={16} className="text-emerald-600" />;
    if (l === "moderate") return <AlertTriangle size={16} className="text-amber-600" />;
    return <X size={16} className="text-red-500" />;
  };

  return (
    <div className="space-y-6">
      {!result ? (
        <>
          <div className="editorial-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-1">Scholarship Negotiation Strategy</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Enter your admitted schools and their scholarship offers. We will generate a personalized negotiation playbook.
            </p>

            <div className="space-y-4">
              {schools.map((school, idx) => (
                <div key={idx} className="p-4 bg-foreground/[0.02] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">
                        School {idx + 1}
                      </span>
                      {school.slug && preferredSchool === school.slug && (
                        <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-full font-semibold">
                          Preferred
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {school.slug && preferredSchool !== school.slug && (
                        <button
                          onClick={() => setPreferredSchool(school.slug)}
                          className="text-[10px] text-primary font-medium"
                        >
                          Set as preferred
                        </button>
                      )}
                      {schools.length > 2 && (
                        <button
                          onClick={() => removeSchool(idx)}
                          className="text-muted-foreground hover:text-red-500"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {!school.slug ? (
                    <div className="relative">
                      <div className="flex items-center gap-2">
                        <Search size={14} className="text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search for admitted school..."
                          value={searchingIdx === idx ? searchQuery : ""}
                          onFocus={() => setSearchingIdx(idx)}
                          onChange={(e) => {
                            setSearchingIdx(idx);
                            setSearchQuery(e.target.value);
                          }}
                          className="w-full px-3 py-2 border border-border/10 rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                      {searchingIdx === idx && searchResults.length > 0 && (
                        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-border/10 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {searchResults.map((s) => (
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
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{school.name}</span>
                        <button
                          onClick={() => setSchools((p) => p.map((s, i) => i === idx ? { slug: "", name: "", scholarship: 0 } : s))}
                          className="text-xs text-muted-foreground"
                        >
                          Change
                        </button>
                      </div>
                      <div className="relative">
                        <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="number"
                          placeholder="Scholarship amount"
                          value={school.scholarship || ""}
                          onChange={(e) => updateScholarship(idx, parseInt(e.target.value) || 0)}
                          className="w-full pl-8 pr-3 py-2 border border-border/10 rounded-lg text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {schools.length < 6 && (
                <button
                  onClick={addSchool}
                  className="flex items-center gap-2 px-4 py-2 border border-border/10 rounded-lg text-sm text-muted-foreground hover:border-border/30 transition-colors w-full justify-center"
                >
                  <Plus size={14} /> Add School
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 bg-foreground text-white rounded-lg font-semibold text-sm hover:bg-foreground/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Building negotiation strategy...
              </>
            ) : (
              <>
                <Zap size={18} />
                Generate Negotiation Strategy
              </>
            )}
          </button>
        </>
      ) : (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Strategy */}
            <div className="editorial-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <Star size={18} className="text-primary" />
                Your Negotiation Strategy
              </h2>
              <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">
                {result.strategy}
              </p>
            </div>

            {/* Leverage Analysis */}
            <div className="editorial-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <Shield size={18} className="text-primary" />
                Leverage Analysis
              </h2>
              <div className="space-y-3">
                {result.leverage_analysis.map((le, i) => (
                  <div key={i} className={`p-3 border rounded-lg flex items-start gap-3 ${leverageColor(le.leverage)}`}>
                    {leverageIcon(le.leverage)}
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold">{le.school}</span>
                        <span className="text-[10px] uppercase font-bold opacity-60">
                          {le.leverage}
                        </span>
                      </div>
                      <p className="text-xs">{le.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Email Template */}
            <div className="editorial-card p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Copy size={18} className="text-primary" />
                  Email Template
                </h2>
                <button
                  onClick={copyEmail}
                  className="text-xs bg-primary text-white px-3 py-1.5 rounded-md font-medium flex items-center gap-1 hover:bg-primary/90 transition-colors"
                >
                  {copied ? (
                    <><CheckCircle2 size={12} /> Copied</>
                  ) : (
                    <><Copy size={12} /> Copy Email</>
                  )}
                </button>
              </div>
              <pre className="text-sm text-foreground/80 whitespace-pre-wrap bg-foreground/[0.02] p-4 rounded-lg border border-border/10 font-sans leading-relaxed">
                {result.email_template}
              </pre>
            </div>

            {/* Timing */}
            <div className="editorial-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                <Clock size={18} className="text-primary" />
                Timing
              </h2>
              <p className="text-sm text-foreground/80">{result.timing}</p>
              <div className="mt-3 p-3 bg-primary/5 rounded-lg">
                <p className="text-sm text-foreground font-medium">Expected Outcome</p>
                <p className="text-xs text-muted-foreground mt-0.5">{result.expected_outcome}</p>
              </div>
            </div>

            {/* Dos & Don'ts */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="editorial-card p-6">
                <h3 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                  <ThumbsUp size={16} /> Do
                </h3>
                <ul className="space-y-2">
                  {result.dos_and_donts.dos.map((d, i) => (
                    <li key={i} className="text-xs text-foreground/80 flex gap-2">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="editorial-card p-6">
                <h3 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
                  <ThumbsDown size={16} /> Don&apos;t
                </h3>
                <ul className="space-y-2">
                  {result.dos_and_donts.donts.map((d, i) => (
                    <li key={i} className="text-xs text-foreground/80 flex gap-2">
                      <X size={14} className="text-red-500 shrink-0 mt-0.5" />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              onClick={() => { setResult(null); setError(""); }}
              className="px-4 py-2 border border-border/10 rounded-lg text-sm font-medium text-foreground hover:bg-foreground/5 transition-colors"
            >
              Start Over
            </button>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
