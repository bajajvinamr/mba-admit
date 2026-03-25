"use client";

import Link from"next/link";
import { motion } from"framer-motion";
import { Sparkles, ArrowRight } from"lucide-react";
import type { JourneyStage } from"@/lib/constants";

interface NextStepCardProps {
 journeyStage: JourneyStage;
 trackedSchoolCount: number;
 nextDeadlineDays: number | null;
 nextDeadlineSchool: string | null;
 hasEssays: boolean;
 hasInterviewPrep: boolean;
}

interface Suggestion {
 message: string;
 cta: string;
 href: string;
}

function generateSuggestion(props: NextStepCardProps): Suggestion {
 const {
 journeyStage,
 trackedSchoolCount,
 nextDeadlineDays,
 nextDeadlineSchool,
 hasEssays,
 hasInterviewPrep,
 } = props;

 // Deadline urgency takes priority
 if (nextDeadlineDays !== null && nextDeadlineDays <= 30 && nextDeadlineSchool) {
 if (!hasEssays) {
 return {
 message: `You've tracked ${trackedSchoolCount} school${trackedSchoolCount !== 1 ?"s":""} but haven't started essays. ${nextDeadlineSchool} R1 is in ${nextDeadlineDays} days.`,
 cta:"Start Essay Coach",
 href:"/essays",
 };
 }
 return {
 message: `${nextDeadlineSchool} deadline is in ${nextDeadlineDays} days. Polish your essays with AI feedback before submitting.`,
 cta:"Review Essays",
 href:"/evaluator",
 };
 }

 // Stage-specific suggestions
 switch (journeyStage) {
 case "explore":
 if (trackedSchoolCount === 0) {
 return {
 message:"Start by exploring schools that match your profile. Our fit calculator analyzes 800+ programs against your stats.",
 cta:"Find Your Schools",
 href:"/schools",
 };
 }
 return {
 message: `You're tracking ${trackedSchoolCount} school${trackedSchoolCount !== 1 ?"s":""}. Calculate your ROI to prioritize your list.`,
 cta:"Calculate ROI",
 href:"/roi",
 };

 case "prepare":
 return {
 message:"Build your GMAT study plan and set up your application timeline. Preparation is the foundation.",
 cta:"Open GMAT Planner",
 href:"/gmat-planner",
 };

 case "write":
 return {
 message:"Time to craft your essays. The AI coach provides real-time feedback on structure, tone, and impact.",
 cta:"Launch Essay Coach",
 href:"/essays",
 };

 case "practice":
 if (!hasInterviewPrep) {
 return {
 message:"Practice makes perfect. Run a mock interview with AI-powered behavioral questions.",
 cta:"Start Mock Interview",
 href:"/interview",
 };
 }
 return {
 message:"Keep building interview confidence. Review your question bank and practice weak areas.",
 cta:"View Question Bank",
 href:"/interview-bank",
 };

 case "decide":
 return {
 message:"Compare your offers side by side. Factor in salary data and cost of living for each city.",
 cta:"Compare Offers",
 href:"/compare",
 };

 case "engage":
 return {
 message:"Congratulations! Connect with your future classmates and explore alumni networks.",
 cta:"Browse Community",
 href:"/community",
 };

 default:
 return {
 message:"Continue your MBA admissions journey with personalized guidance at every step.",
 cta:"Explore Tools",
 href:"/tools",
 };
 }
}

export function NextStepCard(props: NextStepCardProps) {
 const suggestion = generateSuggestion(props);

 return (
 <motion.div
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.4, delay: 0.1 }}
 className="bg-card border border-border rounded-lg p-6 hover: transition-shadow"
 >
 <div className="flex items-start gap-3 mb-4">
 <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
 <Sparkles className="size-4 text-primary"/>
 </div>
 <div>
 <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
 Recommended Next Step
 </h3>
 </div>
 </div>

 <p className="text-sm text-foreground leading-relaxed mb-5">
 {suggestion.message}
 </p>

 <Link
 href={suggestion.href}
 className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors"
 >
 {suggestion.cta}
 <ArrowRight className="size-4"/>
 </Link>
 </motion.div>
 );
}
