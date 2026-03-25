"use client";

import { motion } from"framer-motion";
import { ArrowRight, BarChart3, BookOpen, GraduationCap, MapPin, Target, User } from"lucide-react";
import Link from"next/link";
import { UserProfile } from"@/hooks/useProfile";
import { useRecentSchools } from"@/hooks/useRecentSchools";

type Props = {
 profile: UserProfile;
 onShowCalc: () => void;
};

const QUICK_LINKS = [
 { href:"/schools", label:"Browse Schools", icon: GraduationCap, desc:"Find your fit"},
 { href:"/profile-report", label:"Profile Report", icon: BarChart3, desc:"Strength analysis"},
 { href:"/my-schools", label:"My Applications", icon: Target, desc:"Track progress"},
 { href:"/evaluator", label:"Essay Evaluator", icon: BookOpen, desc:"Get feedback"},
];

export function WelcomeBack({ profile, onShowCalc }: Props) {
 const { recentSchools } = useRecentSchools();
 const firstName = profile.name?.split("")[0] ||"there";
 const stats = [
 profile.gmat && { label:"GMAT", value: String(profile.gmat) },
 profile.gpa && { label:"GPA", value: profile.gpa.toFixed(1) },
 profile.yoe && { label:"Years Exp", value: String(profile.yoe) },
 profile.industry && { label:"Industry", value: profile.industry },
 ].filter(Boolean) as { label: string; value: string }[];

 return (
 <section className="max-w-7xl mx-auto px-8 py-20">
 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className="flex flex-col lg:flex-row gap-12 items-start"
 >
 {/* Left: greeting + stats */}
 <div className="flex-1">
 <div className="flex items-center gap-3 mb-4">
 <div className="w-10 h-10 bg-gold/20 border border-gold/30 flex items-center justify-center">
 <User size={18} className="text-gold"/>
 </div>
 <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/50 font-medium">
 Welcome back
 </p>
 </div>

 <h1 className="heading-serif text-4xl md:text-5xl mb-4">
 Hey {firstName}, <br />
 <span className="text-muted-foreground/50 italic">let&apos;s keep going.</span>
 </h1>

 <p className="text-muted-foreground/60 mb-8 max-w-md">
 Your profile is saved. Pick up where you left off, or explore something new.
 </p>

 {/* Profile stats strip */}
 {stats.length > 0 && (
 <div className="flex flex-wrap gap-3 mb-8">
 {stats.map((s) => (
 <div
 key={s.label}
 className="bg-card border border-border/5 px-4 py-2.5 flex items-center gap-3"
 >
 <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold">
 {s.label}
 </span>
 <span className="text-sm font-bold text-foreground">{s.value}</span>
 </div>
 ))}
 <button
 onClick={onShowCalc}
 className="bg-background border border-border/5 px-4 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold hover:border-gold hover:text-gold transition-colors"
 >
 Update Profile
 </button>
 </div>
 )}
 </div>

 {/* Right: quick action grid */}
 <div className="w-full lg:w-auto">
 <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/30 font-bold mb-4">
 Quick Actions
 </p>
 <div className="grid grid-cols-2 gap-3 w-full lg:w-[380px]">
 {QUICK_LINKS.map((link, i) => {
 const Icon = link.icon;
 return (
 <motion.div
 key={link.href}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.1 + i * 0.05 }}
 >
 <Link
 href={link.href}
 className="group block bg-card border border-border/5 p-5 hover:border-gold/30 hover: transition-all"
 >
 <Icon
 size={20}
 className="text-muted-foreground/30 group-hover:text-gold transition-colors mb-3"
 />
 <h3 className="text-sm font-bold text-foreground mb-0.5 flex items-center gap-1">
 {link.label}
 <ArrowRight
 size={12}
 className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-gold"
 />
 </h3>
 <p className="text-[11px] text-muted-foreground/40">{link.desc}</p>
 </Link>
 </motion.div>
 );
 })}
 </div>
 </div>
 </motion.div>

 {/* Recently viewed schools */}
 {recentSchools.length > 0 && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ delay: 0.4 }}
 className="mt-10"
 >
 <div className="flex items-center justify-between mb-4">
 <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/30 font-bold">
 Recently Viewed
 </p>
 <Link href="/schools" className="text-[10px] font-bold text-gold hover:text-foreground transition-colors uppercase tracking-wider">
 Browse All
 </Link>
 </div>
 <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
 {recentSchools.slice(0, 6).map((s) => (
 <Link
 key={s.id}
 href={`/school/${s.id}`}
 className="shrink-0 bg-card border border-border/5 p-4 hover:border-gold/40 transition-colors group min-w-[180px]"
 >
 <p className="font-bold text-sm text-foreground group-hover:text-gold transition-colors truncate">{s.name}</p>
 <p className="text-[10px] text-muted-foreground/40 mt-1 flex items-center gap-1">
 <MapPin size={8} /> {s.location}
 </p>
 </Link>
 ))}
 </div>
 </motion.div>
 )}
 </section>
 );
}
