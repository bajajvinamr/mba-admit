"use client";

import { useState, useRef, useEffect, useCallback } from"react";
import { Card, CardContent } from"@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from"@/components/ui/tabs";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { ScrollArea } from"@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from"@/components/ui/avatar";
import { Separator } from"@/components/ui/separator";
import { Send, Sparkles, Brain, Eye, Palette, Loader2 } from"lucide-react";
import { cn } from"@/lib/cn";
import { ToneChecker } from"./ToneChecker";
import { API_BASE } from"@/lib/api";

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
 promptText?: string;
 schoolId?: string;
 schoolContext: SchoolContext | null;
 wordLimit?: number;
};

export function AICoach({ essayText, promptText, schoolId, schoolContext, wordLimit }: AICoachProps) {
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
 const [isStreaming, setIsStreaming] = useState(false);
 const scrollRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
 if (scrollRef.current) {
 scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
 }
 }, [messages]);

 const handleSend = useCallback(async () => {
 const trimmed = input.trim();
 if (!trimmed || isStreaming) return;

 const userMsg: Message = {
 id: `user-${Date.now()}`,
 role:"user",
 content: trimmed,
 timestamp: new Date(),
 };

 const assistantMsgId = `assistant-${Date.now()}`;
 const assistantMsg: Message = {
 id: assistantMsgId,
 role:"assistant",
 content:"",
 timestamp: new Date(),
 };

 setMessages((prev) => [...prev, userMsg, assistantMsg]);
 setInput("");
 setIsStreaming(true);

 try {
 const combinedText = essayText
  ? `${trimmed}\n\nCurrent essay draft:\n${essayText}`
  : trimmed;

 const res = await fetch(`${API_BASE}/api/essay/coach`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
   school_id: schoolId || "unknown",
   prompt_text: promptText || "General essay",
   essay_text: combinedText,
   mode,
   word_limit: wordLimit || null,
  }),
 });

 if (!res.ok) {
  const err = await res.text();
  setMessages((prev) =>
   prev.map((m) => m.id === assistantMsgId ? { ...m, content: `Error: ${err}` } : m)
  );
  return;
 }

 const reader = res.body?.getReader();
 const decoder = new TextDecoder();
 if (!reader) return;

 let accumulated = "";
 while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value, { stream: true });
  for (const line of chunk.split("\n")) {
   if (!line.startsWith("data: ")) continue;
   const payload = line.slice(6).trim();
   if (payload === "[DONE]") break;
   try {
    const parsed = JSON.parse(payload);
    if (parsed.text) {
     accumulated += parsed.text;
     setMessages((prev) =>
      prev.map((m) => m.id === assistantMsgId ? { ...m, content: accumulated } : m)
     );
    }
    if (parsed.error) {
     accumulated += `\n\nError: ${parsed.error}`;
     setMessages((prev) =>
      prev.map((m) => m.id === assistantMsgId ? { ...m, content: accumulated } : m)
     );
    }
   } catch {}
  }
 }
 } catch (err) {
 setMessages((prev) =>
  prev.map((m) => m.id === assistantMsgId
   ? { ...m, content:"Sorry, I couldn't connect to the AI coach. Please try again." }
   : m)
 );
 } finally {
 setIsStreaming(false);
 }
 }, [input, mode, essayText, promptText, schoolId, wordLimit, isStreaming]);

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
