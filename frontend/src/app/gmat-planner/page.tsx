"use client";

import { useState, useEffect } from"react";
import { motion } from"framer-motion";
import {
 BookOpen, Target, Clock, Calendar, TrendingUp,
 CheckCircle2, BarChart3, Zap, GraduationCap,
} from"lucide-react";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import { EmailCapture } from"@/components/EmailCapture";

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

type PlanInputs = {
 currentScore: number | null; // null ="Not taken yet"
 targetScore: number;
 hoursPerWeek: number;
 testDate: string; // ISO date string
};

type Phase = {
 name: string;
 weeks: number;
 focus: string;
 icon: React.ReactNode;
 color: string;
 tasks: string[];
};

type Milestone = {
 week: number;
 label: string;
};

type StudyPlan = {
 inputs: PlanInputs;
 weeksUntilTest: number;
 totalHours: number;
 scoreGap: number;
 gapCategory:"fine-tuning"|"moderate"|"significant";
 gapLabel: string;
 gapAdvice: string;
 phases: Phase[];
 milestones: Milestone[];
 resources: string[];
};

/* ------------------------------------------------------------------ */
/* Plan Generator */
/* ------------------------------------------------------------------ */

const STORAGE_KEY ="gmat-study-plan";

function generatePlan(inputs: PlanInputs): StudyPlan {
 const now = new Date();
 const test = new Date(inputs.testDate);
 const diffMs = test.getTime() - now.getTime();
 const weeksUntilTest = Math.max(1, Math.round(diffMs / (7 * 24 * 60 * 60 * 1000)));
 const totalHours = weeksUntilTest * inputs.hoursPerWeek;

 const current = inputs.currentScore ?? 500; // assume 500 baseline if not taken
 const scoreGap = Math.max(0, inputs.targetScore - current);

 let gapCategory: StudyPlan["gapCategory"];
 let gapLabel: string;
 let gapAdvice: string;

 if (scoreGap < 30) {
 gapCategory ="fine-tuning";
 gapLabel ="Fine-tuning";
 gapAdvice ="Focus on timing strategy, error pattern analysis, and eliminating careless mistakes. You are close to your goal.";
 } else if (scoreGap <= 70) {
 gapCategory ="moderate";
 gapLabel ="Moderate Improvement";
 gapAdvice ="Balance concept review with heavy practice. Identify your 2-3 weakest areas and prioritize targeted drills.";
 } else {
 gapCategory ="significant";
 gapLabel ="Significant Lift";
 gapAdvice ="Build a strong foundation first. Master core concepts before moving to timed practice. Consistency matters more than intensity.";
 }

 // Phase distribution
 const p1Weeks = Math.max(1, Math.round(weeksUntilTest * 0.3));
 const p2Weeks = Math.max(1, Math.round(weeksUntilTest * 0.4));
 const p3Weeks = Math.max(1, weeksUntilTest - p1Weeks - p2Weeks);

 const phases: Phase[] = [
 {
 name:"Phase 1: Foundation",
 weeks: p1Weeks,
 focus: `Weeks 1\u2013${p1Weeks} \u00B7 ${Math.round(p1Weeks * inputs.hoursPerWeek)} hours`,
 icon: <BookOpen size={18} />,
 color:"bg-blue-50 text-blue-600 border-blue-200",
 tasks: [
"Review core Quantitative concepts (number properties, algebra, geometry)",
"Study Verbal fundamentals (sentence correction rules, CR argument structure)",
"Learn the GMAT question format and adaptive scoring mechanics",
"Take a diagnostic practice test to identify baseline weaknesses",
"Build a formula and rules reference sheet",
 ],
 },
 {
 name:"Phase 2: Practice",
 weeks: p2Weeks,
 focus: `Weeks ${p1Weeks + 1}\u2013${p1Weeks + p2Weeks} \u00B7 ${Math.round(p2Weeks * inputs.hoursPerWeek)} hours`,
 icon: <BarChart3 size={18} />,
 color:"bg-primary/10 text-primary border-primary/30",
 tasks: [
"Complete daily problem sets targeting weak areas",
"Sectional timed practice (Quant and Verbal separately)",
"Review every wrong answer \u2014 maintain an error log",
"Practice Data Insights section (data sufficiency, multi-source reasoning)",
"Take a full-length practice test every 2 weeks",
 ],
 },
 {
 name:"Phase 3: Refinement",
 weeks: p3Weeks,
 focus: `Weeks ${p1Weeks + p2Weeks + 1}\u2013${weeksUntilTest} \u00B7 ${Math.round(p3Weeks * inputs.hoursPerWeek)} hours`,
 icon: <Zap size={18} />,
 color:"bg-emerald-50 text-emerald-600 border-emerald-200",
 tasks: [
"Full-length practice tests under realistic conditions",
"Refine timing strategy \u2014 practice pacing per section",
"Focus only on high-frequency error patterns",
"Simulate test-day conditions (morning sessions, timed breaks)",
"Light review only in the final 3 days \u2014 no new material",
 ],
 },
 ];

 // Milestones: practice test every 2 weeks
 const milestones: Milestone[] = [];
 for (let w = 2; w <= weeksUntilTest; w += 2) {
 milestones.push({ week: w, label: `Practice Test ${milestones.length + 1}` });
 }
 // Final test day
 milestones.push({ week: weeksUntilTest, label:"Test Day"});

 const resources = [
"Official practice tests from the test maker",
"Quantitative concept review guides",
"Verbal reasoning workbooks",
"Online adaptive practice question banks",
"Error log spreadsheet or notebook",
"Timed sectional drill sets",
"Video explanations for difficult concept areas",
"Study group or accountability partner",
 ];

 return {
 inputs,
 weeksUntilTest,
 totalHours,
 scoreGap,
 gapCategory,
 gapLabel,
 gapAdvice,
 phases,
 milestones,
 resources,
 };
}

