"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Clock, User, Video, Eye, EyeOff, AlertTriangle,
  Lightbulb, MessageSquare, ArrowRight, Shield,
  FileText, Filter, BarChart3, ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { ToolCrossLinks } from "@/components/ToolCrossLinks";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

/* ── Types ─────────────────────────────────────────────────────────── */

type GuideFormat = {
  interviewer_type: string;
  duration: string;
  medium: string;
  is_blind: boolean;
};

type GuideData = {
  school_slug: string;
  school_name?: string;
  format: GuideFormat;
  style: string[];
  common_themes: string[];
  sample_questions: string[];
  red_flags: string[];
  tips: string[];
  reports_count: number;
};

type Props = {
  slug: string;
  guide: Record<string, unknown> | null;
  error: string | null;
};

const STYLE_COLORS: Record<string, string> = {
  behavioral: "bg-blue-100 text-blue-700",
  conversational: "bg-emerald-100 text-emerald-700",
  "team-based discussion": "bg-violet-100 text-violet-700",
  "case-method": "bg-orange-100 text-orange-700",
  "case-lite": "bg-orange-100 text-orange-700",
  "self-reflection": "bg-rose-100 text-rose-700",
  "post-interview reflection": "bg-rose-100 text-rose-700",
  "values-based": "bg-amber-100 text-amber-700",
  "innovation-focused": "bg-indigo-100 text-indigo-700",
  technical: "bg-slate-100 text-slate-700",
  "data-driven": "bg-indigo-100 text-indigo-700",
  structured: "bg-slate-100 text-slate-700",
  "career-focused": "bg-teal-100 text-teal-700",
  "action-based": "bg-emerald-100 text-emerald-700",
  "impact-focused": "bg-emerald-100 text-emerald-700",
  "mission-driven": "bg-amber-100 text-amber-700",
  "community-focused": "bg-teal-100 text-teal-700",
  "teamwork-focused": "bg-blue-100 text-blue-700",
  "diversity-focused": "bg-pink-100 text-pink-700",
  "fast-paced": "bg-red-100 text-red-700",
  "global-focused": "bg-sky-100 text-sky-700",
  "tech-focused": "bg-indigo-100 text-indigo-700",
  entrepreneurial: "bg-violet-100 text-violet-700",
  "service-oriented": "bg-amber-100 text-amber-700",
  collaborative: "bg-teal-100 text-teal-700",
  "values-driven": "bg-amber-100 text-amber-700",
  "healthcare-focused": "bg-rose-100 text-rose-700",
  "ethical leadership": "bg-amber-100 text-amber-700",
  analytical: "bg-indigo-100 text-indigo-700",
};

type InterviewReportData = {
  id: string;
  school_slug: string;
  round: string;
  date: string;
  format: string;
  duration: number;
  questions: string[];
  style: string;
  feeling: string;
  advice: string;
  outcome: string | null;
};

type ReportStats = {
  total_reports: number;
  top_questions: Array<{ question: string; count: number; pct: number }>;
  avg_duration_minutes: number;
  style_distribution: Record<string, number>;
  format_distribution: Record<string, number>;
  feeling_distribution: Record<string, number>;
};

const FEELING_COLORS: Record<string, string> = {
  great: "bg-emerald-100 text-emerald-700",
  good: "bg-blue-100 text-blue-700",
  okay: "bg-amber-100 text-amber-700",
  rough: "bg-red-100 text-red-700",
};

const FORMAT_LABELS: Record<string, string> = {
  virtual_alumni: "Virtual (Alumni)",
  virtual_adcom: "Virtual (AdCom)",
  inperson_alumni: "In-Person (Alumni)",
  inperson_adcom: "In-Person (AdCom)",
};

function styleColor(style: string) {
  return STYLE_COLORS[style.toLowerCase()] || "bg-foreground/5 text-muted-foreground";
}

/* ── Interview Reports Sub-Component ──────────────────────────────── */

