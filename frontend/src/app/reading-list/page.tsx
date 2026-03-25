"use client";

import { useState } from"react";
import { BookOpen, Star, Clock, User } from"lucide-react";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type Book = {
 title: string;
 author: string;
 category: string;
 whyRead: string;
 pages: number;
 difficulty:"Easy"|"Medium"|"Advanced";
 bestFor: string;
 rating: number;
};

const BOOKS: Book[] = [
 { title:"The Hard Thing About Hard Things", author:"Ben Horowitz", category:"Leadership", whyRead:"Raw, honest lessons from building and running a company. Perfect for leadership essays and interview stories.", pages: 304, difficulty:"Easy", bestFor:"Entrepreneurship essays, leadership examples", rating: 4.8 },
 { title:"Thinking, Fast and Slow", author:"Daniel Kahneman", category:"Strategy", whyRead:"Foundational behavioral economics. Adcoms love candidates who understand cognitive biases in business decisions.", pages: 499, difficulty:"Advanced", bestFor:"Building analytical frameworks for interviews", rating: 4.7 },
 { title:"Good to Great", author:"Jim Collins", category:"Strategy", whyRead:"The Level 5 Leadership concept is MBA interview gold. Understand what separates good companies from great ones.", pages: 320, difficulty:"Easy", bestFor:"Career goals essays, 'Why MBA?' articulation", rating: 4.5 },
 { title:"Lean Startup", author:"Eric Ries", category:"Entrepreneurship", whyRead:"MVP thinking and validated learning. Essential vocabulary if your post-MBA goal involves startups.", pages: 336, difficulty:"Easy", bestFor:"Tech/startup career goals", rating: 4.6 },
 { title:"Sapiens", author:"Yuval Noah Harari", category:"Big Picture", whyRead:"Broadens your worldview. Great for 'What matters most?' essays and showing intellectual curiosity.", pages: 443, difficulty:"Medium", bestFor:"Stanford essay, showing breadth of thinking", rating: 4.8 },
 { title:"Zero to One", author:"Peter Thiel", category:"Entrepreneurship", whyRead:"Contrarian thinking framework. 'What important truth do very few people agree with you on?' - a great essay prompt to internalize.", pages: 195, difficulty:"Easy", bestFor:"Innovation-focused essays and interviews", rating: 4.5 },
 { title:"The Innovator's Dilemma", author:"Clayton Christensen", category:"Strategy", whyRead:"HBS professor's most famous work. Understanding disruption theory shows business school readiness.", pages: 286, difficulty:"Medium", bestFor:"HBS applicants especially, strategy discussions", rating: 4.4 },
 { title:"Measure What Matters", author:"John Doerr", category:"Leadership", whyRead:"OKR framework used at Google, Intel, and top companies. Shows you understand how to set and achieve goals.", pages: 320, difficulty:"Easy", bestFor:"Goals essays, demonstrating strategic thinking", rating: 4.3 },
 { title:"Shoe Dog", author:"Phil Knight", category:"Memoir", whyRead:"Nike founder's memoir. Raw entrepreneurship story that'll inspire your own narrative and provide interview anecdotes.", pages: 386, difficulty:"Easy", bestFor:"Understanding the founder mindset", rating: 4.9 },
 { title:"Crossing the Chasm", author:"Geoffrey Moore", category:"Strategy", whyRead:"Classic tech marketing strategy. Essential if your career goals involve product management or GTM.", pages: 288, difficulty:"Medium", bestFor:"Tech PM career goals, marketing concentration", rating: 4.3 },
 { title:"Principles", author:"Ray Dalio", category:"Leadership", whyRead:"Radical transparency and decision-making frameworks. Great material for 'describe your leadership style' essays.", pages: 592, difficulty:"Medium", bestFor:"Finance career goals, leadership philosophy", rating: 4.4 },
 { title:"The Case Study Handbook", author:"William Ellet", category:"MBA Prep", whyRead:"Learn the case method before you start. Especially critical for HBS, Darden, and Ivey applicants.", pages: 272, difficulty:"Medium", bestFor:"Pre-enrollment preparation", rating: 4.2 },
 { title:"Becoming", author:"Michelle Obama", category:"Memoir", whyRead:"Identity, community, and purpose. Powerful inspiration for personal essays and 'What matters most?' prompts.", pages: 448, difficulty:"Easy", bestFor:"Personal essays, diversity of perspective", rating: 4.7 },
 { title:"Blue Ocean Strategy", author:"W. Chan Kim & Renée Mauborgne", category:"Strategy", whyRead:"Framework for creating uncontested market space. INSEAD professors' work - essential for INSEAD applicants.", pages: 320, difficulty:"Medium", bestFor:"INSEAD applicants, strategy concentration", rating: 4.3 },
 { title:"How to Win Friends and Influence People", author:"Dale Carnegie", category:"Leadership", whyRead:"Timeless interpersonal skills. MBA is as much about networking as academics.", pages: 288, difficulty:"Easy", bestFor:"Building networking skills pre-MBA", rating: 4.6 },
];

