"use client";

import { useState } from"react";
import { Headphones, ExternalLink, Star } from"lucide-react";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type Podcast = {
 name: string;
 host: string;
 description: string;
 category: string;
 episodes: string;
 rating: number;
 topics: string[];
 bestFor: string;
};

const PODCASTS: Podcast[] = [
 {
 name:"Clear Admit MBA Admissions Podcast", host:"Clear Admit", description:"Weekly coverage of MBA admissions news, school-specific analysis, and application strategy from the Clear Admit team.",
 category:"Admissions", episodes:"400+", rating: 4.7, topics: ["Application Strategy","School Profiles","Interview Tips"], bestFor:"Active applicants wanting weekly admissions intel",
 },
 {
 name:"Touch the MBA", host:"Darren Joe", description:"Candid conversations with MBA students and alumni about their journeys, from application to career outcomes.",
 category:"Student Stories", episodes:"200+", rating: 4.8, topics: ["Student Experience","Career Transitions","Diversity"], bestFor:"Hearing real stories from diverse applicants",
 },
 {
 name:"Poets&Quants MBA Insider", host:"John Byrne", description:"Deep dives into MBA rankings, school news, and interviews with deans and admissions directors.",
 category:"Industry News", episodes:"150+", rating: 4.5, topics: ["Rankings","School News","Dean Interviews"], bestFor:"Staying current on MBA industry trends",
 },
 {
 name:"MBA Admissions Podcast by ApplicantLab", host:"Maria Wich-Vila", description:"Practical, no-nonsense advice from a former HBS admissions board member. Covers essays, interviews, and strategy.",
 category:"Admissions", episodes:"100+", rating: 4.9, topics: ["Essays","Interview Prep","Admissions Strategy"], bestFor:"DIY applicants who want expert-level guidance for free",
 },
 {
 name:"Business Casual", host:"Morning Brew", description:"Conversations with business leaders about careers, strategy, and the future of work. Great for career goal ideation.",
 category:"Career", episodes:"300+", rating: 4.6, topics: ["Career Strategy","Industry Trends","Leadership"], bestFor:"Shaping your post-MBA career narrative",
 },
 {
 name:"The MBA Podcast", host:"Various", description:"Official podcasts from individual business schools featuring student stories, faculty insights, and program highlights.",
 category:"School-Specific", episodes:"Varies", rating: 4.4, topics: ["School Culture","Student Life","Faculty Research"], bestFor:"Deep-diving into specific schools you're targeting",
 },
 {
 name:"Admissions Straight Talk", host:"Linda Abraham", description:"The Accepted.com podcast featuring admissions experts discussing essays, interviews, and application strategy.",
 category:"Admissions", episodes:"250+", rating: 4.6, topics: ["Essay Strategy","School Selection","Interview Coaching"], bestFor:"Getting consultant-level advice without the price tag",
 },
 {
 name:"GMAT Club Podcast", host:"GMAT Club", description:"GMAT/GRE strategy, study plans, and test-day tips from top scorers and tutors.",
 category:"Testing", episodes:"80+", rating: 4.5, topics: ["GMAT Strategy","Study Plans","Score Improvement"], bestFor:"Active GMAT studyers wanting test-specific tips",
 },
 {
 name:"HBR IdeaCast", host:"Harvard Business Review", description:"Weekly conversations with leading business thinkers. Excellent for expanding your business vocabulary and thinking.",
 category:"Career", episodes:"900+", rating: 4.7, topics: ["Strategy","Management","Innovation"], bestFor:"Building business acumen for essays and interviews",
 },
 {
 name:"Wharton Moneyball", host:"Wharton Professors", description:"Data-driven analysis of business decisions. Showcases the analytical thinking valued at top MBA programs.",
 category:"School-Specific", episodes:"100+", rating: 4.3, topics: ["Analytics","Decision Making","Sports Business"], bestFor:"Understanding data-driven business thinking",
 },
];

const CATEGORIES = ["All","Admissions","Career","Testing","Student Stories","Industry News","School-Specific"];

export default function PodcastsPage() {
 const [category, setCategory] = useState("All");

 const filtered = category ==="All" ? PODCASTS : PODCASTS.filter((p) => p.category === category);

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-5xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 MBA Podcasts
 </h1>
 <p className="text-white/70 text-lg">Curated shows for every stage of your MBA journey.</p>
 </div>
 </section>

 <div className="max-w-5xl mx-auto px-6 py-10">
 <div className="flex flex-wrap gap-2 mb-8">
 {CATEGORIES.map((cat) => (
 <button key={cat} onClick={() => setCategory(cat)}
 className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${category === cat ?"bg-foreground text-white":"bg-foreground/5 text-foreground/40 hover:bg-foreground/10"}`}>
 {cat}
 </button>
 ))}
 </div>

 <div className="grid md:grid-cols-2 gap-4">
 {filtered.map((pod) => (
 <div key={pod.name} className="editorial-card p-5">
 <div className="flex items-start gap-3">
 <Headphones size={20} className="text-primary mt-0.5 shrink-0"/>
 <div className="flex-1">
 <p className="font-medium text-foreground text-sm">{pod.name}</p>
 <p className="text-[10px] text-foreground/40">by {pod.host} &middot; {pod.episodes} episodes</p>
 <p className="text-xs text-foreground/50 mt-2 leading-relaxed">{pod.description}</p>
 <div className="flex items-center gap-2 mt-2">
 <Star size={10} className="text-primary fill-primary"/>
 <span className="text-[10px] text-primary font-bold">{pod.rating}</span>
 <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-bold">{pod.category}</span>
 </div>
 <div className="flex flex-wrap gap-1 mt-2">
 {pod.topics.map((t) => (
 <span key={t} className="text-[9px] px-1.5 py-0.5 bg-foreground/5 rounded text-foreground/40">{t}</span>
 ))}
 </div>
 <p className="text-[10px] text-foreground/30 mt-2 italic">Best for: {pod.bestFor}</p>
 </div>
 </div>
 </div>
 ))}
 </div>

 <ToolCrossLinks current="/podcasts"/>
 </div>
 </main>
 );
}
