"use client";

import { useState, useEffect, useRef, useCallback } from"react";
import {
 Mic,
 MicOff,
 Video,
 PhoneOff,
 Play,
 BarChart3,
 RefreshCcw,
 User,
 ShieldCheck,
 Heart,
 Shield,
 Flame,
 ChevronDown,
 ChevronUp,
 Trash2,
 Clock,
 Award,
 SkipForward,
 Check,
 Volume2,
 VolumeX,
} from"lucide-react";
import Link from"next/link";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import { EmailCapture } from"@/components/EmailCapture";
import { apiFetch, fetchSSE } from"@/lib/api";
import { track } from"@/lib/analytics";
import { useAbortSignal } from"@/hooks/useAbortSignal";
import { useUsage } from"@/hooks/useUsage";
import { UsageGate } from"@/components/UsageGate";
import { useVoice } from"@/hooks/useVoice";

/* ─── Types ─── */
type School = { id: string; name: string };
type Message = { role:"user"|"ai"; content: string; category?: string };
type Difficulty ="friendly"|"standard"|"pressure";

interface Feedback {
 conciseness: number;
 star_method: number;
 narrative_strength: number;
 communication_clarity: number;
 authenticity: number;
 self_awareness: number;
 school_fit: number;
 overall_score: number;
 overall_feedback: string;
 per_question_notes?: string[];
}

interface HistoryEntry {
 date: string;
 school_id: string;
 school_name: string;
 difficulty: Difficulty;
 overall_score: number;
 feedback: Feedback;
}

const HISTORY_KEY ="mba_interview_history";

const DIFFICULTY_OPTIONS: {
 value: Difficulty;
 label: string;
 description: string;
 icon: typeof Heart;
}[] = [
 {
 value:"friendly",
 label:"Friendly",
 description:"Warm & encouraging. Perfect for first practice.",
 icon: Heart,
 },
 {
 value:"standard",
 label:"Standard",
 description:"Professional & balanced. The real deal.",
 icon: Shield,
 },
 {
 value:"pressure",
 label:"Pressure-Test",
 description:"Stress interview. Interruptions. Sharp follow-ups.",
 icon: Flame,
 },
];

const QUESTION_COUNTS = [3, 5, 7] as const;

const CATEGORY_LABELS: Record<string, string> = {
 behavioral_leadership:"Behavioral Leadership",
 career_goals:"Career Goals",
 why_school:"Why School",
 strengths_weaknesses:"Strengths & Weaknesses",
 school_signature:"School Signature",
};

const DIMENSION_LABELS: {
 key: keyof Omit<Feedback,"overall_score"|"overall_feedback"|"per_question_notes">;
 label: string;
}[] = [
 { key:"conciseness", label:"Conciseness"},
 { key:"star_method", label:"STAR Method"},
 { key:"narrative_strength", label:"Narrative"},
 { key:"communication_clarity", label:"Clarity"},
 { key:"authenticity", label:"Authenticity"},
 { key:"self_awareness", label:"Self-Awareness"},
 { key:"school_fit", label:"School Fit"},
];

/* ─── Helpers ─── */
function loadHistory(): HistoryEntry[] {
 if (typeof window ==="undefined") return [];
 try {
 const raw = localStorage.getItem(HISTORY_KEY);
 return raw ? JSON.parse(raw) : [];
 } catch {
 return [];
 }
}

function saveHistoryEntry(entry: HistoryEntry) {
 const existing = loadHistory();
 existing.unshift(entry);
 localStorage.setItem(HISTORY_KEY, JSON.stringify(existing.slice(0, 20)));
}

function clearHistory() {
 localStorage.removeItem(HISTORY_KEY);
}

function formatDate(iso: string): string {
 return new Date(iso).toLocaleDateString("en-US", {
 month:"short",
 day:"numeric",
 year:"numeric",
 });
}

/* ─── Typewriter Hook ─── */
function useTypewriter(text: string, speed: number = 30) {
 const [displayed, setDisplayed] = useState("");
 const [done, setDone] = useState(false);

 useEffect(() => {
 setDisplayed("");
 setDone(false);
 if (!text) return;

 let i = 0;
 const interval = setInterval(() => {
 i++;
 setDisplayed(text.slice(0, i));
 if (i >= text.length) {
 clearInterval(interval);
 setDone(true);
 }
 }, speed);

 return () => clearInterval(interval);
 }, [text, speed]);

 return { displayed, done };
}

/* ─── Timer Ring (SVG) ─── */
function TimerRing({
 seconds,
 total,
 size = 120,
}: {
 seconds: number;
 total: number;
 size?: number;
}) {
 const radius = (size - 8) / 2;
 const circumference = 2 * Math.PI * radius;
 const progress = Math.max(0, seconds / total);
 const offset = circumference * (1 - progress);

 const isWarning = seconds <= 30 && seconds > 10;
 const isCritical = seconds <= 10;
 const isFlashing = seconds === 0;

 const strokeColor = isCritical
 ?"#EF4444"
 : isWarning
 ?"#C9A962"
 :"#FFFFFF";

 const mins = Math.floor(seconds / 60);
 const secs = seconds % 60;

 return (
 <div
 className="relative flex items-center justify-center"
 style={{ width: size, height: size }}
 >
 <svg
 width={size}
 height={size}
 className={`-rotate-90 ${isFlashing ?" animate-timer-flash":""}`}
 >
 {/* Background ring */}
 <circle
 cx={size / 2}
 cy={size / 2}
 r={radius}
 fill="none"
 stroke="#2A2A2A"
 strokeWidth={3}
 />
 {/* Progress ring */}
 <circle
 cx={size / 2}
 cy={size / 2}
 r={radius}
 fill="none"
 stroke={strokeColor}
 strokeWidth={3}
 strokeLinecap="round"
 strokeDasharray={circumference}
 strokeDashoffset={offset}
 className={`transition-[stroke-dashoffset] duration-1000 linear ${
 isCritical
 ?" animate-timer-pulse-fast"
 : isWarning
 ?" animate-timer-pulse"
 :""
 }`}
 style={{
 filter:
 isCritical || isWarning
 ? `drop-shadow(0 0 6px ${strokeColor})`
 :"none",
 }}
 />
 </svg>
 <div className="absolute inset-0 flex items-center justify-center">
 <span
 className={`font-mono text-lg tracking-wider ${
 isCritical
 ?"text-red-400"
 : isWarning
 ?"text-gold"
 :"text-white"
 }`}
 >
 {mins}:{secs.toString().padStart(2,"0")}
 </span>
 </div>
 </div>
 );
}

