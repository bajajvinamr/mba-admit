"use client";

import Link from"next/link";
import { Target, Shield, Zap, Users, Globe, Heart } from"lucide-react";

export default function AboutPage() {
 return (
 <div className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-8">
 <div className="max-w-3xl mx-auto">
 <p className="text-xs uppercase tracking-[0.2em] text-primary mb-4">About Us</p>
 <h1 className="heading-serif text-4xl md:text-5xl mb-4">
 We believe MBA admissions<br />should be accessible to everyone.
 </h1>
 <p className="text-white/60 text-lg leading-relaxed">
 Admit Compass is an AI-powered platform that democratizes business school admissions.
 No more $10,000 consultants gatekeeping access to top programs.
 </p>
 </div>
 </section>

 <section className="max-w-3xl mx-auto px-8 py-16">
 <h2 className="heading-serif text-2xl mb-8">What We Do</h2>
 <div className="grid md:grid-cols-3 gap-6">
 {[
 { icon: <Target size={24} />, title:"Odds Engine", desc:"Calculate your admission probability against 840+ programs using real community data from 12,000+ decisions."},
 { icon: <Zap size={24} />, title:"AI Essay Tools", desc:"Draft, evaluate, and refine your essays with AI that understands what admissions committees look for."},
 { icon: <Users size={24} />, title:"Interview Prep", desc:"Practice with AI mock interviews tailored to each school's format and question style."},
 ].map((f, i) => (
 <div key={i} className="editorial-card p-6">
 <div className="text-primary mb-4">{f.icon}</div>
 <h3 className="font-bold mb-2">{f.title}</h3>
 <p className="text-sm text-muted-foreground/60 leading-relaxed">{f.desc}</p>
 </div>
 ))}
 </div>
 </section>

 <section className="max-w-3xl mx-auto px-8 pb-16">
 <h2 className="heading-serif text-2xl mb-8">Our Coverage</h2>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {[
 { value:"840+", label:"Programs"},
 { value:"66", label:"Countries"},
 { value:"4", label:"Program Types"},
 { value:"120+", label:"Tools"},
 ].map((s, i) => (
 <div key={i} className="editorial-card p-6 text-center">
 <p className="text-2xl font-bold text-primary">{s.value}</p>
 <p className="text-xs text-muted-foreground/50 mt-1">{s.label}</p>
 </div>
 ))}
 </div>
 </section>

 <section className="max-w-3xl mx-auto px-8 pb-16">
 <h2 className="heading-serif text-2xl mb-6">Our Values</h2>
 <div className="space-y-4">
 {[
 { icon: <Globe size={18} />, title:"Accessible", desc:"Free tools for every applicant. Premium features at a fraction of consultant costs."},
 { icon: <Shield size={18} />, title:"Honest", desc:"No fake success stories. Real data, realistic odds, candid feedback."},
 { icon: <Heart size={18} />, title:"Applicant-First", desc:"We build for applicants, not for schools. Your success is our only metric."},
 ].map((v, i) => (
 <div key={i} className="flex items-start gap-4 editorial-card p-5">
 <div className="text-primary mt-0.5">{v.icon}</div>
 <div>
 <h3 className="font-bold text-sm">{v.title}</h3>
 <p className="text-xs text-muted-foreground/60 mt-1">{v.desc}</p>
 </div>
 </div>
 ))}
 </div>
 </section>

 <section className="max-w-3xl mx-auto px-8 pb-16 text-center">
 <Link href="/schools" className="btn-primary inline-flex items-center gap-2">
 Explore Schools
 </Link>
 </section>

 <div className="max-w-3xl mx-auto px-8 pb-16">
 </div>
 </div>
 );
}
