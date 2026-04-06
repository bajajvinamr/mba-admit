"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Target,
  School,
  Calendar,
  Shield,
  Clock,
  ChevronDown,
  ChevronUp,
  Send,
  Download,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  MessageSquare,
  FileText,
} from "lucide-react";
import { apiFetch, API_BASE } from "@/lib/api";
import { useUsage } from "@/hooks/useUsage";
import { UsageGate } from "@/components/UsageGate";
import { ToolCrossLinks } from "@/components/ToolCrossLinks";

// ── Types ──────────────────────────────────────────────────────────────────

type SchoolRecommendation = {
  school: string;
  slug?: string;
  reasoning: string;
  probability?: string;
};

type RoundStrategy = {
  school: string;
  recommended_round: string;
  reasoning: string;
  deadline?: string;
};

type WeaknessMitigation = {
  weakness: string;
  severity: string;
  strategy: string;
  timeline: string;
};

type TimelineItem = {
  week_range: string;
  focus: string;
  actions: string[];
  milestone: string;
};

type StrategyResult = {
  profile_assessment: {
    archetype: string;
    archetype_description: string;
    strengths: string[];
    weaknesses: string[];
    adcom_perception: string;
    differentiation_angle: string;
    overall_competitiveness: string;
  };
  school_list: {
    reach: SchoolRecommendation[];
    target: SchoolRecommendation[];
    safety: SchoolRecommendation[];
    avoid: { school: string; reasoning: string }[];
  };
  round_strategy: RoundStrategy[];
  narrative_arc: {
    through_line: string;
    origin_story: string;
    why_mba_refined: string;
    why_now_refined: string;
    goals_narrative: string;
  };
  weakness_mitigation: WeaknessMitigation[];
  timeline: TimelineItem[];
};

type FormData = {
  gmat: string;
  gmat_type: "focus" | "classic";
  gpa: string;
  undergrad_major: string;
  undergrad_school: string;
  years_experience: string;
  current_role: string;
  current_company_type: string;
  industry: string;
  target_industry: string;
  target_role: string;
  short_term_goal: string;
  long_term_goal: string;
  extracurriculars: string;
  leadership_examples: string;
  international: boolean;
  urm: boolean;
  military: boolean;
  citizenship: string;
  target_schools: string;
  weaknesses: string;
  why_mba: string;
  why_now: string;
};

const INITIAL_FORM: FormData = {
  gmat: "",
  gmat_type: "focus",
  gpa: "",
  undergrad_major: "",
  undergrad_school: "",
  years_experience: "",
  current_role: "",
  current_company_type: "",
  industry: "",
  target_industry: "",
  target_role: "",
  short_term_goal: "",
  long_term_goal: "",
  extracurriculars: "",
  leadership_examples: "",
  international: false,
  urm: false,
  military: false,
  citizenship: "",
  target_schools: "",
  weaknesses: "",
  why_mba: "",
  why_now: "",
};

const STEPS = [
  { label: "Profile", icon: Brain },
  { label: "Goals", icon: Target },
  { label: "Schools", icon: School },
  { label: "Weaknesses", icon: Shield },
] as const;

const COMPETITIVENESS_COLORS: Record<string, string> = {
  strong: "text-emerald-700 bg-emerald-50 border-emerald-200",
  competitive: "text-blue-700 bg-blue-50 border-blue-200",
  developing: "text-amber-700 bg-amber-50 border-amber-200",
  needs_work: "text-red-700 bg-red-50 border-red-200",
};

