"use client";

import { useState, useEffect, useCallback } from"react";
import { FileText, Lightbulb, ListOrdered, PenLine, Save, RotateCcw } from"lucide-react";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

/* ── Template Data ───────────────────────────────────────────────────── */

type Template = {
 id: string;
 title: string;
 sections: string[];
 tips: string[];
 openers: string[];
};

const TEMPLATES: Template[] = [
 {
 id:"why-mba",
 title:"Why MBA",
 sections: [
"1. Opening hook - a pivotal professional moment that sparked your MBA ambition",
"2. Current role and what you have accomplished so far",
"3. The gap - skills or perspectives you need that only an MBA provides",
"4. Short-term career goal (specific role, industry, geography)",
"5. Long-term vision and broader impact",
"6. Closing - why now is the right time",
 ],
 tips: [
"Admissions committees want specificity - name the exact role, company type, or sector you are targeting.",
"Show a logical thread: past experience leads to the gap, which leads to the MBA, which leads to the goal.",
"Avoid generic reasons like \"networking\"or \"prestige.\"Instead, cite a specific class, lab, or initiative.",
"Keep it under 750 words unless the school specifies otherwise.",
 ],
 openers: [
"When I led the integration of two supply chains across Southeast Asia, I realized that operational expertise alone would not be enough to drive the systemic change I envision.",
"Three years into my career in healthcare consulting, a conversation with a hospital CEO changed the trajectory of my ambitions.",
"The moment our startup closed its Series A, I knew the next chapter of my growth required a fundamentally different kind of education.",
 ],
 },
 {
 id:"career-goals",
 title:"Career Goals",
 sections: [
"1. Where you are today - role, industry, key achievements",
"2. Inflection point - the experience that reshaped your career vision",
"3. Short-term goal (2-5 years post-MBA) - specific role and why",
"4. Long-term goal (10+ years) - the impact you want to make",
"5. Why an MBA is the critical bridge between today and those goals",
"6. What you will contribute to the program and your peers",
 ],
 tips: [
"Your short-term goal should be achievable and specific - recruiters and AdComs will judge plausibility.",
"Connect long-term goals to a larger mission or industry trend to show vision.",
"Demonstrate that you have researched the career outcomes of the program's graduates.",
"Use metrics where possible: revenue influenced, people managed, markets entered.",
 ],
 openers: [
"After five years in private equity, I have developed a conviction that climate infrastructure is the defining investment opportunity of our generation - and I want to lead capital allocation in this space.",
"My goal is to become a product leader at a frontier AI company within three years of graduation, building tools that make enterprise software radically more accessible.",
"Growing up in rural India and working in microfinance taught me that financial inclusion is not just a social good - it is an enormous market. My goal is to build the bridge between the two.",
 ],
 },
 {
 id:"why-this-school",
 title:"Why This School",
 sections: [
"1. Opening - a specific moment of connection with the school (visit, conversation, event)",
"2. Academic fit - name 2-3 courses, professors, or centers aligned with your goals",
"3. Community fit - clubs, treks, conferences, or traditions you will engage with",
"4. Career resources - recruiting relationships, alumni network, or career treks",
"5. Culture and values - what about this school's ethos resonates with you",
"6. Your unique contribution - what you will bring to the classroom and community",
 ],
 tips: [
"Name real courses, professors, and clubs - generic praise will not differentiate you.",
"Reference conversations with current students or alumni to show genuine engagement.",
"Align the school's strengths with your specific goals - do not just list features.",
"Every reason you give for wanting the school should connect back to your career narrative.",
 ],
 openers: [
"When Professor [Name]'s research on behavioral economics appeared in my feed, I spent the weekend reading every paper - and realized that [School] is where I need to be.",
"My conversation with [Alumni Name], Class of 2024, confirmed what the data already suggested: [School]'s approach to experiential learning is unmatched for aspiring operators.",
"Walking through [School]'s campus during Admitted Students Weekend, I felt the collaborative intensity I had been searching for - a community that debates ideas with rigor and respect.",
 ],
 },
 {
 id:"personal-statement",
 title:"Personal Statement",
 sections: [
"1. A vivid, specific scene that reveals who you are at your core",
"2. Background and formative experiences that shaped your values",
"3. A challenge or failure and what it taught you",
"4. How those values drive your professional choices and ambitions",
"5. What you care about beyond work - passions, service, identity",
"6. The thread connecting your past, present, and future self",
 ],
 tips: [
"This is the most personal essay - lead with story, not statements.",
"Vulnerability is an asset. Admissions officers remember authentic moments, not polished summaries.",
"Avoid repeating your resume. This essay should reveal dimensions your other materials cannot.",
"End on a forward-looking note that ties your personal identity to your MBA aspirations.",
 ],
 openers: [
"I was seventeen when I translated my mother's layoff notice from English to Spanish, and in that moment I understood that language is never just language - it is power.",
"The first business I started failed in four months. The second lasted two years. Both taught me more than any classroom ever has.",
"Every Sunday morning, my grandmother and I would sit at her kitchen table and review the family budget - a ritual that planted the seed for my career in finance.",
 ],
 },
];

const STORAGE_KEY ="loi-builder-drafts";

type Drafts = Record<string, string>;

function loadDrafts(): Drafts {
 if (typeof window ==="undefined") return {};
 try {
 const raw = localStorage.getItem(STORAGE_KEY);
 return raw ? JSON.parse(raw) : {};
 } catch {
 return {};
 }
}

