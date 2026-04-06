"use client";

import { useState, useRef, useEffect } from "react";
import {
  Compass, Send, Loader2, ChevronRight, FileText,
  Target, Clock, Sparkles, ArrowRight, CheckCircle2,
  Download, ClipboardCheck, School,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { UsageGate } from "@/components/UsageGate";
import { ToolCrossLinks } from "@/components/ToolCrossLinks";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { track } from "@/lib/analytics";

/* ── Types ─────────────────────────────────────────────────────────── */

type NarrativeArc = {
  core_identity: string;
  why_mba: string;
  why_now: string;
  short_term_goal: string;
  long_term_goal: string;
  the_thread: string;
  key_stories: string[];
  blind_spots: string[];
  school_adaptations: Record<string, {
    school_name: string;
    angle: string;
    emphasize: string[];
    connect_to: string;
  }>;
};

type ConsistencyResult = {
  overall_consistency_score: number;
  overall_summary: string;
  essays: Array<{
    school: string;
    alignment_score: number;
    issues: string[];
    strengths: string[];
    suggestions: string[];
  }>;
  cross_essay_issues: string[];
  missing_elements: string[];
};

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  questionIndex?: number;
};

/* ── Questions ─────────────────────────────────────────────────────── */

const QUESTIONS = [
  "What's the professional achievement you're most proud of?",
  "What's a failure that changed how you think?",
  "If you could only solve one problem in the world, what would it be?",
  "What would your best friend say is your biggest flaw?",
  "Why do you need an MBA specifically?",
  "Where do you see yourself in 10 years — genuinely?",
  "What about your background do most people misunderstand?",
  "Who influenced you the most and why?",
  "What communities do you belong to and what's your role?",
  "What would you bring to a classroom that nobody else would?",
];

const FOLLOW_UPS = [
  "That's a strong start. Can you be more specific about the impact — numbers, scale, who was affected?",
  "Good vulnerability. What did you actually change in how you operate day-to-day after that failure?",
  "Why this problem specifically? What personal experience connects you to it?",
  "Interesting. How does this flaw show up at work? Give me a specific example.",
  "Why can't you achieve this without an MBA? What specifically is the gap?",
  "Be honest — is that truly what you want, or what you think sounds good?",
  "Give me an example of a time this misunderstanding caused a real problem.",
  "How has this person's influence shaped a decision you made in the last year?",
  "What's a time your community needed you and you showed up? What happened?",
  "Why would your classmates remember you 10 years from now?",
];

/* ── Target Schools ────────────────────────────────────────────────── */

const POPULAR_SCHOOLS = [
  { slug: "hbs", name: "Harvard Business School" },
  { slug: "gsb", name: "Stanford GSB" },
  { slug: "wharton", name: "Wharton" },
  { slug: "booth", name: "Chicago Booth" },
  { slug: "kellogg", name: "Kellogg" },
  { slug: "sloan", name: "MIT Sloan" },
  { slug: "cbs", name: "Columbia Business School" },
  { slug: "tuck", name: "Dartmouth Tuck" },
  { slug: "haas", name: "UC Berkeley Haas" },
  { slug: "ross", name: "Michigan Ross" },
  { slug: "fuqua", name: "Duke Fuqua" },
  { slug: "darden", name: "UVA Darden" },
  { slug: "stern", name: "NYU Stern" },
  { slug: "som", name: "Yale SOM" },
  { slug: "johnson", name: "Cornell Johnson" },
];

/* ── Component ─────────────────────────────────────────────────────── */

