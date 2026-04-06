"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Video,
  Clock,
  ChevronDown,
  ChevronUp,
  Play,
  Square,
  Monitor,
  Eye,
  Lightbulb,
  Mic,
  Camera,
  Timer,
  CheckCircle2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { ToolCrossLinks } from "@/components/ToolCrossLinks";
import { pageTransition, listItem, stagger, scaleOnHover } from "@/lib/motion";

/* ─── Types ─── */

interface VideoSchool {
  id: string;
  name: string;
  format: string;
  questions: number;
  prep_time_sec: number | null;
  response_time_sec: number;
  platform: string;
  description: string;
  behavioral_focus: boolean;
}

interface SchoolTips {
  school_id: string;
  school_name: string;
  tips: string[];
  scoring_criteria: string[];
  practice_questions: string[];
  general_tips: Record<string, string[]>;
  format: {
    questions: number;
    prep_time_sec: number | null;
    response_time_sec: number;
    platform: string;
  };
}

type PracticePhase = "idle" | "prep" | "recording" | "done";

/* ─── Constants ─── */

const GENERAL_TIP_ICONS: Record<string, typeof Eye> = {
  body_language: Eye,
  eye_contact: Camera,
  lighting: Lightbulb,
  audio: Mic,
  background: Monitor,
  pacing: Timer,
};

const GENERAL_TIP_LABELS: Record<string, string> = {
  body_language: "Body Language",
  eye_contact: "Eye Contact",
  lighting: "Lighting",
  audio: "Audio",
  background: "Background",
  pacing: "Pacing",
};

/* ─── Circular Timer ─── */

function CircularTimer({
  timeLeft,
  totalTime,
  phase,
}: {
  timeLeft: number;
  totalTime: number;
  phase: PracticePhase;
}) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = totalTime > 0 ? timeLeft / totalTime : 0;
  const offset = circumference * (1 - progress);

  const phaseColor =
    phase === "prep"
      ? "text-amber-500"
      : phase === "recording"
        ? "text-red-500"
        : "text-emerald-500";

  const strokeColor =
    phase === "prep"
      ? "stroke-amber-500"
      : phase === "recording"
        ? "stroke-red-500"
        : "stroke-emerald-500";

  return (
    <div className="relative flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-border"
          strokeWidth="6"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          className={strokeColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.3s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={cn("text-3xl font-bold tabular-nums", phaseColor)}>
          {timeLeft}s
        </span>
        <span className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">
          {phase === "prep"
            ? "Prep"
            : phase === "recording"
              ? "Recording"
              : phase === "done"
                ? "Complete"
                : "Ready"}
        </span>
      </div>
    </div>
  );
}

/* ─── Practice Mode Modal ─── */

