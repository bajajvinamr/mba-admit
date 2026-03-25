"use client";

import { motion } from"framer-motion";
import {
 BarChart3, FileText, Mic, Flame, Users, Target, Calendar,
 CheckCircle2, Type, DollarSign, BookOpen, Network, Hourglass,
 Briefcase, GraduationCap, Globe, Banknote, MessageSquare,
 TrendingUp, MapPin, ArrowRight, Trophy, Radar, ClipboardList,
 Zap, Home, PenTool,
} from"lucide-react";
import Link from"next/link";
import { track } from"@/lib/analytics";
import { EmailCapture } from"@/components/EmailCapture";

type Tool = {
 href: string;
 label: string;
 desc: string;
 icon: React.ReactNode;
 tag?: string;
 tagColor?: string;
};

const TOOL_GROUPS: { title: string; tools: Tool[] }[] = [
 {
 title:"Research & Compare",
 tools: [
 { href:"/schools", label:"School Directory", desc:"Browse 840+ MBA programs worldwide", icon: <GraduationCap size={20} /> },
 { href:"/rankings", label:"School Rankings", desc:"Sort by GMAT, selectivity, salary, tuition", icon: <Trophy size={20} />, tag:"New", tagColor:"bg-emerald-500"},
 { href:"/compare", label:"Compare Schools", desc:"Side-by-side analysis with real data", icon: <BarChart3 size={20} /> },
 { href:"/fit-score", label:"School Fit Score", desc:"5-dimension profile-program match", icon: <Target size={20} />, tag:"New", tagColor:"bg-emerald-500"},
 { href:"/decisions", label:"Decision Tracker", desc:"12K+ real admit/deny decisions", icon: <Globe size={20} /> },
 { href:"/profile-report", label:"Profile Report", desc:"AI-powered strength analysis", icon: <TrendingUp size={20} /> },
 { href:"/calendar", label:"Deadline Calendar", desc:"Every deadline at a glance", icon: <Calendar size={20} />, tag:"New", tagColor:"bg-emerald-500"},
 { href:"/fee-calculator", label:"Fee Calculator", desc:"Total application costs", icon: <DollarSign size={20} />, tag:"New", tagColor:"bg-emerald-500"},
 { href:"/class-profile", label:"Class Profiles", desc:"Demographics side-by-side", icon: <Users size={20} />, tag:"New", tagColor:"bg-emerald-500"},
 { href:"/gmat-targets", label:"GMAT Targets", desc:"Score targets by tier", icon: <Target size={20} />, tag:"New", tagColor:"bg-emerald-500"},
 { href:"/score-convert", label:"GMAT↔GRE", desc:"Score converter + percentiles", icon: <TrendingUp size={20} /> },
 { href:"/roi", label:"ROI Calculator", desc:"10-year return analysis", icon: <DollarSign size={20} /> },
 { href:"/cost-of-living", label:"Cost of Living", desc:"City-by-city comparison", icon: <Home size={20} />, tag:"New", tagColor:"bg-emerald-500"},
 ],
 },
 {
 title:"Essay & Application",
 tools: [
 { href:"/storyteller", label:"Master Storyteller", desc:"AI narrative brainstorming", icon: <BookOpen size={20} /> },
 { href:"/evaluator", label:"Essay Evaluator", desc:"AI-powered essay feedback", icon: <FileText size={20} /> },
 { href:"/essay-length-optimizer", label:"Essay Length", desc:"Real-time limit tracking", icon: <Type size={20} />, tag:"New", tagColor:"bg-emerald-500"},
 { href:"/checklist", label:"App Checklist", desc:"Track every requirement", icon: <CheckCircle2 size={20} />, tag:"New", tagColor:"bg-emerald-500"},
 { href:"/essay-themes", label:"Essay Themes", desc:"Theme balance analyzer", icon: <PenTool size={20} />, tag:"New", tagColor:"bg-emerald-500"},
 { href:"/goals", label:"Goal Sculptor", desc:"Post-MBA career narrative", icon: <Briefcase size={20} /> },
 { href:"/essay-prompts", label:"Prompt Library", desc:"Every school's essays", icon: <FileText size={20} /> },
 ],
 },
 {
 title:"Interview & Strategy",
 tools: [
 { href:"/interview", label:"Interview Simulator", desc:"AI mock interviews", icon: <Mic size={20} /> },
 { href:"/interview/questions", label:"Question Bank", desc:"100+ curated questions", icon: <MessageSquare size={20} />, tag:"New", tagColor:"bg-emerald-500"},
 { href:"/roaster", label:"Resume Roaster", desc:"Brutal bullet feedback", icon: <Flame size={20} /> },
 { href:"/resume-keywords", label:"Resume Keywords", desc:"Keyword optimization analysis", icon: <FileText size={20} />, tag:"New", tagColor:"bg-emerald-500"},
 { href:"/recommenders", label:"Rec Strategy", desc:"Letter of rec planning + tracker", icon: <Users size={20} /> },
 { href:"/alumni-interview", label:"Alumni Interview", desc:"School-specific interview prep", icon: <MessageSquare size={20} />, tag:"New", tagColor:"bg-emerald-500"},
 ],
 },
 {
 title:"Track & Manage",
 tools: [
 { href:"/my-schools", label:"App Tracker", desc:"Status per school + round", icon: <ClipboardList size={20} />, tag:"New", tagColor:"bg-emerald-500"},
 { href:"/strength", label:"Strength Meter", desc:"Application power score", icon: <Zap size={20} />, tag:"New", tagColor:"bg-emerald-500"},
 { href:"/timeline", label:"Journey Timeline", desc:"Step-by-step progress", icon: <Calendar size={20} /> },
 { href:"/alerts", label:"Deadline Alerts", desc:"Never miss a date", icon: <Calendar size={20} /> },
 { href:"/essay-drafts", label:"Essay Drafts", desc:"Manage all your essays", icon: <FileText size={20} /> },
 ],
 },
 {
 title:"Financial & Post-Admit",
 tools: [
 { href:"/scholarships", label:"Scholarships", desc:"ROI calculator & negotiation", icon: <Banknote size={20} /> },
 { href:"/scholarship-estimate", label:"Scholarship Estimator", desc:"Award probability per school", icon: <DollarSign size={20} />, tag:"New", tagColor:"bg-emerald-500"},
 { href:"/salary", label:"Salary Calculator", desc:"Post-MBA salary by role & school", icon: <TrendingUp size={20} />, tag:"New", tagColor:"bg-emerald-500"},
 { href:"/outreach", label:"Networking Hub", desc:"Alumni outreach planning", icon: <Network size={20} /> },
 { href:"/waitlist", label:"Waitlist Strategy", desc:"Post-waitlist action plan", icon: <Hourglass size={20} /> },
 { href:"/loi-builder", label:"LOI Builder", desc:"Statement of purpose templates", icon: <PenTool size={20} />, tag:"New", tagColor:"bg-emerald-500"},
 ],
 },
];

