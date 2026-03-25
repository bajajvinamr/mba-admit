"use client";

import { useState, useEffect, useMemo, useCallback } from"react";
import { motion, AnimatePresence } from"framer-motion";
import {
 Banknote,
 ChevronRight,
 Calculator,
 FileText,
 CheckCircle2,
 Copy,
 TrendingUp,
 DollarSign,
 Clock,
 ArrowRight,
 BarChart3,
 GraduationCap,
 Landmark,
 BadgeDollarSign,
 X,
 Plus,
} from"lucide-react";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import { EmailCapture } from"@/components/EmailCapture";
import { useUsage } from"@/hooks/useUsage";
import { UsageGate } from"@/components/UsageGate";
import { useAbortSignal } from"@/hooks/useAbortSignal";

type School = { id: string; name: string };

type NegotiationResult = {
 leverage_analysis: string;
 leverage_score: number;
 appeal_letter: string;
 pro_tips: string[];
};

/* ── API Types ─────────────────────────────────────────────────────── */

type FinancialCompareRequest = {
 schools: { school_id: string; scholarship_amount: number }[];
 current_salary: number;
 gmat?: number;
 gpa?: number;
 work_exp_years?: number;
 loan_rate: number;
 loan_term_years: number;
};

type ScholarshipLikelihood = {
 likelihood:"high"|"medium"|"low"|"unlikely";
 estimated_min: number;
 estimated_max: number;
};

type LoanResult = {
 principal: number;
 monthly_payment: number;
 total_interest: number;
 total_paid: number;
 debt_to_income_pct: number | null;
};

type SchoolFinancialResult = {
 school_id: string;
 school_name: string;
 tuition: number;
 program_years: number;
 living_cost_yearly: number;
 scholarship_applied: number;
 net_cost: number;
 opportunity_cost: number;
 total_investment: number;
 post_mba_salary: number;
 salary_increase: number;
 breakeven_years: number | null;
 npv_5yr: number;
 npv_10yr: number;
 scholarship_likelihood: ScholarshipLikelihood | null;
 loan: LoanResult;
};

type FinancialCompareResponse = {
 comparisons: SchoolFinancialResult[];
 errors: { school_id: string; error: string }[] | null;
 recommendation: string;
 recommendation_reason: string;
};

/* ── AnimatedNumber ────────────────────────────────────────────────── */

function AnimatedNumber({ value, prefix =""}: { value: number; prefix?: string }) {
 const [displayValue, setDisplayValue] = useState(0);

 useEffect(() => {
 if (value === 0) { setDisplayValue(0); return; }
 const duration = 600;
 const steps = 30;
 const increment = value / steps;
 let current = 0;
 let step = 0;
 const timer = setInterval(() => {
 step++;
 current += increment;
 if (step >= steps) {
 setDisplayValue(value);
 clearInterval(timer);
 } else {
 setDisplayValue(Math.round(current));
 }
 }, duration / steps);
 return () => clearInterval(timer);
 }, [value]);

 const formatted = Math.abs(displayValue) >= 1000
 ? `${prefix}${(displayValue / 1000).toFixed(0)}k`
 : `${prefix}${displayValue.toLocaleString()}`;

 return <span>{displayValue < 0 ? `-$${Math.abs(displayValue / 1000).toFixed(0)}k` : `$${formatted.replace(prefix,"")}`}</span>;
}

/* ── Helpers ───────────────────────────────────────────────────────── */

const fmtDollar = (n: number) =>
 new Intl.NumberFormat("en-US", { style:"currency", currency:"USD", maximumFractionDigits: 0 }).format(n);

const fmtPct = (n: number) => `${n.toFixed(1)}%`;

const likelihoodStyle: Record<string, string> = {
 high:"bg-emerald-100 text-emerald-800",
 medium:"bg-amber-100 text-amber-800",
 low:"bg-muted/10 text-muted-foreground/50",
 unlikely:"bg-red-100 text-red-800",
};

/* ── Tabs ──────────────────────────────────────────────────────────── */

type TabId ="compare"|"merit"|"loan";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
 { id:"compare", label:"Compare Schools", icon: <BarChart3 size={16} /> },
 { id:"merit", label:"Merit Aid Estimator", icon: <GraduationCap size={16} /> },
 { id:"loan", label:"Loan Calculator", icon: <Landmark size={16} /> },
];

