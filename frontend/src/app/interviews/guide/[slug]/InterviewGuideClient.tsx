"use client";

import { motion } from "framer-motion";
import {
  Clock, User, Video, Eye, EyeOff, AlertTriangle,
  Lightbulb, MessageSquare, ArrowRight, Shield,
} from "lucide-react";
import Link from "next/link";
import { ToolCrossLinks } from "@/components/ToolCrossLinks";
import { EmailCapture } from "@/components/EmailCapture";

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

function styleColor(style: string) {
  return STYLE_COLORS[style.toLowerCase()] || "bg-foreground/5 text-muted-foreground";
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
  const label = g.school_name || slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <main className="min-h-screen bg-background">
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

        {/* CTA */}
        <motion.div
          className="text-center py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
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

        <EmailCapture variant="contextual" source={`interview-guide-${slug}`} />
        <ToolCrossLinks current={`/interviews/guide/${slug}`} />
      </div>
    </main>
  );
}