function InterviewReportsSection({ slug }: { slug: string }) {
  const [reports, setReports] = useState<InterviewReportData[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [roundFilter, setRoundFilter] = useState("all");
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<{ reports: InterviewReportData[]; total: number }>(`/api/interview-reports?school=${slug}&limit=50`),
      apiFetch<ReportStats>(`/api/interview-reports/stats/${slug}`).catch(() => null),
    ])
      .then(([reportsData, statsData]) => {
        setReports(reportsData.reports);
        setStats(statsData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const filteredReports = roundFilter === "all"
    ? reports
    : reports.filter(r => r.round === roundFilter);

  if (loading) {
    return (
      <div className="editorial-card p-8 text-center">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="heading-serif text-xl font-[family-name:var(--font-heading)] text-foreground flex items-center gap-2">
            <FileText size={20} className="text-primary" />
            Interview Reports
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {reports.length} interview report{reports.length !== 1 ? "s" : ""} from real applicants
          </p>
        </div>
        <button
          onClick={() => setShowSubmitModal(true)}
          className="text-xs font-bold px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
        >
          Submit Your Report
        </button>
      </div>

      {/* Stats Sidebar */}
      {stats && stats.total_reports > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="editorial-card p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.total_reports}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Reports</p>
          </div>
          <div className="editorial-card p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.avg_duration_minutes}m</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Avg Duration</p>
          </div>
          <div className="editorial-card p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-2">Style</p>
            <div className="space-y-1">
              {Object.entries(stats.style_distribution).slice(0, 3).map(([style, pct]) => (
                <div key={style} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground capitalize">{style.replace("_", " ")}</span>
                  <span className="font-bold text-foreground">{pct}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="editorial-card p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-2">Feeling</p>
            <div className="space-y-1">
              {Object.entries(stats.feeling_distribution).map(([feeling, pct]) => (
                <div key={feeling} className="flex items-center justify-between text-xs">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${FEELING_COLORS[feeling] || ""}`}>{feeling}</span>
                  <span className="font-bold text-foreground">{pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top Questions */}
      {stats && stats.top_questions.length > 0 && (
        <div className="editorial-card p-6">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <BarChart3 size={16} className="text-primary" />
            Most Asked Questions
          </h3>
          <ol className="space-y-2">
            {stats.top_questions.slice(0, 5).map((q, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-muted-foreground flex-1">{q.question}</span>
                <span className="text-[10px] font-bold text-muted-foreground/50 shrink-0">{q.pct}%</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter size={14} className="text-muted-foreground" />
        <select
          value={roundFilter}
          onChange={(e) => setRoundFilter(e.target.value)}
          className="px-3 py-1.5 border border-border/10 rounded text-sm bg-card"
        >
          <option value="all">All Rounds</option>
          <option value="R1">Round 1</option>
          <option value="R2">Round 2</option>
          <option value="R3">Round 3</option>
        </select>
        <span className="text-xs text-muted-foreground">{filteredReports.length} reports</span>
      </div>

      {/* Report Cards */}
      <div className="space-y-3">
        {filteredReports.slice(0, 20).map((report) => (
          <div key={report.id} className="editorial-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-foreground/5 text-muted-foreground">
                    {report.round}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-foreground/5 text-muted-foreground">
                    {FORMAT_LABELS[report.format] || report.format}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${FEELING_COLORS[report.feeling] || ""}`}>
                    {report.feeling}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{report.duration}m</span>
                  <span className="text-[10px] text-muted-foreground">{report.date}</span>
                  {report.outcome && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      report.outcome === "admitted" ? "bg-emerald-100 text-emerald-700" :
                      report.outcome === "waitlisted" ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {report.outcome}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground italic">&ldquo;{report.advice}&rdquo;</p>
              </div>
              <button
                onClick={() => setExpanded(expanded === report.id ? null : report.id)}
                className="text-muted-foreground/30 hover:text-muted-foreground shrink-0"
              >
                <ChevronDown size={16} className={`transition-transform ${expanded === report.id ? "rotate-180" : ""}`} />
              </button>
            </div>

            {expanded === report.id && (
              <div className="mt-3 pt-3 border-t border-border/10">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-2">Questions Asked</p>
                <ol className="space-y-1">
                  {report.questions.map((q, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-muted-foreground/30 shrink-0">{i + 1}.</span>
                      {q}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Submit Modal (simplified inline) */}
      {showSubmitModal && (
        <SubmitReportModal slug={slug} onClose={() => setShowSubmitModal(false)} onSubmitted={() => {
          setShowSubmitModal(false);
          // Refresh reports
          apiFetch<{ reports: InterviewReportData[] }>(`/api/interview-reports?school=${slug}&limit=50`)
            .then(data => setReports(data.reports))
            .catch(() => {});
        }} />
      )}
    </div>
  );
}

/* ── Submit Report Modal ──────────────────────────────────────────── */

function SubmitReportModal({ slug, onClose, onSubmitted }: {
  slug: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [form, setForm] = useState({
    round: "R1",
    date: new Date().toISOString().slice(0, 10),
    format: "virtual_alumni",
    duration: 30,
    questions: [""],
    style: "conversational",
    feeling: "good",
    advice: "",
    outcome: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const addQuestion = () => {
    setForm(prev => ({ ...prev, questions: [...prev.questions, ""] }));
  };

  const updateQuestion = (i: number, value: string) => {
    setForm(prev => {
      const questions = [...prev.questions];
      questions[i] = value;
      return { ...prev, questions };
    });
  };

  const handleSubmit = async () => {
    if (!form.advice.trim()) return;
    const validQuestions = form.questions.filter(q => q.trim());
    if (validQuestions.length === 0) return;

    setSubmitting(true);
    try {
      await apiFetch("/api/interview-reports", {
        method: "POST",
        body: JSON.stringify({
          school_slug: slug,
          round: form.round,
          date: form.date,
          format: form.format,
          duration: form.duration,
          questions: validQuestions,
          style: form.style,
          feeling: form.feeling,
          advice: form.advice,
          outcome: form.outcome || null,
          anonymous: true,
        }),
      });
      onSubmitted();
    } catch {
      alert("Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-background rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <h3 className="heading-serif text-xl mb-4 font-[family-name:var(--font-heading)] text-foreground">
          Submit Interview Report
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Round</label>
              <select value={form.round} onChange={e => setForm(prev => ({ ...prev, round: e.target.value }))}
                className="w-full px-3 py-2 border border-border/20 rounded-lg text-sm bg-background">
                <option value="R1">R1</option>
                <option value="R2">R2</option>
                <option value="R3">R3</option>
                <option value="ED">ED</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 border border-border/20 rounded-lg text-sm bg-background" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Format</label>
              <select value={form.format} onChange={e => setForm(prev => ({ ...prev, format: e.target.value }))}
                className="w-full px-3 py-2 border border-border/20 rounded-lg text-sm bg-background">
                <option value="virtual_alumni">Virtual (Alumni)</option>
                <option value="virtual_adcom">Virtual (AdCom)</option>
                <option value="inperson_alumni">In-Person (Alumni)</option>
                <option value="inperson_adcom">In-Person (AdCom)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Duration (min)</label>
              <input type="number" value={form.duration} onChange={e => setForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 30 }))}
                className="w-full px-3 py-2 border border-border/20 rounded-lg text-sm bg-background" min={5} max={180} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Style</label>
              <select value={form.style} onChange={e => setForm(prev => ({ ...prev, style: e.target.value }))}
                className="w-full px-3 py-2 border border-border/20 rounded-lg text-sm bg-background">
                <option value="conversational">Conversational</option>
                <option value="challenging">Challenging</option>
                <option value="case_based">Case-Based</option>
                <option value="by_the_book">By the Book</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">How did it feel?</label>
              <select value={form.feeling} onChange={e => setForm(prev => ({ ...prev, feeling: e.target.value }))}
                className="w-full px-3 py-2 border border-border/20 rounded-lg text-sm bg-background">
                <option value="great">Great</option>
                <option value="good">Good</option>
                <option value="okay">Okay</option>
                <option value="rough">Rough</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Questions Asked</label>
            {form.questions.map((q, i) => (
              <input key={i} value={q} onChange={e => updateQuestion(i, e.target.value)}
                placeholder={`Question ${i + 1}`}
                className="w-full px-3 py-2 border border-border/20 rounded-lg text-sm bg-background mb-2" />
            ))}
            <button onClick={addQuestion} className="text-xs text-primary font-medium">+ Add question</button>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Advice for future applicants</label>
            <textarea value={form.advice} onChange={e => setForm(prev => ({ ...prev, advice: e.target.value }))}
              placeholder="What would you tell someone preparing for this interview?"
              rows={3}
              className="w-full px-3 py-2 border border-border/20 rounded-lg text-sm bg-background resize-none" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Outcome (optional)</label>
            <select value={form.outcome} onChange={e => setForm(prev => ({ ...prev, outcome: e.target.value }))}
              className="w-full px-3 py-2 border border-border/20 rounded-lg text-sm bg-background">
              <option value="">Prefer not to say</option>
              <option value="admitted">Admitted</option>
              <option value="waitlisted">Waitlisted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-border/20 rounded-lg text-sm text-muted-foreground hover:text-foreground">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={submitting || !form.advice.trim()}
              className="flex-1 px-4 py-2 bg-foreground text-white rounded-lg text-sm font-bold hover:bg-foreground/90 disabled:opacity-30">
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Component ────────────────────────────────────────────────────── */

export default function InterviewGuideClient({ slug, guide, error }: Props) {
  if (error || !guide) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="heading-serif text-3xl mb-4 font-[family-name:var(--font-heading)]">
            Guide Not Found
          </h1>
          <p className="text-muted-foreground mb-6">{error || "Interview guide unavailable."}</p>
          <Link href="/interview" className="text-primary underline">
            Back to Interview Simulator
          </Link>
        </div>
      </main>
    );
  }

  const g = guide as unknown as GuideData;
  const label = g.school_name || (
    slug.length <= 5 && !slug.includes("_") && !slug.includes("-")
      ? slug.toUpperCase()
      : slug.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6">
        <Breadcrumb items={[
          { label: "Interview", href: "/interview" },
          { label: `${label} Guide` },
        ]} />
      </div>
      {/* Hero */}
      <section className="bg-foreground text-white py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-white/50 text-sm font-medium tracking-widest uppercase mb-3">
            Interview Intelligence
          </p>
          <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
            {label}
          </h1>
          <p className="text-white/70 text-lg">
            Pre-game briefing for your {label} MBA interview.
            Based on {g.reports_count}+ interview reports.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* Format Card */}
        <motion.div
          className="editorial-card p-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="heading-serif text-xl mb-4 font-[family-name:var(--font-heading)] text-foreground">
            Interview Format
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <User size={18} className="text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Interviewer</p>
                <p className="text-sm font-semibold text-foreground capitalize">
                  {g.format.interviewer_type}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock size={18} className="text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-sm font-semibold text-foreground">{g.format.duration}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Video size={18} className="text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Medium</p>
                <p className="text-sm font-semibold text-foreground capitalize">{g.format.medium}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {g.format.is_blind ? (
                <EyeOff size={18} className="text-amber-500 shrink-0" />
              ) : (
                <Eye size={18} className="text-emerald-500 shrink-0" />
              )}
              <div>
                <p className="text-xs text-muted-foreground">Application</p>
                <p className="text-sm font-semibold text-foreground">
                  {g.format.is_blind ? "Blind (not read)" : "Informed (read)"}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Style Tags */}
        <motion.div
          className="editorial-card p-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <h2 className="heading-serif text-xl mb-4 font-[family-name:var(--font-heading)] text-foreground">
            Interview Style
          </h2>
          <div className="flex flex-wrap gap-2">
            {g.style.map((s) => (
              <span
                key={s}
                className={`px-3 py-1.5 text-sm font-medium rounded-full ${styleColor(s)}`}
              >
                {s}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Common Themes */}
        <motion.div
          className="editorial-card p-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="heading-serif text-xl mb-4 font-[family-name:var(--font-heading)] text-foreground">
            Common Themes
          </h2>
          <div className="flex flex-wrap gap-2">
            {g.common_themes.map((theme) => (
              <span
                key={theme}
                className="px-3 py-1.5 text-sm font-medium rounded-full bg-primary/10 text-primary"
              >
                {theme}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Sample Questions */}
        <motion.div
          className="editorial-card p-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="heading-serif text-xl mb-4 font-[family-name:var(--font-heading)] text-foreground flex items-center gap-2">
            <MessageSquare size={20} className="text-primary" />
            Top Sample Questions
          </h2>
          <ol className="space-y-3">
            {g.sample_questions.map((q, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="w-6 h-6 shrink-0 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                  {idx + 1}
                </span>
                <p className="text-sm text-muted-foreground">{q}</p>
              </li>
            ))}
          </ol>
        </motion.div>

        {/* Red Flags */}
        <motion.div
          className="editorial-card p-6 border-l-4 border-red-400"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="heading-serif text-xl mb-4 font-[family-name:var(--font-heading)] text-foreground flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-500" />
            Red Flags to Avoid
          </h2>
          <ul className="space-y-2">
            {g.red_flags.map((flag, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Shield size={14} className="text-red-400 mt-0.5 shrink-0" />
                {flag}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Tips */}
        <motion.div
          className="editorial-card p-6 border-l-4 border-emerald-400"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h2 className="heading-serif text-xl mb-4 font-[family-name:var(--font-heading)] text-foreground flex items-center gap-2">
            <Lightbulb size={20} className="text-emerald-500" />
            Expert Tips
          </h2>
          <ul className="space-y-2">
            {g.tips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                <ArrowRight size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Interview Reports Section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <InterviewReportsSection slug={slug} />
        </motion.div>

        {/* CTA */}
        <motion.div
          className="text-center py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <Link
            href={`/interview?school=${slug}`}
            className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors text-lg"
          >
            Start Mock Interview
            <ArrowRight size={20} />
          </Link>
          <p className="text-xs text-muted-foreground mt-3">
            Practice with an AI interviewer tailored to {label}&apos;s style
          </p>
        </motion.div>

        <ToolCrossLinks current={`/interviews/guide/${slug}`} />
      </div>
    </main>
  );
}
