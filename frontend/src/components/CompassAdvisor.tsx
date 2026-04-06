"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Sparkles, ArrowRight } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/cn";
import Link from "next/link";

type AdviceResponse = {
  advisor: string;
  advice: string;
  follow_up_tools: { label: string; href: string }[];
};

const QUICK_ACTIONS = [
  { label: "Assess my profile", type: "profile_assessment" },
  { label: "Am I on track?", type: "deadline_panic" },
  { label: "Encourage me", type: "general" },
];

export function CompassAdvisor() {
  const [open, setOpen] = useState(false);
  const [response, setResponse] = useState<AdviceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [schoolInput, setSchoolInput] = useState("");
  const { profile } = useProfile();

  const askCompass = useCallback(
    async (questionType: string, schoolId?: string) => {
      setLoading(true);
      setResponse(null);
      try {
        const res = await apiFetch<AdviceResponse>("/api/compass/advice", {
          method: "POST",
          body: JSON.stringify({
            question_type: questionType,
            gmat: profile.gmat,
            gpa: profile.gpa,
            yoe: profile.yoe,
            school_id: schoolId || undefined,
          }),
        });
        setResponse(res);
      } catch {
        setResponse({
          advisor: "Compass",
          advice: "I'm having trouble connecting right now. Try refreshing the page.",
          follow_up_tools: [],
        });
      } finally {
        setLoading(false);
      }
    },
    [profile]
  );

  const handleSchoolFit = () => {
    if (schoolInput.trim()) {
      askCompass("school_fit", schoolInput.trim().toLowerCase());
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed bottom-20 right-5 z-50 md:bottom-6 md:right-6",
          "w-12 h-12 rounded-full shadow-lg transition-all",
          "flex items-center justify-center",
          open
            ? "bg-muted text-muted-foreground hover:bg-muted/80"
            : "bg-foreground text-background hover:scale-105"
        )}
        aria-label={open ? "Close Compass advisor" : "Ask Compass"}
      >
        {open ? <X size={18} /> : <MessageCircle size={18} />}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-36 right-5 z-50 md:bottom-20 md:right-6 w-[340px] max-h-[480px] bg-card border border-border rounded-xl shadow-xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-border/50 bg-muted/20">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-primary" />
                <span className="text-sm font-semibold text-foreground">Compass</span>
                <span className="text-[10px] text-muted-foreground">Your admissions advisor</span>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {!response && !loading && (
                <>
                  <p className="text-sm text-muted-foreground">
                    {profile.gmat
                      ? `Hi! I see you have a ${profile.gmat} GMAT. What can I help with?`
                      : "Hi! I'm Compass, your admissions advisor. How can I help?"}
                  </p>

                  {/* Quick actions */}
                  <div className="space-y-2">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action.type}
                        onClick={() => askCompass(action.type)}
                        disabled={action.type === "profile_assessment" && !profile.gmat}
                        className="w-full text-left px-3 py-2 text-sm bg-muted/30 border border-border/40 rounded-lg hover:bg-primary/5 hover:border-primary/20 transition-colors disabled:opacity-40"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>

                  {/* School fit check */}
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground mb-1.5">Check fit for a school:</p>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="e.g. hbs, chicago_booth"
                        value={schoolInput}
                        onChange={(e) => setSchoolInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSchoolFit()}
                        className="flex-1 px-2.5 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        onClick={handleSchoolFit}
                        disabled={!schoolInput.trim()}
                        className="px-2.5 py-1.5 bg-foreground text-background rounded-md text-sm disabled:opacity-40"
                      >
                        <Send size={12} />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {loading && (
                <div className="flex items-center gap-2 py-4">
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="text-sm text-muted-foreground">Compass is thinking...</span>
                </div>
              )}

              {response && (
                <div className="space-y-3">
                  <div className="prose prose-sm max-w-none text-foreground/80 text-sm leading-relaxed [&_strong]:text-foreground [&_em]:text-muted-foreground">
                    {response.advice.split("\n").map((line, i) => {
                      if (line.startsWith("**") && line.endsWith("**")) {
                        return <h4 key={i} className="font-semibold text-foreground text-sm mt-2 mb-1">{line.replace(/\*\*/g, "")}</h4>;
                      }
                      if (line.startsWith("- ")) {
                        return <p key={i} className="pl-3 border-l-2 border-primary/20 text-sm my-1">{line.slice(2)}</p>;
                      }
                      if (line.startsWith("*") && line.endsWith("*")) {
                        return <p key={i} className="text-xs text-muted-foreground italic mt-2">{line.replace(/\*/g, "")}</p>;
                      }
                      if (line.trim() === "") return <br key={i} />;
                      return <p key={i} className="text-sm my-1">{line}</p>;
                    })}
                  </div>

                  {/* Follow-up tools */}
                  {response.follow_up_tools.length > 0 && (
                    <div className="pt-2 border-t border-border/30 space-y-1.5">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold">Next steps</p>
                      {response.follow_up_tools.map((tool) => (
                        <Link
                          key={tool.href}
                          href={tool.href}
                          onClick={() => setOpen(false)}
                          className="flex items-center justify-between px-3 py-2 text-xs bg-muted/30 border border-border/30 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          <span>{tool.label}</span>
                          <ArrowRight size={10} className="text-primary" />
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Ask another */}
                  <button
                    onClick={() => setResponse(null)}
                    className="w-full text-center text-xs text-primary hover:underline py-1"
                  >
                    Ask something else
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
