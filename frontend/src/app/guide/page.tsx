"use client";

import { useState } from"react";
import { motion, AnimatePresence } from"framer-motion";
import { CheckCircle2, ChevronRight, Calculator, AlertCircle, Briefcase, GraduationCap, XOctagon, Target, TrendingUp, Globe, Plane, DollarSign, Award, Building2, BookOpen, Clock, UserCheck, Timer } from"lucide-react";
import Link from"next/link";
import { EmailCapture } from"@/components/EmailCapture";

type QuizStep = {
 question: string;
 type:"single"|"multi";
 options: { label: string; score: number; feedback?: string }[];
};

const QUIZ_STEPS: QuizStep[] = [
 {
 question:"How many years of full-time work experience do you have?",
 type:"single",
 options: [
 { label:"0-2 years (Early Career)", score: 0, feedback:"Top MS/MiM programs might be better right now, or wait 2-3 years."},
 { label:"3-5 years (Sweet Spot)", score: 10, feedback:"Perfect timing for top MBA programs."},
 { label:"6-8 years (Senior)", score: 8, feedback:"Great for regular MBAs, but you should also consider 1-year programs like INSEAD."},
 { label:"9+ years (Very Senior)", score: 4, feedback:"An Executive MBA (EMBA) is likely a better fit than a full-time MBA."},
 ]
 },
 {
 question:"What is your primary reason for wanting an MBA? (Select one)",
 type:"single",
 options: [
 { label:"Pivot to a new industry (e.g., Tech to Finance)", score: 10 },
 { label:"Pivot geographically (e.g., India to US/Europe)", score: 10 },
 { label:"Accelerate career in current industry", score: 8 },
 { label:"I hate my current job and need a break", score: -5, feedback:"Adcoms can smell this. You need a clearer 'Why' before applying."},
 { label:"I want to start a company immediately", score: 5, feedback:"An MBA gives you a great network, but it's expensive if you aren't recruiting."}
 ]
 },
 {
 question:"How much of a pivot are you attempting?",
 type:"single",
 options: [
 { label:"Single Pivot (e.g., Same role, new industry)", score: 10 },
 { label:"Double Pivot (e.g., New role, new industry)", score: 8, feedback:"A double pivot is the classic MBA use case, but requires a strong narrative."},
 { label:"Triple Pivot (New role, new industry, new geography)", score: 4, feedback:"Extremely difficult. You will need to recruit incredibly hard."},
 { label:"No Pivot (Sponsoring company / returning to same role)", score: 10, feedback:"Adcoms love sponsored candidates. Very low risk for their yield/placement stats."}
 ]
 },
 {
 question:"Where is your current target GMAT / GRE score?",
 type:"single",
 options: [
 { label:"Above 730 (GMAT) / Above 325 (GRE)", score: 10 },
 { label:"680 - 720 (GMAT) / 315 - 320 (GRE)", score: 6 },
 { label:"Below 680 (GMAT) / Below 315 (GRE)", score: 2, feedback:"You will severely limit your M7/T15 chances without raising this score."},
 { label:"Haven't started studying yet", score: 5 }
 ]
 },
 {
 question:"What is your biggest concern right now?",
 type:"single",
 options: [
 { label:"The financial cost / ROI of the degree", score: 8 },
 { label:"Whether my profile is 'good enough' for top schools", score: 8 },
 { label:"Crafting the right story / essays", score: 8 },
 { label:"I literally don't know where to start", score: 5 }
 ]
 }
];

