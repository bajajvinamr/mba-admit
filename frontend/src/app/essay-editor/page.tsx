"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Save, Clock, ChevronDown, CheckCircle2, AlertTriangle,
  Sparkles, ArrowRight, RotateCcw, Loader2, TrendingUp, Scissors,
  RefreshCw, Target, Zap, BookOpen,
} from "lucide-react";
import Link from "next/link";
import { ToolCrossLinks } from "@/components/ToolCrossLinks";
import { EmailCapture } from "@/components/EmailCapture";
import { apiFetch } from "@/lib/api";

/* ── Types ─────────────────────────────────────────────────────────── */

type School = { id: string; name: string };

type Prompt = {
  prompt_id: string;
  prompt_index: number;
  prompt_text: string;
  word_limit: number | null;
};

type Suggestion = {
  start: number;
  end: number;
  type: "strengthen" | "cut" | "rephrase";
  text: string;
};

type Feedback = {
  overall_score: number;
  readiness: "draft" | "review" | "ready";
  suggestions: Suggestion[];
  strengths: string[];
  improvements: string[];
  word_count: number;
  word_limit: number | null;
};

type DraftVersion = {
  id: string;
  school_id: string;
  prompt_id: string;
  content: string;
  word_count: number;
  version: number;
  created_at: string;
  updated_at: string;
};

/* ── Helpers ───────────────────────────────────────────────────────── */

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const READINESS_CONFIG = {
  draft: { label: "Early Draft", color: "text-amber-600", bg: "bg-amber-100", border: "border-amber-200" },
  review: { label: "Needs Review", color: "text-blue-600", bg: "bg-blue-100", border: "border-blue-200" },
  ready: { label: "Submission Ready", color: "text-emerald-600", bg: "bg-emerald-100", border: "border-emerald-200" },
};

const SUGGESTION_COLORS = {
  strengthen: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", icon: TrendingUp },
  cut: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", icon: Scissors },
  rephrase: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: RefreshCw },
};

/* ── Page ──────────────────────────────────────────────────────────── */

