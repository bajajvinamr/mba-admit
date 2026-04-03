"use client";

import { useState, useMemo, useEffect } from"react";
import { motion } from"framer-motion";
import { FileText, Sparkles } from"lucide-react";
import { Button } from"@/components/ui/button";
import { Badge } from"@/components/ui/badge";
import { fadeIn } from"@/lib/motion";
import { cn } from"@/lib/cn";
import { EssayEditor } from"@/components/essays/EssayEditor";
import { AICoach } from"@/components/essays/AICoach";
import { PromptCard, type EssayPrompt } from"@/components/essays/PromptCard";
import { apiFetch } from"@/lib/api";

type School = { id: string; name: string };

const FALLBACK_SCHOOLS: School[] = [
 { id:"hbs", name:"Harvard Business School"},
 { id:"gsb", name:"Stanford GSB"},
 { id:"wharton", name:"Wharton"},
 { id:"booth", name:"Chicago Booth"},
 { id:"kellogg", name:"Kellogg"},
];

/* ---- Page Component ---- */

export default function EssayCoachPage() {
 const [schools, setSchools] = useState<School[]>(FALLBACK_SCHOOLS);
 const [prompts, setPrompts] = useState<EssayPrompt[]>([]);
 const [selectedSchool, setSelectedSchool] = useState<string>("hbs");
 const [selectedPrompt, setSelectedPrompt] = useState<EssayPrompt | null>(null);
 const [essayText, setEssayText] = useState("");
 const [mobilePanel, setMobilePanel] = useState<"editor"|"coach">("editor");

 // Fetch top schools on mount
 useEffect(() => {
 apiFetch("/api/schools?limit=10&sort=ranking")
  .then((r) => r.json())
  .then((data) => {
   const list = (data.schools || data.results || []).slice(0, 10);
   if (list.length > 0) {
    setSchools(list.map((s: { id?: string; school_id?: string; name: string }) => ({
     id: s.id || s.school_id || "",
     name: s.name,
    })));
   }
  })
  .catch(() => {}); // keep fallback
 }, []);

 // Fetch essay prompts when school changes
 useEffect(() => {
 apiFetch(`/api/essay-prompts?school_id=${selectedSchool}`)
  .then((r) => r.json())
  .then((data) => {
   const raw = data.prompts || data || [];
   const mapped: EssayPrompt[] = raw.map((p: { prompt?: string; prompt_text?: string; word_limit?: number; required?: boolean }, i: number) => ({
    id: `${selectedSchool}-${i}`,
    schoolName: schools.find((s) => s.id === selectedSchool)?.name || selectedSchool,
    promptText: p.prompt || p.prompt_text || String(p),
    wordLimit: p.word_limit || null,
    required: p.required ?? true,
   }));
   setPrompts(mapped);
   if (mapped.length > 0) setSelectedPrompt(mapped[0]);
  })
  .catch(() => setPrompts([]));
 }, [selectedSchool, schools]);

 const filteredPrompts = prompts;

 const schoolContext = useMemo(
 () => ({
 name: schools.find((s) => s.id === selectedSchool)?.name ??"",
 lookingFor:"",
 }),
 [selectedSchool, schools]
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
 {schools.map((school) => (
 <Button
 key={school.id}
 variant={selectedSchool === school.id ?"default":"outline"}
 size="sm"
 onClick={() => {
 setSelectedSchool(school.id);
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
 <AICoach
 essayText={essayText}
 promptText={selectedPrompt?.promptText}
 schoolId={selectedSchool}
 schoolContext={schoolContext}
 wordLimit={selectedPrompt?.wordLimit || undefined}
 />
 </div>
 </div>
 </motion.div>
 );
}