/* ------------------------------------------------------------------ */
/* Component */
/* ------------------------------------------------------------------ */

export default function GmatPlannerPage() {
 const [currentScore, setCurrentScore] = useState<number | null>(null);
 const [notTakenYet, setNotTakenYet] = useState(true);
 const [targetScore, setTargetScore] = useState<number>(700);
 const [hoursPerWeek, setHoursPerWeek] = useState<number>(10);
 const [testDate, setTestDate] = useState<string>("");
 const [plan, setPlan] = useState<StudyPlan | null>(null);

 // Load saved plan on mount
 useEffect(() => {
 try {
 const saved = localStorage.getItem(STORAGE_KEY);
 if (saved) {
 const parsed = JSON.parse(saved) as StudyPlan;
 setPlan(parsed);
 setCurrentScore(parsed.inputs.currentScore);
 setNotTakenYet(parsed.inputs.currentScore === null);
 setTargetScore(parsed.inputs.targetScore);
 setHoursPerWeek(parsed.inputs.hoursPerWeek);
 setTestDate(parsed.inputs.testDate);
 }
 } catch { /* ignore corrupt data */ }
 }, []);

 const handleSubmit = () => {
 if (!testDate) return;
 const inputs: PlanInputs = {
 currentScore: notTakenYet ? null : currentScore,
 targetScore,
 hoursPerWeek,
 testDate,
 };
 const newPlan = generatePlan(inputs);
 setPlan(newPlan);
 localStorage.setItem(STORAGE_KEY, JSON.stringify(newPlan));
 };

 const clearPlan = () => {
 setPlan(null);
 localStorage.removeItem(STORAGE_KEY);
 };

 // Min date for the date picker = tomorrow
 const tomorrow = new Date();
 tomorrow.setDate(tomorrow.getDate() + 1);
 const minDate = tomorrow.toISOString().split("T")[0];

 return (
 <main className="min-h-screen bg-background">
 {/* Hero */}
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-4xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 GMAT Study Planner
 </h1>
 <p className="text-white/70 text-lg">
 Personalized week-by-week study schedule based on your goals.
 </p>
 </div>
 </section>

 <div className="max-w-3xl mx-auto px-6 py-10">
 {/* Input Form */}
 <div className="editorial-card p-8">
 <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/40 mb-6">
 Your Details
 </h2>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Current Score */}
 <div>
 <label className="text-xs font-medium text-foreground/50 block mb-2">Current Score</label>
 <div className="flex items-center gap-3 mb-2">
 <label className="flex items-center gap-1.5 text-xs text-foreground/60 cursor-pointer">
 <input
 type="checkbox"
 checked={notTakenYet}
 onChange={(e) => {
 setNotTakenYet(e.target.checked);
 if (e.target.checked) setCurrentScore(null);
 }}
 className="rounded border-border/20 text-primary focus:ring-primary/50"
 />
 Not taken yet
 </label>
 </div>
 {!notTakenYet && (
 <input
 type="number"
 min={200}
 max={800}
 step={10}
 placeholder="e.g. 620"
 value={currentScore ??""}
 onChange={(e) => setCurrentScore(e.target.value ? +e.target.value : null)}
 className="w-full px-4 py-3 text-lg font-bold border border-border/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
 />
 )}
 </div>

 {/* Target Score */}
 <div>
 <label className="text-xs font-medium text-foreground/50 block mb-2">Target Score</label>
 <input
 type="number"
 min={200}
 max={800}
 step={10}
 value={targetScore}
 onChange={(e) => setTargetScore(+e.target.value)}
 className="w-full px-4 py-3 text-lg font-bold border border-border/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
 />
 <p className="text-[10px] text-foreground/30 mt-1">200 - 800</p>
 </div>

 {/* Hours per week */}
 <div>
 <label className="text-xs font-medium text-foreground/50 block mb-2">Study Hours / Week</label>
 <input
 type="number"
 min={1}
 max={60}
 value={hoursPerWeek}
 onChange={(e) => setHoursPerWeek(+e.target.value)}
 className="w-full px-4 py-3 text-lg font-bold border border-border/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
 />
 <p className="text-[10px] text-foreground/30 mt-1">Most successful test-takers study 10-20 hrs/week</p>
 </div>

 {/* Test Date */}
 <div>
 <label className="text-xs font-medium text-foreground/50 block mb-2">Target Test Date</label>
 <input
 type="date"
 min={minDate}
 value={testDate}
 onChange={(e) => setTestDate(e.target.value)}
 className="w-full px-4 py-3 text-lg font-bold border border-border/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
 />
 </div>
 </div>

 <div className="flex gap-3 mt-8">
 <button
 onClick={handleSubmit}
 disabled={!testDate}
 className="flex-1 py-3 bg-primary text-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-40 transition-all"
 >
 Generate Study Plan
 </button>
 {plan && (
 <button
 onClick={clearPlan}
 className="px-6 py-3 border border-border/10 text-foreground/50 font-medium rounded-lg hover:border-border/30 transition-all"
 >
 Clear
 </button>
 )}
 </div>
 </div>

 {/* Plan Output */}
 {plan && (
 <motion.div
 initial={{ opacity: 0, y: 16 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.3 }}
 >
 {/* Summary Stats */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
 {[
 { label:"Weeks", value: plan.weeksUntilTest, icon: <Calendar size={16} /> },
 { label:"Total Hours", value: plan.totalHours, icon: <Clock size={16} /> },
 { label:"Score Gap", value: plan.scoreGap > 0 ? `+${plan.scoreGap}` :"0", icon: <TrendingUp size={16} /> },
 { label:"Practice Tests", value: plan.milestones.length - 1, icon: <Target size={16} /> },
 ].map((stat) => (
 <div key={stat.label} className="editorial-card p-4 text-center">
 <div className="flex items-center justify-center gap-1.5 text-primary mb-1">{stat.icon}</div>
 <p className="text-2xl font-bold text-foreground heading-serif font-[family-name:var(--font-heading)]">
 {stat.value}
 </p>
 <p className="text-[10px] text-foreground/40 font-medium uppercase tracking-wider">{stat.label}</p>
 </div>
 ))}
 </div>

 {/* Gap Analysis */}
 <div className="editorial-card p-6 mt-6">
 <div className="flex items-center gap-2 mb-2">
 <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${
 plan.gapCategory ==="fine-tuning"
 ?"bg-emerald-50 text-emerald-600 border-emerald-200"
 : plan.gapCategory ==="moderate"
 ?"bg-primary/10 text-primary border-primary/30"
 :"bg-red-50 text-red-600 border-red-200"
 }`}>
 {plan.gapLabel}
 </span>
 </div>
 <p className="text-sm text-foreground/70">{plan.gapAdvice}</p>
 </div>

 {/* Phase Timeline */}
 <h2 className="text-xs font-bold uppercase tracking-widest text-foreground/40 mt-10 mb-4">
 Week-by-Week Breakdown
 </h2>
 <div className="relative">
 <div className="absolute left-6 top-0 bottom-0 w-px bg-foreground/10"/>
 <div className="space-y-6">
 {plan.phases.map((phase, i) => (
 <div key={i} className="flex gap-4 relative">
 <div className="w-12 flex-shrink-0 flex items-start justify-center pt-4">
 <div className="w-3 h-3 rounded-full bg-primary border-2 border-white z-10"/>
 </div>
 <div className="editorial-card p-5 flex-1">
 <div className="flex items-center gap-2 mb-1">
 <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${phase.color}`}>
 {phase.focus}
 </span>
 </div>
 <h3 className="font-semibold text-foreground text-base mt-2 flex items-center gap-2">
 {phase.icon} {phase.name}
 </h3>
 <ul className="mt-3 space-y-1.5">
 {phase.tasks.map((task, j) => (
 <li key={j} className="flex items-start gap-2 text-xs text-foreground/60">
 <CheckCircle2 size={12} className="text-primary mt-0.5 shrink-0"/>
 {task}
 </li>
 ))}
 </ul>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Milestones */}
 <h2 className="text-xs font-bold uppercase tracking-widest text-foreground/40 mt-10 mb-4">
 Milestones
 </h2>
 <div className="editorial-card p-5">
 <div className="flex flex-wrap gap-3">
 {plan.milestones.map((m, i) => (
 <div
 key={i}
 className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border ${
 m.label ==="Test Day"
 ?"bg-primary/10 text-primary border-primary/30"
 :"bg-foreground/3 text-foreground/60 border-border/8"
 }`}
 >
 {m.label ==="Test Day" ? <GraduationCap size={14} /> : <Target size={14} />}
 <span>Week {m.week}: {m.label}</span>
 </div>
 ))}
 </div>
 </div>

 {/* Resources */}
 <h2 className="text-xs font-bold uppercase tracking-widest text-foreground/40 mt-10 mb-4">
 Recommended Resources
 </h2>
 <div className="editorial-card p-5">
 <ul className="space-y-2">
 {plan.resources.map((r, i) => (
 <li key={i} className="flex items-start gap-2 text-sm text-foreground/70">
 <CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0"/>
 {r}
 </li>
 ))}
 </ul>
 </div>
 </motion.div>
 )}

 <EmailCapture variant="contextual"source="gmat-planner"/>
 <ToolCrossLinks current="/gmat-planner"/>
 </div>
 </main>
 );
}
