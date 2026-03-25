"use client";

import { useState, useRef, useEffect } from"react";
import { Loader2, Send, Edit, Target, BookOpen, CheckCircle2, Copy, Check } from"lucide-react";
import Link from 'next/link';
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import { apiFetch } from"@/lib/api";
import { useAbortSignal } from"@/hooks/useAbortSignal";
import { useUsage } from"@/hooks/useUsage";
import { UsageGate } from"@/components/UsageGate";
import { EmailCapture } from"@/components/EmailCapture";

interface SchoolData {
 id: string;
 name: string;
}

interface Message {
 role:"user"|"assistant";
 content: string;
}

export default function StorytellerPage() {
 const abortSignal = useAbortSignal();
 const usage = useUsage("storyteller");
 // App state
 const [step, setStep] = useState<"setup"|"chat"|"outline">("setup");
 
 // Setup data
 const [schools, setSchools] = useState<SchoolData[]>([]);
 const [loadingSchools, setLoadingSchools] = useState(true);
 
 // Selection
 const [schoolName, setSchoolName] = useState("");
 const [essayPrompt, setEssayPrompt] = useState("");
 
 // Chat state
 const [messages, setMessages] = useState<Message[]>([]);
 const [inputValue, setInputValue] = useState("");
 const [isLoading, setIsLoading] = useState(false);
 const [extractedOutline, setExtractedOutline] = useState<string | null>(null);
 const [error, setError] = useState<string | null>(null);
 const [copied, setCopied] = useState(false);
 
 const messagesEndRef = useRef<HTMLDivElement>(null);

 // Restore conversation from sessionStorage on mount
 useEffect(() => {
 const saved = sessionStorage.getItem("mba_storyteller_chat");
 if (saved) {
 try {
 const data = JSON.parse(saved);
 setSchoolName(data.schoolName ||"");
 setEssayPrompt(data.essayPrompt ||"");
 setMessages(data.chatHistory || []);
 setStep(data.step ||"setup");
 if (data.extractedOutline) setExtractedOutline(data.extractedOutline);
 } catch (err) {
 console.error("Failed to restore storyteller session:", err);
 }
 }
 }, []);

 // Save conversation to sessionStorage on changes
 useEffect(() => {
 if (messages.length > 0) {
 sessionStorage.setItem("mba_storyteller_chat", JSON.stringify({ schoolName, essayPrompt, chatHistory: messages, step, extractedOutline }));
 }
 }, [messages, step, schoolName, essayPrompt, extractedOutline]);

 // Fetch school list on mount
 useEffect(() => {
 async function fetchSchools() {
 try {
 const data = await apiFetch<SchoolData[]>(`/api/schools/names`);
 const parsedSchools = Array.isArray(data) ? data : [];
 const schoolList = parsedSchools
 .filter((s) => s.name)
 .sort((a, b) => a.name.localeCompare(b.name));
 setSchools(schoolList);
 } catch (err) {
 console.error("Failed to load schools:", err);
 setError("Failed to load school list. Please refresh the page.");
 } finally {
 setLoadingSchools(false);
 }
 }
 fetchSchools();
 }, []);

 // Scroll to bottom of chat
 useEffect(() => {
 messagesEndRef.current?.scrollIntoView({ behavior:"smooth"});
 }, [messages, isLoading]);

 const handleStartChat = () => {
 if (!schoolName || !essayPrompt.trim()) {
 setError("Please select a school and enter an essay prompt to begin.");
 return;
 }
 setError(null);
 setStep("chat");
 usage.recordUse();

 // Auto-trigger the first assistant probing question
 handleSendMessage("Hi! I'm ready to brainstorm for this essay.", true);
 };

 const handleSendMessage = async (customMessage?: string, isInitial: boolean = false) => {
 const textToSend = customMessage || inputValue.trim();
 if (!textToSend && !isInitial) return;

 if (!isInitial) {
 setMessages((prev) => [...prev, { role:"user", content: textToSend }]);
 setInputValue("");
 }
 
 setIsLoading(true);
 setError(null);

 try {
 // Send only strictly previous history to backend (not including the new message attached separately)
 const currentHistory = isInitial ? [] : messages;
 
 const data = await apiFetch<{ reply: string; is_complete: boolean; extracted_outline?: string }>(`/api/essays/storyteller`, {
 method:"POST",
 body: JSON.stringify({
 school_name: schoolName,
 essay_prompt: essayPrompt,
 chat_history: currentHistory,
 new_message: textToSend,
 }),
 noRetry: true,
 timeoutMs: 60_000,
 signal: abortSignal,
 });

 setMessages((prev) => [...prev, { role:"assistant", content: data.reply }]);
 
 if (data.is_complete && data.extracted_outline) {
 setExtractedOutline(data.extracted_outline);
 // Small delay so user sees the final reply before moving to outline view
 setTimeout(() => setStep("outline"), 3000);
 }
 
 } catch (err: any) {
 setError(err.message ||"An error occurred in communications.");
 if (!isInitial) {
 // remove the optimistic user message on error
 setMessages((prev) => prev.slice(0, -1));
 }
 } finally {
 setIsLoading(false);
 }
 };

 const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
 if (e.key === 'Enter' && !e.shiftKey) {
 e.preventDefault();
 handleSendMessage();
 }
 };

 return (
 <>
 <UsageGate feature="storyteller">
 <div className="min-h-screen bg-muted flex flex-col py-24 px-6">

 {/* Header */}
 <div className="text-center mb-10 max-w-3xl mx-auto">
 <h1 className="text-4xl font-display font-medium text-foreground mb-4 inline-flex items-center gap-3">
 <BookOpen className="w-10 h-10 text-foreground"/> Master Storyteller
 </h1>
 <p className="text-lg text-muted-foreground">
 AdComs want introspection, not just a resume rehash. Ideate your essay narrative through a guided, Socratic interview with an elite AI consultant.
 </p>
 </div>

 <div className="max-w-4xl max-w-5xl mx-auto w-full flex-grow flex flex-col bg-card border border-border shadow-sm rounded-lg overflow-hidden relative">
 
 {/* --- STEP 1: SETUP --- */}
 {step ==="setup" && (
 <div className="p-8 md:p-12 animate-in fade-in zoom-in-95 duration-300">
 <h2 className="text-2xl heading-serif text-foreground mb-8 border-b pb-4">Define The Prompt</h2>
 
 <div className="space-y-8">
 <div className="space-y-3">
 <label htmlFor="st-school" className="text-sm font-bold text-gray-700 uppercase tracking-widest">Target School</label>
 <select
 id="st-school"
 className="w-full flex h-12 rounded-lg border border-border bg-muted px-4 py-2 text-md text-foreground focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
 disabled={loadingSchools}
 value={schoolName}
 onChange={(e) => setSchoolName(e.target.value)}
 >
 <option value="" disabled>{loadingSchools ?"Loading schools...":"Select the school you're writing for..."}</option>
 {schools.map((school) => (
 <option key={school.name} value={school.name}>
 {school.name}
 </option>
 ))}
 </select>
 </div>

 <div className="space-y-3">
 <label htmlFor="st-prompt" className="text-sm font-bold text-gray-700 uppercase tracking-widest flex justify-between">
 <span>The Essay Prompt</span>
 <span className="text-muted-foreground font-normal normal-case text-xs">Copy/paste the exact prompt</span>
 </label>
 <textarea
 id="st-prompt"
 placeholder="e.g., What matters most to you, and why? (600 words)"
 className="w-full flex min-h-[140px] rounded-lg border border-border bg-muted p-4 text-md placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none transition-all leading-relaxed"
 value={essayPrompt}
 onChange={(e) => setEssayPrompt(e.target.value)}
 />
 </div>

 {error && (
 <div role="alert" className="p-4 bg-red-50 text-red-700 text-sm border border-red-200 rounded-lg flex items-center gap-2">
 <Target className="w-5 h-5 flex-shrink-0"/>
 <p className="font-medium">{error}</p>
 </div>
 )}

 <div className="pt-4">
 <button
 disabled={!schoolName || !essayPrompt.trim()}
 className="w-full sm:w-auto px-10 flex items-center justify-center bg-black hover:bg-black/90 text-white font-medium h-14 rounded-lg text-lg transition-all duration-200 disabled:opacity-50"
 onClick={handleStartChat}
 >
 Start The Interview →
 </button>
 </div>
 </div>
 </div>
 )}


 {/* --- STEP 2: CHAT INTERFACE --- */}
 {step ==="chat" && (
 <div className="flex flex-col h-[70vh] min-h-[500px] bg-muted">
 {/* Chat Context Header */}
 <div className="bg-card border-b px-6 py-4 flex items-start justify-between">
 <div>
 <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Targeting {schoolName}</p>
 <p className="text-sm font-medium text-foreground line-clamp-2 md:line-clamp-none">
 Prompt:"{essayPrompt}"
 </p>
 </div>
 <button
 onClick={() => setStep("setup")}
 className="text-muted-foreground hover:text-foreground transition-colors"
 title="Edit setup"
 aria-label="Edit setup"
 >
 <Edit className="w-4 h-4"/>
 </button>
 </div>

 {/* Messages Area */}
 <div className="flex-1 overflow-y-auto p-6 space-y-6" aria-live="polite">
 {messages.map((msg, i) => (
 <div key={i} className={`flex ${msg.role ==="assistant" ?"justify-start":"justify-end"}`}>
 <div className={`max-w-[85%] rounded-2xl p-5 text-[15px] leading-relaxed ${
 msg.role ==="assistant"
 ?"bg-card border border-border text-foreground rounded-tl-none"
 :"bg-black text-white rounded-tr-none"
 }`}>
 {msg.role ==="assistant" && (
 <div className="flex items-center gap-2 mb-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
 <Target className="w-3 h-3 text-foreground"/>
 Consultant
 </div>
 )}
 <span className="whitespace-pre-wrap">{msg.content}</span>
 </div>
 </div>
 ))}
 
 {isLoading && (
 <div className="flex justify-start">
 <div className="bg-card border border-border rounded-2xl rounded-tl-none p-5 flex items-center gap-3">
 <Loader2 className="w-5 h-5 animate-spin text-muted-foreground"/>
 <span className="text-sm text-muted-foreground font-medium">Analyzing response...</span>
 </div>
 </div>
 )}
 
 {error && (
 <div role="alert" className="mx-auto bg-red-50 text-red-700 text-sm border border-red-200 rounded-lg p-3 text-center max-w-sm">
 {error}
 </div>
 )}
 <div ref={messagesEndRef} />
 </div>

 {/* Input Area */}
 <div className="p-4 bg-card border-t border-border">
 <div className="relative max-w-4xl mx-auto flex items-end">
 <textarea
 value={inputValue}
 onChange={(e) => setInputValue(e.target.value)}
 onKeyDown={handleKeyDown}
 placeholder="Type your response here... (Shift+Enter for new line)"
 aria-label="Your response"
 className="w-full max-h-40 min-h-[60px] resize-none rounded-lg border border-border bg-muted px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all pr-14"
 />
 <button
 onClick={() => handleSendMessage()}
 disabled={!inputValue.trim() || isLoading}
 aria-label="Send message"
 aria-busy={isLoading}
 className="absolute right-2 bottom-2 p-2.5 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-black transition-all"
 >
 <Send className="w-4 h-4"/>
 </button>
 </div>
 </div>
 </div>
 )}

 {/* --- STEP 3: OUTLINE EXTRACTED --- */}
 {step ==="outline" && extractedOutline && (
 <div className="flex flex-col h-full bg-card animate-in zoom-in-95 duration-500">
 <div className="bg-stone-900 border-b border-stone-800 px-8 py-10 text-center">
 <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4"/>
 <h2 className="text-3xl font-display text-white mb-2">Narrative Extracted</h2>
 <p className="text-stone-400 max-w-xl mx-auto text-lg">
 Based on our conversation, here is a structured outline you can use to draft your essay for {schoolName}.
 </p>
 </div>
 
 <div className="p-8 md:p-12 overflow-y-auto">
 <div className="prose prose-stone max-w-3xl mx-auto">
 <div className="bg-muted p-8 rounded-lg border border-border whitespace-pre-wrap font-display text-foreground leading-relaxed text-lg">
 {extractedOutline}
 </div>
 </div>

 <div className="mt-12 text-center border-t pt-8">
 <button
 onClick={() => {
 navigator.clipboard.writeText(extractedOutline);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 }}
 className="px-8 py-4 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors inline-flex items-center gap-2"
 >
 {copied ? <Check className="w-5 h-5"/> : <Copy className="w-5 h-5"/>}
 {copied ?"Copied!":"Copy Outline to Clipboard"}
 </button>
 <button 
 onClick={() => {
 setMessages([]);
 setExtractedOutline(null);
 setStep("setup");
 sessionStorage.removeItem("mba_storyteller_chat");
 }}
 className="ml-4 px-8 py-4 bg-card text-muted-foreground border border-border font-medium rounded-lg hover:bg-muted transition-colors inline-block"
 >
 Start Over
 </button>
 </div>
 </div>
 </div>
 )}

 </div>
 </div>
 </UsageGate>

 <div className="max-w-4xl mx-auto px-6 pb-8">
 <EmailCapture variant="contextual"source="storyteller"/>
 <ToolCrossLinks current="/storyteller"/>
 </div>
 </>
 );
}