/* ─── Waveform Visualizer ─── */
function WaveformVisualizer({
 active,
 speaking,
}: {
 active: boolean;
 speaking: boolean;
}) {
 const BAR_COUNT = 24;
 const barsRef = useRef<HTMLDivElement>(null);
 const frameRef = useRef<number>(0);
 const audioCtxRef = useRef<AudioContext | null>(null);
 const analyserRef = useRef<AnalyserNode | null>(null);
 const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
 const dataRef = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(BAR_COUNT));

 useEffect(() => {
 if (!active) {
 if (audioCtxRef.current) {
 audioCtxRef.current.close();
 audioCtxRef.current = null;
 analyserRef.current = null;
 sourceRef.current = null;
 }
 return;
 }

 let cancelled = false;

 const initAudio = async () => {
 try {
 const stream = await navigator.mediaDevices.getUserMedia({
 audio: true,
 });
 if (cancelled) {
 stream.getTracks().forEach((t) => t.stop());
 return;
 }
 const ctx = new AudioContext();
 const analyser = ctx.createAnalyser();
 analyser.fftSize = 64;
 const source = ctx.createMediaStreamSource(stream);
 source.connect(analyser);

 audioCtxRef.current = ctx;
 analyserRef.current = analyser;
 sourceRef.current = source;
 dataRef.current = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
 } catch {
 // Mic not available, fallback to breathing animation
 }
 };

 initAudio();

 return () => {
 cancelled = true;
 if (audioCtxRef.current) {
 audioCtxRef.current.close();
 audioCtxRef.current = null;
 }
 };
 }, [active]);

 useEffect(() => {
 if (!barsRef.current) return;

 const animate = () => {
 if (!barsRef.current) return;
 const bars = barsRef.current.children;

 if (analyserRef.current && active) {
 analyserRef.current.getByteFrequencyData(dataRef.current);
 }

 for (let i = 0; i < bars.length; i++) {
 const bar = bars[i] as HTMLDivElement;
 let height: number;

 if (active && analyserRef.current) {
 const dataIndex = Math.floor(
 (i / BAR_COUNT) * dataRef.current.length
 );
 const value = dataRef.current[dataIndex] || 0;
 height = speaking ? 8 + (value / 255) * 52 : 4 + (value / 255) * 20;
 } else {
 // Breathing animation when silent
 const t = Date.now() / 1000;
 height = 6 + Math.sin(t * 1.5 + i * 0.3) * 4;
 }

 bar.style.height = `${height}px`;
 }

 frameRef.current = requestAnimationFrame(animate);
 };

 frameRef.current = requestAnimationFrame(animate);
 return () => cancelAnimationFrame(frameRef.current);
 }, [active, speaking]);

 return (
 <div
 ref={barsRef}
 className="flex items-center justify-center gap-[3px] h-16"
 aria-hidden="true"
 >
 {Array.from({ length: BAR_COUNT }).map((_, i) => (
 <div
 key={i}
 className={`w-[3px] rounded-full transition-[height] duration-75 ${
 active ?"waveform-bar-active":"waveform-bar-idle"
 }`}
 style={{
 height: 6,
 }}
 />
 ))}
 </div>
 );
}

/* ─── Checkmark Animation ─── */
function AnimatedCheckmark() {
 return (
 <svg
 width="64"
 height="64"
 viewBox="0 0 64 64"
 fill="none"
 className="animate-checkmark-draw"
 >
 <circle
 cx="32"
 cy="32"
 r="28"
 stroke="#34D399"
 strokeWidth="3"
 fill="none"
 className="animate-checkmark-circle"
 />
 <path
 d="M20 32 L28 40 L44 24"
 stroke="#34D399"
 strokeWidth="3"
 strokeLinecap="round"
 strokeLinejoin="round"
 fill="none"
 className="animate-checkmark-path"
 />
 </svg>
 );
}

/* ─── Score Flash Badge ─── */
function ScoreFlash({
 label,
 score,
 delay,
}: {
 label: string;
 score: number;
 delay: number;
}) {
 return (
 <div
 className="animate-score-flash inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2"
 style={{ animationDelay: `${delay}ms` }}
 >
 <span className="text-xs text-white/50 uppercase tracking-wider font-bold">
 {label}
 </span>
 <span className="text-lg font-black text-gold">{score}</span>
 </div>
 );
}

/* ─── Circular Score Component (Results page) ─── */
function CircularScore({
 score,
 size = 160,
}: {
 score: number;
 size?: number;
}) {
 const pct = Math.min(100, Math.max(0, score));
 const hue = pct < 40 ? 0 : pct < 70 ? 40 : 50;
 const saturation = pct < 40 ? 60 : 70;
 const lightness = pct < 40 ? 50 : pct < 70 ? 50 : 45;

 return (
 <div
 className="relative flex items-center justify-center"
 style={{ width: size, height: size }}
 >
 <div
 className="absolute inset-0 rounded-full"
 style={{
 background: `conic-gradient(
 hsl(${hue}, ${saturation}%, ${lightness}%) ${pct * 3.6}deg,
 rgba(255, 255, 255, 0.05) ${pct * 3.6}deg
 )`,
 }}
 />
 <div
 className="absolute rounded-full bg-[#0A0A0A] flex items-center justify-center"
 style={{ inset: size * 0.1 }}
 >
 <div className="text-center">
 <span className="text-5xl font-black text-white leading-none">
 {score}
 </span>
 <span className="text-sm text-white/20 font-bold block">/100</span>
 </div>
 </div>
 </div>
 );
}

