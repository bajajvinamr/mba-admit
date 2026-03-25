"use client";

import { useState, useMemo } from"react";
import { motion } from"framer-motion";
import { FileText, Sparkles } from"lucide-react";
import { Button } from"@/components/ui/button";
import { Badge } from"@/components/ui/badge";
import { fadeIn } from"@/lib/motion";
import { cn } from"@/lib/cn";
import { EssayEditor } from"@/components/essays/EssayEditor";
import { AICoach } from"@/components/essays/AICoach";
import { PromptCard, type EssayPrompt } from"@/components/essays/PromptCard";

/* ---- Mock Data ---- */

const MOCK_SCHOOLS = [
 { id:"hbs", name:"Harvard Business School"},
 { id:"gsb", name:"Stanford GSB"},
 { id:"wharton", name:"Wharton"},
 { id:"booth", name:"Chicago Booth"},
 { id:"kellogg", name:"Kellogg"},
];

const MOCK_PROMPTS: EssayPrompt[] = [
 {
 id:"hbs-1",
 schoolName:"Harvard Business School",
 promptText:
"As we review your application, what more would you like us to know as we consider your candidacy for the Harvard Business School MBA program?",
 wordLimit: 900,
 required: true,
 },
 {
 id:"gsb-1",
 schoolName:"Stanford GSB",
 promptText:"What matters most to you, and why?",
 wordLimit: 650,
 required: true,
 },
 {
 id:"gsb-2",
 schoolName:"Stanford GSB",
 promptText:"Why Stanford?",
 wordLimit: 400,
 required: true,
 },
 {
 id:"wharton-1",
 schoolName:"Wharton",
 promptText:
"How do you plan to use the Wharton MBA program to help you achieve your future professional goals? You might consider your past experience, short and long-term goals, and how Wharton's resources can help.",
 wordLimit: 500,
 required: true,
 },
 {
 id:"booth-1",
 schoolName:"Chicago Booth",
 promptText:
"How will a Booth MBA help you achieve your immediate and long-term post-MBA career goals?",
 wordLimit: 250,
 required: true,
 },
 {
 id:"kellogg-1",
 schoolName:"Kellogg",
 promptText:
"Kellogg leaders are primed to tackle challenges everywhere. Describe a time you have demonstrated leadership and created lasting value. What challenges did you face, and what did you learn?",
 wordLimit: 450,
 required: true,
 },
 {
 id:"kellogg-2",
 schoolName:"Kellogg",
 promptText:
"Values are what guide you in your life and work. What values are important to you and how have they influenced you?",
 wordLimit: 450,
 required: false,
 },
];

const SCHOOL_CONTEXT: Record<string, string> = {
 hbs:"Looks for: leadership under ambiguity, habit of going beyond expectations, personal growth through challenge.",
 gsb:"Looks for: deep self-awareness, clarity of purpose, authentic personal narrative.",
 wharton:"Looks for: analytical rigor, collaborative spirit, specific knowledge of Wharton resources.",
 booth:"Looks for: intellectual curiosity, data-driven thinking, clear career vision with Booth-specific fit.",
 kellogg:"Looks for: teamwork & empathy, values-driven leadership, community impact.",
};

/* ---- Page Component ---- */

export default function EssayCoachPage() {
 const [selectedSchool, setSelectedSchool] = useState<string>("hbs");
 const [selectedPrompt, setSelectedPrompt] = useState<EssayPrompt>(
 MOCK_PROMPTS[0]
 );
 const [essayText, setEssayText] = useState("");
 const [mobilePanel, setMobilePanel] = useState<"editor"|"coach">("editor");

 const filteredPrompts = useMemo(
 () =>
 MOCK_PROMPTS.filter(
 (p) =>
 p.schoolName ===
 MOCK_SCHOOLS.find((s) => s.id === selectedSchool)?.name
 ),
 [selectedSchool]
 );

 const schoolContext = useMemo(
 () => ({
 name: MOCK_SCHOOLS.find((s) => s.id === selectedSchool)?.name ??"",
 lookingFor: SCHOOL_CONTEXT[selectedSchool] ??"",
 }),
 [selectedSchool]
 );

 return (
 <motion.div
 {...fadeIn}
 className="flex h-dvh flex-col overflow-hidden"
 >
 {/* Header */}
 <header className="flex shrink-0 flex-col gap-3 border-b px-4 py-3 sm:px-6">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <FileText className="size-5 text-primary"/>
 <h1 className="text-lg font-semibold">Essay Coach</h1>
 <Badge variant="secondary" className="text-xs">
 Beta
 </Badge>
 </div>

 {/* Mobile panel toggle */}
 <div className="flex gap-1 lg:hidden">
 <Button
 variant={mobilePanel ==="editor" ?"default":"outline"}
 size="sm"
 onClick={() => setMobilePanel("editor")}
 >
 <FileText className="mr-1 size-3.5"/>
 Write
 </Button>
 <Button
 variant={mobilePanel ==="coach" ?"default":"outline"}
 size="sm"
 onClick={() => setMobilePanel("coach")}
 >
 <Sparkles className="mr-1 size-3.5"/>
 Coach
 </Button>
 </div>
 </div>

 {/* School selector + prompt selector */}
 <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
 <div className="flex flex-wrap gap-1.5">
 {MOCK_SCHOOLS.map((school) => (
 <Button
 key={school.id}
 variant={selectedSchool === school.id ?"default":"outline"}
 size="sm"
 onClick={() => {
 setSelectedSchool(school.id);
 const first = MOCK_PROMPTS.find(
 (p) => p.schoolName === school.name
 );
 if (first) setSelectedPrompt(first);
 setEssayText("");
 }}
 className="text-xs"
 >
 {school.name}
 </Button>
 ))}
 </div>
 </div>

 {/* Prompt cards (horizontal scroll on mobile) */}
 {filteredPrompts.length > 1 && (
 <div className="flex gap-2 overflow-x-auto pb-1">
 {filteredPrompts.map((prompt) => (
 <div key={prompt.id} className="min-w-[280px] shrink-0">
 <PromptCard
 prompt={prompt}
 selected={selectedPrompt.id === prompt.id}
 onSelect={(p) => {
 setSelectedPrompt(p);
 setEssayText("");
 }}
 />
 </div>
 ))}
 </div>
 )}

 {/* Single prompt display when only one */}
 {filteredPrompts.length === 1 && (
 <PromptCard prompt={filteredPrompts[0]} selected />
 )}
 </header>

 {/* Main Content: Split panel */}
 <div className="flex min-h-0 flex-1">
 {/* Left: Essay Editor */}
 <div
 className={cn(
"flex flex-col border-r p-4",
"lg:flex lg:w-1/2",
 mobilePanel ==="editor" ?"flex w-full":"hidden"
 )}
 >
 <div className="mb-2 text-xs text-muted-foreground">
 {selectedPrompt.promptText}
 </div>
 <EssayEditor
 value={essayText}
 onChange={setEssayText}
 wordLimit={selectedPrompt.wordLimit}
 placeholder={`Write your ${selectedPrompt.schoolName} essay here...`}
 />
 </div>

 {/* Right: AI Coach */}
 <div
 className={cn(
"flex flex-col p-4",
"lg:flex lg:w-1/2",
 mobilePanel ==="coach" ?"flex w-full":"hidden"
 )}
 >
 <AICoach essayText={essayText} schoolContext={schoolContext} />
 </div>
 </div>
 </motion.div>
 );
}
