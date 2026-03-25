"use client";

import { useState, useRef, useEffect, useCallback } from"react";
import { Card, CardContent } from"@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from"@/components/ui/tabs";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { ScrollArea } from"@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from"@/components/ui/avatar";
import { Separator } from"@/components/ui/separator";
import { Send, Sparkles, Brain, Eye, Palette } from"lucide-react";
import { cn } from"@/lib/cn";
import { ToneChecker } from"./ToneChecker";

type Message = {
 id: string;
 role:"user"|"assistant";
 content: string;
 timestamp: Date;
};

type SchoolContext = {
 name: string;
 lookingFor: string;
};

type AICoachProps = {
 essayText: string;
 schoolContext: SchoolContext | null;
};

const MOCK_RESPONSES: Record<string, string[]> = {
 brainstorm: [
"That's a great starting point. Can you think of a specific moment that crystallized this goal for you? The more concrete and sensory the detail, the more the reader will connect with your story.",
"I notice you're focused on the 'what' — but admissions readers care about the 'why.' What was the turning point that made this path feel inevitable rather than just interesting?",
"Consider the 'before and after' structure: Who were you before this experience, and how did it fundamentally shift your perspective?",
 ],
 review: [
"Your opening paragraph tells rather than shows. Instead of stating 'I am passionate about finance,' could you open with a scene that demonstrates that passion in action?",
"The transition between paragraphs 2 and 3 feels abrupt. What connects these two ideas? Finding that bridge will strengthen your narrative arc.",
"Your conclusion restates your intro. Try ending with a forward-looking vision that builds on everything you've shared — where is this story going next?",
 ],
 tone: [
"I'm detecting a few phrases that read as formulaic. Let me run a tone check to highlight specific areas where your authentic voice could shine through more.",
"Your second paragraph has a different energy than the rest — it feels more genuinely you. Can you bring that same conversational quality to the opening?",
 ],
};

function generateMockResponse(mode: string): string {
 const responses = MOCK_RESPONSES[mode] ?? MOCK_RESPONSES.brainstorm;
 return responses[Math.floor(Math.random() * responses.length)];
}

export function AICoach({ essayText, schoolContext }: AICoachProps) {
 const [messages, setMessages] = useState<Message[]>([
 {
 id:"welcome",
 role:"assistant",
 content:
"Hi! I'm your essay coach. I won't write your essay for you — instead, I'll ask questions and give feedback to help you find your authentic voice. What would you like to work on?",
 timestamp: new Date(),
 },
 ]);
 const [input, setInput] = useState("");
 const [mode, setMode] = useState("brainstorm");
 const scrollRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
 if (scrollRef.current) {
 scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
 }
 }, [messages]);

 const handleSend = useCallback(() => {
 const trimmed = input.trim();
 if (!trimmed) return;

 const userMsg: Message = {
 id: `user-${Date.now()}`,
 role:"user",
 content: trimmed,
 timestamp: new Date(),
 };

 const assistantMsg: Message = {
 id: `assistant-${Date.now()}`,
 role:"assistant",
 content: generateMockResponse(mode),
 timestamp: new Date(),
 };

 setMessages((prev) => [...prev, userMsg, assistantMsg]);
 setInput("");
 }, [input, mode]);

 const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
 if (e.key ==="Enter" && !e.shiftKey) {
 e.preventDefault();
 handleSend();
 }
 };

 return (
 <div className="flex h-full flex-col gap-3">
 {/* School Context Card */}
 {schoolContext && (
 <Card size="sm">
 <CardContent className="flex items-start gap-3 px-4 py-3">
 <Sparkles className="mt-0.5 size-4 shrink-0 text-primary"/>
 <div className="flex flex-col gap-0.5">
 <span className="text-sm font-medium">{schoolContext.name}</span>
 <span className="text-xs text-muted-foreground">
 {schoolContext.lookingFor}
 </span>
 </div>
 </CardContent>
 </Card>
 )}

 {/* Mode Tabs */}
 <Tabs
 defaultValue={0}
 onValueChange={(val) => {
 const modes = ["brainstorm","review","tone"];
 if (typeof val ==="number") setMode(modes[val]);
 }}
 >
 <TabsList className="w-full">
 <TabsTrigger value={0} className="flex-1 gap-1.5">
 <Brain className="size-3.5"/>
 <span className="hidden sm:inline">Brainstorm</span>
 </TabsTrigger>
 <TabsTrigger value={1} className="flex-1 gap-1.5">
 <Eye className="size-3.5"/>
 <span className="hidden sm:inline">Review</span>
 </TabsTrigger>
 <TabsTrigger value={2} className="flex-1 gap-1.5">
 <Palette className="size-3.5"/>
 <span className="hidden sm:inline">Tone Check</span>
 </TabsTrigger>
 </TabsList>

 <TabsContent value={0} className="flex min-h-0 flex-1 flex-col">
 <ChatPanel
 messages={messages}
 input={input}
 setInput={setInput}
 onSend={handleSend}
 onKeyDown={handleKeyDown}
 scrollRef={scrollRef}
 />
 </TabsContent>

 <TabsContent value={1} className="flex min-h-0 flex-1 flex-col">
 <ChatPanel
 messages={messages}
 input={input}
 setInput={setInput}
 onSend={handleSend}
 onKeyDown={handleKeyDown}
 scrollRef={scrollRef}
 />
 </TabsContent>

 <TabsContent value={2} className="min-h-0 flex-1 overflow-y-auto">
 <ToneChecker text={essayText} />
 </TabsContent>
 </Tabs>
 </div>
 );
}

/* ---- Chat Panel Sub-component ---- */

type ChatPanelProps = {
 messages: Message[];
 input: string;
 setInput: (val: string) => void;
 onSend: () => void;
 onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
 scrollRef: React.RefObject<HTMLDivElement | null>;
};

function ChatPanel({
 messages,
 input,
 setInput,
 onSend,
 onKeyDown,
 scrollRef,
}: ChatPanelProps) {
 return (
 <div className="flex min-h-0 flex-1 flex-col gap-2">
 {/* Messages */}
 <ScrollArea className="min-h-0 flex-1">
 <div ref={scrollRef} className="flex flex-col gap-3 py-2">
 {messages.map((msg) => (
 <div
 key={msg.id}
 className={cn(
"flex gap-2",
 msg.role ==="user" ?"flex-row-reverse":"flex-row"
 )}
 >
 <Avatar size="sm" className="mt-0.5 shrink-0">
 <AvatarFallback>
 {msg.role ==="user" ?"Y":"AI"}
 </AvatarFallback>
 </Avatar>
 <div
 className={cn(
" max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed",
 msg.role ==="user"
 ?"bg-primary text-primary-foreground"
 :"bg-muted"
 )}
 >
 {msg.content}
 </div>
 </div>
 ))}
 </div>
 </ScrollArea>

 <Separator />

 {/* Input */}
 <div className="flex items-center gap-2">
 <Input
 value={input}
 onChange={(e) => setInput(e.target.value)}
 onKeyDown={onKeyDown}
 placeholder="Ask a question or paste text for feedback"
 className="flex-1"
 />
 <Button
 size="sm"
 onClick={onSend}
 disabled={!input.trim()}
 aria-label="Send message"
 >
 <Send className="size-4"/>
 </Button>
 </div>
 </div>
 );
}