export default function NarrativePage() {
  // Phase: schools | chat | generating | result | consistency
  const [phase, setPhase] = useState<"schools" | "chat" | "generating" | "result" | "consistency">("schools");
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [narrativeArc, setNarrativeArc] = useState<NarrativeArc | null>(null);
  const [consistencyResult, setConsistencyResult] = useState<ConsistencyResult | null>(null);
  const [essayInputs, setEssayInputs] = useState<Array<{ school: string; content: string }>>([{ school: "", content: "" }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleSchool = (slug: string) => {
    setSelectedSchools(prev =>
      prev.includes(slug)
        ? prev.filter(s => s !== slug)
        : prev.length < 5 ? [...prev, slug] : prev
    );
  };

  const startChat = () => {
    if (selectedSchools.length === 0) return;
    setPhase("chat");
    setMessages([
      {
        role: "assistant",
        content: "Let's build your narrative arc. I'll ask you 10 deep questions — answer honestly, not perfectly. This is about finding YOUR story, not the story you think admissions wants to hear.",
        questionIndex: -1,
      },
      {
        role: "assistant",
        content: `Question 1 of 10: ${QUESTIONS[0]}`,
        questionIndex: 0,
      },
    ]);
    track("narrative_started", { schools: selectedSchools.join(","), school_count: selectedSchools.length });
  };

  const handleSendAnswer = async () => {
    if (!currentInput.trim()) return;

    const answer = currentInput.trim();
    const qKey = `q${currentQuestion + 1}`;

    // Add user message
    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: answer },
    ];

    // Store answer
    const newAnswers = { ...answers, [qKey]: answer };
    setAnswers(newAnswers);
    setCurrentInput("");

    if (currentQuestion < 9) {
      // Follow-up then next question
      const nextQ = currentQuestion + 1;
      newMessages.push({
        role: "assistant",
        content: FOLLOW_UPS[currentQuestion],
      });

      // If they haven't answered the follow-up yet, show next question after a beat
      newMessages.push({
        role: "assistant",
        content: `Question ${nextQ + 1} of 10: ${QUESTIONS[nextQ]}`,
        questionIndex: nextQ,
      });

      setMessages(newMessages);
      setCurrentQuestion(nextQ);
    } else {
      // All 10 answered — generate
      setMessages(newMessages);
      setPhase("generating");

      try {
        const result = await apiFetch<NarrativeArc>("/api/narrative/generate", {
          method: "POST",
          body: JSON.stringify({
            answers: newAnswers,
            target_schools: selectedSchools,
          }),
          timeoutMs: 120_000,
        });
        setNarrativeArc(result);
        setPhase("result");
        track("narrative_generated", { schools: selectedSchools.length });
      } catch (err) {
        setError("Failed to generate narrative. Please try again.");
        setPhase("chat");
      }
    }
  };

  const checkConsistency = async () => {
    if (!narrativeArc) return;
    const validEssays = essayInputs.filter(e => e.school && e.content.trim());
    if (validEssays.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const result = await apiFetch<ConsistencyResult>("/api/narrative/check-consistency", {
        method: "POST",
        body: JSON.stringify({
          narrative_arc: narrativeArc,
          essays: validEssays,
        }),
        timeoutMs: 90_000,
      });
      setConsistencyResult(result);
      setPhase("consistency");
      track("narrative_consistency_checked", { essay_count: validEssays.length });
    } catch {
      setError("Failed to check consistency. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const addEssayInput = () => {
    setEssayInputs(prev => [...prev, { school: "", content: "" }]);
  };

  const updateEssayInput = (index: number, field: "school" | "content", value: string) => {
    setEssayInputs(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const exportAsPdf = () => {
    // Simple print-based PDF export
    window.print();
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6">
        <Breadcrumb items={[{ label: "Narrative Arc Builder" }]} />
      </div>

      {/* Hero */}
      <section className="bg-foreground text-white py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-white/50 text-sm font-medium tracking-widest uppercase mb-3">
            Premium Feature
          </p>
          <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
            Narrative Arc Builder
          </h1>
          <p className="text-white/70 text-lg">
            10 questions. One cohesive story. The consultant-replacement tool.
          </p>
        </div>
      </section>

      <UsageGate feature="narrative_arc" freeTrialCount={1}>
        <div className="max-w-4xl mx-auto px-6 py-10">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
              <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
            </div>
          )}

          {/* Phase: School Selection */}
          {phase === "schools" && (
            <div className="space-y-8">
              <div className="editorial-card p-8">
                <h2 className="heading-serif text-2xl mb-2 font-[family-name:var(--font-heading)] text-foreground">
                  Select Your Target Schools
                </h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Choose up to 5 schools. Your narrative will be adapted for each one.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {POPULAR_SCHOOLS.map(school => (
                    <button
                      key={school.slug}
                      onClick={() => toggleSchool(school.slug)}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-all text-left ${
                        selectedSchools.includes(school.slug)
                          ? "bg-foreground text-white ring-2 ring-foreground"
                          : "bg-foreground/5 text-foreground hover:bg-foreground/10"
                      }`}
                    >
                      <School size={14} className="inline mr-2" />
                      {school.name}
                    </button>
                  ))}
                </div>

                {selectedSchools.length > 0 && (
                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {selectedSchools.length} school{selectedSchools.length !== 1 ? "s" : ""} selected
                    </p>
                    <button
                      onClick={startChat}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-white font-semibold rounded-lg hover:bg-foreground/90 transition-colors"
                    >
                      Start Building Your Narrative
                      <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Phase: Chat Interface */}
          {phase === "chat" && (
            <div className="editorial-card">
              <div className="p-6 border-b border-border/10">
                <div className="flex items-center justify-between">
                  <h2 className="heading-serif text-xl font-[family-name:var(--font-heading)] text-foreground">
                    Building Your Story
                  </h2>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary">
                    {currentQuestion + 1} / 10
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-3 h-1.5 bg-foreground/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-foreground rounded-full transition-all duration-500"
                    style={{ width: `${((currentQuestion + 1) / 10) * 100}%` }}
                  />
                </div>
              </div>

              {/* Messages */}
              <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${
                        msg.role === "user"
                          ? "bg-foreground text-white rounded-br-md"
                          : msg.questionIndex !== undefined && msg.questionIndex >= 0
                            ? "bg-primary/10 text-foreground font-medium rounded-bl-md"
                            : "bg-foreground/5 text-muted-foreground rounded-bl-md"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border/10">
                <div className="flex gap-3">
                  <textarea
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendAnswer();
                      }
                    }}
                    placeholder="Type your answer... (Shift+Enter for new line)"
                    rows={3}
                    className="flex-1 px-4 py-3 border border-border/20 rounded-lg bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-foreground/20"
                  />
                  <button
                    onClick={handleSendAnswer}
                    disabled={!currentInput.trim()}
                    className="px-4 py-3 bg-foreground text-white rounded-lg hover:bg-foreground/90 disabled:opacity-30 transition-all self-end"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Phase: Generating */}
          {phase === "generating" && (
            <div className="editorial-card p-16 text-center">
              <Loader2 size={48} className="mx-auto mb-6 text-foreground animate-spin" />
              <h2 className="heading-serif text-2xl mb-3 font-[family-name:var(--font-heading)] text-foreground">
                Synthesizing Your Narrative
              </h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Analyzing your 10 answers, identifying patterns, and building a cohesive narrative arc
                with adaptations for {selectedSchools.length} school{selectedSchools.length !== 1 ? "s" : ""}...
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {["Finding your archetype", "Connecting the dots", "Mapping school angles", "Identifying blind spots"].map((step, i) => (
                  <span key={step} className="text-xs px-3 py-1 bg-foreground/5 rounded-full text-muted-foreground animate-pulse" style={{ animationDelay: `${i * 0.5}s` }}>
                    {step}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Phase: Result */}
          {phase === "result" && narrativeArc && (
            <div className="space-y-8 print:space-y-4" id="narrative-result">
              {/* Core Identity */}
              <div className="editorial-card p-8 border-l-4 border-foreground">
                <div className="flex items-center gap-2 mb-3">
                  <Compass size={20} className="text-foreground" />
                  <h2 className="heading-serif text-xl font-[family-name:var(--font-heading)] text-foreground">
                    Core Identity
                  </h2>
                </div>
                <p className="text-lg text-foreground font-medium leading-relaxed">
                  {narrativeArc.core_identity}
                </p>
              </div>

              {/* Why MBA + Why Now */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="editorial-card p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Target size={18} className="text-primary" />
                    <h3 className="heading-serif text-lg font-[family-name:var(--font-heading)] text-foreground">Why MBA</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{narrativeArc.why_mba}</p>
                </div>
                <div className="editorial-card p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={18} className="text-primary" />
                    <h3 className="heading-serif text-lg font-[family-name:var(--font-heading)] text-foreground">Why Now</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{narrativeArc.why_now}</p>
                </div>
              </div>

              {/* Goals */}
              <div className="editorial-card p-6">
                <h3 className="heading-serif text-lg mb-4 font-[family-name:var(--font-heading)] text-foreground flex items-center gap-2">
                  <ChevronRight size={18} className="text-primary" />
                  Goals
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground/50 mb-1">Short-term (Post-MBA)</p>
                    <p className="text-sm text-foreground">{narrativeArc.short_term_goal}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground/50 mb-1">Long-term (10-year)</p>
                    <p className="text-sm text-foreground">{narrativeArc.long_term_goal}</p>
                  </div>
                </div>
              </div>

              {/* The Thread */}
              <div className="editorial-card p-8 bg-primary/5 border-l-4 border-primary">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={20} className="text-primary" />
                  <h3 className="heading-serif text-lg font-[family-name:var(--font-heading)] text-foreground">The Thread</h3>
                </div>
                <p className="text-foreground font-medium">{narrativeArc.the_thread}</p>
              </div>

              {/* Key Stories */}
              {narrativeArc.key_stories && narrativeArc.key_stories.length > 0 && (
                <div className="editorial-card p-6">
                  <h3 className="heading-serif text-lg mb-4 font-[family-name:var(--font-heading)] text-foreground">
                    Key Stories to Use
                  </h3>
                  <ul className="space-y-2">
                    {narrativeArc.key_stories.map((story, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                        <span className="text-sm text-muted-foreground">{story}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Blind Spots */}
              {narrativeArc.blind_spots && narrativeArc.blind_spots.length > 0 && (
                <div className="editorial-card p-6 border-l-4 border-amber-400">
                  <h3 className="heading-serif text-lg mb-4 font-[family-name:var(--font-heading)] text-foreground">
                    Blind Spots to Address
                  </h3>
                  <ul className="space-y-2">
                    {narrativeArc.blind_spots.map((spot, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">!</span>
                        <span className="text-sm text-muted-foreground">{spot}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Per-School Adaptations */}
              {narrativeArc.school_adaptations && (
                <div className="space-y-4">
                  <h3 className="heading-serif text-xl font-[family-name:var(--font-heading)] text-foreground">
                    School-Specific Angles
                  </h3>
                  {Object.entries(narrativeArc.school_adaptations).map(([slug, adaptation]) => (
                    <div key={slug} className="editorial-card p-6">
                      <h4 className="font-bold text-foreground mb-2 flex items-center gap-2">
                        <School size={16} className="text-primary" />
                        {adaptation.school_name || slug.toUpperCase()}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-3">{adaptation.angle}</p>
                      {adaptation.emphasize && (
                        <div className="mb-2">
                          <p className="text-xs uppercase tracking-widest text-muted-foreground/50 mb-1">Emphasize</p>
                          <div className="flex flex-wrap gap-1.5">
                            {adaptation.emphasize.map((item, i) => (
                              <span key={i} className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">{item}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {adaptation.connect_to && (
                        <p className="text-xs text-muted-foreground mt-2">
                          <span className="font-semibold">Connect to:</span> {adaptation.connect_to}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={exportAsPdf}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-foreground text-white font-medium rounded-lg hover:bg-foreground/90 transition-colors text-sm"
                >
                  <Download size={16} />
                  Export as PDF
                </button>
              </div>

              {/* Essay Consistency Check */}
              <div className="editorial-card p-8 mt-8">
                <h3 className="heading-serif text-xl mb-2 font-[family-name:var(--font-heading)] text-foreground flex items-center gap-2">
                  <ClipboardCheck size={20} className="text-primary" />
                  Check My Essays Against This Narrative
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Paste your essays below and we will analyze how well they align with your narrative arc.
                </p>

                {essayInputs.map((essay, i) => (
                  <div key={i} className="mb-6 p-4 bg-foreground/[0.02] rounded-lg border border-border/10">
                    <div className="flex items-center gap-3 mb-3">
                      <select
                        value={essay.school}
                        onChange={(e) => updateEssayInput(i, "school", e.target.value)}
                        className="px-3 py-2 border border-border/20 rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                      >
                        <option value="">Select school</option>
                        {POPULAR_SCHOOLS.map(s => (
                          <option key={s.slug} value={s.slug}>{s.name}</option>
                        ))}
                      </select>
                      <span className="text-xs text-muted-foreground">Essay {i + 1}</span>
                    </div>
                    <textarea
                      value={essay.content}
                      onChange={(e) => updateEssayInput(i, "content", e.target.value)}
                      placeholder="Paste your essay content here..."
                      rows={6}
                      className="w-full px-4 py-3 border border-border/20 rounded-lg bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-foreground/20"
                    />
                  </div>
                ))}

                <div className="flex items-center gap-3">
                  <button
                    onClick={addEssayInput}
                    className="text-sm text-primary hover:text-primary/80 font-medium"
                  >
                    + Add another essay
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={checkConsistency}
                    disabled={loading || essayInputs.every(e => !e.school || !e.content.trim())}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-white font-semibold rounded-lg hover:bg-foreground/90 disabled:opacity-30 transition-all text-sm"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                    Check Consistency
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Phase: Consistency Results */}
          {phase === "consistency" && consistencyResult && (
            <div className="space-y-6">
              <button
                onClick={() => setPhase("result")}
                className="text-sm text-primary hover:text-primary/80 font-medium"
              >
                &larr; Back to Narrative
              </button>

              {/* Overall Score */}
              <div className="editorial-card p-8 text-center">
                <p className="text-xs uppercase tracking-widest text-muted-foreground/50 mb-2">Overall Consistency</p>
                <p className={`text-6xl font-bold ${
                  consistencyResult.overall_consistency_score >= 80 ? "text-emerald-600" :
                  consistencyResult.overall_consistency_score >= 60 ? "text-amber-600" : "text-red-600"
                }`}>
                  {consistencyResult.overall_consistency_score}
                </p>
                <p className="text-sm text-muted-foreground mt-3 max-w-lg mx-auto">
                  {consistencyResult.overall_summary}
                </p>
              </div>

              {/* Per-Essay Analysis */}
              {consistencyResult.essays.map((essay, i) => (
                <div key={i} className="editorial-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-foreground capitalize">{essay.school}</h4>
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                      essay.alignment_score >= 80 ? "bg-emerald-100 text-emerald-700" :
                      essay.alignment_score >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                    }`}>
                      {essay.alignment_score}/100
                    </span>
                  </div>
                  {essay.strengths.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs uppercase tracking-widest text-emerald-600 mb-1">Strengths</p>
                      <ul className="space-y-1">
                        {essay.strengths.map((s, j) => (
                          <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                            <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {essay.issues.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs uppercase tracking-widest text-red-600 mb-1">Issues</p>
                      <ul className="space-y-1">
                        {essay.issues.map((issue, j) => (
                          <li key={j} className="text-sm text-muted-foreground">{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {essay.suggestions.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-widest text-primary mb-1">Suggestions</p>
                      <ul className="space-y-1">
                        {essay.suggestions.map((sug, j) => (
                          <li key={j} className="text-sm text-muted-foreground">{sug}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}

              {/* Cross-essay issues */}
              {consistencyResult.cross_essay_issues && consistencyResult.cross_essay_issues.length > 0 && (
                <div className="editorial-card p-6 border-l-4 border-amber-400">
                  <h4 className="font-bold text-foreground mb-3">Cross-Essay Issues</h4>
                  <ul className="space-y-2">
                    {consistencyResult.cross_essay_issues.map((issue, i) => (
                      <li key={i} className="text-sm text-muted-foreground">{issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Missing elements */}
              {consistencyResult.missing_elements && consistencyResult.missing_elements.length > 0 && (
                <div className="editorial-card p-6 border-l-4 border-red-400">
                  <h4 className="font-bold text-foreground mb-3">Missing from Your Narrative</h4>
                  <ul className="space-y-2">
                    {consistencyResult.missing_elements.map((el, i) => (
                      <li key={i} className="text-sm text-muted-foreground">{el}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="mt-10">
            <ToolCrossLinks current="/narrative" />
          </div>
        </div>
      </UsageGate>
    </main>
  );
}