export default function EssayEditorPage() {
  // School & prompt state
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState("");
  const [loadingPrompts, setLoadingPrompts] = useState(false);

  // Editor state
  const [content, setContent] = useState("");
  const [lastSavedContent, setLastSavedContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<string | null>(null);

  // Feedback state
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Version history state
  const [versions, setVersions] = useState<DraftVersion[]>([]);
  const [showVersions, setShowVersions] = useState(false);

  // Refs
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wordCount = countWords(content);
  const selectedPrompt = prompts.find((p) => p.prompt_id === selectedPromptId);
  const wordLimit = selectedPrompt?.word_limit || null;
  const hasUnsavedChanges = content !== lastSavedContent && content.trim().length > 0;

  // Word count progress
  const utilization = wordLimit ? (wordCount / wordLimit) * 100 : 0;
  const wordCountColor =
    !wordLimit ? "text-foreground/40" :
    utilization > 100 ? "text-red-500" :
    utilization >= 90 ? "text-amber-500" :
    "text-emerald-500";
  const progressBarColor =
    !wordLimit ? "bg-foreground/10" :
    utilization > 100 ? "bg-red-500" :
    utilization >= 90 ? "bg-amber-500" :
    "bg-emerald-500";

  // ── Load Schools ──────────────────────────────────────────────────
  useEffect(() => {
    apiFetch<School[]>("/api/schools/names")
      .then((data) => setSchools(data))
      .catch(console.error);
  }, []);

  // ── Load Prompts for selected school ──────────────────────────────
  useEffect(() => {
    if (!selectedSchoolId) {
      setPrompts([]);
      setSelectedPromptId("");
      return;
    }
    setLoadingPrompts(true);
    apiFetch<{ prompts: Prompt[] }>(`/api/essay/prompts/${selectedSchoolId}`)
      .then((data) => {
        setPrompts(data.prompts);
        if (data.prompts.length > 0) {
          setSelectedPromptId(data.prompts[0].prompt_id);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingPrompts(false));
  }, [selectedSchoolId]);

  // ── Load drafts when prompt changes ───────────────────────────────
  useEffect(() => {
    if (!selectedSchoolId) return;
    apiFetch<{ drafts: DraftVersion[] }>(`/api/essay/drafts/${selectedSchoolId}`)
      .then((data) => {
        const promptDrafts = data.drafts.filter((d) => d.prompt_id === selectedPromptId);
        setVersions(promptDrafts);
        // Load the latest version
        if (promptDrafts.length > 0) {
          const latest = promptDrafts[0]; // Already sorted by version desc
          setContent(latest.content);
          setLastSavedContent(latest.content);
        } else {
          setContent("");
          setLastSavedContent("");
        }
      })
      .catch(console.error);
  }, [selectedSchoolId, selectedPromptId]);

  // ── Reset feedback when content changes significantly ─────────────
  useEffect(() => {
    if (feedback && content !== lastSavedContent) {
      // Don't clear immediately, just mark as potentially stale
    }
  }, [content, feedback, lastSavedContent]);

  // ── Save Draft ────────────────────────────────────────────────────
  const saveDraft = useCallback(async () => {
    if (!selectedSchoolId || !selectedPromptId || !content.trim()) return;
    if (content === lastSavedContent) return;

    setSaving(true);
    try {
      const data = await apiFetch<{ draft: DraftVersion }>("/api/essay/save-draft", {
        method: "POST",
        body: JSON.stringify({
          school_id: selectedSchoolId,
          prompt_id: selectedPromptId,
          content,
        }),
      });
      setLastSavedContent(content);
      setLastSaveTime(new Date().toISOString());
      setVersions((prev) => [data.draft, ...prev]);
    } catch (e) {
      console.error("Save failed:", e);
    } finally {
      setSaving(false);
    }
  }, [selectedSchoolId, selectedPromptId, content, lastSavedContent]);

  // ── Auto-save every 30 seconds ────────────────────────────────────
  useEffect(() => {
    if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setInterval(() => {
      if (hasUnsavedChanges) {
        saveDraft();
      }
    }, 30000);
    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [saveDraft, hasUnsavedChanges]);

  // ── Get AI Feedback ───────────────────────────────────────────────
  const getFeedback = async () => {
    if (!content.trim() || countWords(content) < 30) {
      setFeedbackError("Write at least 30 words before requesting AI feedback.");
      return;
    }
    if (!selectedSchoolId || !selectedPromptId) {
      setFeedbackError("Select a school and prompt first.");
      return;
    }

    setLoadingFeedback(true);
    setFeedbackError(null);
    setFeedback(null);

    try {
      const data = await apiFetch<Feedback>("/api/essay/ai-feedback", {
        method: "POST",
        body: JSON.stringify({
          school_id: selectedSchoolId,
          prompt_text: selectedPrompt?.prompt_text || "",
          content,
          word_limit: wordLimit,
        }),
        noRetry: true,
        timeoutMs: 60_000,
      });
      setFeedback(data);
    } catch (e) {
      console.error(e);
      setFeedbackError("Failed to get AI feedback. Please try again.");
    } finally {
      setLoadingFeedback(false);
    }
  };

  // ── Load previous version ─────────────────────────────────────────
  const loadVersion = (version: DraftVersion) => {
    setContent(version.content);
    setShowVersions(false);
  };

  // ── Score Circle Component ────────────────────────────────────────
  const ScoreCircle = ({ score }: { score: number }) => {
    const circumference = 2 * Math.PI * 42;
    const progress = (score / 100) * circumference;
    const scoreColor =
      score >= 71 ? "#10b981" :
      score >= 41 ? "#3b82f6" :
      "#f59e0b";

    return (
      <div className="relative w-28 h-28 mx-auto">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-foreground/5" />
          <circle cx="50" cy="50" r="42" fill="none" stroke={scoreColor} strokeWidth="6"
            strokeDasharray={circumference} strokeDashoffset={circumference - progress}
            strokeLinecap="round" className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-foreground">{score}</span>
          <span className="text-[9px] uppercase tracking-widest text-foreground/40">Score</span>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <section className="bg-foreground text-white py-16 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 text-white/80 font-bold uppercase tracking-widest text-[10px] mb-6">
            <Sparkles size={12} /> AI-Powered Editor
          </div>
          <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
            Essay Editor
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Write, refine, and get AI feedback on your MBA essays. Track versions and reach submission readiness.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* School & Prompt Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-foreground/40 font-bold mb-2">
              Target School
            </label>
            <select
              value={selectedSchoolId}
              onChange={(e) => {
                setSelectedSchoolId(e.target.value);
                setSelectedPromptId("");
                setFeedback(null);
                setContent("");
                setLastSavedContent("");
                setVersions([]);
              }}
              className="w-full border border-border/10 px-4 py-3 text-sm focus:border-border focus:outline-none bg-background"
            >
              <option value="">Select a school...</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-foreground/40 font-bold mb-2">
              Essay Prompt
            </label>
            <select
              value={selectedPromptId}
              onChange={(e) => {
                setSelectedPromptId(e.target.value);
                setFeedback(null);
              }}
              disabled={!selectedSchoolId || loadingPrompts}
              className="w-full border border-border/10 px-4 py-3 text-sm focus:border-border focus:outline-none bg-background disabled:opacity-50"
            >
              {!selectedSchoolId && <option>Select a school first</option>}
              {loadingPrompts && <option>Loading prompts...</option>}
              {prompts.map((p) => (
                <option key={p.prompt_id} value={p.prompt_id}>
                  {p.prompt_text.length > 80 ? p.prompt_text.substring(0, 80) + "..." : p.prompt_text}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Prompt Display */}
        {selectedPrompt && (
          <div className="mb-6 p-4 bg-primary/5 border border-primary/10 rounded-lg">
            <div className="flex items-start gap-3">
              <BookOpen size={16} className="text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-foreground">{selectedPrompt.prompt_text}</p>
                {selectedPrompt.word_limit && (
                  <p className="text-xs text-foreground/40 mt-1">Word limit: {selectedPrompt.word_limit} words</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Editor + Feedback Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Left: Editor */}
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={saveDraft}
                  disabled={!hasUnsavedChanges || saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-foreground text-white text-sm font-medium rounded-lg hover:bg-foreground/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save
                </button>
                <button
                  onClick={getFeedback}
                  disabled={loadingFeedback || !content.trim() || !selectedSchoolId}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary text-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingFeedback ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Get AI Feedback
                </button>
              </div>
              <div className="flex items-center gap-3">
                {/* Version History Toggle */}
                <button
                  onClick={() => setShowVersions(!showVersions)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-foreground/50 hover:text-foreground/80 transition-colors"
                >
                  <Clock size={14} />
                  <span>{versions.length} version{versions.length !== 1 ? "s" : ""}</span>
                  <ChevronDown size={12} className={`transition-transform ${showVersions ? "rotate-180" : ""}`} />
                </button>
                {/* Save indicator */}
                {lastSaveTime && !hasUnsavedChanges && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-500">
                    <CheckCircle2 size={10} /> Saved
                  </span>
                )}
                {hasUnsavedChanges && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-500">
                    <AlertTriangle size={10} /> Unsaved
                  </span>
                )}
              </div>
            </div>

            {/* Version History Dropdown */}
            <AnimatePresence>
              {showVersions && versions.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-card border border-border/10 rounded-lg p-4 max-h-60 overflow-y-auto">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/30 mb-3">
                      Version History
                    </p>
                    <div className="space-y-1">
                      {versions.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => loadVersion(v)}
                          className="w-full text-left p-3 rounded-lg hover:bg-foreground/3 transition-colors flex items-center justify-between group"
                        >
                          <div>
                            <span className="text-sm font-medium text-foreground">v{v.version}</span>
                            <span className="text-xs text-foreground/30 ml-2">{v.word_count} words</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-foreground/30">{formatTime(v.created_at)}</span>
                            <RotateCcw size={12} className="text-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Textarea Editor */}
            <div className="editorial-card overflow-hidden">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={selectedSchoolId ? "Start writing your essay..." : "Select a school and prompt to begin..."}
                disabled={!selectedSchoolId || !selectedPromptId}
                className="w-full min-h-[500px] p-6 text-[15px] leading-relaxed text-foreground bg-card resize-y focus:outline-none placeholder:text-foreground/15 disabled:opacity-40"
                onKeyDown={(e) => {
                  // Ctrl/Cmd+S to save
                  if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                    e.preventDefault();
                    saveDraft();
                  }
                }}
              />

              {/* Word Count Bar */}
              <div className="px-6 py-3 bg-foreground/3 border-t border-border/5">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-medium ${wordCountColor}`}>
                    {wordCount} words
                    {wordLimit && (
                      <span className="text-foreground/30">
                        {" "}/ {wordLimit} limit ({Math.round(utilization)}%)
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-foreground/30">
                    {content.length} characters
                  </span>
                </div>
                {wordLimit && (
                  <div className="w-full h-1.5 bg-foreground/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${progressBarColor}`}
                      style={{ width: `${Math.min(utilization, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Feedback Error */}
            {feedbackError && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 text-sm rounded-lg flex items-center justify-between">
                <span>{feedbackError}</span>
                <button onClick={() => setFeedbackError(null)} className="text-sm font-bold underline ml-3">
                  Dismiss
                </button>
              </div>
            )}
          </div>

          {/* Right: Feedback Panel */}
          <div className="space-y-4">
            {/* Submission Readiness - Always visible when feedback exists */}
            {feedback ? (
              <>
                {/* Score Circle */}
                <div className="editorial-card p-6 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/30 mb-4">
                    Submission Readiness
                  </p>
                  <ScoreCircle score={feedback.overall_score} />
                  <div className="mt-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full ${READINESS_CONFIG[feedback.readiness].bg} ${READINESS_CONFIG[feedback.readiness].color} ${READINESS_CONFIG[feedback.readiness].border} border`}>
                      <Target size={12} />
                      {READINESS_CONFIG[feedback.readiness].label}
                    </span>
                  </div>
                </div>

                {/* Inline Suggestions */}
                {feedback.suggestions.length > 0 && (
                  <div className="editorial-card p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/30 mb-3">
                      Suggestions ({feedback.suggestions.length})
                    </p>
                    <div className="space-y-2.5">
                      {feedback.suggestions.map((s, i) => {
                        const config = SUGGESTION_COLORS[s.type];
                        const Icon = config.icon;
                        return (
                          <div key={i} className={`p-3 rounded-lg border ${config.bg} ${config.border}`}>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Icon size={12} className={config.text} />
                              <span className={`text-[10px] font-bold uppercase tracking-wide ${config.text}`}>
                                {s.type}
                              </span>
                              <span className="text-[9px] text-foreground/30 ml-auto">
                                words {s.start}-{s.end}
                              </span>
                            </div>
                            <p className="text-xs text-foreground/70 leading-relaxed">{s.text}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Strengths */}
                {feedback.strengths.length > 0 && (
                  <div className="editorial-card p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-3 flex items-center gap-1.5">
                      <CheckCircle2 size={12} /> Strengths
                    </p>
                    <ul className="space-y-2">
                      {feedback.strengths.map((s, i) => (
                        <li key={i} className="text-xs text-foreground/60 leading-relaxed flex items-start gap-2">
                          <span className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Improvements */}
                {feedback.improvements.length > 0 && (
                  <div className="editorial-card p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-3 flex items-center gap-1.5">
                      <Zap size={12} /> Areas to Improve
                    </p>
                    <ul className="space-y-2">
                      {feedback.improvements.map((s, i) => (
                        <li key={i} className="text-xs text-foreground/60 leading-relaxed flex items-start gap-2">
                          <span className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : loadingFeedback ? (
              <div className="editorial-card p-12 text-center">
                <Loader2 size={32} className="mx-auto text-primary animate-spin mb-4" />
                <p className="text-sm font-medium text-foreground">Analyzing your essay...</p>
                <p className="text-xs text-foreground/40 mt-1">
                  Claude is reviewing for structure, authenticity, and impact
                </p>
              </div>
            ) : (
              <div className="editorial-card p-8 text-center">
                <Sparkles size={32} className="mx-auto text-foreground/10 mb-4" />
                <p className="text-sm font-medium text-foreground/40 mb-2">AI Feedback</p>
                <p className="text-xs text-foreground/25 max-w-[240px] mx-auto">
                  {selectedSchoolId
                    ? "Write your essay and click \"Get AI Feedback\" for a detailed review with inline suggestions."
                    : "Select a school and prompt to begin writing. AI feedback will appear here."
                  }
                </p>
              </div>
            )}

            {/* Quick Links */}
            <div className="editorial-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/30 mb-3">
                Related Tools
              </p>
              <div className="space-y-1.5">
                <Link href="/evaluator" className="flex items-center justify-between p-2 rounded hover:bg-foreground/3 text-sm text-foreground/60 hover:text-foreground transition-colors">
                  <span>Essay B.S. Detector</span>
                  <ArrowRight size={12} />
                </Link>
                <Link href="/essay-themes" className="flex items-center justify-between p-2 rounded hover:bg-foreground/3 text-sm text-foreground/60 hover:text-foreground transition-colors">
                  <span>Theme Analyzer</span>
                  <ArrowRight size={12} />
                </Link>
                <Link href="/storyteller" className="flex items-center justify-between p-2 rounded hover:bg-foreground/3 text-sm text-foreground/60 hover:text-foreground transition-colors">
                  <span>Story Brainstormer</span>
                  <ArrowRight size={12} />
                </Link>
                <Link href="/essay-drafts" className="flex items-center justify-between p-2 rounded hover:bg-foreground/3 text-sm text-foreground/60 hover:text-foreground transition-colors">
                  <span>Draft Manager</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <EmailCapture variant="contextual" source="essay-editor" />
        </div>
        <ToolCrossLinks current="/essay-editor" />
      </div>
    </main>
  );
}