export default function ToolsPage() {
 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-20 px-6">
 <div className="max-w-4xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-6xl mb-4 font-[family-name:var(--font-heading)]">
 Every Tool You Need
 </h1>
 <p className="text-white/70 text-lg max-w-2xl mx-auto">
 From research to post-admit - 40+ purpose-built tools for your MBA journey.
 </p>
 </div>
 </section>

 {/* Quick-start: most popular tools */}
 <section className="max-w-5xl mx-auto px-6 -mt-8 mb-8">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {[
 { href:"/simulator", label:"Check My Odds", desc:"See your admit chances at 840+ schools", icon: <Radar size={22} />, cta:"Free - no login required"},
 { href:"/evaluator", label:"Evaluate My Essay", desc:"AI feedback on structure, content, and impact", icon: <FileText size={22} />, cta:"1 free evaluation"},
 { href:"/interview", label:"Mock Interview", desc:"Practice with AI - get scored on your answers", icon: <Mic size={22} />, cta:"3 free sessions"},
 ].map((tool) => (
 <Link
 key={tool.href}
 href={tool.href}
 onClick={() => track("tool_clicked", { tool: tool.label, source:"featured"})}
 className="bg-card border-2 border-primary/20 p-6 hover:border-primary hover: transition-all group"
 >
 <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3 group-hover:bg-primary/20 transition-colors">
 {tool.icon}
 </div>
 <h3 className="font-bold text-foreground text-base group-hover:text-primary transition-colors mb-1">
 {tool.label}
 </h3>
 <p className="text-xs text-muted-foreground mb-3">{tool.desc}</p>
 <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
 {tool.cta} →
 </span>
 </Link>
 ))}
 </div>
 </section>

 <div className="max-w-5xl mx-auto px-6 py-12">
 {TOOL_GROUPS.map((group, gi) => (
 <div key={group.title} className="mb-12">
 <h2 className="heading-serif text-2xl font-[family-name:var(--font-heading)] text-foreground mb-6">
 {group.title}
 </h2>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {group.tools.map((tool, i) => (
 <motion.div
 key={tool.href}
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: gi * 0.1 + i * 0.03 }}
 >
 <Link
 href={tool.href}
 onClick={() => track("tool_clicked", { tool: tool.label, source:"grid"})}
 className="editorial-card p-5 block hover: hover:-translate-y-0.5 transition-all group"
 >
 <div className="flex items-start gap-3">
 <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 group-hover:bg-primary/20 transition-colors">
 {tool.icon}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
 {tool.label}
 </h3>
 {tool.tag && (
 <span className={`text-[9px] px-1.5 py-0.5 text-white rounded-full font-bold ${tool.tagColor}`}>
 {tool.tag}
 </span>
 )}
 </div>
 <p className="text-xs text-muted-foreground mt-0.5">{tool.desc}</p>
 </div>
 <ArrowRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors mt-1"/>
 </div>
 </Link>
 </motion.div>
 ))}
 </div>
 </div>
 ))}
 </div>

 <div className="max-w-5xl mx-auto px-6 pb-16">
 <EmailCapture variant="contextual"source="tools"/>
 </div>
 </main>
 );
}
