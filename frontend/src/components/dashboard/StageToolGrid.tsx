"use client";

import Link from"next/link";
import { motion } from"framer-motion";
import {
 Search, Calculator, DollarSign,
 BookOpen, CalendarDays, Users,
 FileText, PenTool, Mic2,
 MessageSquare, ListChecks, BarChart3,
 Scale, TrendingUp, MapPin,
} from"lucide-react";
import type { JourneyStage } from"@/lib/constants";
import { cn } from"@/lib/cn";

interface ToolCard {
 href: string;
 label: string;
 description: string;
 icon: React.ComponentType<{ className?: string }>;
 color: string;
}

const STAGE_TOOLS: Record<string, ToolCard[]> = {
 explore: [
 {
 href:"/schools",
 label:"School Search",
 description:"Browse 800+ programs with advanced filters",
 icon: Search,
 color:"text-blue-600 bg-blue-50",
 },
 {
 href:"/fit-score",
 label:"Fit Calculator",
 description:"Match your profile to school requirements",
 icon: Calculator,
 color:"text-emerald-600 bg-emerald-50",
 },
 {
 href:"/roi",
 label:"ROI Calculator",
 description:"Compare tuition, salary, and payback period",
 icon: DollarSign,
 color:"text-amber-600 bg-amber-50",
 },
 ],
 prepare: [
 {
 href:"/gmat-planner",
 label:"GMAT Planner",
 description:"Personalized study schedule and milestones",
 icon: BookOpen,
 color:"text-indigo-600 bg-indigo-50",
 },
 {
 href:"/application-timeline-builder",
 label:"Timeline Builder",
 description:"Map your application milestones across rounds",
 icon: CalendarDays,
 color:"text-teal-600 bg-teal-50",
 },
 {
 href:"/rec-tracker",
 label:"Recommender Tracker",
 description:"Manage recommender outreach and follow-ups",
 icon: Users,
 color:"text-purple-600 bg-purple-50",
 },
 ],
 write: [
 {
 href:"/essay-prompts",
 label:"Essay Prompts",
 description:"All prompts organized by school and round",
 icon: FileText,
 color:"text-blue-600 bg-blue-50",
 },
 {
 href:"/essays",
 label:"Essay Coach",
 description:"AI-powered feedback on structure and narrative",
 icon: PenTool,
 color:"text-rose-600 bg-rose-50",
 },
 {
 href:"/essay-tone-checker",
 label:"Tone Checker",
 description:"Analyze voice, confidence, and authenticity",
 icon: Mic2,
 color:"text-orange-600 bg-orange-50",
 },
 ],
 practice: [
 {
 href:"/interview",
 label:"Interview Simulator",
 description:"Practice with AI-generated behavioral questions",
 icon: Mic2,
 color:"text-purple-600 bg-purple-50",
 },
 {
 href:"/interview-bank",
 label:"Question Bank",
 description:"Browse real questions reported by applicants",
 icon: MessageSquare,
 color:"text-cyan-600 bg-cyan-50",
 },
 {
 href:"/evals",
 label:"Score History",
 description:"Track your mock interview performance over time",
 icon: BarChart3,
 color:"text-emerald-600 bg-emerald-50",
 },
 ],
 decide: [
 {
 href:"/compare",
 label:"Offer Comparison",
 description:"Side-by-side analysis of your admit packages",
 icon: Scale,
 color:"text-indigo-600 bg-indigo-50",
 },
 {
 href:"/salary-database",
 label:"Salary Data",
 description:"Post-MBA salary by school, industry, and role",
 icon: TrendingUp,
 color:"text-emerald-600 bg-emerald-50",
 },
 {
 href:"/cost-of-living",
 label:"Cost of Living",
 description:"Compare expenses across MBA city locations",
 icon: MapPin,
 color:"text-amber-600 bg-amber-50",
 },
 ],
 engage: [
 {
 href:"/community",
 label:"Community",
 description:"Connect with admitted students and alumni",
 icon: Users,
 color:"text-blue-600 bg-blue-50",
 },
 {
 href:"/alumni",
 label:"Alumni Network",
 description:"Explore alumni outcomes by school and industry",
 icon: ListChecks,
 color:"text-purple-600 bg-purple-50",
 },
 {
 href:"/events",
 label:"Events",
 description:"Upcoming info sessions, visits, and webinars",
 icon: CalendarDays,
 color:"text-teal-600 bg-teal-50",
 },
 ],
};

const container = {
 hidden: { opacity: 0 },
 show: {
 opacity: 1,
 transition: {
 staggerChildren: 0.08,
 },
 },
};

const item = {
 hidden: { opacity: 0, y: 12 },
 show: { opacity: 1, y: 0 },
};

interface StageToolGridProps {
 stage: JourneyStage;
}

export function StageToolGrid({ stage }: StageToolGridProps) {
 const tools = STAGE_TOOLS[stage] || STAGE_TOOLS.explore;

 return (
 <motion.div
 variants={container}
 initial="hidden"
 animate="show"
 className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
 >
 {tools.map((tool) => {
 const Icon = tool.icon;
 return (
 <motion.div key={tool.href} variants={item}>
 <Link
 href={tool.href}
 className="group flex flex-col bg-card border border-border rounded-lg p-5 hover: transition-all"
 >
 <div
 className={cn(
"flex size-10 items-center justify-center rounded-lg mb-3",
 tool.color
 )}
 >
 <Icon className="size-5"/>
 </div>
 <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
 {tool.label}
 </h3>
 <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
 {tool.description}
 </p>
 </Link>
 </motion.div>
 );
 })}
 </motion.div>
 );
}
