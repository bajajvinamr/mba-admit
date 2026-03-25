"use client";

import { useState, useMemo } from"react";
import { Search, BookOpen } from"lucide-react";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type Term = { term: string; definition: string; category: string };

const TERMS: Term[] = [
 { term:"GMAT", definition:"Graduate Management Admission Test - the most widely used standardized test for MBA admissions. Scored 200-800. Schools typically report the median GMAT of their admitted class.", category:"Testing"},
 { term:"GRE", definition:"Graduate Record Examinations - an alternative to the GMAT accepted by most MBA programs. Scored 260-340. Some applicants prefer it for its broader vocabulary focus.", category:"Testing"},
 { term:"Executive Assessment (EA)", definition:"A shorter alternative exam primarily for EMBA programs. 3 sections, 90 minutes total. Gaining broader acceptance at full-time programs.", category:"Testing"},
 { term:"GPA", definition:"Grade Point Average - your undergraduate academic performance on a 4.0 scale. International applicants may need WES evaluation to convert grades.", category:"Profile"},
 { term:"WES Evaluation", definition:"World Education Services - a credential evaluation agency that converts international grades to US GPA equivalents. Required by some schools for non-US degrees.", category:"Profile"},
 { term:"R1 / R2 / R3", definition:"Application rounds. R1 (Sep-Oct deadline) is most competitive with largest class fill. R2 (Jan) fills remaining spots. R3 (Mar-Apr) is typically for exceptional candidates only.", category:"Application"},
 { term:"Early Decision (ED)", definition:"A binding commitment to attend if admitted. Columbia Business School is the most notable program with ED. Offers a slight admissions advantage in exchange for less negotiating power on financial aid.", category:"Application"},
 { term:"Deferred Enrollment", definition:"Programs like HBS 2+2 and Yale Silver Scholars that allow college seniors to apply and defer enrollment for 2-4 years of work experience.", category:"Application"},
 { term:"LOR / Letter of Recommendation", definition:"A recommendation letter from someone who knows your work. Most schools require 2 letters. Ideally from direct supervisors who can provide specific examples.", category:"Application"},
 { term:"Ding", definition:"Slang for rejection. Getting 'dinged' means your application was not accepted. Can happen pre-interview or post-interview.", category:"Outcomes"},
 { term:"Waitlist", definition:"Neither accepted nor rejected - placed on a waiting list. Schools admit from the waitlist as admitted students decline offers. Proactive follow-up can help.", category:"Outcomes"},
 { term:"Yield", definition:"The percentage of admitted students who actually enroll. High yield (HBS ~90%) means strong brand pull. Schools care about yield because it affects rankings.", category:"Outcomes"},
 { term:"Yield Protection", definition:"The controversial practice of rejecting overqualified applicants who are unlikely to enroll. Whether this actually happens is debated.", category:"Outcomes"},
 { term:"M7", definition:"The 'Magnificent 7' - the seven most prestigious MBA programs: HBS, Stanford GSB, Wharton, Booth, Kellogg, Columbia, MIT Sloan.", category:"Rankings"},
 { term:"T15 / T25", definition:"Top 15 and Top 25 MBA programs as ranked by US News, Bloomberg, or similar publications. Common shorthand for school tiers.", category:"Rankings"},
 { term:"STEM Designation", definition:"Science, Technology, Engineering, and Math designation for an MBA program. Qualifies international students for 3-year OPT (vs 1-year standard). Most top schools now have this.", category:"Career"},
 { term:"OPT", definition:"Optional Practical Training - work authorization for international students after graduation. Standard is 12 months; STEM extension adds 24 months for a total of 36.", category:"Career"},
 { term:"H-1B Visa", definition:"The most common long-term work visa for international MBA graduates in the US. Requires employer sponsorship and is subject to an annual lottery.", category:"Career"},
 { term:"OCR / On-Campus Recruiting", definition:"Structured recruiting events where companies come to campus for presentations, networking, and interviews. The primary hiring channel at most top MBA programs.", category:"Career"},
 { term:"Case Method", definition:"A teaching approach (pioneered by HBS) where students analyze real business situations and debate solutions in class. Requires extensive daily preparation.", category:"Academics"},
 { term:"Cold Call", definition:"When a professor randomly calls on a student to analyze the case without warning. Common in case-method schools. Class participation often counts for 50%+ of the grade.", category:"Academics"},
 { term:"Section / Cohort", definition:"A fixed group of ~90 students who take all first-year core courses together. Designed to build deep bonds and simulate diverse business teams.", category:"Academics"},
 { term:"Core Curriculum", definition:"Required first-year courses covering fundamentals: accounting, finance, marketing, strategy, operations, organizational behavior, economics.", category:"Academics"},
 { term:"Electives", definition:"Second-year courses chosen based on your interests. Top schools offer 100+ electives. This is where you specialize.", category:"Academics"},
 { term:"Concentration / Major", definition:"A focused area of study within the MBA (e.g., Finance, Marketing, Strategy). Some schools require one; others let you design your own.", category:"Academics"},
 { term:"Trek", definition:"Student-organized trips to visit companies in specific industries or regions (e.g., Silicon Valley Tech Trek, Japan Trek). Major networking opportunities.", category:"Student Life"},
 { term:"Club", definition:"Student-run organizations around professional interests (Finance Club, Consulting Club) or affinity groups (Women in Business, LGBTQ+ Club). Critical for recruiting.", category:"Student Life"},
 { term:"AdCom", definition:"Admissions Committee - the group of admissions officers who review applications and make admit/deny decisions.", category:"Application"},
 { term:"Fit", definition:"How well your profile, goals, and values align with a school's culture, curriculum, and strengths. 'Fit' is often the deciding factor in borderline decisions.", category:"Application"},
 { term:"Pre-MBA", definition:"Work experience and activities before starting the MBA program. Most admits have 3-7 years. Less than 2 or more than 10 is unusual at most programs.", category:"Profile"},
 { term:"URM", definition:"Underrepresented Minority - in US MBA admissions, typically refers to Black, Hispanic/Latino, and Native American applicants. Many schools actively recruit URM candidates.", category:"Profile"},
 { term:"ORM", definition:"Overrepresented Minority - informal term for demographic groups that are well-represented in MBA applicant pools (e.g., Indian males in tech). Higher bar due to competition within cohort.", category:"Profile"},
 { term:"Consortium", definition:"The Consortium for Graduate Study in Management - a network of top business schools offering fellowships (full tuition) to promote diversity. Single application covers multiple schools.", category:"Financial"},
 { term:"Forté Fellowship", definition:"Fellowship program for women pursuing MBA. Provides scholarships, mentoring, and career development. Partner schools include most M7 and T15 programs.", category:"Financial"},
 { term:"ROI", definition:"Return on Investment - the financial return of an MBA considering total cost (tuition + opportunity cost) vs salary increase. Typical payback period is 3-5 years.", category:"Financial"},
 { term:"COA / Cost of Attendance", definition:"Total cost including tuition, fees, living expenses, books, and health insurance. Ranges from $100K (1-year) to $230K+ (2-year at top schools).", category:"Financial"},
];