// ── Collapsible Section ─────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  summary,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ElementType;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon size={18} className="text-primary" />
          <span className="font-bold text-sm uppercase tracking-wider">{title}</span>
          {summary && !open && (
            <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">{summary}</span>
          )}
        </div>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pt-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function StrategyPage() {
  const usage = useUsage("strategy_ai");
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [strategy, setStrategy] = useState<StrategyResult | null>(null);
  const [rawText, setRawText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Follow-up chat
  const [followUp, setFollowUp] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: string; text: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const resultRef = useRef<HTMLDivElement>(null);

  const updateField = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);
    setProgress(0);
    setStrategy(null);
    setRawText("");

    const payload = {
      gmat: form.gmat ? parseInt(form.gmat) : null,
      gmat_type: form.gmat_type,
      gpa: form.gpa ? parseFloat(form.gpa) : null,
      undergrad_major: form.undergrad_major,
      undergrad_school: form.undergrad_school,
      years_experience: form.years_experience ? parseInt(form.years_experience) : 0,
      current_role: form.current_role,
      current_company_type: form.current_company_type,
      industry: form.industry,
      target_industry: form.target_industry,
      target_role: form.target_role,
      short_term_goal: form.short_term_goal,
      long_term_goal: form.long_term_goal,
      extracurriculars: form.extracurriculars
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      leadership_examples: form.leadership_examples,
      international: form.international,
      urm: form.urm,
      military: form.military,
      citizenship: form.citizenship,
      target_schools: form.target_schools
        .split(",")
        .map((s) => s.trim().toLowerCase().replace(/\s+/g, "_"))
        .filter(Boolean),
      weaknesses: form.weaknesses,
      why_mba: form.why_mba,
      why_now: form.why_now,
    };

    try {
      const response = await fetch(`${API_BASE}/api/strategy/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail?.error === "usage_limit" ? "You've used your free strategy generation. Upgrade to Pro for more." : "Failed to generate strategy");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let accumulated = "";
      let chunkCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "chunk") {
              accumulated += data.text;
              chunkCount++;
              setProgress(Math.min(95, chunkCount * 2));
              setRawText(accumulated);
            } else if (data.type === "complete") {
              setStrategy(data.strategy);
              setProgress(100);
              usage.recordUse();
            } else if (data.type === "complete_raw") {
              setRawText(data.text);
              setProgress(100);
              usage.recordUse();
            } else if (data.type === "error") {
              throw new Error(data.message);
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Strategy generation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUp = async () => {
    if (!followUp.trim() || chatLoading) return;

    const question = followUp.trim();
    setChatHistory((prev) => [...prev, { role: "user", text: question }]);
    setFollowUp("");
    setChatLoading(true);

    try {
      const data = await apiFetch<{ answer: string }>("/api/strategy/follow-up", {
        method: "POST",
        body: JSON.stringify({
          context: strategy || { raw: rawText.slice(0, 3000) },
          question,
        }),
        noRetry: true,
        timeoutMs: 60_000,
      });
      setChatHistory((prev) => [...prev, { role: "assistant", text: data.answer }]);
    } catch {
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", text: "Sorry, I couldn't process that question. Please try again." },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  // ── Step Content ──────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      case 0: // Profile
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">GMAT/GRE Score</label>
              <input
                type="number"
                value={form.gmat}
                onChange={(e) => updateField("gmat", e.target.value)}
                placeholder="740"
                className="w-full px-3 py-2.5 border border-border bg-background text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Test Type</label>
              <select
                value={form.gmat_type}
                onChange={(e) => updateField("gmat_type", e.target.value as "focus" | "classic")}
                className="w-full px-3 py-2.5 border border-border bg-background text-sm focus:outline-none focus:border-primary"
              >
                <option value="focus">GMAT Focus</option>
                <option value="classic">GMAT Classic</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">GPA</label>
              <input
                type="number"
                step="0.01"
                value={form.gpa}
                onChange={(e) => updateField("gpa", e.target.value)}
                placeholder="3.7"
                className="w-full px-3 py-2.5 border border-border bg-background text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Undergrad Major</label>
              <input
                value={form.undergrad_major}
                onChange={(e) => updateField("undergrad_major", e.target.value)}
                placeholder="Economics"
                className="w-full px-3 py-2.5 border border-border bg-background text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Undergrad School</label>
              <input
                value={form.undergrad_school}
                onChange={(e) => updateField("undergrad_school", e.target.value)}
                placeholder="University of Michigan"
                className="w-full px-3 py-2.5 border border-border bg-background text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Years of Experience</label>
              <input
                type="number"
                value={form.years_experience}
                onChange={(e) => updateField("years_experience", e.target.value)}
                placeholder="5"
                className="w-full px-3 py-2.5 border border-border bg-background text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Current Role</label>
              <input
                value={form.current_role}
                onChange={(e) => updateField("current_role", e.target.value)}
                placeholder="Senior Analyst"
                className="w-full px-3 py-2.5 border border-border bg-background text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Company Type</label>
              <input
                value={form.current_company_type}
                onChange={(e) => updateField("current_company_type", e.target.value)}
                placeholder="Big 4 / MBB / Fortune 500 / Startup"
                className="w-full px-3 py-2.5 border border-border bg-background text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Current Industry</label>
              <input
                value={form.industry}
                onChange={(e) => updateField("industry", e.target.value)}
                placeholder="Management Consulting"
                className="w-full px-3 py-2.5 border border-border bg-background text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Citizenship</label>
              <input
                value={form.citizenship}
                onChange={(e) => updateField("citizenship", e.target.value)}
                placeholder="US, India, etc."
                className="w-full px-3 py-2.5 border border-border bg-background text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div className="md:col-span-2 flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.international}
                  onChange={(e) => updateField("international", e.target.checked)}
                  className="accent-primary"
                />
                International Applicant
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.urm}
                  onChange={(e) => updateField("urm", e.target.checked)}
                  className="accent-primary"
                />
                Underrepresented Minority
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.military}
                  onChange={(e) => updateField("military", e.target.checked)}
                  className="accent-primary"
                />
                Military / Government
              </label>
            </div>
          </div>
        );

      case 1: // Goals
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Target Industry</label>
                <input
                  value={form.target_industry}
                  onChange={(e) => updateField("target_industry", e.target.value)}
                  placeholder="Tech / PE / VC / Consulting"
                  className="w-full px-3 py-2.5 border border-border bg-background text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Target Role</label>
                <input
                  value={form.target_role}
                  onChange={(e) => updateField("target_role", e.target.value)}
                  placeholder="Product Manager / Associate"
                  className="w-full px-3 py-2.5 border border-border bg-background text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Short-Term Goal (2-3 years post-MBA)</label>
              <textarea
                value={form.short_term_goal}
                onChange={(e) => updateField("short_term_goal", e.target.value)}
                placeholder="Transition to product management at a growth-stage tech company..."
                rows={3}
                className="w-full px-3 py-2.5 border border-border bg-background text-sm focus:outline-none focus:border-primary resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Long-Term Goal (10+ years)</label>
              <textarea
                value={form.long_term_goal}
                onChange={(e) => updateField("long_term_goal", e.target.value)}
                placeholder="Lead product organization at a public tech company / found an ed-tech startup..."
                rows={3}
                className="w-full px-3 py-2.5 border border-border bg-background text-sm focus:outline-none focus:border-primary resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Why MBA?</label>
              <textarea
                value={form.why_mba}
                onChange={(e) => updateField("why_mba", e.target.value)}
                placeholder="I need an MBA because..."
                rows={3}
                className="w-full px-3 py-2.5 border border-border bg-background text-sm focus:outline-none focus:border-primary resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Why Now?</label>
              <textarea
                value={form.why_now}
                onChange={(e) => updateField("why_now", e.target.value)}
                placeholder="This is the right time because..."
                rows={2}
                className="w-full px-3 py-2.5 border border-border bg-background text-sm focus:outline-none focus:border-primary resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Extracurriculars (comma-separated)</label>
              <input
                value={form.extracurriculars}
                onChange={(e) => updateField("extracurriculars", e.target.value)}
                placeholder="Nonprofit board, marathon runner, mentoring program"
                className="w-full px-3 py-2.5 border border-border bg-background text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Leadership Examples</label>
              <textarea
                value={form.leadership_examples}
                onChange={(e) => updateField("leadership_examples", e.target.value)}
                placeholder="Led a team of 8 on a $2M project..."
                rows={3}
                className="w-full px-3 py-2.5 border border-border bg-background text-sm focus:outline-none focus:border-primary resize-none"
              />
            </div>
          </div>
        );

      case 2: // Schools
        return (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Target Schools (comma-separated slugs)</label>
              <textarea
                value={form.target_schools}
                onChange={(e) => updateField("target_schools", e.target.value)}
                placeholder="hbs, gsb, wharton, chicago_booth, kellogg, mit_sloan"
                rows={3}
                className="w-full px-3 py-2.5 border border-border bg-background text-sm focus:outline-none focus:border-primary resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave blank for AI-recommended school list. Use school slugs (e.g., hbs, gsb, wharton).
              </p>
            </div>
          </div>
        );

      case 3: // Weaknesses
        return (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Known Weaknesses</label>
              <textarea
                value={form.weaknesses}
                onChange={(e) => updateField("weaknesses", e.target.value)}
                placeholder="Low GPA from freshman year, short work experience, overrepresented background in consulting..."
                rows={4}
                className="w-full px-3 py-2.5 border border-border bg-background text-sm focus:outline-none focus:border-primary resize-none"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ── Result Sections ───────────────────────────────────────────────────────

  const renderResults = () => {
    if (!strategy) {
      if (rawText) {
        return (
          <div className="mt-8 p-6 border border-border bg-card">
            <h3 className="font-bold text-sm uppercase tracking-wider mb-4">Strategy (Raw Output)</h3>
            <pre className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">{rawText}</pre>
          </div>
        );
      }
      return null;
    }

    const { profile_assessment: pa, school_list, round_strategy, narrative_arc, weakness_mitigation, timeline } = strategy;

    return (
      <div ref={resultRef} className="mt-8 space-y-4 print:space-y-6">
        {/* Profile Assessment */}
        <Section title="Profile Assessment" icon={Brain} summary={pa.archetype}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-primary/10 text-primary border border-primary/20">
                {pa.archetype}
              </span>
              <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 border ${COMPETITIVENESS_COLORS[pa.overall_competitiveness] || "text-muted-foreground bg-muted border-border"}`}>
                {pa.overall_competitiveness?.replace("_", " ")}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{pa.archetype_description}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">Strengths</h4>
                <ul className="space-y-1.5">
                  {pa.strengths?.map((s, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-red-700 mb-2">Weaknesses</h4>
                <ul className="space-y-1.5">
                  {pa.weaknesses?.map((w, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-4 bg-muted/50 border border-border">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">AdCom Perception</h4>
              <p className="text-sm">{pa.adcom_perception}</p>
            </div>
            <div className="p-4 bg-primary/5 border border-primary/20">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-1">Your Differentiation Angle</h4>
              <p className="text-sm">{pa.differentiation_angle}</p>
            </div>
          </div>
        </Section>

        {/* School List */}
        <Section title="School List" icon={School} summary={`${(school_list.reach?.length || 0) + (school_list.target?.length || 0) + (school_list.safety?.length || 0)} schools`}>
          <div className="space-y-6">
            {[
              { label: "Reach", schools: school_list.reach, color: "red" },
              { label: "Target", schools: school_list.target, color: "amber" },
              { label: "Safety", schools: school_list.safety, color: "emerald" },
            ].map(({ label, schools, color }) => (
              <div key={label}>
                <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 text-${color}-700`}>{label} Schools</h4>
                <div className="space-y-2">
                  {schools?.map((s, i) => (
                    <div key={i} className="p-3 border border-border bg-background flex items-start gap-3">
                      <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 bg-${color}-50 text-${color}-700 border border-${color}-200 shrink-0 mt-0.5`}>
                        {s.probability || label}
                      </span>
                      <div>
                        <span className="font-semibold text-sm">{s.school}</span>
                        <p className="text-xs text-muted-foreground mt-1">{s.reasoning}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {school_list.avoid && school_list.avoid.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-3 text-muted-foreground">Schools to Avoid</h4>
                {school_list.avoid.map((s, i) => (
                  <div key={i} className="p-3 border border-border bg-muted/30 mb-2">
                    <span className="font-semibold text-sm">{s.school}</span>
                    <p className="text-xs text-muted-foreground mt-1">{s.reasoning}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* Round Strategy */}
        <Section title="Round Strategy" icon={Calendar}>
          <div className="space-y-2">
            {round_strategy?.map((rs, i) => (
              <div key={i} className="flex items-center gap-4 p-3 border border-border bg-background">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 bg-primary/10 text-primary border border-primary/20 shrink-0">
                  {rs.recommended_round}
                </span>
                <div className="flex-1">
                  <span className="font-semibold text-sm">{rs.school}</span>
                  <p className="text-xs text-muted-foreground">{rs.reasoning}</p>
                </div>
                {rs.deadline && (
                  <span className="text-xs text-muted-foreground shrink-0">{rs.deadline}</span>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* Narrative Arc */}
        <Section title="Narrative Arc" icon={FileText}>
          <div className="space-y-4">
            {[
              { label: "Through-Line", text: narrative_arc?.through_line },
              { label: "Origin Story", text: narrative_arc?.origin_story },
              { label: "Why MBA (Refined)", text: narrative_arc?.why_mba_refined },
              { label: "Why Now (Refined)", text: narrative_arc?.why_now_refined },
              { label: "Goals Narrative", text: narrative_arc?.goals_narrative },
            ].map(({ label, text }) =>
              text ? (
                <div key={label}>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</h4>
                  <p className="text-sm leading-relaxed">{text}</p>
                </div>
              ) : null,
            )}
          </div>
        </Section>

        {/* Weakness Mitigation */}
        <Section title="Weakness Mitigation" icon={Shield}>
          <div className="space-y-3">
            {weakness_mitigation?.map((wm, i) => (
              <div key={i} className="p-4 border border-border bg-background">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-sm">{wm.weakness}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border ${
                    wm.severity === "high"
                      ? "text-red-700 bg-red-50 border-red-200"
                      : wm.severity === "medium"
                        ? "text-amber-700 bg-amber-50 border-amber-200"
                        : "text-emerald-700 bg-emerald-50 border-emerald-200"
                  }`}>
                    {wm.severity}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{wm.strategy}</p>
                {wm.timeline && (
                  <p className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1">
                    <Clock size={10} /> {wm.timeline}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* Timeline */}
        <Section title="Week-by-Week Timeline" icon={Clock}>
          <div className="space-y-3">
            {timeline?.map((t, i) => (
              <div key={i} className="p-4 border border-border bg-background">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">{t.week_range}</span>
                  <span className="text-xs text-muted-foreground">{t.focus}</span>
                </div>
                <ul className="space-y-1">
                  {t.actions?.map((a, j) => (
                    <li key={j} className="text-sm flex gap-2">
                      <span className="text-muted-foreground/50">-</span> {a}
                    </li>
                  ))}
                </ul>
                {t.milestone && (
                  <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                    <CheckCircle2 size={10} /> Milestone: {t.milestone}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* Follow-up Chat */}
        <div className="border border-border bg-card p-6 mt-6">
          <h3 className="font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <MessageSquare size={16} className="text-primary" /> Ask a Follow-Up
          </h3>
          {chatHistory.length > 0 && (
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 text-sm ${
                    msg.role === "user"
                      ? "bg-primary/5 border border-primary/20 ml-8"
                      : "bg-muted border border-border mr-8"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFollowUp()}
              placeholder="Ask about school fit, essay topics, timeline adjustments..."
              className="flex-1 px-3 py-2.5 border border-border bg-background text-sm focus:outline-none focus:border-primary"
              disabled={chatLoading}
            />
            <button
              onClick={handleFollowUp}
              disabled={!followUp.trim() || chatLoading}
              className="px-4 py-2.5 bg-foreground text-background text-xs font-bold uppercase tracking-wider hover:bg-foreground/90 transition-colors disabled:opacity-40"
            >
              {chatLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </div>

        {/* Export */}
        <div className="flex gap-3 print:hidden">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2.5 border border-border text-xs font-bold uppercase tracking-wider hover:bg-muted transition-colors"
          >
            <Download size={14} /> Export as PDF
          </button>
        </div>
      </div>
    );
  };

  return (
    <UsageGate feature="strategy_ai" freeTrialCount={1}>
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={20} className="text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 border border-primary/20">
              Premium
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">AI Profile Strategist</h1>
          <p className="text-muted-foreground text-sm max-w-lg">
            Get a comprehensive, personalized MBA application strategy. The $10K consultant, in a box.
          </p>
        </div>

        {/* Step Indicator */}
        {!strategy && !loading && (
          <>
            <div className="flex items-center gap-2 mb-6">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                      step === i
                        ? "bg-foreground text-background"
                        : i < step
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-muted text-muted-foreground border border-border"
                    }`}
                  >
                    <Icon size={12} />
                    {s.label}
                  </button>
                );
              })}
            </div>

            {/* Step Content */}
            <div className="border border-border bg-card p-6 mb-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.15 }}
                >
                  {renderStep()}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <button
                onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
                className="flex items-center gap-2 px-4 py-2.5 border border-border text-xs font-bold uppercase tracking-wider hover:bg-muted transition-colors disabled:opacity-30"
              >
                <ArrowLeft size={14} /> Back
              </button>
              {step < STEPS.length - 1 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-foreground text-background text-xs font-bold uppercase tracking-wider hover:bg-foreground/90 transition-colors"
                >
                  Next <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-foreground text-background text-xs font-bold uppercase tracking-wider hover:bg-foreground/90 transition-colors disabled:opacity-40"
                >
                  <Sparkles size={14} /> Generate Strategy
                </button>
              )}
            </div>
          </>
        )}

        {/* Loading */}
        {loading && (
          <div className="border border-border bg-card p-8 text-center">
            <Loader2 size={32} className="animate-spin text-primary mx-auto mb-4" />
            <h3 className="font-bold text-sm uppercase tracking-wider mb-2">
              Analyzing your profile...
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Our AI is evaluating your profile against admissions frameworks for your target schools.
            </p>
            <div className="w-full max-w-xs mx-auto bg-muted h-2 overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground/50 mt-2">{progress}%</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700 mt-4">
            {error}
          </div>
        )}

        {/* Results */}
        {renderResults()}

        <div className="mt-12">
          <ToolCrossLinks current="strategy" count={4} />
        </div>
      </div>
    </UsageGate>
  );
}
