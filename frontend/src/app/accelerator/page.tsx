"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  CheckCircle2, Circle, Rocket, ChevronDown, ChevronRight,
  Clock, Lock, ArrowRight, Target, Sparkles, BookOpen,
  GraduationCap, PenTool, FileText, Users, Mic, Send,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { ToolCrossLinks } from "@/components/ToolCrossLinks";

// ── Types ───────────────────────────────────────────────────────────────────

interface Task {
  title: string;
  description: string;
  tool_link: string;
  estimated_minutes: number;
  required: boolean;
  index: number;
  completed: boolean;
  completed_at: string | null;
}

interface WeekProgress {
  week: number;
  title: string;
  completed_count: number;
  total_count: number;
  status: "complete" | "in_progress" | "not_started";
  tasks: Task[];
}

interface ProgressData {
  completed_tasks: number;
  total_tasks: number;
  overall_pct: number;
  current_week: number;
  weeks: WeekProgress[];
}

interface CurriculumTask {
  title: string;
  description: string;
  tool_link: string;
  estimated_minutes: number;
  required: boolean;
}

interface CurriculumWeek {
  week: number;
  title: string;
  subtitle: string;
  description: string;
  links: string[];
  tasks: CurriculumTask[];
}

interface CurriculumData {
  weeks: CurriculumWeek[];
  total_weeks: number;
  total_tasks: number;
}

// ── Constants ───────────────────────────────────────────────────────────────

const WEEK_ICONS: Record<number, React.ReactNode> = {
  1: <Target size={18} />,
  2: <BookOpen size={18} />,
  3: <GraduationCap size={18} />,
  4: <PenTool size={18} />,
  5: <FileText size={18} />,
  6: <Users size={18} />,
  7: <Mic size={18} />,
  8: <Send size={18} />,
};

const MOTIVATIONAL_MESSAGES: { threshold: number; message: string }[] = [
  { threshold: 0, message: "Every admit letter starts with a first step. Let's go." },
  { threshold: 10, message: "You're building momentum. Keep going." },
  { threshold: 25, message: "Quarter of the way there. The hardest part is starting — and you did." },
  { threshold: 50, message: "Halfway through. You're ahead of most applicants right now." },
  { threshold: 75, message: "The finish line is in sight. Don't slow down." },
  { threshold: 90, message: "Almost there. Final push." },
  { threshold: 100, message: "You did it. Every application, done. Now go get that admit letter." },
];