function PracticeMode({
  school,
  tips,
  onClose,
}: {
  school: VideoSchool;
  tips: SchoolTips;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<PracticePhase>("idle");
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const prepTime = school.prep_time_sec ?? 10;
  const recordTime = school.response_time_sec;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const pickQuestion = useCallback(() => {
    const questions = tips.practice_questions;
    const idx = Math.floor(Math.random() * questions.length);
    setQuestionIndex(idx);
    setCurrentQuestion(questions[idx]);
  }, [tips.practice_questions]);

  const startPractice = useCallback(() => {
    clearTimer();
    pickQuestion();
    setPhase("prep");
    setTimeLeft(prepTime);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          // Transition to recording
          setPhase("recording");
          setTimeLeft(recordTime);

          timerRef.current = setInterval(() => {
            setTimeLeft((p) => {
              if (p <= 1) {
                clearTimer();
                setPhase("done");
                return 0;
              }
              return p - 1;
            });
          }, 1000);

          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer, pickQuestion, prepTime, recordTime]);

  const stopPractice = useCallback(() => {
    clearTimer();
    setPhase("idle");
    setTimeLeft(0);
  }, [clearTimer]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const totalTime =
    phase === "prep"
      ? prepTime
      : phase === "recording"
        ? recordTime
        : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && phase === "idle") onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="bg-background border border-border rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Practice Mode
            </h3>
            <p className="text-sm text-muted-foreground">{school.name}</p>
          </div>
          <button
            onClick={onClose}
            disabled={phase !== "idle" && phase !== "done"}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
          >
            <Square className="w-5 h-5" />
          </button>
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          {phase !== "idle" && (
            <motion.div
              key={questionIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-muted/50 rounded-xl p-4 mb-6 border border-border"
            >
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Question
              </p>
              <p className="text-foreground font-medium">{currentQuestion}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timer */}
        <div className="flex justify-center mb-6">
          {phase === "idle" ? (
            <div className="text-center space-y-3">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {school.prep_time_sec !== null && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {prepTime}s prep
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-red-500" />
                  {recordTime}s response
                </span>
              </div>
              <p className="text-xs text-muted-foreground max-w-xs">
                Simulates the real experience: question appears, prep timer starts, then recording begins.
              </p>
            </div>
          ) : (
            <CircularTimer
              timeLeft={timeLeft}
              totalTime={totalTime}
              phase={phase}
            />
          )}
        </div>

        {/* Phase indicator */}
        {(phase === "prep" || phase === "recording") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center gap-2 mb-6"
          >
            <span
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                phase === "prep"
                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                  : "bg-muted text-muted-foreground"
              )}
            >
              Prepare
            </span>
            <span
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                phase === "recording"
                  ? "bg-red-500/10 text-red-500 border border-red-500/20"
                  : "bg-muted text-muted-foreground"
              )}
            >
              Record
            </span>
          </motion.div>
        )}

        {/* Done state */}
        {phase === "done" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Time&apos;s up! How did that feel? Try again or pick another question.
            </p>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          {phase === "idle" && (
            <button
              onClick={startPractice}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              <Play className="w-4 h-4" />
              Start Practice
            </button>
          )}
          {(phase === "prep" || phase === "recording") && (
            <button
              onClick={stopPractice}
              className="flex items-center gap-2 px-5 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
          )}
          {phase === "done" && (
            <>
              <button
                onClick={startPractice}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-5 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Done
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── School Card ─── */

function SchoolCard({
  school,
  isExpanded,
  onToggle,
  onPractice,
}: {
  school: VideoSchool;
  isExpanded: boolean;
  onToggle: () => void;
  onPractice: () => void;
}) {
  const [tips, setTips] = useState<SchoolTips | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isExpanded && !tips) {
      setLoading(true);
      apiFetch<SchoolTips>(`/api/video-essay/tips/${school.id}`)
        .then(setTips)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isExpanded, tips, school.id]);

  return (
    <motion.div
      variants={listItem}
      className="border border-border rounded-xl bg-background hover:border-foreground/10 transition-colors"
    >
      {/* Card Header */}
      <button
        onClick={onToggle}
        className="w-full text-left p-5 flex items-start justify-between gap-4"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="font-semibold text-foreground truncate">
              {school.name}
            </h3>
            {school.behavioral_focus && (
              <span className="shrink-0 text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500">
                Behavioral
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {school.description}
          </p>

          {/* Format pills */}
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
              <Video className="w-3 h-3" />
              {school.format}
            </span>
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
              <Sparkles className="w-3 h-3" />
              {school.questions} {school.questions === 1 ? "question" : "questions"}
            </span>
            {school.prep_time_sec !== null && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
                <Clock className="w-3 h-3" />
                {school.prep_time_sec}s prep
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
              <Timer className="w-3 h-3" />
              {school.response_time_sec}s response
            </span>
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
              <Monitor className="w-3 h-3" />
              {school.platform}
            </span>
          </div>
        </div>

        <div className="shrink-0 mt-1 text-muted-foreground">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-border pt-4 space-y-5">
              {loading && (
                <p className="text-sm text-muted-foreground animate-pulse">
                  Loading tips...
                </p>
              )}

              {tips && (
                <>
                  {/* School-specific tips */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      School-Specific Tips
                    </h4>
                    <ul className="space-y-1.5">
                      {tips.tips.map((tip, i) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground flex gap-2"
                        >
                          <span className="shrink-0 text-muted-foreground/50 mt-0.5">
                            &bull;
                          </span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Scoring criteria */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">
                      Scoring Criteria
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {tips.scoring_criteria.map((criterion, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        >
                          {criterion}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Sample questions */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">
                      Sample Questions
                    </h4>
                    <ul className="space-y-1.5">
                      {tips.practice_questions.slice(0, 5).map((q, i) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground flex gap-2"
                        >
                          <span className="shrink-0 text-primary font-medium w-4 text-right">
                            {i + 1}.
                          </span>
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* General tips */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3">
                      General Video Tips
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(tips.general_tips).map(([key, items]) => {
                        const Icon = GENERAL_TIP_ICONS[key] ?? Eye;
                        return (
                          <div
                            key={key}
                            className="p-2.5 rounded-lg bg-muted/50 border border-border"
                          >
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-xs font-medium text-foreground">
                                {GENERAL_TIP_LABELS[key] ?? key}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                              {items[0]}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Practice button */}
                  <motion.button
                    {...scaleOnHover}
                    onClick={onPractice}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Practice Mode
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Page ─── */

export default function VideoEssayPage() {
  const [schools, setSchools] = useState<VideoSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [practiceSchool, setPracticeSchool] = useState<VideoSchool | null>(null);
  const [practiceTips, setPracticeTips] = useState<SchoolTips | null>(null);

  useEffect(() => {
    apiFetch<{ schools: VideoSchool[] }>("/api/video-essay/schools")
      .then((data) => setSchools(data.schools))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openPractice = useCallback(
    async (school: VideoSchool) => {
      try {
        const tips = await apiFetch<SchoolTips>(
          `/api/video-essay/tips/${school.id}`
        );
        setPracticeSchool(school);
        setPracticeTips(tips);
      } catch {
        // Tips already loaded via expansion in most cases
      }
    },
    []
  );

  return (
    <motion.div
      {...pageTransition}
      className="min-h-screen bg-background"
    >
      <div className="max-w-4xl mx-auto px-4 py-10 md:py-14">
        {/* Hero */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <Video className="w-5 h-5 text-red-500" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Video Essay Prep
            </h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Several top MBA programs require video essays as part of their
            application. Each school has a unique format. Prepare with
            school-specific tips, practice questions, and a timed simulator
            that mirrors the real experience.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 rounded-xl bg-muted animate-pulse"
              />
            ))}
          </div>
        )}

        {/* School Cards */}
        {!loading && schools.length > 0 && (
          <motion.div
            variants={stagger}
            initial="initial"
            animate="animate"
            className="space-y-3"
          >
            {schools.map((school) => (
              <SchoolCard
                key={school.id}
                school={school}
                isExpanded={expandedId === school.id}
                onToggle={() =>
                  setExpandedId((prev) =>
                    prev === school.id ? null : school.id
                  )
                }
                onPractice={() => openPractice(school)}
              />
            ))}
          </motion.div>
        )}

        {/* Empty state */}
        {!loading && schools.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <Video className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No video essay data available right now.</p>
          </div>
        )}

        {/* Cross-links */}
        <div className="mt-14">
          <ToolCrossLinks current="/video-essay" />
        </div>
      </div>

      {/* Practice Mode Overlay */}
      <AnimatePresence>
        {practiceSchool && practiceTips && (
          <PracticeMode
            school={practiceSchool}
            tips={practiceTips}
            onClose={() => {
              setPracticeSchool(null);
              setPracticeTips(null);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