/* ─── Ripple Button ─── */
function RippleButton({
 children,
 onClick,
 disabled,
 className,
 ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
 const btnRef = useRef<HTMLButtonElement>(null);

 const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
 if (!btnRef.current) return;
 const rect = btnRef.current.getBoundingClientRect();
 const ripple = document.createElement("span");
 const size = Math.max(rect.width, rect.height);
 ripple.style.width = ripple.style.height = `${size}px`;
 ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
 ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
 ripple.className ="ripple-effect";
 btnRef.current.appendChild(ripple);
 setTimeout(() => ripple.remove(), 600);
 onClick?.(e);
 };

 return (
 <button
 ref={btnRef}
 onClick={handleClick}
 disabled={disabled}
 className={`relative overflow-hidden ${className ??""}`}
 {...props}
 >
 {children}
 </button>
 );
}

/* ─── Main Component ─── */
export default function InterviewPage() {
 const abortSignal = useAbortSignal();
 const usage = useUsage("interview_simulator");
 const [schools, setSchools] = useState<School[]>([]);
 const [selectedSchoolId, setSelectedSchoolId] = useState("");
 const [history, setHistory] = useState<Message[]>([]);
 const [currentInput, setCurrentInput] = useState("");
 const [loading, setLoading] = useState(false);
 const [isStarted, setIsStarted] = useState(false);
 const [isFinished, setIsFinished] = useState(false);
 const [feedback, setFeedback] = useState<Feedback | null>(null);
 const [error, setError] = useState<string | null>(null);

 const [difficulty, setDifficulty] = useState<Difficulty>("standard");
 const [questionCount, setQuestionCount] = useState<number>(5);
 const [questionNumber, setQuestionNumber] = useState(0);
 const [totalQuestions, setTotalQuestions] = useState(5);
 const [questionCategory, setQuestionCategory] = useState("");
 const [categoryMap, setCategoryMap] = useState<Record<number, string>>({});
 const [expandedNotes, setExpandedNotes] = useState(false);
 const [pastSessions, setPastSessions] = useState<HistoryEntry[]>([]);
 const [voiceMode, setVoiceMode] = useState(false);

 // Immersive interview state
 const [timerSeconds, setTimerSeconds] = useState(120);
 const [showPostQuestion, setShowPostQuestion] = useState(false);
 const [postQuestionScores, setPostQuestionScores] = useState<{
 content: number;
 structure: number;
 } | null>(null);
 const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
 const textareaRef = useRef<HTMLTextAreaElement>(null);

 const scrollRef = useRef<HTMLDivElement>(null);

 const [streamingText, setStreamingText] = useState("");
 const [voiceState, setVoiceState] = useState<"idle"|"listening"|"thinking"|"speaking">("idle");
 const [voiceError, setVoiceError] = useState<string | null>(null);
 const [speakResponses, setSpeakResponses] = useState(true);

 const voice = useVoice({
 continuous: true,
 vadTimeoutMs: 2000,
 onResult: (finalTranscript) => {
 if (voiceMode && finalTranscript.trim()) {
 setCurrentInput(finalTranscript.trim());
 }
 },
 onInterim: (interim) => {
 if (voiceMode) {
 setCurrentInput(interim);
 }
 },
 onError: (_errType, message) => {
 setVoiceError(message);
 setVoiceState("idle");
 },
 });

 useEffect(() => {
 apiFetch<School[]>(`/api/schools/names`)
 .then((data) => setSchools(data))
 .catch(() => setError("Failed to load schools. Please refresh the page."));
 setPastSessions(loadHistory());
 }, []);

 useEffect(() => {
 scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
 }, [history]);

 // Track voice states
 useEffect(() => {
 if (!voiceMode) {
 setVoiceState("idle");
 return;
 }
 if (voice.isSpeaking) {
 setVoiceState("speaking");
 } else if (voice.isListening) {
 setVoiceState("listening");
 } else if (loading) {
 setVoiceState("thinking");
 } else {
 setVoiceState("idle");
 }
 }, [voiceMode, voice.isListening, voice.isSpeaking, loading]);

 // Auto-speak AI messages in voice mode
 useEffect(() => {
 if (!voiceMode || !speakResponses || history.length === 0) return;
 const lastMsg = history[history.length - 1];
 if (lastMsg.role ==="ai" && !loading) {
 voice.speak(lastMsg.content).then(() => {
 if (!isFinished && voiceMode) {
 setTimeout(() => voice.startListening(), 300);
 }
 });
 }
 }, [history.length, loading, voiceMode, speakResponses, isFinished]);

 // Also auto-speak streamed text when streaming completes
 useEffect(() => {
 if (!voiceMode || !speakResponses || !streamingText || loading) return;
 // streamingText is set when stream finishes — the last AI message should match
 const lastMsg = history[history.length - 1];
 if (lastMsg?.role === "ai" && lastMsg.content === streamingText) {
 // Already handled by the history-based effect above
 setStreamingText("");
 }
 }, [streamingText, loading, voiceMode, speakResponses, history]);

 // Keyboard shortcut: Space to toggle recording in voice mode
 useEffect(() => {
 if (!voiceMode || !isStarted || isFinished) return;

 const handleKeyDown = (e: KeyboardEvent) => {
 // Only if not typing in a text field
 if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
 if (e.code === "Space" && !e.repeat) {
 e.preventDefault();
 if (voice.isListening) {
 voice.stopListening();
 } else if (!voice.isSpeaking && !loading) {
 voice.stopSpeaking();
 setCurrentInput("");
 voice.startListening();
 }
 }
 };

 window.addEventListener("keydown", handleKeyDown);
 return () => window.removeEventListener("keydown", handleKeyDown);
 }, [voiceMode, isStarted, isFinished, voice.isListening, voice.isSpeaking, loading]);

 // Timer countdown
 useEffect(() => {
 if (isStarted && !isFinished && !loading && !showPostQuestion) {
 timerRef.current = setInterval(() => {
 setTimerSeconds((prev) => {
 if (prev <= 0) return 0;
 return prev - 1;
 });
 }, 1000);
 }
 return () => {
 if (timerRef.current) clearInterval(timerRef.current);
 };
 }, [isStarted, isFinished, loading, showPostQuestion]);

 // Reset timer on new question
 useEffect(() => {
 if (questionNumber > 0) {
 setTimerSeconds(120);
 }
 }, [questionNumber]);

 // Get the latest AI question for typewriter
 const latestAiMessage =
 history.length > 0 && history[history.length - 1].role ==="ai"
 ? history[history.length - 1].content
 :"";

 const currentQuestionText =
 !loading && !showPostQuestion ? latestAiMessage :"";

 const typewriter = useTypewriter(currentQuestionText, 25);

 const handleStart = async () => {
 if (!selectedSchoolId) return;
 setError(null);
 setLoading(true);
 setIsStarted(true);
 setCategoryMap({});
 setQuestionNumber(0);
 setQuestionCategory("");
 setTimerSeconds(120);
 setShowPostQuestion(false);
 setPostQuestionScores(null);
 try {
 const data = await apiFetch<Record<string, unknown>>(`/api/interview/start`, {
 method:"POST",
 body: JSON.stringify({
 school_id: selectedSchoolId,
 difficulty,
 question_count: questionCount,
 }),
 noRetry: true,
 timeoutMs: 60_000,
 signal: abortSignal,
 });
 if (data.question_number)
 setQuestionNumber(data.question_number as number);
 if (data.total_questions)
 setTotalQuestions(data.total_questions as number);
 if (data.question_category) {
 setQuestionCategory(data.question_category as string);
 setCategoryMap((prev) => ({
 ...prev,
 [(data.question_number as number) || 1]: data.question_category as string,
 }));
 }
 const firstMsg: Message = {
 role:"ai",
 content: data.message as string,
 category: (data.question_category as string) || undefined,
 };
 setHistory([firstMsg]);
 usage.recordUse();
 track("interview_started", {
 school_id: selectedSchoolId,
 difficulty,
 question_count: questionCount,
 });
 } catch (e) {
 console.error(e);
 setError("Failed to start session. Please try again.");
 setIsStarted(false);
 } finally {
 setLoading(false);
 }
 };

 const handleSendStreaming = async (newHistory: Message[]) => {
 let streamedMessage = "";
 setStreamingText("");

 try {
 await fetchSSE(
 `/api/interview/respond-stream`,
 {
 method: "POST",
 body: JSON.stringify({
 school_id: selectedSchoolId,
 history: newHistory.map((m) => ({ role: m.role, content: m.content })),
 difficulty,
 question_count: questionCount,
 }),
 timeoutMs: 90_000,
 signal: abortSignal,
 },
 (event) => {
 if (event.type === "text") {
 streamedMessage += event.content as string;
 setStreamingText(streamedMessage);
 } else if (event.type === "done") {
 const result = event.result as Record<string, unknown>;
 // Apply the final parsed data
 if (result.question_number)
 setQuestionNumber(result.question_number as number);
 if (result.total_questions)
 setTotalQuestions(result.total_questions as number);
 if (result.question_category) {
 setQuestionCategory(result.question_category as string);
 setCategoryMap((prev) => ({
 ...prev,
 [(result.question_number as number) || questionNumber + 1]:
 result.question_category as string,
 }));
 }

 const message = (result.message as string) || streamedMessage;
 const aiMsg: Message = {
 role: "ai",
 content: message,
 category: (result.question_category as string) || undefined,
 };
 setHistory([...newHistory, aiMsg]);
 setStreamingText("");

 if (result.is_finished) {
 setIsFinished(true);
 setFeedback((result.feedback as Feedback) || null);
 track("interview_completed", {
 school_id: selectedSchoolId,
 difficulty,
 overall_score: (result.feedback as Feedback)?.overall_score ?? null,
 questions_answered: questionNumber,
 });
 if (result.feedback) {
 const entry: HistoryEntry = {
 date: new Date().toISOString(),
 school_id: selectedSchoolId,
 school_name: selectedSchoolName,
 difficulty,
 overall_score: (result.feedback as Feedback).overall_score,
 feedback: result.feedback as Feedback,
 };
 saveHistoryEntry(entry);
 setPastSessions(loadHistory());
 }
 }
 }
 },
 );
 } catch (err) {
 console.error(err);
 setStreamingText("");
 throw err;
 }
 };

 const handleSend = async (e?: React.FormEvent) => {
 e?.preventDefault();
 if (!currentInput.trim() || loading) return;

 setError(null);
 setVoiceError(null);
 const userMsg: Message = { role:"user", content: currentInput };
 const newHistory = [...history, userMsg];
 setHistory(newHistory);
 setCurrentInput("");
 setLoading(true);

 // Stop listening while processing
 if (voice.isListening) voice.stopListening();

 // Show post-question transition (scores populated after API responds)
 setShowPostQuestion(true);
 setPostQuestionScores(null);

 try {
 if (voiceMode) {
 // Use streaming endpoint in voice mode for real-time text display
 await new Promise((resolve) => setTimeout(resolve, 1200));
 setShowPostQuestion(false);
 setPostQuestionScores(null);
 await handleSendStreaming(newHistory);
 } else {
 const data = await apiFetch<Record<string, unknown>>(`/api/interview/respond`, {
 method:"POST",
 body: JSON.stringify({
 school_id: selectedSchoolId,
 history: newHistory.map((m) => ({ role: m.role, content: m.content })),
 difficulty,
 question_count: questionCount,
 }),
 noRetry: true,
 timeoutMs: 60_000,
 signal: abortSignal,
 });

 // Keep post-question visible briefly
 await new Promise((resolve) => setTimeout(resolve, 1800));
 setShowPostQuestion(false);
 setPostQuestionScores(null);

 if (data.question_number)
 setQuestionNumber(data.question_number as number);
 if (data.total_questions)
 setTotalQuestions(data.total_questions as number);
 if (data.question_category) {
 setQuestionCategory(data.question_category as string);
 setCategoryMap((prev) => ({
 ...prev,
 [(data.question_number as number) || questionNumber + 1]:
 data.question_category as string,
 }));
 }

 const aiMsg: Message = {
 role:"ai",
 content: data.message as string,
 category: (data.question_category as string) || undefined,
 };
 setHistory([...newHistory, aiMsg]);

 if (data.is_finished) {
 setIsFinished(true);
 setFeedback((data.feedback as Feedback) || null);
 track("interview_completed", {
 school_id: selectedSchoolId,
 difficulty,
 overall_score: (data.feedback as Feedback)?.overall_score ?? null,
 questions_answered: questionNumber,
 });
 if (data.feedback) {
 const entry: HistoryEntry = {
 date: new Date().toISOString(),
 school_id: selectedSchoolId,
 school_name: selectedSchoolName,
 difficulty,
 overall_score: (data.feedback as Feedback).overall_score,
 feedback: data.feedback as Feedback,
 };
 saveHistoryEntry(entry);
 setPastSessions(loadHistory());
 }
 }
 }
 } catch (e) {
 console.error(e);
 setShowPostQuestion(false);
 setPostQuestionScores(null);
 setError("Error during simulation. Please try again.");
 } finally {
 setLoading(false);
 }
 };

 const handleSkip = () => {
 setCurrentInput("[SKIP]");
 setTimeout(() => handleSend(), 50);
 };

 const handleReset = () => {
 setIsStarted(false);
 setIsFinished(false);
 setHistory([]);
 setFeedback(null);
 setQuestionNumber(0);
 setQuestionCategory("");
 setCategoryMap({});
 setExpandedNotes(false);
 setTimerSeconds(120);
 setShowPostQuestion(false);
 setPostQuestionScores(null);
 setStreamingText("");
 setVoiceState("idle");
 setVoiceError(null);
 voice.stopListening();
 voice.stopSpeaking();
 if (timerRef.current) clearInterval(timerRef.current);
 };

 const handleClearHistory = () => {
 clearHistory();
 setPastSessions([]);
 };

 const selectedSchoolName =
 schools.find((s) => s.id === selectedSchoolId)?.name ||"Target School";

 const progressPct =
 totalQuestions > 0 ? (questionNumber / totalQuestions) * 100 : 0;

 return (
 <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center">
 <UsageGate feature="interview_simulator">
 {/* ── Pre-Call Setup ── */}
 {!isStarted && (
 <div className="w-full min-h-screen flex flex-col items-center justify-center p-4 md:p-8 animate-fade-in">
 <div className="bg-[#0A0A0A] w-full max-w-xl p-10 border border-white/10 shadow-2xl text-center">
 <div className="w-20 h-20 bg-gold/10 flex items-center justify-center mx-auto mb-8 border border-gold/20">
 <Video size={32} className="text-gold"/>
 </div>
 <h1 className="font-display text-4xl text-white mb-4 font-semibold">
 Adcom Interview Simulator
 </h1>
 <p className="text-white/40 mb-8 max-w-sm mx-auto">
 Face the fire. Select your target school to load their specific
 Adcom interview persona.
 </p>

 {/* School Selector */}
 <div className="mb-8 text-left">
 <label
 htmlFor="school-select"
 className="block text-[10px] uppercase tracking-widest text-white/30 font-bold mb-3 px-1"
 >
 Choose School Persona
 </label>
 <select
 id="school-select"
 value={selectedSchoolId}
 onChange={(e) => setSelectedSchoolId(e.target.value)}
 className="w-full bg-[#141414] border border-white/10 px-6 py-4 focus:border-gold focus:outline-none text-white font-medium"
 >
 <option value="">Select a school...</option>
 {schools.map((s) => (
 <option key={s.id} value={s.id}>
 {s.name}
 </option>
 ))}
 </select>
 </div>

 {/* Difficulty Selector */}
 <div
 className="mb-8 text-left"
 role="group"
 aria-labelledby="difficulty-label"
 >
 <label
 id="difficulty-label"
 className="block text-[10px] uppercase tracking-widest text-white/30 font-bold mb-3 px-1"
 >
 Interview Difficulty
 </label>
 <div className="grid grid-cols-3 gap-3">
 {DIFFICULTY_OPTIONS.map((opt) => {
 const Icon = opt.icon;
 const selected = difficulty === opt.value;
 return (
 <button
 key={opt.value}
 type="button"
 aria-pressed={selected}
 onClick={() => setDifficulty(opt.value)}
 className={`relative bg-[#141414] border p-4 text-center transition-all duration-200 ${
 selected
 ?"border-gold ring-2 ring-gold/20"
 :"border-white/10 hover:border-white/20"
 }`}
 >
 <div
 className={`w-10 h-10 flex items-center justify-center mx-auto mb-2 ${
 selected
 ?"bg-gold text-[#0A0A0A]"
 :"bg-white/5 text-white/30"
 } transition-colors`}
 >
 <Icon size={18} />
 </div>
 <div className="text-xs font-bold text-white mb-1">
 {opt.label}
 </div>
 <div className="text-[9px] text-white/30 leading-tight">
 {opt.description}
 </div>
 </button>
 );
 })}
 </div>
 </div>

 {/* Question Count Selector */}
 <div
 className="mb-10 text-left"
 role="group"
 aria-labelledby="question-count-label"
 >
 <label
 id="question-count-label"
 className="block text-[10px] uppercase tracking-widest text-white/30 font-bold mb-3 px-1"
 >
 Number of Questions
 </label>
 <div className="flex gap-3">
 {QUESTION_COUNTS.map((count) => (
 <button
 key={count}
 type="button"
 aria-pressed={questionCount === count}
 onClick={() => setQuestionCount(count)}
 className={`flex-1 py-3 font-bold text-sm transition-all duration-200 ${
 questionCount === count
 ?"bg-gold text-[#0A0A0A]"
 :"bg-[#141414] border border-white/10 text-white hover:border-white/20"
 }`}
 >
 {count} Qs
 </button>
 ))}
 </div>
 </div>

 {error && (
 <div
 role="alert"
 className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 text-sm mb-6"
 >
 {error}
 </div>
 )}

 <button
 onClick={handleStart}
 disabled={!selectedSchoolId}
 className="w-full bg-gold text-[#0A0A0A] font-bold uppercase tracking-widest py-5 flex items-center justify-center gap-3 hover:bg-gold/90 transition-all disabled:opacity-50 group"
 >
 Start Mock Interview{""}
 <Play
 size={18}
 fill="#0A0A0A"
 className="group-hover:translate-x-1 transition-transform"
 />
 </button>

 <div className="mt-8 flex items-center justify-center gap-4 text-white/20">
 <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-tighter">
 <ShieldCheck size={14} /> End-to-End Encrypted
 </div>
 <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-tighter">
 <User size={14} /> 1-on-1 Session
 </div>
 </div>

 {/* Past Sessions */}
 {pastSessions.length > 0 && (
 <div className="mt-10 text-left border-t border-white/5 pt-8">
 <div className="flex items-center justify-between mb-4">
 <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold px-1">
 Past Sessions
 </label>
 <button
 type="button"
 onClick={handleClearHistory}
 className="text-[10px] uppercase tracking-widest text-white/20 hover:text-red-400 font-bold flex items-center gap-1 transition-colors"
 >
 <Trash2 size={10} /> Clear
 </button>
 </div>
 <div className="space-y-2">
 {pastSessions.slice(0, 5).map((session, idx) => (
 <div
 key={idx}
 className="bg-[#141414] border border-white/5 p-4 flex items-center justify-between"
 >
 <div className="flex-1 min-w-0">
 <div className="text-sm font-bold text-white truncate">
 {session.school_name}
 </div>
 <div className="flex items-center gap-2 mt-1">
 <span className="text-[9px] text-white/30 flex items-center gap-1">
 <Clock size={9} /> {formatDate(session.date)}
 </span>
 <span
 className={`text-[9px] uppercase font-bold px-2 py-0.5 ${
 session.difficulty ==="friendly"
 ?"bg-green-500/10 text-green-400"
 : session.difficulty ==="pressure"
 ?"bg-red-500/10 text-red-400"
 :"bg-blue-500/10 text-blue-400"
 }`}
 >
 {session.difficulty}
 </span>
 </div>
 </div>
 <div className="text-right ml-4">
 <div className="text-2xl font-black text-white leading-none">
 {session.overall_score}
 </div>
 <div className="text-[8px] text-white/20 font-bold">
 /100
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>
 )}

 {/* ── IMMERSIVE Active Interview ── */}
 {isStarted && !isFinished && (
 <div className="fixed inset-0 z-50 bg-[#0A0A0A] flex flex-col interview-immersive">
 {/* Animated grain overlay */}
 <div className="grain-overlay" aria-hidden="true"/>

 {/* Deep gradient background */}
 <div
 className="absolute inset-0"
 style={{
 background:
"radial-gradient(ellipse at center, #0F0F0F 0%, #0A0A0A 70%)",
 }}
 aria-hidden="true"
 />

 {/* Main content area */}
 <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pb-24">
 {/* Post-question transition */}
 {showPostQuestion ? (
 <div className="flex flex-col items-center gap-6 animate-fade-in">
 <AnimatedCheckmark />
 <p className="text-white/40 text-sm uppercase tracking-widest font-bold">
 Answer Recorded
 </p>
 {postQuestionScores && (
 <div className="flex gap-4 mt-2">
 <ScoreFlash
 label="Content"
 score={postQuestionScores.content}
 delay={400}
 />
 <ScoreFlash
 label="Structure"
 score={postQuestionScores.structure}
 delay={700}
 />
 </div>
 )}
 </div>
 ) : (
 <>
 {/* Category badge */}
 {questionCategory && (
 <div className="mb-6 animate-fade-in">
 <span className="text-[10px] text-gold/80 uppercase font-bold tracking-widest bg-gold/5 border border-gold/20 px-4 py-1.5">
 {CATEGORY_LABELS[questionCategory] || questionCategory}
 </span>
 </div>
 )}

 {/* Timer ring */}
 <div className="mb-8">
 <TimerRing
 seconds={timerSeconds}
 total={120}
 size={120}
 />
 </div>

 {/* Question text with typewriter / streaming */}
 <div className="max-w-3xl text-center mb-8 min-h-[80px]">
 {loading && !streamingText ? (
 <div className="flex gap-1.5 justify-center py-4">
 <div className="w-2 h-2 bg-gold rounded-full animate-bounce [animation-delay:-0.3s]"/>
 <div className="w-2 h-2 bg-gold rounded-full animate-bounce [animation-delay:-0.15s]"/>
 <div className="w-2 h-2 bg-gold rounded-full animate-bounce"/>
 </div>
 ) : streamingText && loading ? (
 <p className="font-display text-2xl md:text-3xl text-white leading-snug font-medium">
 {streamingText}
 <span className="animate-blink text-gold">|</span>
 </p>
 ) : (
 <p className="font-display text-2xl md:text-3xl text-white leading-snug font-medium">
 {typewriter.displayed}
 {!typewriter.done && (
 <span className="animate-blink text-gold">|</span>
 )}
 </p>
 )}
 </div>

 {/* Voice waveform visualization */}
 {voiceMode && (
 <div className="mb-6">
 <WaveformVisualizer
 active={voice.isListening}
 speaking={voice.isSpeaking}
 />
 {voice.isListening && (
 <div className="waveform-glow" aria-hidden="true"/>
 )}
 {/* Voice state indicator */}
 <div className="mt-3 flex items-center justify-center gap-2">
 <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${
 voiceState === "listening" ? "bg-red-400 animate-pulse"
 : voiceState === "speaking" ? "bg-gold animate-pulse"
 : voiceState === "thinking" ? "bg-blue-400 animate-pulse"
 : "bg-white/20"
 }`} />
 <span className="text-[9px] text-white/30 uppercase tracking-widest font-bold">
 {voiceState === "listening" ? "Listening..."
 : voiceState === "speaking" ? "Speaking..."
 : voiceState === "thinking" ? "Thinking..."
 : "Ready"}
 </span>
 </div>
 </div>
 )}

 {/* Voice error banner */}
 {voiceError && voiceMode && (
 <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 text-xs max-w-md animate-fade-in">
 {voiceError}
 <button
 type="button"
 onClick={() => setVoiceError(null)}
 className="ml-3 text-red-400/60 hover:text-red-400 underline"
 >dismiss</button>
 </div>
 )}

 {/* Answer input area */}
 {!loading && typewriter.done && (
 <div className="w-full max-w-2xl animate-fade-in">
 {voiceMode ? (
 <div className="flex flex-col items-center gap-4">
 {/* Real-time transcription display */}
 {(voice.isListening || currentInput) && (
 <div className="w-full bg-white/5 border border-white/10 p-4 text-sm min-h-[52px] transition-all">
 <span className={voice.isListening ? "text-white" : "text-white/50"}>
 {currentInput || voice.transcript || "Listening..."}
 </span>
 {voice.isListening && voice.interimTranscript && currentInput !== voice.interimTranscript && (
 <span className="text-white/25 italic ml-1">
 {voice.interimTranscript.slice(currentInput.length)}
 </span>
 )}
 </div>
 )}
 <div className="flex items-center gap-4">
 {/* Main mic button with pulsing indicator */}
 <button
 type="button"
 onClick={() => {
 if (voice.isListening) {
 voice.stopListening();
 } else {
 voice.stopSpeaking();
 setCurrentInput("");
 voice.startListening();
 }
 }}
 disabled={loading}
 className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all ${
 voice.isListening
 ? "bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]"
 : "bg-white/10 text-white hover:bg-white/20"
 }`}
 >
 {/* Pulsing ring when listening */}
 {voice.isListening && (
 <>
 <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
 <span className="absolute inset-[-4px] rounded-full border-2 border-red-400/40 animate-pulse" />
 </>
 )}
 <Mic size={24} className="relative z-10" />
 </button>
 {/* Toggle speak-back */}
 <button
 type="button"
 onClick={() => {
 setSpeakResponses(!speakResponses);
 if (voice.isSpeaking) voice.stopSpeaking();
 }}
 className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
 speakResponses
 ? "bg-white/10 text-white/60"
 : "bg-white/5 text-white/20"
 }`}
 title={speakResponses ? "Disable voice responses" : "Enable voice responses"}
 >
 {speakResponses ? <Volume2 size={16} /> : <VolumeX size={16} />}
 </button>
 </div>
 <p className="text-[8px] text-white/20 uppercase font-bold tracking-widest">
 {voice.isListening
 ? "Listening... tap to stop \u00B7 Space to toggle"
 : voice.isSpeaking
 ? "Interviewer speaking..."
 : "Tap mic or press Space to respond"}
 </p>
 </div>
 ) : (
 <form
 onSubmit={(e) => {
 e.preventDefault();
 handleSend(e);
 }}
 className="w-full"
 >
 <textarea
 ref={textareaRef}
 value={currentInput}
 onChange={(e) => setCurrentInput(e.target.value)}
 onKeyDown={(e) => {
 if (e.key ==="Enter" && !e.shiftKey) {
 e.preventDefault();
 handleSend();
 }
 }}
 placeholder="Type your answer... (Enter to submit, Shift+Enter for new line)"
 className="w-full bg-white/5 border border-white/10 p-5 text-white text-sm leading-relaxed placeholder:text-white/20 focus:border-gold/50 focus:outline-none resize-none min-h-[100px] max-h-[200px]"
 disabled={loading}
 rows={3}
 />
 </form>
 )}
 </div>
 )}

 {/* Progress dots */}
 {questionNumber > 0 && (
 <div className="flex items-center gap-3 mt-8">
 <div className="flex gap-2 items-center">
 {Array.from({ length: totalQuestions }).map((_, i) => (
 <div
 key={i}
 className={`rounded-full transition-all duration-300 ${
 i + 1 === questionNumber
 ?"w-3.5 h-3.5 bg-gold shadow-[0_0_8px_rgba(201,169,98,0.4)]"
 : i + 1 < questionNumber
 ?"w-2 h-2 bg-emerald-400"
 :"w-2 h-2 border border-white/10 bg-transparent"
 }`}
 />
 ))}
 </div>
 </div>
 )}
 </>
 )}

 {error && (
 <div
 role="alert"
 className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 text-sm mt-4 max-w-md"
 >
 {error}
 </div>
 )}
 </div>

 {/* Bottom control bar */}
 {!showPostQuestion && !loading && (
 <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/95 to-transparent pt-8 pb-6 px-4">
 <div className="flex items-center justify-center gap-4 max-w-2xl mx-auto">
 {/* Skip */}
 <button
 type="button"
 onClick={handleSkip}
 className="px-5 py-3 text-white/30 hover:text-white/60 text-xs uppercase tracking-widest font-bold transition-colors bg-transparent border border-transparent hover:border-white/10"
 >
 <SkipForward size={16} className="inline mr-2"/>
 Skip
 </button>

 {/* Submit Answer */}
 <RippleButton
 onClick={() => handleSend()}
 disabled={!currentInput.trim()}
 className="px-8 py-3 bg-gold text-[#0A0A0A] font-bold uppercase tracking-widest text-sm disabled:opacity-30 transition-all submit-glow"
 >
 Submit Answer
 </RippleButton>

 {/* Voice Mode toggle */}
 {voice.isSupported && (
 <button
 type="button"
 onClick={() => {
 const newMode = !voiceMode;
 setVoiceMode(newMode);
 setVoiceError(null);
 if (newMode) {
 const lastAi = [...history]
 .reverse()
 .find((m) => m.role ==="ai");
 if (lastAi && speakResponses) voice.speak(lastAi.content);
 } else {
 voice.stopListening();
 voice.stopSpeaking();
 setStreamingText("");
 }
 }}
 className={`flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest font-bold transition-all border ${
 voiceMode
 ? "bg-gold text-[#0A0A0A] border-gold shadow-[0_0_12px_rgba(201,169,98,0.2)]"
 : "bg-white/5 text-white/30 hover:text-white/60 border-white/10 hover:border-white/20"
 }`}
 >
 {voiceMode ? <MicOff size={14} /> : <Mic size={14} />}
 {voiceMode ? "Exit Voice" : "Voice Mode"}
 </button>
 )}

 {/* End Interview */}
 <button
 type="button"
 onClick={handleReset}
 className="px-5 py-3 text-red-400/50 hover:text-red-400 text-xs uppercase tracking-widest font-bold transition-colors bg-transparent border border-transparent hover:border-red-400/20"
 >
 End
 <PhoneOff size={14} className="inline ml-2"/>
 </button>
 </div>
 </div>
 )}
 </div>
 )}

 {/* ── Post-Interview Results ── */}
 {isFinished && (
 <div className="w-full min-h-screen flex flex-col items-center justify-start p-4 md:p-8 pt-12 animate-fade-in">
 <div className="bg-[#0A0A0A] w-full max-w-4xl p-8 md:p-12 border border-white/10 shadow-2xl relative overflow-hidden">
 <div className="absolute top-0 right-0 p-12 opacity-5">
 <BarChart3 size={200} className="text-white"/>
 </div>

 <div className="relative z-10">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-4">
 <div>
 <h2 className="text-[10px] uppercase font-black tracking-widest text-white/30 mb-2">
 Simulation Report
 </h2>
 <h3 className="font-display text-3xl md:text-4xl text-white font-semibold">
 Performance Analysis
 </h3>
 </div>
 <button
 onClick={handleReset}
 className="text-[10px] uppercase font-black tracking-widest text-gold hover:text-white flex items-center gap-2 transition-colors border border-gold/20 px-4 py-2"
 >
 <RefreshCcw size={14} /> Re-Interview
 </button>
 </div>

 {feedback ? (
 <>
 {/* Overall Score */}
 <div className="flex flex-col items-center mb-12">
 <label className="text-[10px] uppercase font-black tracking-widest text-white/30 mb-6">
 Overall Score
 </label>
 <CircularScore
 score={feedback.overall_score}
 size={160}
 />
 <div className="mt-4 flex items-center gap-2">
 <span
 className={`text-[9px] uppercase font-bold px-2.5 py-0.5 ${
 difficulty ==="friendly"
 ?"bg-green-500/10 text-green-400"
 : difficulty ==="pressure"
 ?"bg-red-500/10 text-red-400"
 :"bg-blue-500/10 text-blue-400"
 }`}
 >
 {difficulty}
 </span>
 <span className="text-[9px] text-white/20 font-bold uppercase">
 {questionCount} Questions
 </span>
 </div>
 </div>

 {/* 7 Dimension Grid */}
 <div className="mb-12">
 <label className="block text-[10px] uppercase font-black tracking-widest text-white/30 mb-4 px-1">
 Dimension Scores
 </label>
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
 {DIMENSION_LABELS.map(({ key, label }) => {
 const val = feedback[key] as number;
 return (
 <div
 key={key}
 className="bg-[#141414] p-5 border border-white/5 text-center"
 >
 <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">
 {label}
 </div>
 <div className="text-3xl font-black text-white">
 {val}
 <span className="text-sm text-white/15">
 /10
 </span>
 </div>
 <div className="mt-2 h-1 bg-white/5 overflow-hidden">
 <div
 className="h-full bg-gold transition-all duration-500"
 style={{ width: `${val * 10}%` }}
 />
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Adcom Debrief */}
 <div className="mb-10">
 <h4 className="text-[10px] uppercase font-black tracking-widest text-white/30 mb-4">
 Adcom Debrief
 </h4>
 <div className="pl-6 md:pl-8 border-l-4 border-gold">
 <p className="text-xl md:text-2xl font-display italic text-white/80 leading-relaxed">
 &ldquo;{feedback.overall_feedback}&rdquo;
 </p>
 </div>
 </div>

 {/* Per-Question Notes */}
 {feedback.per_question_notes &&
 feedback.per_question_notes.length > 0 && (
 <div className="mb-12">
 <button
 type="button"
 aria-expanded={expandedNotes}
 onClick={() => setExpandedNotes(!expandedNotes)}
 className="w-full flex items-center justify-between bg-[#141414] border border-white/5 p-5 hover:bg-[#1A1A1A] transition-colors"
 >
 <span className="text-[10px] uppercase font-black tracking-widest text-white/30">
 Per-Question Notes (
 {feedback.per_question_notes.length})
 </span>
 {expandedNotes ? (
 <ChevronUp
 size={16}
 className="text-white/30"
 />
 ) : (
 <ChevronDown
 size={16}
 className="text-white/30"
 />
 )}
 </button>
 {expandedNotes && (
 <div className="pt-3 space-y-3 animate-fade-in">
 {feedback.per_question_notes.map((note, idx) => (
 <div
 key={idx}
 className="bg-[#141414] border border-white/5 p-5"
 >
 <div className="flex items-center gap-2 mb-2">
 <span className="text-[9px] uppercase font-bold bg-white/10 text-white px-2 py-0.5">
 Q{idx + 1}
 </span>
 {categoryMap[idx + 1] && (
 <span className="text-[9px] uppercase font-bold text-gold bg-gold/10 px-2 py-0.5 border border-gold/20">
 {CATEGORY_LABELS[categoryMap[idx + 1]] ||
 categoryMap[idx + 1]}
 </span>
 )}
 </div>
 <p className="text-sm text-white/50 leading-relaxed">
 {note}
 </p>
 </div>
 ))}
 </div>
 )}
 </div>
 )}
 </>
 ) : (
 <div className="text-center py-16">
 <div className="w-16 h-16 bg-white/5 flex items-center justify-center mx-auto mb-6">
 <Award size={28} className="text-white/20"/>
 </div>
 <h4 className="font-display text-2xl text-white mb-3 font-semibold">
 Session Ended
 </h4>
 <p className="text-white/40 mb-8 max-w-sm mx-auto">
 Feedback is unavailable for this session. This can happen
 if the session ended early or the evaluation timed out.
 </p>
 <button
 onClick={handleReset}
 className="bg-gold text-[#0A0A0A] font-bold uppercase tracking-widest py-4 px-8 flex items-center justify-center gap-3 hover:bg-gold/90 transition-all mx-auto"
 >
 <RefreshCcw size={16} /> Try Again
 </button>
 </div>
 )}

 {/* CTA */}
 {feedback && (
 <div className="bg-[#141414] border border-white/10 p-8 md:p-10 text-white text-center">
 <h4 className="font-display text-2xl md:text-3xl mb-4 font-semibold">
 Don&apos;t leave your admission to chance.
 </h4>
 <p className="text-white/40 mb-8 max-w-lg mx-auto italic">
 Your story is strong, but your delivery needs M7
 precision. Our mentors have sat in these actual chairs at
 HBS, Wharton, and GSB. Let them polish your pitch.
 </p>
 <Link
 href="/checkout"
 className="inline-block bg-gold text-[#0A0A0A] px-10 py-5 font-bold uppercase tracking-[0.2em] text-sm hover:scale-105 transition-transform shadow-xl"
 >
 Book Mentor Mock &mdash; &#8377;1,000
 </Link>
 </div>
 )}
 </div>
 </div>
 </div>
 )}
 <EmailCapture variant="contextual"source="interview"/>
 </UsageGate>
 {!isStarted && (
 <div className="w-full max-w-4xl mt-8 px-4">
 <ToolCrossLinks current="/interview"/>
 </div>
 )}
 </div>
 );
}