function getMotivationalMessage(pct: number): string {
  let msg = MOTIVATIONAL_MESSAGES[0].message;
  for (const m of MOTIVATIONAL_MESSAGES) {
    if (pct >= m.threshold) msg = m.message;
  }
  return msg;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function AcceleratorPage() {
  const [curriculum, setCurriculum] = useState<CurriculumData | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [currData, progData] = await Promise.all([
        apiFetch<CurriculumData>("/api/accelerator/curriculum"),
        apiFetch<ProgressData>("/api/accelerator/progress"),
      ]);
      setCurriculum(currData);
      setProgress(progData);
      // Auto-expand current week
      if (!expandedWeek) {
        setExpandedWeek(progData.current_week);
      }
    } catch (err) {
      console.error("Failed to load accelerator data:", err);
    } finally {
      setLoading(false);
    }
  }, [expandedWeek]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleTask = async (week: number, taskIndex: number, currentCompleted: boolean) => {
    const key = `${week}-${taskIndex}`;
    if (toggling === key) return;
    setToggling(key);

    try {
      const result = await apiFetch<{
        saved: { week: number; task_index: number; completed: boolean; completed_at: string | null };
        completed_tasks: number;
        total_tasks: number;
        overall_pct: number;
        current_week: number;
      }>("/api/accelerator/progress", {
        method: "POST",
        body: JSON.stringify({
          week,
          task_index: taskIndex,
          completed: !currentCompleted,
        }),
      });

      // Optimistic update merged with server response
      setProgress((prev) => {
        if (!prev) return prev;
        const updatedWeeks = prev.weeks.map((w) => {
          if (w.week !== week) return w;
          const updatedTasks = w.tasks.map((t) => {
            if (t.index !== taskIndex) return t;
            return { ...t, completed: !currentCompleted, completed_at: result.saved.completed_at };
          });
          const completedCount = updatedTasks.filter((t) => t.completed).length;
          return {
            ...w,
            tasks: updatedTasks,
            completed_count: completedCount,
            status: completedCount === w.total_count
              ? "complete" as const
              : completedCount > 0
                ? "in_progress" as const
                : "not_started" as const,
          };
        });
        return {
          ...prev,
          weeks: updatedWeeks,
          completed_tasks: result.completed_tasks,
          total_tasks: result.total_tasks,
          overall_pct: result.overall_pct,
          current_week: result.current_week,
        };
      });
    } catch (err) {
      console.error("Failed to toggle task:", err);
    } finally {
      setToggling(null);
    }
  };

  const getFirstIncompleteLink = (weekData: CurriculumWeek, weekProgress: WeekProgress): string => {
    for (let i = 0; i < weekProgress.tasks.length; i++) {
      if (!weekProgress.tasks[i].completed) {
        return weekData.tasks[i].tool_link;
      }
    }
    return weekData.tasks[0].tool_link;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading your accelerator...</div>
      </div>
    );
  }

  if (!curriculum || !progress) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Failed to load accelerator. Please refresh.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
            <Rocket size={14} />
            8-Week Program
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-3">
            Application Accelerator
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            A structured path from profile to admit letter. No guesswork.
          </p>
        </motion.div>

        {/* ── Overall Progress ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mb-10 p-5 rounded-xl border border-border/50 bg-card"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">
              {progress.overall_pct}% complete
            </span>
            <span className="text-xs text-muted-foreground">
              Week {progress.current_week} of 8 &middot; {progress.completed_tasks}/{progress.total_tasks} tasks
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress.overall_pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </motion.div>

        {/* ── Week Timeline ────────────────────────────────────────────── */}
        <div className="space-y-3">
          {curriculum.weeks.map((weekData, idx) => {
            const weekProg = progress.weeks.find((w) => w.week === weekData.week);
            if (!weekProg) return null;

            const isExpanded = expandedWeek === weekData.week;
            const isCurrent = progress.current_week === weekData.week;
            const isComplete = weekProg.status === "complete";
            const isInProgress = weekProg.status === "in_progress";

            return (
              <motion.div
                key={weekData.week}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * idx, duration: 0.35 }}
              >
                <div
                  className={cn(
                    "rounded-xl border transition-all duration-200",
                    isCurrent
                      ? "border-primary/50 bg-card shadow-sm shadow-primary/5"
                      : isComplete
                        ? "border-emerald-200/50 bg-card"
                        : "border-border/30 bg-card/50",
                  )}
                >
                  {/* Week Header */}
                  <button
                    onClick={() => setExpandedWeek(isExpanded ? null : weekData.week)}
                    className="w-full flex items-center gap-4 p-4 text-left"
                  >
                    {/* Week indicator */}
                    <div
                      className={cn(
                        "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                        isComplete
                          ? "bg-emerald-100 text-emerald-600"
                          : isCurrent
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {isComplete ? (
                        <CheckCircle2 size={20} />
                      ) : (
                        WEEK_ICONS[weekData.week] || <span className="text-sm font-bold">{weekData.week}</span>
                      )}
                    </div>

                    {/* Title + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Week {weekData.week}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            Current
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {weekData.title}
                        <span className="font-normal text-muted-foreground"> &mdash; {weekData.subtitle}</span>
                      </h3>
                    </div>

                    {/* Completion + chevron */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          isComplete
                            ? "text-emerald-600"
                            : isInProgress
                              ? "text-primary"
                              : "text-muted-foreground",
                        )}
                      >
                        {weekProg.completed_count}/{weekProg.total_count}
                      </span>
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown size={16} className="text-muted-foreground" />
                      </motion.div>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4">
                          <p className="text-xs text-muted-foreground mb-4 ml-14">
                            {weekData.description}
                          </p>

                          {/* Tasks */}
                          <div className="space-y-2 ml-14">
                            {weekProg.tasks.map((task, taskIdx) => {
                              const currTask = weekData.tasks[taskIdx];
                              const isToggling = toggling === `${weekData.week}-${taskIdx}`;

                              return (
                                <div
                                  key={taskIdx}
                                  className={cn(
                                    "flex items-start gap-3 p-3 rounded-lg transition-colors",
                                    task.completed
                                      ? "bg-emerald-50/50"
                                      : "bg-muted/30 hover:bg-muted/50",
                                  )}
                                >
                                  <button
                                    onClick={() => toggleTask(weekData.week, taskIdx, task.completed)}
                                    disabled={isToggling}
                                    className={cn(
                                      "flex-shrink-0 mt-0.5 transition-colors",
                                      isToggling && "opacity-50",
                                    )}
                                  >
                                    {task.completed ? (
                                      <CheckCircle2
                                        size={18}
                                        className="text-emerald-500"
                                      />
                                    ) : (
                                      <Circle
                                        size={18}
                                        className="text-muted-foreground/50 hover:text-primary transition-colors"
                                      />
                                    )}
                                  </button>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={cn(
                                          "text-sm font-medium",
                                          task.completed
                                            ? "text-muted-foreground line-through"
                                            : "text-foreground",
                                        )}
                                      >
                                        {currTask.title}
                                      </span>
                                      {!currTask.required && (
                                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                          Optional
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                      {currTask.description}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1.5">
                                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <Clock size={10} />
                                        {currTask.estimated_minutes} min
                                      </span>
                                      {!task.completed && (
                                        <Link
                                          href={currTask.tool_link}
                                          className="text-[10px] font-medium text-primary hover:text-primary/80 flex items-center gap-0.5 transition-colors"
                                        >
                                          Open tool <ArrowRight size={10} />
                                        </Link>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Start button for incomplete weeks */}
                          {weekProg.status !== "complete" && (
                            <div className="mt-3 ml-14">
                              <Link
                                href={getFirstIncompleteLink(weekData, weekProg)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                              >
                                {weekProg.status === "in_progress" ? "Continue" : "Start"} Week {weekData.week}
                                <ArrowRight size={14} />
                              </Link>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── Motivational Footer ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-10 text-center"
        >
          <p className="text-sm text-muted-foreground italic">
            {getMotivationalMessage(progress.overall_pct)}
          </p>
        </motion.div>

        {/* ── Cross Links ──────────────────────────────────────────────── */}
        <ToolCrossLinks current="/accelerator" />
      </div>
    </div>
  );
}