const CATEGORIES = ["All","Strategy","Leadership","Entrepreneurship","Memoir","MBA Prep","Big Picture"];

export default function ReadingListPage() {
 const [category, setCategory] = useState("All");
 const [sortBy, setSortBy] = useState<"rating"|"pages">("rating");

 const filtered = category ==="All" ? BOOKS : BOOKS.filter((b) => b.category === category);
 const sorted = [...filtered].sort((a, b) => sortBy ==="rating" ? b.rating - a.rating : a.pages - b.pages);

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-5xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 MBA Reading List
 </h1>
 <p className="text-white/70 text-lg">15 essential books to sharpen your thinking before business school.</p>
 </div>
 </section>

 <div className="max-w-5xl mx-auto px-6 py-10">
 <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
 <div className="flex flex-wrap gap-2">
 {CATEGORIES.map((cat) => (
 <button key={cat} onClick={() => setCategory(cat)}
 className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${category === cat ?"bg-foreground text-white":"bg-foreground/5 text-muted-foreground hover:bg-foreground/10"}`}>
 {cat}
 </button>
 ))}
 </div>
 <div className="flex gap-1">
 <button onClick={() => setSortBy("rating")}
 className={`text-[10px] px-2 py-1 rounded ${sortBy ==="rating" ?"bg-primary text-white":"bg-foreground/5 text-muted-foreground"}`}>
 By Rating
 </button>
 <button onClick={() => setSortBy("pages")}
 className={`text-[10px] px-2 py-1 rounded ${sortBy ==="pages" ?"bg-primary text-white":"bg-foreground/5 text-muted-foreground"}`}>
 Shortest First
 </button>
 </div>
 </div>

 <div className="grid md:grid-cols-2 gap-4">
 {sorted.map((book) => (
 <div key={book.title} className="editorial-card p-5">
 <div className="flex items-start gap-3">
 <BookOpen size={18} className="text-primary mt-0.5 shrink-0"/>
 <div className="flex-1">
 <p className="font-medium text-foreground text-sm">{book.title}</p>
 <p className="text-[10px] text-muted-foreground flex items-center gap-2">
 <span className="flex items-center gap-0.5"><User size={9} /> {book.author}</span>
 <span className="flex items-center gap-0.5"><Clock size={9} /> {book.pages}p</span>
 <span className="flex items-center gap-0.5"><Star size={9} className="text-primary fill-primary"/> {book.rating}</span>
 </p>
 <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{book.whyRead}</p>
 <div className="flex items-center gap-2 mt-2">
 <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-bold">{book.category}</span>
 <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
 book.difficulty ==="Easy" ?"bg-emerald-50 text-emerald-700":
 book.difficulty ==="Medium" ?"bg-amber-50 text-amber-700":
"bg-rose-50 text-rose-700"
 }`}>{book.difficulty}</span>
 </div>
 <p className="text-[10px] text-muted-foreground mt-2 italic">Best for: {book.bestFor}</p>
 </div>
 </div>
 </div>
 ))}
 </div>

 <ToolCrossLinks current="/reading-list"/>
 </div>
 </main>
 );
}