export default function GuidePage() {
 const [currentStep, setCurrentStep] = useState(-1);
 const [answers, setAnswers] = useState<number[]>([]);
 const [totalScore, setTotalScore] = useState(0);
 const [showResult, setShowResult] = useState(false);

 const startQuiz = () => {
 setCurrentStep(0);
 setAnswers([]);
 setTotalScore(0);
 setShowResult(false);
 };

 const handleAnswer = (score: number, optionIndex: number) => {
 const newAnswers = [...answers, optionIndex];
 setAnswers(newAnswers);
 setTotalScore(prev => prev + score);

 if (currentStep < QUIZ_STEPS.length - 1) {
 setCurrentStep(prev => prev + 1);
 } else {
 setShowResult(true);
 }
 };

 const getResultTier = () => {
 if (totalScore >= 40) return { title:"Prime MBA Candidate", color:"text-emerald-600", bg:"bg-emerald-50 border-emerald-200", desc:"You are heavily in the strike zone for top-tier MBA programs. The timing is right, your motivations are clear, and your goals align with what adcoms are looking for."};
 if (totalScore >= 25) return { title:"Good Fit, But Needs Polish", color:"text-amber-600", bg:"bg-amber-50 border-amber-200", desc:"An MBA makes sense for you, but there are a few red or yellow flags in your profile (e.g., too much/too little experience, or a difficult triple pivot). You need a very strong narrative."};
 return { title:"Reconsider Timing or Format", color:"text-red-600", bg:"bg-red-50 border-red-200", desc:"Based on your answers, a full-time 2-year MBA might not be the highest ROI move right now. Consider waiting a year, looking at MS/MiM programs (if early career), or an EMBA (if highly experienced)."};
 };

 return (
 <div className="max-w-7xl mx-auto px-8">
 {/* ── Header ──────────────────────────────────────────────────────── */}
 <section className="py-16 md:py-24 max-w-4xl border-b border-border/10 mb-16">
 <p className="text-xs uppercase tracking-[0.2em] text-primary font-bold mb-4">Official Guide</p>
 <h1 className="heading-serif text-5xl md:text-6xl mb-6">Is an MBA Actually Right For You?</h1>
 <p className="text-xl text-muted-foreground/60 leading-relaxed font-display">
 It&apos;s a $200,000, two-year commitment. It&apos;s the biggest career bet you will ever make.
 Before you start writing essays, you need to know if the math and the timing make sense.
 </p>
 </section>

 <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 pb-24">
 
 {/* ── Left Column: Educational Content ─────────────────────────────────── */}
 <div className="lg:col-span-7 space-y-16">
 
 <div className="prose prose-lg prose-headings:font-display prose-headings:font-normal prose-h2:text-3xl prose-p:text-muted-foreground/70 prose-li:text-muted-foreground/70">
 <h2>The 3 Valid Reasons to Get an MBA</h2>
 <p className="lead text-xl mb-8">Business school is a remarkably efficient machine for doing exactly three things. If your goal isn&apos;t on this list, you might be making a mistake.</p>
 
 <div className="space-y-8">
 <div className="editorial-card relative overflow-hidden">
 <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
 <h3 className="flex items-center gap-3 text-xl font-bold mb-3"><Target size={20} className="text-primary"/> 1. The Pivot (Industry, Function, Geo)</h3>
 <p className="text-sm leading-relaxed m-0 text-muted-foreground/70">
 This is the #1 use case. You are an engineer who wants to do Investment Banking. You are a marketer in India who wants to do Product in the US. The MBA acts as a magical reset button that makes recruiters forget your past and hire you for your future.
 </p>
 </div>

 <div className="editorial-card relative overflow-hidden">
 <div className="absolute top-0 left-0 w-1 h-full bg-success"></div>
 <h3 className="flex items-center gap-3 text-xl font-bold mb-3"><TrendingUp size={20} className="text-success"/> 2. The Accelerator (Glass Ceilings)</h3>
 <p className="text-sm leading-relaxed m-0 text-muted-foreground/70">
 You are already in Private Equity or Consulting, but your firm requires an MBA to promote you to Principal/Partner. Or, you are climbing the corporate ladder and have hit a ceiling where executive roles require the pedigree and network of a top-tier school.
 </p>
 </div>

 <div className="editorial-card relative overflow-hidden">
 <div className="absolute top-0 left-0 w-1 h-full bg-foreground"></div>
 <h3 className="flex items-center gap-3 text-xl font-bold mb-3"><GraduationCap size={20} className="text-foreground"/> 3. The Entrepreneurial Sandbox</h3>
 <p className="text-sm leading-relaxed m-0 text-muted-foreground/70">
 You want to start a company. Two years in business school gives you a risk-free environment to find a co-founder, build prototypes, access university venture funds, and tap into an incredible alumni network. If it fails, you can jump into campus recruiting.
 </p>
 </div>
 </div>

 <hr className="my-16 border-border/10"/>

 <h2>When NOT to get an MBA</h2>
 <p>Admissions committees (and your bank account) will punish you if you apply for the wrong reasons.</p>
 
 <ul className="space-y-4 list-none pl-0 mt-8">
 <li className="flex items-start gap-3 bg-red-50/50 p-4 border border-red-100">
 <XOctagon size={20} className="text-red-500 shrink-0 mt-0.5"/>
 <div>
 <strong className="block text-red-900 mb-1">"I hate my current job and don't know what to do."</strong>
 <span className="text-sm text-red-800/80">An MBA is not a $200k career counseling center. You need a hypothesis before you arrive.</span>
 </div>
 </li>
 <li className="flex items-start gap-3 bg-red-50/50 p-4 border border-red-100">
 <XOctagon size={20} className="text-red-500 shrink-0 mt-0.5"/>
 <div>
 <strong className="block text-red-900 mb-1">Purely for the money, without a plan.</strong>
 <span className="text-sm text-red-800/80">While average starting salaries are $175k+, the debt burden is massive. If you don't land a high-paying role (Consulting/IB/Tech), the ROI equation breaks down quickly.</span>
 </div>
 </li>
 <li className="flex items-start gap-3 bg-red-50/50 p-4 border border-red-100">
 <XOctagon size={20} className="text-red-500 shrink-0 mt-0.5"/>
 <div>
 <strong className="block text-red-900 mb-1">You already have your dream job.</strong>
 <span className="text-sm text-red-800/80">If you are a Product Manager at Google and want to be a Senior PM at Google, leaving for two years makes zero sense. Just keep working.</span>
 </div>
 </li>
 </ul>

 <hr className="my-16 border-border/10"/>

 <h2>The ROI Calculus</h2>
 <p>Let&apos;s do the math on a top-tier US MBA program.</p>
 
 <div className="grid grid-cols-2 gap-4 mt-8">
 <div className="bg-background p-6 border border-border/10">
 <p className="text-xs uppercase tracking-widest text-muted-foreground/50 font-bold mb-2">The Cost</p>
 <div className="space-y-2 mb-4">
 <div className="flex justify-between text-sm"><span className="text-muted-foreground/60">Tuition (2 yrs)</span><span>~$150,000</span></div>
 <div className="flex justify-between text-sm"><span className="text-muted-foreground/60">Living Exp (2 yrs)</span><span>~$60,000</span></div>
 <div className="flex justify-between text-sm"><span className="text-muted-foreground/60">Opportunity Cost</span><span className="text-red-600 font-medium">Your Salary × 2</span></div>
 </div>
 <div className="pt-2 border-t border-border/10 flex justify-between font-bold">
 <span>Total Cost</span><span>$210k + Salary</span>
 </div>
 </div>
 <div className="bg-background p-6 border border-border/10">
 <p className="text-xs uppercase tracking-widest text-muted-foreground/50 font-bold mb-2">The Return</p>
 <div className="space-y-2 mb-4">
 <div className="flex justify-between text-sm"><span className="text-muted-foreground/60">Base Salary</span><span>~$175,000</span></div>
 <div className="flex justify-between text-sm"><span className="text-muted-foreground/60">Sign-on Bonus</span><span>~$30,000</span></div>
 <div className="flex justify-between text-sm"><span className="text-muted-foreground/60">Network</span><span className="text-emerald-600 font-medium">Priceless</span></div>
 </div>
 <div className="pt-2 border-t border-border/10 flex justify-between font-bold">
 <span>Year 1 Comp</span><span className="text-emerald-700">$205,000+</span>
 </div>
 </div>
 </div>
 <p className="text-sm mt-4 text-muted-foreground/60 italic">Break-even for most M7 graduates is roughly 3.5 to 4.5 years post-graduation.</p>

 </div>
 </div>

 {/* ── Right Column: Interactive Assessment ─────────────────────────────────── */}
 <div className="lg:col-span-5 relative">
 <div className="sticky top-28">
 <div className="editorial-card border-2 border-border">
 {currentStep === -1 && !showResult && (
 <div className="text-center py-6">
 <Calculator size={40} className="text-primary mx-auto mb-6"strokeWidth={1.5} />
 <h3 className="heading-serif text-3xl mb-3">MBA Readiness Assessment</h3>
 <p className="text-muted-foreground/60 text-sm mb-8 px-4">
 Take our 60-second diagnostic quiz. We&apos;ll analyze your profile, timing, and goals to tell you if an MBA makes sense right now.
 </p>
 <button onClick={startQuiz} className="btn-primary w-full">
 Start Assessment
 </button>
 <p className="text-[10px] text-muted-foreground/40 mt-4 uppercase tracking-widest">5 short questions · Instant Results</p>
 </div>
 )}

 {currentStep >= 0 && !showResult && (
 <div>
 <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground/40 mb-6 border-b border-border/10 pb-4">
 <span>Question {currentStep + 1} of {QUIZ_STEPS.length}</span>
 </div>
 
 <AnimatePresence mode="wait">
 <motion.div
 key={currentStep}
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -20 }}
 transition={{ duration: 0.2 }}
 >
 <h4 className="font-display text-2xl mb-6 leading-snug">{QUIZ_STEPS[currentStep].question}</h4>
 
 <div className="space-y-3">
 {QUIZ_STEPS[currentStep].options.map((opt, i) => (
 <button
 key={i}
 onClick={() => handleAnswer(opt.score, i)}
 className="w-full text-left p-4 border border-border/10 hover:border-primary hover:bg-primary/5 transition-all text-sm font-medium flex justify-between items-center group"
 >
 <span>{opt.label}</span>
 <ChevronRight size={16} className="text-muted-foreground/20 group-hover:text-primary transition-colors"/>
 </button>
 ))}
 </div>
 </motion.div>
 </AnimatePresence>
 </div>
 )}

 {showResult && (
 <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
 <div className={`p-6 border mb-6 ${getResultTier().bg}`}>
 <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50 mb-2">Your Diagnostic Result</p>
 <h3 className={`heading-serif text-2xl mb-3 ${getResultTier().color}`}>{getResultTier().title}</h3>
 <p className="text-sm text-muted-foreground/80 leading-relaxed">{getResultTier().desc}</p>
 </div>

 <div className="space-y-4 mb-8">
 <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/50 mb-2">Red/Yellow Flags in your profile:</p>
 {answers.map((ansIdx, stepIdx) => {
 const feedback = QUIZ_STEPS[stepIdx].options[ansIdx].feedback;
 if (!feedback) return null;
 return (
 <div key={stepIdx} className="flex gap-3 text-sm bg-background p-3 border border-border/5">
 <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5"/>
 <p className="text-muted-foreground/70">{feedback}</p>
 </div>
 );
 })}
 {!answers.some((ansIdx, stepIdx) => QUIZ_STEPS[stepIdx].options[ansIdx].feedback) && (
 <div className="flex gap-3 text-sm bg-background p-3 border border-border/5">
 <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5"/>
 <p className="text-muted-foreground/70">No major red flags detected in your basic profile!</p>
 </div>
 )}
 </div>

 <div className="bg-foreground text-white p-6 text-center">
 <h4 className="heading-serif text-2xl mb-2">Need a second opinion?</h4>
 <p className="text-sm text-white/60 mb-6">Talk to a mentor from an M7 or IIM program to map out your exact strategy.</p>
 <Link href="/checkout" className="btn-primary w-full hover:shadow-sm hover:-translate-y-0.5 transition-all">
 Book Consult Call, ₹1,000
 </Link>
 <p className="text-[10px] text-white/40 mt-3">100% refund guarantee</p>
 </div>
 
 <button onClick={startQuiz} className="w-full text-center text-xs text-muted-foreground/40 hover:text-foreground uppercase tracking-widest font-bold mt-6">
 Retake Assessment
 </button>

 </motion.div>
 )}
 </div>
 </div>
 </div>

 </div>

 {/* ── Visa & Work Authorization Guide ──────────────────────────────── */}
 <section className="py-16 border-t border-border/10">
 <div className="max-w-4xl">
 <div className="flex items-center gap-3 mb-2">
 <Globe size={20} className="text-primary"/>
 <p className="text-xs uppercase tracking-[0.2em] text-primary font-bold">International Students</p>
 </div>
 <h2 className="heading-serif text-4xl md:text-5xl mb-4">Visa &amp; Work Authorization Guide</h2>
 <p className="text-lg text-muted-foreground/60 font-display mb-12 max-w-2xl">
 Post-MBA work authorization is the single biggest variable international students underestimate. Here is what you need to know by region.
 </p>

 <div className="space-y-8">
 {/* US */}
 <div className="editorial-card relative overflow-hidden">
 <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
 <div className="flex items-center gap-2 mb-4">
 <span className="text-lg">🇺🇸</span>
 <h3 className="font-bold text-xl">United States</h3>
 </div>
 <div className="space-y-4 text-sm text-muted-foreground/70 leading-relaxed">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="bg-background p-4 border border-border/5">
 <p className="font-bold text-foreground mb-1 flex items-center gap-2"><Plane size={14} className="text-blue-600"/> F-1 OPT</p>
 <p>12 months of standard post-completion OPT. If your MBA is <strong>STEM-designated</strong>, you get an additional 24-month STEM extension (36 months total work authorization).</p>
 </div>
 <div className="bg-background p-4 border border-border/5">
 <p className="font-bold text-foreground mb-1 flex items-center gap-2"><Briefcase size={14} className="text-blue-600"/> H-1B Visa</p>
 <p>Employer-sponsored, lottery-based. ~30% selection rate. You can apply while on OPT. Having a US master&apos;s degree gives you an additional lottery attempt (higher odds).</p>
 </div>
 <div className="bg-background p-4 border border-border/5">
 <p className="font-bold text-foreground mb-1 flex items-center gap-2"><Award size={14} className="text-blue-600"/> O-1 Visa</p>
 <p>For &quot;extraordinary ability.&quot; No lottery, no cap. Difficult to qualify right out of MBA, but possible for founders with traction or experienced professionals.</p>
 </div>
 <div className="bg-background p-4 border border-border/5">
 <p className="font-bold text-foreground mb-1 flex items-center gap-2"><BookOpen size={14} className="text-blue-600"/> Day 1 CPT</p>
 <p>Some schools allow Curricular Practical Training from Day 1. Useful for internships, but overuse can raise flags. Verify legitimacy with your school&apos;s DSO.</p>
 </div>
 </div>
 <div className="bg-blue-50 border border-blue-200 p-4">
 <p className="font-bold text-blue-900 text-xs uppercase tracking-wider mb-2">STEM-Designated MBA Programs</p>
 <p className="text-blue-800">Most top US programs now carry a STEM designation (or offer STEM concentrations): HBS, GSB, Wharton, Kellogg, Booth, Columbia, MIT Sloan, Tuck, Ross, Stern, Yale SOM, Fuqua, Darden, Anderson, Haas, and more. Always confirm with your target school&apos;s admissions office.</p>
 </div>
 </div>
 </div>

 {/* UK */}
 <div className="editorial-card relative overflow-hidden">
 <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
 <div className="flex items-center gap-2 mb-4">
 <span className="text-lg">🇬🇧</span>
 <h3 className="font-bold text-xl">United Kingdom</h3>
 </div>
 <div className="space-y-4 text-sm text-muted-foreground/70 leading-relaxed">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="bg-background p-4 border border-border/5">
 <p className="font-bold text-foreground mb-1">Graduate Route Visa</p>
 <p><strong>2 years</strong> of unrestricted post-study work. No employer sponsorship required. One of the most generous post-study work rights globally.</p>
 </div>
 <div className="bg-background p-4 border border-border/5">
 <p className="font-bold text-foreground mb-1">Skilled Worker Visa</p>
 <p>Employer-sponsored, no lottery. Requires a job offer at the appropriate salary threshold. Much more predictable than the US H-1B system.</p>
 </div>
 </div>
 </div>
 </div>

 {/* EU */}
 <div className="editorial-card relative overflow-hidden">
 <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
 <div className="flex items-center gap-2 mb-4">
 <span className="text-lg">🇪🇺</span>
 <h3 className="font-bold text-xl">European Union</h3>
 </div>
 <div className="space-y-4 text-sm text-muted-foreground/70 leading-relaxed">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="bg-background p-4 border border-border/5">
 <p className="font-bold text-foreground mb-1">EU Blue Card</p>
 <p>High-skilled worker permit available across most EU countries. Requires a qualifying job offer. Easier path to permanent residency than national visas.</p>
 </div>
 <div className="bg-background p-4 border border-border/5">
 <p className="font-bold text-foreground mb-1">Germany</p>
 <p><strong>18-month</strong> post-study job seeker visa. Strong MBA hiring market, especially in consulting and automotive/industrial sectors.</p>
 </div>
 <div className="bg-background p-4 border border-border/5">
 <p className="font-bold text-foreground mb-1">France &amp; Netherlands</p>
 <p>France: <strong>12-month</strong> post-study permit. Netherlands: <strong>1-year orientation year</strong> for graduates to find employment.</p>
 </div>
 </div>
 </div>
 </div>

 {/* Canada */}
 <div className="editorial-card relative overflow-hidden">
 <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
 <div className="flex items-center gap-2 mb-4">
 <span className="text-lg">🇨🇦</span>
 <h3 className="font-bold text-xl">Canada</h3>
 </div>
 <div className="space-y-4 text-sm text-muted-foreground/70 leading-relaxed">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="bg-background p-4 border border-border/5">
 <p className="font-bold text-foreground mb-1">PGWP (Post-Graduation Work Permit)</p>
 <p><strong>Up to 3 years</strong> of open work authorization. No employer sponsorship needed. One of the clearest paths from MBA to permanent residency.</p>
 </div>
 <div className="bg-background p-4 border border-border/5">
 <p className="font-bold text-foreground mb-1">Express Entry Advantage</p>
 <p>A Canadian MBA gives you significant CRS points boost: Canadian education credential + Canadian work experience. Many MBA grads get PR within 1-2 years of graduation.</p>
 </div>
 </div>
 </div>
 </div>

 {/* Singapore */}
 <div className="editorial-card relative overflow-hidden">
 <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
 <div className="flex items-center gap-2 mb-4">
 <span className="text-lg">🇸🇬</span>
 <h3 className="font-bold text-xl">Singapore</h3>
 </div>
 <div className="space-y-4 text-sm text-muted-foreground/70 leading-relaxed">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="bg-background p-4 border border-border/5">
 <p className="font-bold text-foreground mb-1">Employment Pass (EP)</p>
 <p>Employer-sponsored. Requires minimum salary threshold (currently S$5,600+). Points-based COMPASS framework evaluates qualifications, salary, and company profile.</p>
 </div>
 <div className="bg-background p-4 border border-border/5">
 <p className="font-bold text-foreground mb-1">EntrePass</p>
 <p>For founders looking to start a company in Singapore. Requires government-backed funding, IP ownership, or incubator backing. Gateway to Asia&apos;s startup ecosystem.</p>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Disclaimer */}
 <div className="mt-8 bg-amber-50 border border-amber-200 p-4 flex gap-3">
 <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5"/>
 <p className="text-sm text-amber-800">
 <strong>Disclaimer:</strong> Visa regulations change frequently. The information above is directional, not legal advice. Always verify current rules with your school&apos;s international student office and consult an immigration attorney for your specific situation.
 </p>
 </div>
 </div>
 </section>

 {/* ── Scholarship & Funding Guide ──────────────────────────────────── */}
 <section className="py-16 border-t border-border/10 pb-24">
 <div className="max-w-4xl">
 <div className="flex items-center gap-3 mb-2">
 <DollarSign size={20} className="text-primary"/>
 <p className="text-xs uppercase tracking-[0.2em] text-primary font-bold">Funding Your MBA</p>
 </div>
 <h2 className="heading-serif text-4xl md:text-5xl mb-4">Scholarship &amp; Funding Guide</h2>
 <p className="text-lg text-muted-foreground/60 font-display mb-12 max-w-2xl">
 The sticker price is not the price you pay. Most MBA students receive some form of financial aid. Here&apos;s how it breaks down.
 </p>

 <div className="space-y-8">
 {/* Merit-Based */}
 <div className="editorial-card relative overflow-hidden">
 <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
 <h3 className="flex items-center gap-3 text-xl font-bold mb-4"><Award size={20} className="text-primary"/> Merit-Based Scholarships</h3>
 <div className="space-y-3 text-sm text-muted-foreground/70 leading-relaxed">
 <div className="bg-background p-4 border border-border/5">
 <p className="font-bold text-foreground mb-1">School-Specific Fellowships</p>
 <p>Every top program has named fellowships (e.g., HBS Baker Scholars, Wharton Palmer Scholars). These are awarded by the admissions committee based on your overall application strength. You do not need to apply separately -- your MBA application IS your scholarship application.</p>
 </div>
 <div className="bg-background p-4 border border-border/5">
 <p className="font-bold text-foreground mb-1">GMAT/GRE-Linked Awards</p>
 <p>Many T15-T25 programs actively use high test scores to attract strong candidates. A 760+ GMAT at a school with a 710 median can unlock significant merit aid ($50k-$100k+). This is one reason to &quot;score up&quot; rather than applying with a median score.</p>
 </div>
 </div>
 </div>

 {/* Need-Based */}
 <div className="editorial-card relative overflow-hidden">
 <div className="absolute top-0 left-0 w-1 h-full bg-success"></div>
 <h3 className="flex items-center gap-3 text-xl font-bold mb-4"><Building2 size={20} className="text-success"/> Need-Based Aid</h3>
 <div className="space-y-3 text-sm text-muted-foreground/70 leading-relaxed">
 <div className="bg-background p-4 border border-border/5">
 <p className="font-bold text-foreground mb-1">FAFSA (US Citizens/Residents)</p>
 <p>Federal student aid for US citizens and permanent residents. Determines eligibility for subsidized/unsubsidized federal loans and need-based grants. File early -- deadlines matter.</p>
 </div>
 <div className="bg-background p-4 border border-border/5">
 <p className="font-bold text-foreground mb-1">School-Specific Need-Based Aid</p>
 <p>HBS, Stanford GSB, and a few others are fully need-blind and meet demonstrated need. Most other schools use a combination of merit and need in their aid packages. Submit the CSS Profile or school-specific financial aid forms.</p>
 </div>
 </div>
 </div>

 {/* External */}
 <div className="editorial-card relative overflow-hidden">
 <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
 <h3 className="flex items-center gap-3 text-xl font-bold mb-4"><Globe size={20} className="text-blue-600"/> External Scholarships</h3>
 <div className="space-y-3 text-sm text-muted-foreground/70 leading-relaxed">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 <div className="bg-background p-4 border border-border/5">
 <p className="font-bold text-foreground mb-1">Forte Foundation (Women)</p>
 <p>Fellowships at 50+ partner schools specifically for women pursuing MBAs. Awards range from partial to full tuition.</p>
 </div>
 <div className="bg-background p-4 border border-border/5">
 <p className="font-bold text-foreground mb-1">The Consortium (URM)</p>
 <p>Full-tuition fellowships at 20+ top schools for underrepresented minorities. One application, multiple school considerations.</p>
 </div>
 <div className="bg-background p-4 border border-border/5">
 <p className="font-bold text-foreground mb-1">Fulbright Program</p>
 <p>Government-funded awards for international students studying in the US (and vice versa). Highly competitive but covers tuition and living expenses.</p>
 </div>
 <div className="bg-background p-4 border border-border/5">
 <p className="font-bold text-foreground mb-1">Country-Specific Scholarships</p>
 <p>India: Tata, Narotam Sekhsaria, J.N. Tata Endowment. UK: Chevening. Japan: MEXT. Many governments fund their citizens abroad.</p>
 </div>
 </div>
 </div>
 </div>

 {/* Employer Sponsorship */}
 <div className="editorial-card relative overflow-hidden">
 <div className="absolute top-0 left-0 w-1 h-full bg-foreground"></div>
 <h3 className="flex items-center gap-3 text-xl font-bold mb-4"><Briefcase size={20} className="text-foreground"/> Employer Sponsorship</h3>
 <div className="space-y-3 text-sm text-muted-foreground/70 leading-relaxed">
 <div className="bg-background p-4 border border-border/5">
 <p className="font-bold text-foreground mb-1">Common in EMBA &amp; Sponsored Programs</p>
 <p>Many consulting firms (MBB), banks, and large corporates sponsor employees for MBA programs in exchange for a return commitment (typically 2-3 years post-MBA). In EMBA programs, employer sponsorship is the norm, not the exception.</p>
 </div>
 <div className="bg-background p-4 border border-border/5">
 <p className="font-bold text-foreground mb-2">Negotiation Tips</p>
 <ul className="space-y-1.5 list-disc pl-4">
 <li>Start the conversation 12-18 months before your target matriculation date.</li>
 <li>Frame it as a retention play: &quot;I want to grow my career here, and an MBA will make me a stronger leader for this team.&quot;</li>
 <li>Propose a cost-sharing model if full sponsorship is off the table (e.g., tuition reimbursement after graduation).</li>
 <li>Get everything in writing -- verbal commitments are worthless.</li>
 </ul>
 </div>
 </div>
 </div>

 {/* ROI Framing */}
 <div className="bg-emerald-50 border border-emerald-200 p-6 flex gap-4">
 <TrendingUp size={24} className="text-emerald-600 shrink-0 mt-0.5"/>
 <div>
 <p className="font-bold text-emerald-900 mb-1">The ROI Framing</p>
 <p className="text-sm text-emerald-800">
 Average MBA ROI breaks even in 3-5 years. Scholarships dramatically accelerate this: a 50% scholarship at a T15 program can mean break-even in under 2 years. Use our <a href="/scholarships" className="underline font-bold hover:text-emerald-600 transition-colors">ROI Calculator</a> to model your specific scenario.
 </p>
 </div>
 </div>
 </div>
 </div>
 </section>

 {/* ── Deferred Enrollment Programs ──────────────────────────────── */}
 <section className="py-16 border-t border-border/10">
 <div className="max-w-4xl">
 <div className="flex items-center gap-3 mb-2">
 <UserCheck size={20} className="text-primary"/>
 <p className="text-xs uppercase tracking-[0.2em] text-primary font-bold">Early Career</p>
 </div>
 <h2 className="heading-serif text-4xl md:text-5xl mb-4">Deferred Enrollment Programs</h2>
 <p className="text-lg text-muted-foreground/60 font-display mb-12 max-w-2xl">
 Lock in your MBA admission while still in college or shortly after graduating, then gain 2-5 years of work experience before matriculating.
 </p>

 <div className="space-y-8">
 <div className="editorial-card relative overflow-hidden">
 <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
 <h3 className="flex items-center gap-3 text-xl font-bold mb-3"><Target size={20} className="text-primary"/> Who Should Apply</h3>
 <p className="text-sm leading-relaxed text-muted-foreground/70 mb-4">
 Deferred enrollment is designed for final-year undergraduates or recent graduates (typically within 0-2 years of graduation) who know they want an MBA but want to build meaningful work experience first. You apply now, get admitted, then defer your start date by 2-5 years depending on the program.
 </p>
 <p className="text-sm leading-relaxed text-muted-foreground/70">
 This is a strategically strong move: you lock in admission when your candidacy is fresh and your academic profile is at its peak, without the pressure of reapplying after several years of work.
 </p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="editorial-card relative overflow-hidden">
 <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
 <h3 className="font-bold text-lg mb-2">HBS 2+2 Program</h3>
 <p className="text-xs uppercase tracking-wider text-muted-foreground/40 mb-3">Harvard Business School</p>
 <ul className="space-y-2 text-sm text-muted-foreground/70">
 <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-success shrink-0 mt-0.5"/> Apply in your final year of college</li>
 <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-success shrink-0 mt-0.5"/> Defer for 2-4 years of work experience</li>
 <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-success shrink-0 mt-0.5"/> Same admission standards as regular pool</li>
 <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-success shrink-0 mt-0.5"/> Community events during deferral period</li>
 </ul>
 </div>

 <div className="editorial-card relative overflow-hidden">
 <div className="absolute top-0 left-0 w-1 h-full bg-red-800"></div>
 <h3 className="font-bold text-lg mb-2">Stanford Deferred Enrollment</h3>
 <p className="text-xs uppercase tracking-wider text-muted-foreground/40 mb-3">Stanford GSB</p>
 <ul className="space-y-2 text-sm text-muted-foreground/70">
 <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-success shrink-0 mt-0.5"/> Open to final-year undergrads globally</li>
 <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-success shrink-0 mt-0.5"/> Defer for 2-5 years before matriculating</li>
 <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-success shrink-0 mt-0.5"/> Extremely selective (even by GSB standards)</li>
 <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-success shrink-0 mt-0.5"/> No GMAT/GRE required at time of application</li>
 </ul>
 </div>

 <div className="editorial-card relative overflow-hidden">
 <div className="absolute top-0 left-0 w-1 h-full bg-blue-700"></div>
 <h3 className="font-bold text-lg mb-2">Yale Silver Scholars</h3>
 <p className="text-xs uppercase tracking-wider text-muted-foreground/40 mb-3">Yale School of Management</p>
 <ul className="space-y-2 text-sm text-muted-foreground/70">
 <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-success shrink-0 mt-0.5"/> 3-year program (1 year work + 2 year MBA)</li>
 <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-success shrink-0 mt-0.5"/> For graduating seniors with little work experience</li>
 <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-success shrink-0 mt-0.5"/> Summer internship integrated into the program</li>
 <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-success shrink-0 mt-0.5"/> Same degree as the standard MBA</li>
 </ul>
 </div>

 <div className="editorial-card relative overflow-hidden">
 <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
 <h3 className="font-bold text-lg mb-2">Booth Scholars Program</h3>
 <p className="text-xs uppercase tracking-wider text-muted-foreground/40 mb-3">Chicago Booth</p>
 <ul className="space-y-2 text-sm text-muted-foreground/70">
 <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-success shrink-0 mt-0.5"/> Apply in your final year of undergrad</li>
 <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-success shrink-0 mt-0.5"/> Defer for 2-5 years of professional experience</li>
 <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-success shrink-0 mt-0.5"/> Access to Booth community during deferral</li>
 <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-success shrink-0 mt-0.5"/> Scholarship consideration included</li>
 </ul>
 </div>
 </div>

 <div className="bg-amber-50 border border-amber-200 p-6 flex gap-4">
 <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5"/>
 <div>
 <p className="font-bold text-amber-900 mb-1">Strategic Advice</p>
 <p className="text-sm text-amber-800">
 Deferred enrollment acceptance rates are extremely low. Treat these applications with the same rigor as a regular MBA application. Your essays should demonstrate clear self-awareness, a compelling vision for your career, and a concrete reason why the deferral window will make you a stronger candidate. Apply to these programs alongside your regular job search -- do not count on admission.
 </p>
 </div>
 </div>
 </div>
 </div>
 </section>

 {/* ── 1-Year vs 2-Year MBA ──────────────────────────────────────── */}
 <section className="py-16 border-t border-border/10">
 <div className="max-w-4xl">
 <div className="flex items-center gap-3 mb-2">
 <Timer size={20} className="text-primary"/>
 <p className="text-xs uppercase tracking-[0.2em] text-primary font-bold">Program Format</p>
 </div>
 <h2 className="heading-serif text-4xl md:text-5xl mb-4">1-Year vs 2-Year MBA Programs</h2>
 <p className="text-lg text-muted-foreground/60 font-display mb-12 max-w-2xl">
 Not every MBA needs to be two years. The right program length depends on your career stage, goals, and financial situation.
 </p>

 <div className="space-y-8">
 {/* Comparison Table */}
 <div className="overflow-x-auto">
 <table className="w-full text-sm border-collapse">
 <thead>
 <tr className="bg-foreground text-white">
 <th className="text-left p-4 font-bold text-xs uppercase tracking-wider">Factor</th>
 <th className="text-left p-4 font-bold text-xs uppercase tracking-wider">1-Year MBA</th>
 <th className="text-left p-4 font-bold text-xs uppercase tracking-wider">2-Year MBA</th>
 </tr>
 </thead>
 <tbody>
 {[
 { factor:"Duration", one:"10-16 months", two:"21-24 months"},
 { factor:"Total Cost", one:"Lower (1 year tuition + living)", two:"Higher (2 years of everything)"},
 { factor:"Opportunity Cost", one:"~1 year of lost salary", two:"~2 years of lost salary"},
 { factor:"Summer Internship", one:"Usually none", two:"Yes -- critical for career switchers"},
 { factor:"Career Switching", one:"Harder without internship bridge", two:"Ideal for pivots (test via internship)"},
 { factor:"Best For", one:"Senior professionals (6+ yrs), consultants, sponsored candidates", two:"Career switchers, early-mid career (3-6 yrs)"},
 { factor:"Recruiting Time", one:"Compressed -- starts immediately", two:"Extended -- more time to explore"},
 { factor:"Network Depth", one:"Smaller cohort, less time to bond", two:"Deeper relationships, more clubs/activities"},
 ].map((row, i) => (
 <tr key={i} className={`border-b border-border/5 ${i % 2 === 0 ?"bg-card":"bg-background"}`}>
 <td className="p-4 font-bold text-foreground">{row.factor}</td>
 <td className="p-4 text-muted-foreground/70">{row.one}</td>
 <td className="p-4 text-muted-foreground/70">{row.two}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="editorial-card relative overflow-hidden">
 <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
 <h3 className="flex items-center gap-3 text-lg font-bold mb-3"><Clock size={18} className="text-blue-600"/> Top 1-Year Programs</h3>
 <ul className="space-y-3 text-sm text-muted-foreground/70">
 <li className="flex justify-between border-b border-border/5 pb-2"><span className="font-medium text-foreground">INSEAD</span><span>10 months</span></li>
 <li className="flex justify-between border-b border-border/5 pb-2"><span className="font-medium text-foreground">London Business School</span><span>15-21 months</span></li>
 <li className="flex justify-between border-b border-border/5 pb-2"><span className="font-medium text-foreground">IESE Business School</span><span>15 months</span></li>
 <li className="flex justify-between border-b border-border/5 pb-2"><span className="font-medium text-foreground">Kellogg 1Y</span><span>12 months</span></li>
 <li className="flex justify-between"><span className="font-medium text-foreground">IMD</span><span>11 months</span></li>
 </ul>
 </div>

 <div className="editorial-card relative overflow-hidden">
 <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600"></div>
 <h3 className="flex items-center gap-3 text-lg font-bold mb-3"><GraduationCap size={18} className="text-indigo-600"/> Top 2-Year Programs</h3>
 <ul className="space-y-3 text-sm text-muted-foreground/70">
 <li className="flex justify-between border-b border-border/5 pb-2"><span className="font-medium text-foreground">Harvard Business School</span><span>2 years</span></li>
 <li className="flex justify-between border-b border-border/5 pb-2"><span className="font-medium text-foreground">Stanford GSB</span><span>2 years</span></li>
 <li className="flex justify-between border-b border-border/5 pb-2"><span className="font-medium text-foreground">Wharton</span><span>2 years</span></li>
 <li className="flex justify-between border-b border-border/5 pb-2"><span className="font-medium text-foreground">Columbia Business School</span><span>2 years</span></li>
 <li className="flex justify-between"><span className="font-medium text-foreground">Booth / Kellogg 2Y</span><span>2 years</span></li>
 </ul>
 </div>
 </div>

 <div className="bg-blue-50 border border-blue-200 p-6 flex gap-4">
 <AlertCircle size={20} className="text-blue-600 shrink-0 mt-0.5"/>
 <div>
 <p className="font-bold text-blue-900 mb-1">The Bottom Line</p>
 <p className="text-sm text-blue-800">
 If you are a career switcher with 3-5 years of experience, the 2-year format is almost always the better choice -- the summer internship is essential for landing your pivot role. If you are a senior professional who knows exactly what you want post-MBA and does not need the internship bridge, a 1-year program saves you significant time and money.
 </p>
 </div>
 </div>
 </div>
 </div>
 </section>

 {/* ── Executive MBA (EMBA) ──────────────────────────────────────── */}
 <section className="py-16 border-t border-border/10 pb-24">
 <div className="max-w-4xl">
 <div className="flex items-center gap-3 mb-2">
 <Building2 size={20} className="text-primary"/>
 <p className="text-xs uppercase tracking-[0.2em] text-primary font-bold">Senior Professionals</p>
 </div>
 <h2 className="heading-serif text-4xl md:text-5xl mb-4">Executive MBA (EMBA)</h2>
 <p className="text-lg text-muted-foreground/60 font-display mb-12 max-w-2xl">
 For professionals with 10+ years of experience who want the MBA credential and network without leaving their job.
 </p>

 <div className="space-y-8">
 <div className="editorial-card relative overflow-hidden">
 <div className="absolute top-0 left-0 w-1 h-full bg-purple-600"></div>
 <h3 className="flex items-center gap-3 text-xl font-bold mb-3"><Briefcase size={20} className="text-purple-600"/> How EMBA Differs from Full-Time MBA</h3>
 <div className="space-y-3 text-sm text-muted-foreground/70 leading-relaxed">
 <p>Executive MBA programs are designed for experienced professionals who cannot (or do not want to) leave the workforce for two years. Classes typically meet on weekends, evenings, or in intensive modular blocks (e.g., one week per month). The degree is the same MBA -- only the format differs.</p>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
 <div className="bg-background p-4 border border-border/5">
 <p className="font-bold text-foreground mb-1">Format</p>
 <p>Weekend classes, bi-weekly modules, or intensive 1-week residencies. Programs run 16-24 months.</p>
 </div>
 <div className="bg-background p-4 border border-border/5">
 <p className="font-bold text-foreground mb-1">GMAT/GRE</p>
 <p>Often waived or optional for EMBA candidates with strong professional track records. Work experience speaks louder.</p>
 </div>
 <div className="bg-background p-4 border border-border/5">
 <p className="font-bold text-foreground mb-1">Funding</p>
 <p>Employer sponsorship is common. Many companies cover 50-100% of EMBA tuition as a leadership development investment.</p>
 </div>
 </div>
 </div>
 </div>

 <div className="editorial-card relative overflow-hidden">
 <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
 <h3 className="flex items-center gap-3 text-xl font-bold mb-3"><Award size={20} className="text-primary"/> Top EMBA Programs</h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
 <div className="bg-background p-4 border border-border/5">
 <p className="font-bold text-foreground mb-1">Wharton EMBA</p>
 <p className="text-muted-foreground/70">Alternating Friday/Saturday schedule in Philadelphia and San Francisco. One of the most prestigious EMBA programs globally.</p>
 </div>
 <div className="bg-background p-4 border border-border/5">
 <p className="font-bold text-foreground mb-1">Kellogg-HKUST EMBA</p>
 <p className="text-muted-foreground/70">Joint program between Northwestern Kellogg and Hong Kong UST. Modular format with residencies in Evanston and Hong Kong. Consistently top-ranked.</p>
 </div>
 <div className="bg-background p-4 border border-border/5">
 <p className="font-bold text-foreground mb-1">INSEAD EMBA</p>
 <p className="text-muted-foreground/70">Global modular format across Fontainebleau, Singapore, and Abu Dhabi. 14-17 months. Intensely international cohort.</p>
 </div>
 <div className="bg-background p-4 border border-border/5">
 <p className="font-bold text-foreground mb-1">Columbia EMBA</p>
 <p className="text-muted-foreground/70">Friday/Saturday format in NYC. Strong finance and media/entertainment networks. 20 months.</p>
 </div>
 </div>
 </div>

 <div className="editorial-card relative overflow-hidden">
 <div className="absolute top-0 left-0 w-1 h-full bg-success"></div>
 <h3 className="flex items-center gap-3 text-xl font-bold mb-3"><TrendingUp size={20} className="text-success"/> EMBA Admissions: How It Differs</h3>
 <ul className="space-y-3 text-sm text-muted-foreground/70">
 <li className="flex items-start gap-3 bg-background p-4 border border-border/5">
 <CheckCircle2 size={16} className="text-success shrink-0 mt-0.5"/>
 <div><strong className="text-foreground">Experience is king.</strong> Average EMBA candidate has 12-15 years of work experience and is in a senior management or director-level role. Your career trajectory matters more than test scores.</div>
 </li>
 <li className="flex items-start gap-3 bg-background p-4 border border-border/5">
 <CheckCircle2 size={16} className="text-success shrink-0 mt-0.5"/>
 <div><strong className="text-foreground">GMAT often not required.</strong> Most EMBA programs waive the GMAT/GRE for candidates with strong professional backgrounds. Some may require an Executive Assessment (EA) instead.</div>
 </li>
 <li className="flex items-start gap-3 bg-background p-4 border border-border/5">
 <CheckCircle2 size={16} className="text-success shrink-0 mt-0.5"/>
 <div><strong className="text-foreground">Employer sponsorship is common.</strong> Many EMBA candidates are partially or fully sponsored by their employers. Programs often have dedicated corporate partnerships to facilitate this.</div>
 </li>
 <li className="flex items-start gap-3 bg-background p-4 border border-border/5">
 <CheckCircle2 size={16} className="text-success shrink-0 mt-0.5"/>
 <div><strong className="text-foreground">Rolling admissions.</strong> Unlike full-time MBAs with strict round-based deadlines, many EMBA programs accept applications on a rolling basis with multiple start dates per year.</div>
 </li>
 </ul>
 </div>

 <div className="bg-purple-50 border border-purple-200 p-6 flex gap-4">
 <AlertCircle size={20} className="text-purple-600 shrink-0 mt-0.5"/>
 <div>
 <p className="font-bold text-purple-900 mb-1">EMBA vs Full-Time: The Decision</p>
 <p className="text-sm text-purple-800">
 Choose EMBA if you love your current role and want to accelerate within it. Choose full-time MBA if you want to make a career pivot. The EMBA is not a &quot;lesser&quot; degree -- it is a different tool for a different career stage. The network you build in an EMBA program (C-suite peers, VPs, directors) is arguably more immediately valuable than a full-time MBA network.
 </p>
 </div>
 </div>
 </div>
 </div>
 </section>

 <div className="max-w-4xl mx-auto px-8 pb-16">
 <EmailCapture variant="contextual"source="guide"/>
 </div>
 </div>
 );
}
