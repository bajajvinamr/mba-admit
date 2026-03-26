"use client";

import { useState, useEffect, useMemo } from"react";
import { MessageCircle, ThumbsUp, Clock, Tag, Plus, Send, User } from"lucide-react";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type Post = {
 id: string;
 author: string;
 title: string;
 body: string;
 category: string;
 votes: number;
 replies: Reply[];
 createdAt: string;
};

type Reply = {
 id: string;
 author: string;
 body: string;
 votes: number;
 createdAt: string;
};

const CATEGORIES = ["All","School Selection","Essays","Interview","GMAT/GRE","Recommendations","Financial Aid","Post-Admit"];

const LS_KEY ="community-posts";

const SEED_POSTS: Post[] = [
 {
 id:"seed-1", author:"ApplicantX", title:"Is a 720 GMAT competitive for M7?",
 body:"I have a 720 GMAT, 3.6 GPA from a top 30 school, 4 years in tech consulting. Targeting HBS, GSB, and Wharton. Should I retake?",
 category:"GMAT/GRE", votes: 24, createdAt:"2026-03-10",
 replies: [
 { id:"r1", author:"MBAMentor", body:"720 is competitive for Wharton and most M7. For HBS/GSB, a 740+ gives you more breathing room, but your profile matters more than the score. Focus on your narrative.", votes: 18, createdAt:"2026-03-10"},
 { id:"r2", author:"R1Applicant", body:"I got into Booth with a 710. Your work experience and essays matter way more. Don't retake unless you think you can score 750+.", votes: 12, createdAt:"2026-03-11"},
 ],
 },
 {
 id:"seed-2", author:"CareerPivoter", title:"Switching from engineering to consulting - how to frame the 'why'?",
 body:"5 years as a software engineer at a FAANG. Want to pivot to strategy consulting post-MBA. Struggling with my 'why consulting' essay. Any tips?",
 category:"Essays", votes: 31, createdAt:"2026-03-08",
 replies: [
 { id:"r3", author:"ExMcKinsey", body:"Focus on the problem-solving overlap. You've been solving technical problems - now you want to solve business problems at a broader scale. Avoid generic reasons like 'impact' or 'working with smart people'.", votes: 22, createdAt:"2026-03-08"},
 ],
 },
 {
 id:"seed-3", author:"IntlApplicant", title:"Best schools for international students wanting to stay in the US?",
 body:"I'm from India, currently working in fintech. Want to stay in the US post-MBA. Which schools have the best track record for international placement and H-1B sponsorship?",
 category:"School Selection", votes: 19, createdAt:"2026-03-12",
 replies: [
 { id:"r4", author:"H1BSuccess", body:"Booth and Kellogg have great placement rates for international students. Also look at Ross and Fuqua - they have strong corporate partnerships that help with sponsorship.", votes: 15, createdAt:"2026-03-12"},
 ],
 },
 {
 id:"seed-4", author:"FirstGenMBA", title:"How to ask a recommender who's not great at writing?",
 body:"My direct manager knows my work best but English is his second language and he's not a strong writer. Should I still ask him, or go with someone less close but more articulate?",
 category:"Recommendations", votes: 27, createdAt:"2026-03-05",
 replies: [
 { id:"r5", author:"AdComInsider", body:"Always pick the person who knows you best. Adcoms can see through polished but generic letters. Offer to share bullet points of key stories/achievements to help them structure the letter.", votes: 30, createdAt:"2026-03-05"},
 { id:"r6", author:"ApplicantY", body:"I had the same dilemma. Went with my direct manager and got into multiple T15 schools. Authentic > polished.", votes: 8, createdAt:"2026-03-06"},
 ],
 },
 {
 id:"seed-5", author:"WaitlistedAtHBS", title:"Waitlist strategy - what actually works?",
 body:"Just got waitlisted at HBS R1. Should I send an update letter? Visit campus? What's the timeline?",
 category:"Post-Admit", votes: 35, createdAt:"2026-03-01",
 replies: [
 { id:"r7", author:"HBSAlum2024", body:"Send one strong update letter with tangible developments (promotion, new project, GMAT improvement). Visit campus if you haven't. Don't flood them - quality over quantity.", votes: 25, createdAt:"2026-03-01"},
 ],
 },
];

function loadPosts(): Post[] {
 if (typeof window ==="undefined") return SEED_POSTS;
 try {
 const stored = JSON.parse(localStorage.getItem(LS_KEY) ||"null");
 return stored || SEED_POSTS;
 } catch { return SEED_POSTS; }
}
function savePosts(p: Post[]) { localStorage.setItem(LS_KEY, JSON.stringify(p)); }