function saveDrafts(drafts: Drafts) {
 try {
 localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
 } catch {
 /* storage full - silently fail */
 }
}

function countWords(text: string): number {
 return text.trim() ==="" ? 0 : text.trim().split(/\s+/).length;
}

/* ── Component ───────────────────────────────────────────────────────── */

export default function LoiBuilderPage() {
 const [selectedId, setSelectedId] = useState<string>(TEMPLATES[0].id);
 const [drafts, setDrafts] = useState<Drafts>({});
 const [saved, setSaved] = useState(false);

 useEffect(() => {
 setDrafts(loadDrafts());
 }, []);

 const template = TEMPLATES.find((t) => t.id === selectedId)!;
 const draft = drafts[selectedId] ??"";
 const wordCount = countWords(draft);

 const updateDraft = useCallback(
 (text: string) => {
 setDrafts((prev) => {
 const next = { ...prev, [selectedId]: text };
 saveDrafts(next);
 return next;
 });
 setSaved(false);
 },
 [selectedId],
 );

 const handleSave = () => {
 saveDrafts(drafts);
 setSaved(true);
 setTimeout(() => setSaved(false), 2000);
 };

 const handleReset = () => {
 if (!confirm("Clear this draft? This cannot be undone.")) return;
 setDrafts((prev) => {
 const next = { ...prev };
 delete next[selectedId];
 saveDrafts(next);
 return next;
 });
 };

 return (
 <main className="min-h-screen bg-background">
 {/* Hero */}
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-4xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Letter of Intent Builder
 </h1>
 <p className="text-white/70 text-lg">
 Guided templates for your MBA statement of purpose, career goals essay, and more.
 </p>
 </div>
 </section>

 <div className="max-w-4xl mx-auto px-6 py-10">
 {/* Template Selector */}
 <div className="editorial-card p-6 mb-8">
 <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 block">
 Choose a Template
 </span>
 <div className="flex flex-wrap gap-3">
 {TEMPLATES.map((t) => (
 <button
 key={t.id}
 onClick={() => setSelectedId(t.id)}
 className={`px-4 py-1.5 text-xs font-bold rounded-full border transition-colors ${
 selectedId === t.id
 ?"bg-foreground text-white border-border"
 :"border-border/10 text-muted-foreground hover:border-border/30"
 }`}
 >
 {t.title}
 </button>
 ))}
 </div>
 </div>

 {/* Structure Outline */}
 <div className="editorial-card p-6 mb-6">
 <div className="flex items-center gap-2 mb-4">
 <ListOrdered size={18} className="text-primary"/>
 <h2 className="text-lg font-semibold text-foreground">Structure Outline</h2>
 </div>
 <ol className="space-y-2">
 {template.sections.map((s, i) => (
 <li key={i} className="text-sm text-muted-foreground pl-1">
 {s}
 </li>
 ))}
 </ol>
 </div>

 {/* Tips */}
 <div className="editorial-card p-6 mb-6">
 <div className="flex items-center gap-2 mb-4">
 <Lightbulb size={18} className="text-primary"/>
 <h2 className="text-lg font-semibold text-foreground">Tips</h2>
 </div>
 <ul className="space-y-2">
 {template.tips.map((tip, i) => (
 <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
 <span className="text-primary mt-0.5 shrink-0">&bull;</span>
 {tip}
 </li>
 ))}
 </ul>
 </div>

 {/* Sample Openers */}
 <div className="editorial-card p-6 mb-8">
 <div className="flex items-center gap-2 mb-4">
 <PenLine size={18} className="text-primary"/>
 <h2 className="text-lg font-semibold text-foreground">Sample Opening Sentences</h2>
 </div>
 <div className="space-y-3">
 {template.openers.map((opener, i) => (
 <blockquote
 key={i}
 className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-4"
 >
 &ldquo;{opener}&rdquo;
 </blockquote>
 ))}
 </div>
 </div>

 {/* Draft Editor */}
 <div className="editorial-card p-6 mb-8">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2">
 <FileText size={18} className="text-primary"/>
 <h2 className="text-lg font-semibold text-foreground">Your Draft</h2>
 </div>
 <div className="flex items-center gap-3">
 <span
 className={`text-xs font-bold tabular-nums ${
 wordCount > 750 ?"text-red-500":"text-muted-foreground"
 }`}
 >
 {wordCount} word{wordCount !== 1 ?"s":""}
 </span>
 {wordCount > 750 && (
 <span className="text-[10px] px-2 py-0.5 bg-red-50 text-red-600 rounded-full font-bold">
 Over 750
 </span>
 )}
 </div>
 </div>

 <textarea
 value={draft}
 onChange={(e) => updateDraft(e.target.value)}
 placeholder={`Start drafting your"${template.title}"essay here...`}
 className="w-full min-h-[320px] p-4 rounded-lg border border-border/10 bg-card text-sm text-foreground leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 resize-y"
 />

 <div className="flex items-center justify-between mt-4">
 <button
 onClick={handleReset}
 className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 transition-colors"
 >
 <RotateCcw size={12} />
 Clear draft
 </button>
 <button
 onClick={handleSave}
 className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-bold rounded-full hover:bg-primary/90 transition-colors"
 >
 <Save size={12} />
 {saved ?"Saved!":"Save to browser"}
 </button>
 </div>
 </div>

 <ToolCrossLinks current="/loi-builder"/>
 </div>
 </main>
 );
}