/* ── Main Page ─────────────────────────────────────────────────────── */

export default function ScholarshipsPage() {
 const abortSignal = useAbortSignal();
 const negotiatorUsage = useUsage("scholarship_negotiator");
 const [schools, setSchools] = useState<School[]>([]);

 // Negotiator state
 const [primarySchoolId, setPrimarySchoolId] = useState("");
 const [primaryOffer, setPrimaryOffer] = useState("");
 const [competingSchoolId, setCompetingSchoolId] = useState("");
 const [competingOffer, setCompetingOffer] = useState("");
 const [loading, setLoading] = useState(false);
 const [loadingStep, setLoadingStep] = useState(0);
 const [result, setResult] = useState<NegotiationResult | null>(null);
 const [copied, setCopied] = useState(false);
 const [error, setError] = useState("");

 // Dashboard state
 const [activeTab, setActiveTab] = useState<TabId>("compare");
 const [selectedSchools, setSelectedSchools] = useState<{ school_id: string; scholarship_amount: number }[]>([]);
 const [currentSalary, setCurrentSalary] = useState<string>("80000");
 const [gmat, setGmat] = useState<string>("");
 const [gpa, setGpa] = useState<string>("");
 const [workExp, setWorkExp] = useState<string>("");
 const [loanRate, setLoanRate] = useState<string>("7");
 const [loanTerm, setLoanTerm] = useState<number>(10);
 const [loanAmount, setLoanAmount] = useState<string>("");
 const [dashLoading, setDashLoading] = useState(false);
 const [dashError, setDashError] = useState("");
 const [dashResult, setDashResult] = useState<FinancialCompareResponse | null>(null);

 useEffect(() => {
 apiFetch<any[]>(`/api/schools`)
 .then(data => setSchools(data))
 .catch(console.error);
 }, []);

 // ── Dashboard handlers ────────────────────────────────────────────

 const addSchool = useCallback((schoolId: string) => {
 if (selectedSchools.length >= 5 || selectedSchools.some(s => s.school_id === schoolId)) return;
 setSelectedSchools(prev => [...prev, { school_id: schoolId, scholarship_amount: 0 }]);
 }, [selectedSchools]);

 const removeSchool = useCallback((schoolId: string) => {
 setSelectedSchools(prev => prev.filter(s => s.school_id !== schoolId));
 }, []);

 const updateScholarship = useCallback((schoolId: string, amount: number) => {
 setSelectedSchools(prev => prev.map(s => s.school_id === schoolId ? { ...s, scholarship_amount: amount } : s));
 }, []);

 const runCompare = useCallback(async () => {
 if (selectedSchools.length < 2) return;
 setDashLoading(true);
 setDashError("");

 const body: FinancialCompareRequest = {
 schools: selectedSchools,
 current_salary: parseFloat(currentSalary) || 80000,
 loan_rate: parseFloat(loanRate) || 7,
 loan_term_years: loanTerm,
 };
 if (gmat) body.gmat = parseFloat(gmat);
 if (gpa) body.gpa = parseFloat(gpa);
 if (workExp) body.work_exp_years = parseFloat(workExp);

 try {
 const data = await apiFetch<FinancialCompareResponse>(`/api/financial/compare`, {
 method:"POST",
 body: JSON.stringify(body),
 noRetry: true,
 timeoutMs: 60_000,
 signal: abortSignal,
 });
 setDashResult(data);
 // Pre-fill loan amount from recommended school's net cost
 if (!loanAmount) {
 const best = data.comparisons.find(s => s.school_id === data.recommendation) || data.comparisons[0];
 if (best) setLoanAmount(best.net_cost.toString());
 }
 } catch {
 setDashError("Failed to compare schools. Please try again.");
 } finally {
 setDashLoading(false);
 }
 }, [selectedSchools, currentSalary, gmat, gpa, workExp, loanRate, loanTerm, loanAmount]);

 // ── Local loan calc (Tab 3 can work offline) ──────────────────────

 const loanCalc = useMemo(() => {
 const principal = parseFloat(loanAmount) || 0;
 const rate = (parseFloat(loanRate) || 7) / 100 / 12;
 const n = loanTerm * 12;
 if (principal <= 0 || rate <= 0) return null;
 const monthly = (principal * rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1);
 const totalRepaid = monthly * n;
 const totalInterest = totalRepaid - principal;
 const salary = parseFloat(currentSalary) || 80000;
 const dti = salary > 0 ? ((monthly * 12) / salary) * 100 : 0;
 return { monthly, totalInterest, totalRepaid, dti };
 }, [loanAmount, loanRate, loanTerm, currentSalary]);

 // Use recommended school's loan from API if available, else local calc
 const recommendedSchoolLoan = dashResult?.comparisons.find(
 s => s.school_id === dashResult.recommendation
 )?.loan;
 const activeLoan = recommendedSchoolLoan
 ? { monthly_payment: recommendedSchoolLoan.monthly_payment, total_interest: recommendedSchoolLoan.total_interest, total_repaid: recommendedSchoolLoan.total_paid, debt_to_income_pct: recommendedSchoolLoan.debt_to_income_pct ?? 0 }
 : (loanCalc ? { monthly_payment: loanCalc.monthly, total_interest: loanCalc.totalInterest, total_repaid: loanCalc.totalRepaid, debt_to_income_pct: loanCalc.dti } : null);

 // ── Negotiator handlers ───────────────────────────────────────────

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!primarySchoolId || !competingSchoolId) return;

 setLoading(true);
 setResult(null);
 setError("");
 setLoadingStep(0);

 const interval = setInterval(() => {
 setLoadingStep(s => (s < 3 ? s + 1 : 3));
 }, 1500);

 try {
 const data = await apiFetch<NegotiationResult>(`/api/negotiate_scholarship`, {
 method:"POST",
 body: JSON.stringify({
 primary_school_id: primarySchoolId,
 primary_offer: primaryOffer ||"$0",
 competing_school_id: competingSchoolId,
 competing_offer: competingOffer ||"$0",
 }),
 noRetry: true,
 timeoutMs: 60_000,
 signal: abortSignal,
 });
 clearInterval(interval);
 setResult(data);
 negotiatorUsage.recordUse();
 } catch (err) {
 console.error(err);
 clearInterval(interval);
 setError("Failed to generate strategy. Please try again.");
 } finally {
 setLoading(false);
 }
 };

 const copyToClipboard = () => {
 if (result) {
 navigator.clipboard.writeText(result.appeal_letter);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 }
 };

 // ── School name helper ────────────────────────────────────────────

 const schoolName = useCallback((id: string) => {
 return schools.find(s => s.id === id)?.name || id;
 }, [schools]);

 return (
 <div className="max-w-5xl mx-auto px-8 py-12">
 {/* ── Financial Aid Dashboard ──────────────────────────────────── */}
 <section className="mb-16">
 <div className="text-center mb-10">
 <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 text-primary rounded-full mb-4">
 <BadgeDollarSign size={24} />
 </div>
 <h1 className="heading-serif text-4xl mb-4">Financial Aid Dashboard</h1>
 <p className="text-muted-foreground/60 max-w-lg mx-auto leading-relaxed">
 Compare costs, estimate merit aid, and plan loan repayment across your target schools.
 </p>
 </div>

 {/* Tab Bar */}
 <div className="flex border-b border-border/10 mb-8 gap-1">
 {TABS.map(tab => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors relative ${
 activeTab === tab.id
 ?"text-foreground font-bold"
 :"text-muted-foreground/50 hover:text-muted-foreground/70"
 }`}
 >
 {tab.icon}
 {tab.label}
 {activeTab === tab.id && (
 <motion.div
 layoutId="tab-underline"
 className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"
 transition={{ type:"spring", stiffness: 500, damping: 30 }}
 />
 )}
 </button>
 ))}
 </div>

 {/* Shared School Selector + Inputs */}
 <div className="editorial-card border-2 border-border bg-card mb-6">
 <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/50 font-bold mb-4">Select Schools to Compare</p>

 {/* Selected schools chips */}
 <div className="flex flex-wrap gap-2 mb-4">
 {selectedSchools.map(s => (
 <span
 key={s.school_id}
 className="bg-foreground text-white px-3 py-1.5 text-sm font-bold flex items-center gap-2"
 >
 {schoolName(s.school_id)}
 <button onClick={() => removeSchool(s.school_id)} className="hover:text-primary transition-colors">
 <X size={14} />
 </button>
 </span>
 ))}
 {selectedSchools.length < 5 && (
 <div className="flex-1 min-w-[200px]">
 <select
 value=""
 onChange={e => { if (e.target.value) addSchool(e.target.value); }}
 className="w-full bg-card border border-dashed border-border/20 px-4 py-1.5 text-sm text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors"
 >
 <option value="">
 {selectedSchools.length === 0 ?"Add a school...":"+ Add another school..."}
 </option>
 {schools
 .filter(s => !selectedSchools.some(sel => sel.school_id === s.id))
 .map(s => (
 <option key={s.id} value={s.id}>{s.name}</option>
 ))}
 </select>
 </div>
 )}
 </div>

 {/* Per-school scholarship inputs */}
 {selectedSchools.length > 0 && (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
 {selectedSchools.map(s => (
 <div key={s.school_id} className="bg-background border border-border/5 p-3">
 <label className="block text-[10px] uppercase tracking-wider text-muted-foreground/40 font-bold mb-1">
 {schoolName(s.school_id)} - Scholarship ($)
 </label>
 <input
 type="number"
 value={s.scholarship_amount ||""}
 onChange={e => updateScholarship(s.school_id, parseFloat(e.target.value) || 0)}
 placeholder="0"
 className="w-full bg-card border border-border/20 px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
 />
 </div>
 ))}
 </div>
 )}

 {/* Shared inputs */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
 <div>
 <label className="block text-xs uppercase tracking-wider text-muted-foreground/50 mb-2 font-medium">Current Salary ($)</label>
 <input
 type="number"
 value={currentSalary}
 onChange={e => setCurrentSalary(e.target.value)}
 placeholder="80000"
 className="w-full bg-card border border-border/20 px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
 />
 </div>

 {(activeTab ==="merit" || activeTab ==="compare") && (
 <>
 <div>
 <label className="block text-xs uppercase tracking-wider text-muted-foreground/50 mb-2 font-medium">GMAT Score</label>
 <input
 type="number"
 value={gmat}
 onChange={e => setGmat(e.target.value)}
 placeholder="730"
 className="w-full bg-card border border-border/20 px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
 />
 </div>
 <div>
 <label className="block text-xs uppercase tracking-wider text-muted-foreground/50 mb-2 font-medium">GPA</label>
 <input
 type="number"
 step="0.1"
 value={gpa}
 onChange={e => setGpa(e.target.value)}
 placeholder="3.7"
 className="w-full bg-card border border-border/20 px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
 />
 </div>
 <div>
 <label className="block text-xs uppercase tracking-wider text-muted-foreground/50 mb-2 font-medium">Work Exp (years)</label>
 <input
 type="number"
 value={workExp}
 onChange={e => setWorkExp(e.target.value)}
 placeholder="4"
 className="w-full bg-card border border-border/20 px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
 />
 </div>
 </>
 )}

 {activeTab ==="loan" && (
 <>
 <div>
 <label className="block text-xs uppercase tracking-wider text-muted-foreground/50 mb-2 font-medium">Loan Amount ($)</label>
 <input
 type="number"
 value={loanAmount}
 onChange={e => setLoanAmount(e.target.value)}
 placeholder="150000"
 className="w-full bg-card border border-border/20 px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
 />
 </div>
 <div>
 <label className="block text-xs uppercase tracking-wider text-muted-foreground/50 mb-2 font-medium">Interest Rate (%)</label>
 <input
 type="number"
 step="0.1"
 value={loanRate}
 onChange={e => setLoanRate(e.target.value)}
 placeholder="7"
 className="w-full bg-card border border-border/20 px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
 />
 </div>
 <div>
 <label className="block text-xs uppercase tracking-wider text-muted-foreground/50 mb-2 font-medium">Loan Term</label>
 <select
 value={loanTerm}
 onChange={e => setLoanTerm(parseInt(e.target.value))}
 className="w-full bg-card border border-border/20 px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
 >
 <option value={10}>10 Years</option>
 <option value={15}>15 Years</option>
 <option value={20}>20 Years</option>
 </select>
 </div>
 </>
 )}
 </div>

 {/* Compare button (Tabs 1 & 2 need API call; Tab 3 works locally but also sends) */}
 {activeTab !=="loan" && (
 <button
 onClick={runCompare}
 disabled={selectedSchools.length < 2 || dashLoading}
 className="w-full bg-foreground text-white font-bold py-3.5 hover:bg-primary transition-colors flex justify-center items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
 >
 {dashLoading ? (
 <>
 <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
 Analyzing...
 </>
 ) : (
 <>
 {activeTab ==="compare" ?"Compare Financial Aid":"Estimate Merit Aid"}
 <ArrowRight size={18} />
 </>
 )}
 </button>
 )}

 {selectedSchools.length > 0 && selectedSchools.length < 2 && activeTab !=="loan" && (
 <p className="text-xs text-muted-foreground/40 mt-2 text-center">Add at least 2 schools to compare.</p>
 )}
 </div>

 {dashError && (
 <div className="bg-red-50 border border-red-200 text-red-800 p-4 text-sm mb-6">
 {dashError}
 <button onClick={() => setDashError("")} className="ml-4 text-red-600 font-bold">&times;</button>
 </div>
 )}

 {/* ── Tab 1: Compare Results ─────────────────────────────────── */}
 <AnimatePresence mode="wait">
 {activeTab ==="compare" && dashResult && (
 <motion.div
 key="compare-results"
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -8 }}
 transition={{ duration: 0.3 }}
 >
 <p className="text-xs uppercase tracking-widest text-muted-foreground/50 font-bold mb-4">Side-by-Side Comparison</p>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {dashResult.comparisons.map(s => {
 const isBest = s.school_id === dashResult.recommendation;
 const likelihood = s.scholarship_likelihood?.likelihood ||"unlikely";
 return (
 <motion.div
 key={s.school_id}
 initial={{ opacity: 0, scale: 0.96 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ duration: 0.3 }}
 className={`editorial-card border-2 bg-card relative ${
 isBest ?"border-primary":"border-border"
 }`}
 >
 {isBest && (
 <div className="absolute -top-3 left-4 bg-primary text-foreground text-[10px] font-bold uppercase tracking-widest px-3 py-1">
 Best Value
 </div>
 )}

 <h3 className="heading-serif text-xl mb-1">{s.school_name}</h3>

 <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 mb-4 ${likelihoodStyle[likelihood] ||""}`}>
 {likelihood} scholarship likelihood
 </span>

 <div className="space-y-2">
 <div className="flex justify-between text-sm border-b border-border/5 pb-1">
 <span className="text-muted-foreground/50">Tuition</span>
 <span className="font-bold">{fmtDollar(s.tuition)}</span>
 </div>
 <div className="flex justify-between text-sm border-b border-border/5 pb-1">
 <span className="text-muted-foreground/50">Scholarship</span>
 <span className="font-bold text-emerald-700">{fmtDollar(s.scholarship_applied)}</span>
 </div>
 <div className="flex justify-between text-sm border-b border-border/5 pb-1">
 <span className="text-muted-foreground/50">Net Cost</span>
 <span className="font-bold">{fmtDollar(s.net_cost)}</span>
 </div>
 <div className="flex justify-between text-sm border-b border-border/5 pb-1">
 <span className="text-muted-foreground/50">Opportunity Cost</span>
 <span className="font-bold text-red-700">{fmtDollar(s.opportunity_cost)}</span>
 </div>
 <div className="flex justify-between text-sm border-b border-border/5 pb-1 bg-background px-2 py-1 -mx-2">
 <span className="text-muted-foreground/70 font-medium">Total Investment</span>
 <span className="font-bold">{fmtDollar(s.total_investment)}</span>
 </div>
 <div className="flex justify-between text-sm border-b border-border/5 pb-1">
 <span className="text-muted-foreground/50">Post-MBA Salary</span>
 <span className="font-bold text-emerald-700">{fmtDollar(s.post_mba_salary)}</span>
 </div>
 <div className="flex justify-between text-sm border-b border-border/5 pb-1">
 <span className="text-muted-foreground/50">Breakeven</span>
 <span className="font-bold">{s.breakeven_years != null ? `${s.breakeven_years.toFixed(1)} years` :"N/A"}</span>
 </div>
 <div className="flex justify-between text-sm pt-1">
 <span className="text-muted-foreground/50">10-Year NPV</span>
 <span className={`font-bold ${s.npv_10yr >= 0 ?"text-emerald-700":"text-red-700"}`}>
 {fmtDollar(s.npv_10yr)}
 </span>
 </div>
 </div>
 </motion.div>
 );
 })}
 </div>
 <p className="text-[11px] text-muted-foreground/40 mt-4 italic">
 * NPV calculated at 5% discount rate. Opportunity cost = current salary x 2 years. Actual results will vary.
 </p>
 </motion.div>
 )}

 {/* ── Tab 2: Merit Aid Results ──────────────────────────────── */}
 {activeTab ==="merit" && dashResult && (
 <motion.div
 key="merit-results"
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -8 }}
 transition={{ duration: 0.3 }}
 >
 <p className="text-xs uppercase tracking-widest text-muted-foreground/50 font-bold mb-4">Merit Aid Estimates</p>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {dashResult.comparisons.map(s => {
 const sl = s.scholarship_likelihood;
 const likelihood = sl?.likelihood ||"unlikely";
 return (
 <motion.div
 key={s.school_id}
 initial={{ opacity: 0, scale: 0.96 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ duration: 0.3 }}
 className="editorial-card border-2 border-border bg-card"
 >
 <h3 className="heading-serif text-xl mb-3">{s.school_name}</h3>

 <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 mb-4 ${likelihoodStyle[likelihood] ||""}`}>
 {likelihood} likelihood
 </span>

 {sl ? (
 <div className="space-y-3">
 <div className="bg-background p-3 border border-border/5">
 <p className="text-[10px] uppercase tracking-wider text-muted-foreground/40 font-bold mb-1">Estimated Range</p>
 <p className="text-lg heading-serif">
 {fmtDollar(sl.estimated_min)} - {fmtDollar(sl.estimated_max)}
 </p>
 </div>
 <p className="text-sm text-muted-foreground/60 leading-relaxed">
 Your GMAT is {gmat ? `${parseInt(gmat)}` :"unknown"} - {likelihood ==="high" ?"strong": likelihood ==="medium" ?"moderate":"limited"} merit aid candidate at {s.school_name}.
 </p>
 </div>
 ) : (
 <div className="space-y-3">
 <div className="bg-background p-3 border border-border/5">
 <p className="text-[10px] uppercase tracking-wider text-muted-foreground/40 font-bold mb-1">Current Scholarship</p>
 <p className="text-lg heading-serif">{fmtDollar(s.scholarship_applied)}</p>
 </div>
 <p className="text-sm text-muted-foreground/40 italic">
 Add your GMAT, GPA, and work experience above for a personalized estimate.
 </p>
 </div>
 )}
 </motion.div>
 );
 })}
 </div>
 </motion.div>
 )}

 {/* ── Tab 3: Loan Calculator ───────────────────────────────── */}
 {activeTab ==="loan" && (
 <motion.div
 key="loan-results"
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -8 }}
 transition={{ duration: 0.3 }}
 >
 {activeLoan ? (
 <div className="editorial-card border-2 border-border bg-card max-w-2xl mx-auto">
 <div className="flex items-center gap-3 mb-4">
 <Landmark size={20} className="text-primary"/>
 <p className="text-xs uppercase tracking-[0.2em] text-primary font-bold">Loan Repayment Breakdown</p>
 </div>

 <div className="grid grid-cols-2 gap-4 mb-4">
 <div className="bg-background border border-border/5 p-4">
 <p className="text-[10px] uppercase tracking-wider text-muted-foreground/40 font-bold mb-1">Monthly Payment</p>
 <p className="text-2xl heading-serif text-foreground">
 <AnimatedNumber value={Math.round(activeLoan.monthly_payment)} />
 </p>
 </div>
 <div className="bg-background border border-border/5 p-4">
 <p className="text-[10px] uppercase tracking-wider text-muted-foreground/40 font-bold mb-1">Total Interest</p>
 <p className="text-2xl heading-serif text-red-700">
 <AnimatedNumber value={Math.round(activeLoan.total_interest)} />
 </p>
 </div>
 <div className="bg-background border border-border/5 p-4">
 <p className="text-[10px] uppercase tracking-wider text-muted-foreground/40 font-bold mb-1">Total Repaid</p>
 <p className="text-2xl heading-serif text-foreground">
 <AnimatedNumber value={Math.round(activeLoan.total_repaid)} />
 </p>
 </div>
 <div className={`border p-4 ${activeLoan.debt_to_income_pct > 20 ?"bg-red-50 border-red-100":"bg-emerald-50 border-emerald-100"}`}>
 <p className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${activeLoan.debt_to_income_pct > 20 ?"text-red-400":"text-emerald-400"}`}>
 Debt-to-Income
 </p>
 <p className={`text-2xl heading-serif ${activeLoan.debt_to_income_pct > 20 ?"text-red-700":"text-emerald-700"}`}>
 {fmtPct(activeLoan.debt_to_income_pct)}
 </p>
 <p className={`text-[11px] mt-1 ${activeLoan.debt_to_income_pct > 20 ?"text-red-500":"text-emerald-500"}`}>
 {activeLoan.debt_to_income_pct > 20 ?"Above recommended 20%":"Healthy ratio"}
 </p>
 </div>
 </div>

 <p className="text-[11px] text-muted-foreground/40 italic">
 * Standard amortization. Adjust inputs above to model different scenarios.
 </p>
 </div>
 ) : (
 <div className="text-center py-12 text-muted-foreground/40 text-sm">
 Enter a loan amount above to see your repayment breakdown.
 </div>
 )}
 </motion.div>
 )}
 </AnimatePresence>

 {/* Empty state for tabs 1 & 2 when no results */}
 {activeTab !=="loan" && !dashResult && !dashLoading && (
 <div className="text-center py-12">
 <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
 <Calculator size={28} className="text-primary"/>
 </div>
 <p className="text-muted-foreground/40 text-sm">
 Select 2+ schools and hit Compare to see your financial breakdown.
 </p>
 </div>
 )}

 {/* Loading spinner */}
 {dashLoading && (
 <div className="text-center py-12">
 <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
 <p className="text-sm text-muted-foreground/50">Crunching the numbers...</p>
 </div>
 )}
 </section>

 {/* ── Scholarship Negotiator Section ──────────────────────────── */}
 <section className="pt-16 border-t border-border/10">
 <div className="text-center mb-12">
 <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 text-primary rounded-full mb-4">
 <Banknote size={24} />
 </div>
 <h1 className="heading-serif text-4xl mb-4">Scholarship Negotiator</h1>
 <p className="text-muted-foreground/60 max-w-lg mx-auto leading-relaxed">
 Leverage your competing offers to negotiate more merit aid from your top choice school. Professional, firm, and strategic.
 </p>
 </div>

 {!result && !loading && (
 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="editorial-card max-w-2xl mx-auto bg-card">
 <form onSubmit={handleSubmit} className="space-y-6">

 <div className="p-4 bg-background border border-border/5 space-y-4">
 <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground/80 flex items-center gap-2">
 <span className="w-5 h-5 rounded-full bg-foreground text-white flex items-center justify-center text-[10px]">1</span>
 Your Top Choice
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-xs uppercase tracking-wider text-muted-foreground/50 mb-2 font-medium">Target School</label>
 <select
 value={primarySchoolId}
 onChange={e => setPrimarySchoolId(e.target.value)}
 required
 className="w-full bg-card border border-border/20 px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
 >
 <option value="">Select a school...</option>
 {schools.map(s => <option key={`pri-${s.id}`} value={s.id}>{s.name}</option>)}
 </select>
 </div>
 <div>
 <label className="block text-xs uppercase tracking-wider text-muted-foreground/50 mb-2 font-medium">Current Offer (Optional)</label>
 <input
 type="text"
 placeholder="e.g. $10,000 / None"
 value={primaryOffer}
 onChange={e => setPrimaryOffer(e.target.value)}
 className="w-full bg-card border border-border/20 px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
 />
 </div>
 </div>
 </div>

 <div className="p-4 bg-background border border-border/5 space-y-4">
 <h3 className="font-bold text-sm uppercase tracking-wider text-emerald-800 flex items-center gap-2">
 <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px]">2</span>
 Your Leverage (Competing Offer)
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-xs uppercase tracking-wider text-muted-foreground/50 mb-2 font-medium">Competing School</label>
 <select
 value={competingSchoolId}
 onChange={e => setCompetingSchoolId(e.target.value)}
 required
 className="w-full bg-card border border-emerald-200 focus:border-emerald-500 px-4 py-2.5 text-sm outline-none transition-colors"
 >
 <option value="">Select a school...</option>
 {schools.map(s => <option key={`comp-${s.id}`} value={s.id}>{s.name}</option>)}
 </select>
 </div>
 <div>
 <label className="block text-xs uppercase tracking-wider text-muted-foreground/50 mb-2 font-medium">Scholarship Amount</label>
 <input
 type="text"
 required
 placeholder="e.g. $60,000 / Full Ride"
 value={competingOffer}
 onChange={e => setCompetingOffer(e.target.value)}
 className="w-full bg-card border border-emerald-200 focus:border-emerald-500 px-4 py-2.5 text-sm outline-none transition-colors"
 />
 </div>
 </div>
 </div>

 <button type="submit" className="w-full bg-foreground text-white font-bold py-3.5 hover:bg-primary transition-colors flex justify-center items-center gap-2">
 Generate Negotiation Strategy <ChevronRight size={18} />
 </button>
 </form>
 </motion.div>
 )}

 {error && !loading && (
 <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg text-sm mb-6 max-w-2xl mx-auto">
 {error}
 <button onClick={() => setError("")} className="ml-4 text-red-600 font-bold">&times;</button>
 </div>
 )}

 {loading && (
 <div className="max-w-xl mx-auto py-12 text-center">
 <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
 <div className="space-y-4">
 <p className={`text-sm transition-opacity duration-300 font-medium ${loadingStep >= 0 ?"text-foreground":"text-muted-foreground/30 hidden"}`}>
 Analyzing peer grouping between the two schools...
 </p>
 <p className={`text-sm transition-opacity duration-300 font-medium ${loadingStep >= 1 ?"text-foreground":"text-muted-foreground/30 hidden"}`}>
 Evaluating leverage strength...
 </p>
 <p className={`text-sm transition-opacity duration-300 font-medium ${loadingStep >= 2 ?"text-foreground":"text-muted-foreground/30 hidden"}`}>
 Drafting strategic appeal letter...
 </p>
 <p className={`text-sm transition-opacity duration-300 font-medium ${loadingStep >= 3 ?"text-primary":"text-muted-foreground/30 hidden"}`}>
 Finalizing professional tone...
 </p>
 </div>
 </div>
 )}

 {result && !loading && (
 <UsageGate feature="scholarship_negotiator">
 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <div className="editorial-card bg-foreground text-white md:col-span-1">
 <p className="text-[10px] uppercase tracking-widest text-white/50 mb-4 font-bold">Leverage Score</p>
 <div className="flex items-end gap-2 mb-2">
 <span className="text-6xl heading-serif text-primary leading-none">{result.leverage_score}</span>
 <span className="text-xl text-white/40 mb-1">/ 10</span>
 </div>
 <p className="text-sm text-white/70 mt-4 leading-relaxed line-clamp-4">
 {result.leverage_analysis}
 </p>
 </div>

 <div className="editorial-card bg-background border border-border/5 md:col-span-2">
 <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 mb-4 font-bold flex items-center gap-2">
 <CheckCircle2 size={14} className="text-emerald-600"/> Negotiation Playbook
 </p>
 <ul className="space-y-3">
 {result.pro_tips.map((tip, idx) => (
 <li key={idx} className="flex gap-3 text-sm text-muted-foreground/80 bg-card p-3 border border-border/5">
 <span className="font-bold text-primary">0{idx + 1}</span>
 <span>{tip}</span>
 </li>
 ))}
 </ul>
 <div className="mt-6 flex gap-3">
 <button onClick={() => setResult(null)} className="btn-outline text-xs py-2">Start Over</button>
 </div>
 </div>
 </div>

 <div className="editorial-card border border-border/5 bg-card relative">
 <button
 onClick={copyToClipboard}
 className="absolute top-6 right-6 p-2 bg-background hover:bg-primary/10 text-muted-foreground/50 hover:text-primary transition-colors border border-border/5 rounded"
 title="Copy to clipboard"
 >
 <Copy size={16} />
 {copied && <span className="absolute -top-8 -right-4 bg-foreground text-white text-[10px] px-2 py-1 whitespace-nowrap">Copied!</span>}
 </button>
 <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 mb-6 font-bold flex items-center gap-2">
 <FileText size={14} /> Drafted Email
 </p>
 <div className="whitespace-pre-wrap font-display text-[15px] leading-relaxed text-foreground bg-background p-6 border-l-4 border-primary/40">
 {result.appeal_letter}
 </div>
 </div>

 </motion.div>
 </UsageGate>
 )}
 </section>

 <div className="max-w-5xl mx-auto px-8 pb-12">
 <EmailCapture variant="contextual"source="scholarships"/>
 <ToolCrossLinks current="/scholarships"/>
 </div>
 </div>
 );
}
