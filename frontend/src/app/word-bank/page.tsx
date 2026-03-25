"use client";

import { useState } from"react";
import { BookOpen, Copy, Check } from"lucide-react";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type WordCategory = {
 id: string;
 label: string;
 description: string;
 sections: { title: string; words: string[] }[];
};

const CATEGORIES: WordCategory[] = [
 {
 id:"leadership",
 label:"Leadership",
 description:"Words that demonstrate initiative, influence, and team impact.",
 sections: [
 { title:"Action Verbs", words: ["Spearheaded","Orchestrated","Championed","Mobilized","Pioneered","Galvanized","Steered","Navigated","Catalyzed","Empowered","Mentored","Delegated","Rallied","Directed","Instituted"] },
 { title:"Impact Phrases", words: ["drove cross-functional alignment","built consensus among stakeholders","transformed team culture","scaled operations from X to Y","established a new standard for","turned around underperforming","created a framework for","developed a pipeline of talent"] },
 { title:"Qualities", words: ["decisive","collaborative","resilient","visionary","empathetic","accountable","inclusive","strategic","adaptive","authentic"] },
 ],
 },
 {
 id:"career_goals",
 label:"Career Goals",
 description:"Words for articulating your post-MBA vision with clarity and conviction.",
 sections: [
 { title:"Aspiration Verbs", words: ["Aspire","Envision","Intend","Aim","Seek","Pursue","Transition","Leverage","Pivot","Accelerate","Deepen","Broaden","Specialize","Scale"] },
 { title:"Bridge Phrases", words: ["bridge the gap between X and Y","at the intersection of","uniquely positioned to","building on my experience in","combining my background in X with","the MBA will equip me to","this trajectory will prepare me for","my short-term goal of X will lead to"] },
 { title:"Impact Words", words: ["disrupt","innovate","democratize","transform","optimize","streamline","reshape","modernize","scale","amplify"] },
 ],
 },
 {
 id:"why_school",
 label:"Why This School",
 description:"Phrases for connecting your goals to specific school offerings.",
 sections: [
 { title:"Connection Phrases", words: ["resonates deeply with","aligns perfectly with my goal of","uniquely offers","distinctively positioned to help me","the emphasis on X mirrors my own values","particularly drawn to","the collaborative culture of X matches","no other program offers this combination"] },
 { title:"Specificity Words", words: ["curriculum","concentration","experiential learning","capstone project","immersion program","cohort model","cross-disciplinary","dual degree","trek","lab","practicum","fellowship"] },
 { title:"Community Words", words: ["tight-knit","diverse","collaborative","intellectually rigorous","entrepreneurial","mission-driven","globally oriented"," values-driven","supportive","ambitious"] },
 ],
 },
 {
 id:"diversity",
 label:"Diversity & Background",
 description:"Words for sharing your unique perspective and cultural context.",
 sections: [
 { title:"Perspective Phrases", words: ["shaped my worldview","gave me a unique lens on","instilled in me a deep appreciation for","growing up between two cultures","navigating different contexts taught me","my non-traditional path","first in my family to","from an underrepresented community"] },
 { title:"Contribution Verbs", words: ["enrich","diversify","broaden","contribute","illuminate","share","challenge","represent","advocate","amplify"] },
 { title:"Identity Words", words: ["heritage","perspective"," identity","community"," values","tradition","belonging","inclusion","equity","representation"] },
 ],
 },
 {
 id:"failure",
 label:"Failure & Growth",
 description:"Words for showing self-awareness and learning from setbacks.",
 sections: [
 { title:"Reflection Verbs", words: ["Recognized","Realized","Confronted","Acknowledged","Reassessed","Recalibrated","Adapted","Overcame","Persevered","Rebounded","Recovered","Internalized"] },
 { title:"Growth Phrases", words: ["this experience taught me","in hindsight, I would have","the lesson I carry forward is","this failure became a turning point","I emerged with a deeper understanding of","it fundamentally changed how I approach","the most valuable feedback I received","I now recognize that"] },
 { title:"Maturity Words", words: ["humility","self-awareness","vulnerability","accountability","growth mindset","resilience","introspection","candor","emotional intelligence","composure"] },
 ],
 },
 {
 id:"teamwork",
 label:"Teamwork & Collaboration",
 description:"Words for demonstrating your ability to work with and through others.",
 sections: [
 { title:"Action Verbs", words: ["Collaborated","Co-created","Facilitated","Mediated","Synthesized","Aligned","Coordinated","Partnered","Integrated","Unified","Harmonized","Leveraged diverse perspectives"] },
 { title:"Outcome Phrases", words: ["delivered results that exceeded","built trust across functions","created shared ownership of","resolved competing priorities by","fostered an environment where","enabled team members to","built bridges between"] },
 { title:"Qualities", words: ["consensus-builder","cross-functional","inclusive","active listener","emotionally intelligent","diplomatic","adaptable","culturally sensitive"] },
 ],
 },
 {
 id:" transitions",
 label:"Transitions & Connectors",
 description:"Smooth connectors to improve essay flow and readability.",
 sections: [
 { title:"Cause & Effect", words: ["Consequently","As a result","This experience led me to","Building on this","Driven by this realization","Motivated by","Inspired by this outcome"] },
 { title:"Contrast", words: ["However","Despite this","While X, I also Y","On the other hand","In contrast to my initial assumption","Paradoxically","Yet this challenge"] },
 { title:"Progression", words: ["Furthermore","Moreover","Additionally","This laid the groundwork for","Taking this a step further","Expanding on this foundation","Looking ahead"] },
 { title:"Conclusion", words: ["Ultimately","In sum","This journey has prepared me to","I am now ready to","With this foundation","Armed with these experiences","My path forward is clear"] },
 ],
 },
];