const CATEGORIES = ["All","Testing","Profile","Application","Academics","Outcomes","Rankings","Career","Student Life","Financial"];

export default function GlossaryPage() {
 const [search, setSearch] = useState("");
 const [category, setCategory] = useState("All");

 const filtered = useMemo(() => {
 return TERMS.filter((t) => {
 if (category !=="All" && t.category !== category) return false;
 if (search && !t.term.toLowerCase().includes(search.toLowerCase()) && !t.definition.toLowerCase().includes(search.toLowerCase())) return false;
 return true;
 }).sort((a, b) => a.term.localeCompare(b.term));
 }, [search, category]);

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-4xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 MBA Glossary
 </h1>
 <p className="text-white/70 text-lg">{TERMS.length} terms every MBA applicant should know.</p>
 </div>
 </section>

 <div className="max-w-4xl mx-auto px-6 py-10">
 {/* Search */}
 <div className="relative mb-6">
 <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/20"/>
 <input
 type="text"
 placeholder="Search terms..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full pl-10 pr-4 py-3 border border-border/10 rounded-lg text-sm bg-card"
 />
 </div>

 {/* Category tabs */}
 <div className="flex flex-wrap gap-2 mb-8">
 {CATEGORIES.map((cat) => (
 <button
 key={cat}
 onClick={() => setCategory(cat)}
 className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
 category === cat ?"bg-foreground text-white":"bg-foreground/5 text-foreground/40 hover:bg-foreground/10"
 }`}
 >
 {cat}
 </button>
 ))}
 </div>

 <p className="text-xs text-foreground/30 mb-4">{filtered.length} terms</p>

 {/* Terms */}
 <div className="space-y-3">
 {filtered.map((t) => (
 <div key={t.term} className="editorial-card p-5">
 <div className="flex items-start justify-between gap-3">
 <div>
 <p className="font-medium text-foreground text-sm">{t.term}</p>
 <p className="text-xs text-foreground/50 mt-1 leading-relaxed">{t.definition}</p>
 </div>
 <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-bold shrink-0">
 {t.category}
 </span>
 </div>
 </div>
 ))}
 </div>

 {filtered.length === 0 && (
 <div className="text-center py-12 text-foreground/30">
 <BookOpen size={40} className="mx-auto mb-3 text-foreground/10"/>
 <p className="text-sm">No matching terms found.</p>
 </div>
 )}

 <ToolCrossLinks current="/glossary"/>
 </div>
 </main>
 );
}