export default function CommunityPage() {
 const [posts, setPosts] = useState<Post[]>([]);
 const [category, setCategory] = useState("All");
 const [expandedId, setExpandedId] = useState<string | null>(null);
 const [showNew, setShowNew] = useState(false);
 const [newTitle, setNewTitle] = useState("");
 const [newBody, setNewBody] = useState("");
 const [newCat, setNewCat] = useState("School Selection");
 const [replyText, setReplyText] = useState<Record<string, string>>({});

 useEffect(() => { setPosts(loadPosts()); }, []);
 useEffect(() => { if (posts.length) savePosts(posts); }, [posts]);

 const filtered = useMemo(() => {
 const list = category ==="All" ? posts : posts.filter((p) => p.category === category);
 return list.sort((a, b) => b.votes - a.votes);
 }, [posts, category]);

 const addPost = () => {
 if (!newTitle.trim() || !newBody.trim()) return;
 const post: Post = {
 id: crypto.randomUUID(),
 author:"You",
 title: newTitle.trim(),
 body: newBody.trim(),
 category: newCat,
 votes: 0,
 replies: [],
 createdAt: new Date().toISOString().slice(0, 10),
 };
 setPosts([post, ...posts]);
 setNewTitle(""); setNewBody(""); setShowNew(false);
 };

 const addReply = (postId: string) => {
 const text = replyText[postId]?.trim();
 if (!text) return;
 setPosts(posts.map((p) => p.id === postId ? {
 ...p,
 replies: [...p.replies, {
 id: crypto.randomUUID(),
 author:"You",
 body: text,
 votes: 0,
 createdAt: new Date().toISOString().slice(0, 10),
 }],
 } : p));
 setReplyText({ ...replyText, [postId]:""});
 };

 const vote = (postId: string) => {
 setPosts(posts.map((p) => p.id === postId ? { ...p, votes: p.votes + 1 } : p));
 };

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-5xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Community
 </h1>
 <p className="text-white/70 text-lg">Questions, advice, and real talk from MBA applicants.</p>
 </div>
 </section>

 <div className="max-w-4xl mx-auto px-6 py-10">
 {/* Category tabs */}
 <div className="flex flex-wrap gap-2 mb-6">
 {CATEGORIES.map((cat) => (
 <button
 key={cat}
 onClick={() => setCategory(cat)}
 className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
 category === cat ?"bg-foreground text-white":"bg-foreground/5 text-muted-foreground hover:bg-foreground/10"
 }`}
 >
 {cat}
 </button>
 ))}
 </div>

 {/* New post button */}
 {!showNew ? (
 <button onClick={() => setShowNew(true)}
 className="mb-6 px-4 py-2 border border-border/10 text-sm text-muted-foreground rounded-lg hover:border-border/30 flex items-center gap-1">
 <Plus size={14} /> Ask a Question
 </button>
 ) : (
 <div className="editorial-card p-5 mb-6">
 <input type="text" placeholder="Question title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
 className="w-full px-3 py-2 border border-border/10 rounded text-sm mb-2"/>
 <textarea placeholder="Details..." value={newBody} onChange={(e) => setNewBody(e.target.value)}
 className="w-full px-3 py-2 border border-border/10 rounded text-sm h-24 resize-none mb-2"/>
 <div className="flex gap-2">
 <select value={newCat} onChange={(e) => setNewCat(e.target.value)}
 className="px-3 py-1.5 border border-border/10 rounded text-sm">
 {CATEGORIES.filter((c) => c !=="All").map((c) => <option key={c} value={c}>{c}</option>)}
 </select>
 <button onClick={addPost} className="px-4 py-1.5 bg-foreground text-white text-sm rounded font-medium">Post</button>
 <button onClick={() => setShowNew(false)} className="px-3 py-1.5 text-sm text-muted-foreground">Cancel</button>
 </div>
 </div>
 )}

 {/* Posts */}
 {filtered.map((post) => (
 <div key={post.id} className="editorial-card mb-4 overflow-hidden">
 <div className="flex gap-3 px-5 py-4">
 {/* Vote */}
 <button onClick={() => vote(post.id)} className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-primary">
 <ThumbsUp size={16} />
 <span className="text-xs font-bold">{post.votes}</span>
 </button>

 {/* Content */}
 <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(expandedId === post.id ? null : post.id)}>
 <div className="flex items-center gap-2 mb-1">
 <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-primary/10 text-primary`}>
 {post.category}
 </span>
 <span className="text-[10px] text-muted-foreground flex items-center gap-1">
 <User size={10} />{post.author}
 </span>
 <span className="text-[10px] text-muted-foreground flex items-center gap-1">
 <Clock size={10} />{post.createdAt}
 </span>
 </div>
 <p className="font-medium text-foreground text-sm">{post.title}</p>
 <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.body}</p>
 <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
 <MessageCircle size={10} />{post.replies.length} {post.replies.length === 1 ?"reply":"replies"}
 </p>
 </div>
 </div>

 {/* Expanded: replies */}
 {expandedId === post.id && (
 <div className="border-t border-border/5 px-5 py-4">
 {post.replies.map((reply) => (
 <div key={reply.id} className="flex gap-3 py-3 border-b border-border/5 last:border-0">
 <div className="w-6 text-center">
 <ThumbsUp size={12} className="text-muted-foreground mx-auto"/>
 <span className="text-[10px] text-muted-foreground">{reply.votes}</span>
 </div>
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-1">
 <span className="text-[10px] font-bold text-muted-foreground">{reply.author}</span>
 <span className="text-[10px] text-muted-foreground">{reply.createdAt}</span>
 </div>
 <p className="text-xs text-muted-foreground">{reply.body}</p>
 </div>
 </div>
 ))}

 {/* Reply input */}
 <div className="flex gap-2 mt-3">
 <input
 type="text"
 placeholder="Add a reply..."
 value={replyText[post.id] ||""}
 onChange={(e) => setReplyText({ ...replyText, [post.id]: e.target.value })}
 onKeyDown={(e) => e.key ==="Enter" && addReply(post.id)}
 className="flex-1 px-3 py-1.5 border border-border/10 rounded text-sm"
 />
 <button onClick={() => addReply(post.id)} className="p-1.5 bg-foreground text-white rounded">
 <Send size={14} />
 </button>
 </div>
 </div>
 )}
 </div>
 ))}

 <ToolCrossLinks current="/community"/>
 </div>
 </main>
 );
}