export default function WordBankPage() {
 const [activeCategory, setActiveCategory] = useState("leadership");
 const [copied, setCopied] = useState<string | null>(null);

 const category = CATEGORIES.find((c) => c.id === activeCategory)!;

 const copyWord = (word: string) => {
 navigator.clipboard.writeText(word);
 setCopied(word);
 setTimeout(() => setCopied(null), 1500);
 };

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-5xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Essay Word Bank
 </h1>
 <p className="text-white/70 text-lg">Power words and phrases organized by MBA essay type. Click to copy.</p>
 </div>
 </section>

 <div className="max-w-5xl mx-auto px-6 py-10">
 {/* Category tabs */}
 <div className="flex flex-wrap gap-2 mb-8">
 {CATEGORIES.map((cat) => (
 <button
 key={cat.id}
 onClick={() => setActiveCategory(cat.id)}
 className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
 activeCategory === cat.id ?"bg-foreground text-white":"bg-foreground/5 text-muted-foreground hover:bg-foreground/10"
 }`}
 >
 {cat.label}
 </button>
 ))}
 </div>

 {/* Category description */}
 <div className="editorial-card p-5 mb-6 flex items-start gap-3">
 <BookOpen size={18} className="text-primary mt-0.5 shrink-0"/>
 <div>
 <p className="font-medium text-foreground text-sm">{category.label}</p>
 <p className="text-xs text-muted-foreground mt-0.5">{category.description}</p>
 </div>
 </div>

 {/* Word sections */}
 {category.sections.map((section) => (
 <div key={section.title} className="mb-6">
 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">{section.title}</p>
 <div className="flex flex-wrap gap-2">
 {section.words.map((word) => (
 <button
 key={word}
 onClick={() => copyWord(word)}
 className="group relative text-xs px-3 py-1.5 bg-card border border-border/10 rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground"
 >
 {word}
 <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] bg-foreground text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
 {copied === word ? <><Check size={8} className="inline mr-0.5"/>Copied!</> : <><Copy size={8} className="inline mr-0.5"/>Click to copy</>}
 </span>
 </button>
 ))}
 </div>
 </div>
 ))}

 <ToolCrossLinks current="/word-bank"/>
 </div>
 </main>
 );
}
