"use client";

import { useState, useEffect } from"react";
import { useRouter } from"next/navigation";
import { motion } from"framer-motion";
import {
 ChevronDown, ChevronUp, TrendingUp, ArrowRight, Star, Share2,
} from"lucide-react";
import { apiFetch } from"@/lib/api";
import { useProfile } from"@/hooks/useProfile";
import { track } from"@/lib/analytics";
import { z } from"zod";

type OddsResult = { school_id: string; school: string; tier: string; prob: number; degree_type?: string; country?: string; gmat_avg?: number; acceptance_rate?: number };

export function OddsCalculator() {
 const router = useRouter();
 const { profile: savedProfile, updateProfile: saveProfile } = useProfile();
 const [testType, setTestType] = useState("gmat");
 const [gmat, setGmat] = useState("");
 const [testScore, setTestScore] = useState("");
 const [gpa, setGpa] = useState("");
 const [gpaScale, setGpaScale] = useState("4.0");
 const [workExp, setWorkExp] = useState("");
 const [odds, setOdds] = useState<OddsResult[]>([]);
 const [oddsLoading, setOddsLoading] = useState(false);
 const [oddsError, setOddsError] = useState("");
 const [showAdvanced, setShowAdvanced] = useState(false);
 const [degreeType, setDegreeType] = useState("");
 const [advancedFields, setAdvancedFields] = useState({
 undergrad_tier:"",
 industry:"",
 intl_experience: false,
 leadership_roles:"",
 community_service: false,
 publications: false,
 target_intake:"",
 });

 // Pre-fill form from saved profile on mount
 useEffect(() => {
 if (savedProfile.gmat && !gmat) setGmat(String(savedProfile.gmat));
 if (savedProfile.gpa && !gpa) setGpa(String(savedProfile.gpa));
 if (savedProfile.yoe && !workExp) setWorkExp(String(savedProfile.yoe));
 if (savedProfile.industry && !advancedFields.industry) {
 setAdvancedFields(prev => ({ ...prev, industry: savedProfile.industry! }));
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 // Dynamic Zod schema - adapts to selected test type
 const oddsSchema = z.object({
 gpa: z.number({ error:"GPA is required"}).min(0,"GPA must be ≥ 0").max(10,"GPA cannot exceed 10"),
 gmat: z.number().int().min(200,"GMAT must be 200-800").max(800,"GMAT must be 200-800").nullable(),
 test_score: z.number().int().nullable(),
 }).refine(
 (d) => testType ==="waiver" || d.gmat !== null || d.test_score !== null,
 { message:"Enter a test score or select Test Waiver", path: ["gmat"] }
 );

 const handleCalculate = async (e: React.FormEvent) => {
 e.preventDefault();
 setOddsLoading(true);
 setOddsError("");

 // Client-side Zod validation before network call
 const parsed = oddsSchema.safeParse({
 gpa: gpa ? parseFloat(gpa) : undefined,
 gmat: testType ==="gmat" && gmat ? parseInt(gmat) : null,
 test_score: testType !=="gmat" && testType !=="waiver" && testScore ? parseInt(testScore) : null,
 });
 if (!parsed.success) {
 setOddsError(parsed.error.issues.map(i => i.message).join("."));
 setOddsLoading(false);
 return;
 }

 try {
 const payload = {
 gmat: parsed.data.gmat,
 gpa: parsed.data.gpa,
 gpa_scale: gpaScale,
 work_exp: workExp ? parseInt(workExp) : null,
 test_type: testType,
 test_score: parsed.data.test_score,
 degree_type: degreeType || null,
 ...advancedFields,
 };
 const data = await apiFetch<any[]>(`/api/calculate_odds`, {
 method:"POST",
 body: JSON.stringify(payload),
 noRetry: true,
 });
 if (!Array.isArray(data)) throw new Error("Unexpected response format");
 setOdds(data);
 track("odds_calculated", {
 test_type: testType,
 gmat: testType ==="gmat" && gmat ? parseInt(gmat) : 0,
 gpa: gpa ? parseFloat(gpa) : 0,
 results_count: data.length,
 });
 // Save to shared profile store for cross-page personalization
 saveProfile({
 gmat: testType ==="gmat" && gmat ? parseInt(gmat) : null,
 gpa: gpa ? parseFloat(gpa) : null,
 yoe: workExp ? parseInt(workExp) : null,
 industry: advancedFields.industry || null,
 test_type: testType,
 target_degree: degreeType || null,
 });
 } catch (err) {
 const msg = err instanceof Error ? err.message :"Something went wrong";
 setOddsError(msg.includes("fetch") ?"Could not reach the server. Make sure the backend is running on port 8000.": msg);
 console.error(err);
 }
 setOddsLoading(false);
 };

 const tierColor = (tier: string) => {
 if (tier ==="Safety") return "bg-emerald-50 text-emerald-700 border-emerald-200";
 if (tier ==="Target") return "bg-amber-50 text-amber-700 border-amber-200";
 return "bg-red-50 text-red-700 border-red-200";
 };

 return (
 <motion.section
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height:"auto"}}
 exit={{ opacity: 0, height: 0 }}
 className="bg-muted text-foreground"
 id="calculator"
 >
 <div className="max-w-3xl mx-auto p-12">
 <h2 className="heading-serif text-3xl mb-2">Instant Odds Calculator</h2>
 <p className="text-muted-foreground mb-8 text-sm">Enter your stats. See your tier against every program.</p>

 <form onSubmit={handleCalculate} className="space-y-6">
 <div className="grid grid-cols-3 gap-4">
 <div>
 <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Test Type</label>
 <select value={testType} onChange={e => {
 const tt = e.target.value;
 setTestType(tt); setGmat(""); setTestScore("");
 // Auto-set program type based on test type
 if (tt ==="cat" || tt ==="xat") setDegreeType("MBA (CAT)");
 else if (degreeType ==="MBA (CAT)" && (tt ==="gmat" || tt ==="gre")) setDegreeType("");
 }}
 className="w-full bg-background border border-border px-4 py-3 text-foreground focus:outline-none focus:border-gold transition-colors mb-2">
 <option value="gmat" className="text-foreground">GMAT</option>
 <option value="gre" className="text-foreground">GRE</option>
 <option value="cat" className="text-foreground">CAT Percentile</option>
 <option value="xat" className="text-foreground">XAT Percentile</option>
 <option value="waiver" className="text-foreground">Test Waiver</option>
 </select>
 {testType ==="gmat" && (
 <>
 <input type="number" value={gmat} onChange={e => setGmat(e.target.value)}
 min={200} max={800}
 className="w-full bg-background border border-border px-4 py-3 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-gold transition-colors"
 placeholder="e.g. 740"/>
 <p className="text-[10px] text-muted-foreground/40 mt-1">Optional, we&apos;ll estimate if blank</p>
 </>
 )}
 {testType ==="gre" && (
 <input type="number" value={testScore} onChange={e => setTestScore(e.target.value)}
 min={260} max={340}
 className="w-full bg-background border border-border px-4 py-3 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-gold transition-colors"
 placeholder="e.g. 325"/>
 )}
 {testType ==="cat" && (
 <input type="number" value={testScore} onChange={e => setTestScore(e.target.value)}
 min={0} max={100}
 className="w-full bg-background border border-border px-4 py-3 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-gold transition-colors"
 placeholder="e.g. 98"/>
 )}
 {testType ==="xat" && (
 <input type="number" value={testScore} onChange={e => setTestScore(e.target.value)}
 min={0} max={100}
 className="w-full bg-background border border-border px-4 py-3 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-gold transition-colors"
 placeholder="e.g. 95"/>
 )}
 {testType ==="waiver" && (
 <p className="text-[10px] text-gold/70 mt-1">We&apos;ll estimate your profile strength</p>
 )}
 </div>
 <div>
 <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Undergrad GPA</label>
 <input type="number" step="0.01" max={10} required value={gpa} onChange={e => setGpa(e.target.value)}
 className="w-full bg-background border border-border px-4 py-3 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-gold transition-colors"
 placeholder="e.g. 3.8"/>
 <select value={gpaScale} onChange={e => setGpaScale(e.target.value)}
 className="mt-1 w-full bg-background border border-border px-4 py-2 text-foreground text-xs focus:outline-none focus:border-gold transition-colors">
 <option value="4.0" className="text-foreground">US (4.0 scale)</option>
 <option value="10.0" className="text-foreground">India (10-point)</option>
 <option value="5.0" className="text-foreground">Germany (1-5, lower better)</option>
 <option value="100" className="text-foreground">Percentage</option>
 </select>
 </div>
 <div>
 <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Work Experience (yrs)</label>
 <input type="number" value={workExp} onChange={e => setWorkExp(e.target.value)}
 className="w-full bg-background border border-border px-4 py-3 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-gold transition-colors"
 placeholder="e.g. 4"/>
 </div>
 </div>

 <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
 className="flex items-center gap-2 text-sm text-gold hover:text-gold-light transition-colors">
 {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
 {showAdvanced ?"Hide Advanced Criteria":"Add More Details for Better Results"}
 </button>

 {showAdvanced && (
 <motion.div
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height:"auto"}}
 className="grid grid-cols-2 gap-4 pt-2"
 >
 <div>
 <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Undergrad Institution Tier</label>
 <select value={advancedFields.undergrad_tier}
 onChange={e => setAdvancedFields({ ...advancedFields, undergrad_tier: e.target.value })}
 className="w-full bg-background border border-border px-4 py-3 text-foreground focus:outline-none focus:border-gold transition-colors">
 <option value="" className="text-foreground">Not Specified</option>
 <option value="top_10" className="text-foreground">Top 10 Globally (IIT, MIT, Stanford...)</option>
 <option value="top_50" className="text-foreground">Top 50 Globally</option>
 <option value="top_100" className="text-foreground">Top 100 / NIT / BITS / Top State</option>
 <option value="other" className="text-foreground">Other</option>
 </select>
 </div>
 <div>
 <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Industry</label>
 <select value={advancedFields.industry}
 onChange={e => setAdvancedFields({ ...advancedFields, industry: e.target.value })}
 className="w-full bg-background border border-border px-4 py-3 text-foreground focus:outline-none focus:border-gold transition-colors">
 <option value="" className="text-foreground">Not Specified</option>
 <option value="consulting" className="text-foreground">Management Consulting (MBB)</option>
 <option value="finance" className="text-foreground">Investment Banking / PE / VC</option>
 <option value="tech" className="text-foreground">Technology / Product Management</option>
 <option value="engineering" className="text-foreground">Engineering / Manufacturing</option>
 <option value="healthcare" className="text-foreground">Healthcare / Pharma</option>
 <option value="nonprofit" className="text-foreground">Non-Profit / Social Impact</option>
 <option value="military" className="text-foreground">Military / Government</option>
 <option value="startup" className="text-foreground">Startup / Entrepreneurship</option>
 <option value="other" className="text-foreground">Other</option>
 </select>
 </div>
 <div>
 <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Leadership Roles</label>
 <select value={advancedFields.leadership_roles}
 onChange={e => setAdvancedFields({ ...advancedFields, leadership_roles: e.target.value })}
 className="w-full bg-background border border-border px-4 py-3 text-foreground focus:outline-none focus:border-gold transition-colors">
 <option value="" className="text-foreground">Not Specified</option>
 <option value="cxo" className="text-foreground">C-Suite / Founder</option>
 <option value="director" className="text-foreground">Director / VP Level</option>
 <option value="manager" className="text-foreground">Manager / Team Lead</option>
 <option value="senior_ic" className="text-foreground">Senior Individual Contributor</option>
 <option value="early_career" className="text-foreground">Early Career</option>
 </select>
 </div>
 <div>
 <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Target Intake Year</label>
 <select value={advancedFields.target_intake}
 onChange={e => setAdvancedFields({ ...advancedFields, target_intake: e.target.value })}
 className="w-full bg-background border border-border px-4 py-3 text-foreground focus:outline-none focus:border-gold transition-colors">
 <option value="" className="text-foreground">Not Specified</option>
 <option value="2026" className="text-foreground">Fall 2026</option>
 <option value="2027" className="text-foreground">Fall 2027</option>
 <option value="2028" className="text-foreground">Fall 2028</option>
 </select>
 </div>
 <div>
 <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Program Type</label>
 <select value={degreeType} onChange={e => setDegreeType(e.target.value)}
 className="w-full bg-background border border-border px-4 py-3 text-foreground focus:outline-none focus:border-gold transition-colors">
 <option value="" className="text-foreground">Auto-detect from test type</option>
 <option value="MBA" className="text-foreground">MBA (Full-Time)</option>
 <option value="MiM" className="text-foreground">Masters in Management</option>
 <option value="Executive MBA" className="text-foreground">Executive MBA</option>
 <option value="MBA (CAT)" className="text-foreground">Indian MBA (CAT/XAT)</option>
 </select>
 </div>
 <div className="col-span-2 flex flex-wrap gap-6 pt-2">
 {[
 { key:"intl_experience", label:"International Experience"},
 { key:"community_service", label:"Community Service / Volunteering"},
 { key:"publications", label:"Publications / Patents"},
 ].map(({ key, label }) => (
 <label key={key} className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
 <input type="checkbox"
 checked={advancedFields[key as keyof typeof advancedFields] as boolean}
 onChange={e => setAdvancedFields({ ...advancedFields, [key]: e.target.checked })}
 className="w-4 h-4 accent-gold"/>
 {label}
 </label>
 ))}
 </div>
 </motion.div>
 )}

 <button type="submit" disabled={oddsLoading}
 className="bg-gold text-foreground font-bold px-10 py-3.5 hover:bg-gold-light transition-colors w-full disabled:opacity-50">
 {oddsLoading ?"Evaluating...":"Calculate My Odds"}
 </button>

 {oddsError && (
 <div className="bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-600">
 {oddsError}
 <button onClick={() => setOddsError("")} className="ml-3 text-red-500 hover:text-red-200 underline text-xs">Dismiss</button>
 </div>
 )}
 </form>

 {odds.length > 0 && (() => {
 // Strategic top-12: 4 best reaches + 4 best targets + 4 best safeties
 const reaches = odds.filter(o => o.tier ==="Reach").slice(0, 4);
 const targets = odds.filter(o => o.tier ==="Target").slice(0, 4);
 const safeties = odds.filter(o => o.tier ==="Safety").slice(0, 4);
 const topSchools = [...reaches, ...targets, ...safeties].slice(0, 12);
 // Fill remaining slots if any tier is underrepresented
 if (topSchools.length < 12) {
 const shown = new Set(topSchools.map(o => o.school_id));
 const remaining = odds.filter(o => !shown.has(o.school_id));
 topSchools.push(...remaining.slice(0, 12 - topSchools.length));
 }
 return (
 <div className="mt-8">
 <p className="text-sm text-gold mb-2">Your top matches across {odds.length} programs:</p>
 <div className="flex gap-3 mb-4 text-[10px] text-muted-foreground/60">
 {(() => {
 const counts: Record<string, number> = {};
 odds.forEach(o => { counts[o.degree_type ||"MBA"] = (counts[o.degree_type ||"MBA"] || 0) + 1; });
 return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([dt, c]) => (
 <span key={dt}>{dt}: {c}</span>
 ));
 })()}
 </div>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto pr-2">
 {topSchools.map(o => (
 <div key={o.school_id}
 onClick={() => router.push(`/school/${o.school_id}`)}
 className="bg-background border border-border p-3 cursor-pointer hover:bg-accent transition-colors">
 <p className="text-xs text-foreground font-medium truncate">{o.school}</p>
 <div className="flex justify-between items-center mt-2">
 <span className={`text-[10px] px-2 py-0.5 border font-bold uppercase ${tierColor(o.tier)}`}>{o.tier}</span>
 <span className="text-[10px] text-muted-foreground/60">{o.prob}%</span>
 </div>
 {o.degree_type && o.degree_type !=="MBA" && (
 <span className="text-[9px] text-gold/60 uppercase tracking-wider mt-1 block">{o.degree_type}</span>
 )}
 </div>
 ))}
 </div>
 <div className="mt-6 space-y-3">
 <button onClick={() => router.push("/dashboard")}
 className="w-full text-sm font-bold px-6 py-3 bg-gold text-foreground hover:bg-gold/90 transition-colors flex items-center justify-center gap-2">
 See Your Personalized Recommendations <ArrowRight size={16} />
 </button>
 <div className="flex flex-wrap gap-3">
 <button onClick={() => router.push("/profile-report")}
 className="text-xs font-bold px-4 py-2 bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors flex items-center gap-2">
 <TrendingUp size={14} /> Full Profile Analysis
 </button>
 <button onClick={() => router.push("/schools")}
 className="text-xs font-bold px-4 py-2 bg-background text-muted-foreground border border-border hover:bg-accent transition-colors flex items-center gap-2">
 Browse all {odds.length} matches <ArrowRight size={14} />
 </button>
 <button onClick={() => router.push("/my-schools")}
 className="text-xs font-bold px-4 py-2 bg-background text-muted-foreground border border-border hover:bg-accent transition-colors flex items-center gap-2">
 <Star size={14} /> Track Applications
 </button>
 </div>
 </div>

 <div className="mt-8 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
 <div>
 <p className="text-sm font-bold text-foreground mb-1"><Share2 size={16} className="inline mr-2 text-gold"/>Share Your Odds</p>
 <p className="text-xs text-muted-foreground">Compare with friends or get feedback from the community.</p>
 </div>
 <div className="flex gap-3">
 <a
 href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Just calculated my MBA admission odds using AI! Admit Compass says I'm a Target for Top 10 programs. Check your stats here: https://admitcompass.ai`)}`}
 target="_blank"
 rel="noopener noreferrer"
 className="text-xs font-bold px-4 py-2 bg-[#1DA1F2]/10 text-[#1DA1F2] border border-[#1DA1F2]/20 hover:bg-[#1DA1F2]/20 transition-colors flex items-center gap-2"
 >
 <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4 fill-current"><g><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.008 5.922H5.078z"></path></g></svg>
 Post to X
 </a>
 <a
 href="https://www.linkedin.com/sharing/share-offsite/?url=https://admitcompass.ai"
 target="_blank"
 rel="noopener noreferrer"
 className="text-xs font-bold px-4 py-2 bg-[#0A66C2]/10 text-[#0A66C2] border border-[#0A66C2]/20 hover:bg-[#0A66C2]/20 transition-colors flex items-center gap-2"
 >
 <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
 Share
 </a>
 </div>
 </div>
 </div>
 );
 })()}
 </div>
 </motion.section>
 );
}
