"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Plus,
  Trash2,
  Mail,
  Download,
  Brain,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  AlertTriangle,
  FileText,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAbortSignal } from "@/hooks/useAbortSignal";
import { useUsage } from "@/hooks/useUsage";
import { UsageGate } from "@/components/UsageGate";
import { ToolCrossLinks } from "@/components/ToolCrossLinks";
import { EmailCapture } from "@/components/EmailCapture";

type School = { id: string; name: string };
type Recommender = { title: string; relationship: string; years_known: string };

/* ── Recommender Tracker Types ─────────────────────────────────────── */

type RecStatus = "not_asked" | "asked" | "accepted" | "submitted";

type TrackedRecommender = {
  id: string;
  name: string;
  email: string;
  title: string;
  relationship: string;
  status: RecStatus;
  schools: string[]; // school IDs they're writing for
  notes: string;
  deadline: string;
};

const STATUS_CONFIG: Record<
  RecStatus,
  { label: string; icon: React.ReactNode; color: string }
> = {
  not_asked: {
    label: "Not Asked",
    icon: <AlertCircle size={14} />,
    color:
      "text-muted-foreground/40 bg-foreground/5 border-border/10",
  },
  asked: {
    label: "Asked",
    icon: <Send size={14} />,
    color: "text-amber-700 bg-amber-50 border-amber-200",
  },
  accepted: {
    label: "Accepted",
    icon: <Clock size={14} />,
    color: "text-blue-700 bg-blue-50 border-blue-200",
  },
  submitted: {
    label: "Submitted",
    icon: <CheckCircle2 size={14} />,
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
};

const RELATIONSHIP_OPTIONS = [
  { value: "manager", label: "Manager" },
  { value: "colleague", label: "Colleague" },
  { value: "professor", label: "Professor" },
  { value: "mentor", label: "Mentor" },
  { value: "other", label: "Other" },
];

const STORAGE_KEY = "admitcompass_recommender_tracker";

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const deadline = new Date(dateStr);
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function DeadlineBadge({ deadline }: { deadline: string }) {
  const days = daysUntil(deadline);
  if (days === null) return null;
  if (days < 0)
    return (
      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded-full">
        Overdue
      </span>
    );
  if (days < 7)
    return (
      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded-full flex items-center gap-1">
        <AlertTriangle size={10} /> {days}d left
      </span>
    );
  if (days < 14)
    return (
      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-full flex items-center gap-1">
        <Clock size={10} /> {days}d left
      </span>
    );
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-foreground/5 text-muted-foreground/50 border border-border/10 rounded-full">
      {days}d left
    </span>
  );
}

export default function RecommendersPage() {
  const abortSignal = useAbortSignal();
  const usage = useUsage("rec_strategy");
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [strengths, setStrengths] = useState<string[]>([
    "Leadership",
    "Analytical Depth",
  ]);
  const [recommenders, setRecommenders] = useState<Recommender[]>([
    { title: "Direct Manager", relationship: "Current Boss", years_known: "2" },
  ]);

  // ── Tracker state (localStorage-backed) ──
  const [trackedRecs, setTrackedRecs] = useState<TrackedRecommender[]>([]);
  const [showTracker, setShowTracker] = useState(true);
  const [addingRec, setAddingRec] = useState(false);
  const [newRecName, setNewRecName] = useState("");
  const [newRecEmail, setNewRecEmail] = useState("");
  const [newRecTitle, setNewRecTitle] = useState("");
  const [newRecRelationship, setNewRecRelationship] = useState("manager");
  const [newRecSchools, setNewRecSchools] = useState<string[]>([]);
  const [newRecDeadline, setNewRecDeadline] = useState("");

  // Briefing modal
  const [briefingRec, setBriefingRec] = useState<TrackedRecommender | null>(
    null,
  );
  const [briefingSchool, setBriefingSchool] = useState("");
  const [briefingContent, setBriefingContent] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setTrackedRecs(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, []);

  const saveTracked = (recs: TrackedRecommender[]) => {
    setTrackedRecs(recs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recs));
  };

  const addTrackedRec = () => {
    if (!newRecName.trim()) return;
    const rec: TrackedRecommender = {
      id: Date.now().toString(),
      name: newRecName,
      email: newRecEmail,
      title: newRecTitle,
      relationship: newRecRelationship,
      status: "not_asked",
      schools: newRecSchools,
      notes: "",
      deadline: newRecDeadline,
    };
    saveTracked([...trackedRecs, rec]);
    setNewRecName("");
    setNewRecEmail("");
    setNewRecTitle("");
    setNewRecRelationship("manager");
    setNewRecSchools([]);
    setNewRecDeadline("");
    setAddingRec(false);
  };

  const updateRecStatus = (id: string, status: RecStatus) => {
    saveTracked(
      trackedRecs.map((r) => (r.id === id ? { ...r, status } : r)),
    );
  };

  const removeTrackedRec = (id: string) => {
    saveTracked(trackedRecs.filter((r) => r.id !== id));
  };

  const toggleSchoolForRec = (recId: string, schoolId: string) => {
    saveTracked(
      trackedRecs.map((r) => {
        if (r.id !== recId) return r;
        const has = r.schools.includes(schoolId);
        return {
          ...r,
          schools: has
            ? r.schools.filter((s) => s !== schoolId)
            : [...r.schools, schoolId],
        };
      }),
    );
  };

  const schoolMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of schools) {
      map[s.id] = s.name;
    }
    return map;
  }, [schools]);

  const generateBriefing = async (rec: TrackedRecommender, schoolId: string) => {
    setBriefingRec(rec);
    setBriefingSchool(schoolId);
    setBriefingLoading(true);
    setBriefingContent(null);
    try {
      const data = await apiFetch<{ template: string }>(
        `/api/recommenders/${rec.id}/briefing?school_id=${schoolId}`,
        { method: "POST", noRetry: true },
      );
      setBriefingContent(data.template);
    } catch {
      // Generate a local fallback
      const schoolName = schoolMap[schoolId] || schoolId;
      setBriefingContent(
        `Dear ${rec.name},\n\nThank you for agreeing to write a recommendation letter for my application to ${schoolName}.\n\nI would appreciate it if you could highlight:\n- Specific examples of my leadership and impact\n- My ability to work in teams and drive results\n- My growth trajectory and potential\n\nThe recommendation is due by ${rec.deadline || "the application deadline"}.\n\nPlease let me know if you need any additional information.\n\nBest regards`,
      );
    } finally {
      setBriefingLoading(false);
    }
  };

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<School[]>(`/api/schools/names`)
      .then((data) => setSchools(data))
      .catch(console.error);
  }, []);

  const addRecommender = () => {
    if (recommenders.length < 3) {
      setRecommenders([
        ...recommenders,
        { title: "", relationship: "", years_known: "" },
      ]);
    }
  };

  const removeRecommender = (index: number) => {
    setRecommenders(recommenders.filter((_, i) => i !== index));
  };

  const updateRecommender = (
    index: number,
    field: keyof Recommender,
    value: string,
  ) => {
    const newRecs = [...recommenders];
    newRecs[index] = { ...newRecs[index], [field]: value };
    setRecommenders(newRecs);
  };

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await apiFetch(`/api/recommender_strategy`, {
        method: "POST",
        body: JSON.stringify({
          school_id: selectedSchoolId || "general",
          applicant_strengths: strengths,
          recommenders,
        }),
        noRetry: true,
        timeoutMs: 60_000,
        signal: abortSignal,
      });
      setResult(data);
      usage.recordUse();
    } catch (e) {
      console.error(e);
      setError("Failed to generate strategy. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-20 px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/20 text-foreground font-bold uppercase tracking-widest text-[10px] mb-6 border border-primary/30">
            <Users size={12} /> Roadmap v2: Recommender Strategy
          </div>
          <h1 className="heading-serif text-5xl text-foreground mb-4">
            The Recommender Strategy Engine
          </h1>
          <p className="text-muted-foreground/60 text-lg max-w-2xl">
            Don&apos;t leave your bosses guessing. Generate a high-stakes
            &quot;Prep Packet&quot; that tells your recommenders exactly which
            strengths to highlight for your target schools.
          </p>
        </div>

        {/* ── Recommender Tracker ──────────────────────────────────── */}
        <div className="bg-card border border-border/10 mb-12">
          <button
            onClick={() => setShowTracker(!showTracker)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-foreground/[0.02] transition-colors"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 size={20} className="text-primary" />
              <span className="font-display text-lg font-bold">
                Recommender Tracker
              </span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold bg-foreground/5 px-2 py-0.5">
                {trackedRecs.length} recommenders
              </span>
              {trackedRecs.length > 0 && (
                <span className="text-[10px] text-emerald-600 font-bold">
                  {
                    trackedRecs.filter((r) => r.status === "submitted")
                      .length
                  }
                  /{trackedRecs.length} submitted
                </span>
              )}
            </div>
            <ChevronRight
              size={18}
              className={`text-muted-foreground/40 transition-transform ${showTracker ? "rotate-90" : ""}`}
            />
          </button>

          <AnimatePresence>
            {showTracker && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6 border-t border-border/5">
                  {trackedRecs.length === 0 && !addingRec && (
                    <p className="text-sm text-muted-foreground/40 py-4">
                      Track your recommenders&apos; status here. Add a
                      recommender to get started.
                    </p>
                  )}

                  {/* Table header */}
                  {trackedRecs.length > 0 && (
                    <div className="hidden md:grid grid-cols-[1fr_120px_1fr_100px_80px_40px] gap-3 py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/30 border-b border-border/5">
                      <span>Name</span>
                      <span>Relationship</span>
                      <span>Schools</span>
                      <span>Status</span>
                      <span>Deadline</span>
                      <span></span>
                    </div>
                  )}

                  {trackedRecs.map((rec) => {
                    const cfg = STATUS_CONFIG[rec.status];
                    return (
                      <div
                        key={rec.id}
                        className="flex flex-col md:grid md:grid-cols-[1fr_120px_1fr_100px_80px_40px] md:items-center gap-2 md:gap-3 py-3 border-b border-border/5 last:border-b-0"
                      >
                        {/* Name + email */}
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-foreground truncate">
                            {rec.name}
                          </p>
                          <p className="text-xs text-muted-foreground/40 truncate">
                            {rec.title}
                            {rec.email ? ` · ${rec.email}` : ""}
                          </p>
                        </div>

                        {/* Relationship */}
                        <span className="text-xs text-muted-foreground/50 capitalize">
                          {rec.relationship || "—"}
                        </span>

                        {/* Assigned schools */}
                        <div className="flex flex-wrap gap-1">
                          {rec.schools.length > 0 ? (
                            rec.schools.map((sid) => (
                              <span
                                key={sid}
                                className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full font-medium truncate max-w-[120px]"
                                title={schoolMap[sid] || sid}
                              >
                                {schoolMap[sid] || sid}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-muted-foreground/30">
                              No schools assigned
                            </span>
                          )}
                          {rec.status !== "submitted" &&
                            rec.schools.length > 0 && (
                              <button
                                onClick={() =>
                                  generateBriefing(rec, rec.schools[0])
                                }
                                className="text-[10px] px-2 py-0.5 bg-foreground/5 text-foreground/60 border border-border/10 rounded-full hover:bg-foreground/10 transition-colors flex items-center gap-1"
                                title="Generate briefing document"
                              >
                                <FileText size={10} /> Brief
                              </button>
                            )}
                        </div>

                        {/* Status */}
                        <select
                          value={rec.status}
                          onChange={(e) =>
                            updateRecStatus(
                              rec.id,
                              e.target.value as RecStatus,
                            )
                          }
                          className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 border rounded-full appearance-none cursor-pointer ${cfg.color}`}
                        >
                          <option value="not_asked">Not Asked</option>
                          <option value="asked">Asked</option>
                          <option value="accepted">Accepted</option>
                          <option value="submitted">Submitted</option>
                        </select>

                        {/* Deadline */}
                        <div>
                          {rec.deadline ? (
                            <DeadlineBadge deadline={rec.deadline} />
                          ) : (
                            <span className="text-[10px] text-muted-foreground/30">
                              —
                            </span>
                          )}
                        </div>

                        {/* Delete */}
                        <button
                          onClick={() => removeTrackedRec(rec.id)}
                          className="text-muted-foreground/20 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}

                  {addingRec ? (
                    <div className="pt-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label htmlFor="rec-name" className="sr-only">Name</label>
                          <input
                            id="rec-name"
                            type="text"
                            placeholder="Name *"
                            value={newRecName}
                            onChange={(e) => setNewRecName(e.target.value)}
                            className="border border-border/15 px-3 py-2 text-sm focus:border-primary focus:outline-none w-full"
                          />
                        </div>
                        <div>
                          <label htmlFor="rec-email" className="sr-only">Email</label>
                          <input
                            id="rec-email"
                            type="email"
                            placeholder="Email (optional)"
                            value={newRecEmail}
                            onChange={(e) => setNewRecEmail(e.target.value)}
                            className="border border-border/15 px-3 py-2 text-sm focus:border-primary focus:outline-none w-full"
                          />
                        </div>
                        <div>
                          <label htmlFor="rec-relationship" className="sr-only">Relationship</label>
                          <select
                            id="rec-relationship"
                            value={newRecRelationship}
                            onChange={(e) =>
                              setNewRecRelationship(e.target.value)
                            }
                            className="border border-border/15 px-3 py-2 text-sm focus:border-primary focus:outline-none w-full"
                          >
                            {RELATIONSHIP_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label htmlFor="rec-title" className="sr-only">Title/Role</label>
                          <input
                            id="rec-title"
                            type="text"
                            placeholder="Title/Role"
                            value={newRecTitle}
                            onChange={(e) => setNewRecTitle(e.target.value)}
                            className="border border-border/15 px-3 py-2 text-sm focus:border-primary focus:outline-none w-full"
                          />
                        </div>
                        <div>
                          <label htmlFor="rec-deadline" className="sr-only">Deadline</label>
                          <input
                            id="rec-deadline"
                            type="date"
                            placeholder="Deadline"
                            value={newRecDeadline}
                            onChange={(e) => setNewRecDeadline(e.target.value)}
                            className="border border-border/15 px-3 py-2 text-sm focus:border-primary focus:outline-none w-full"
                          />
                        </div>
                        {/* School multi-select */}
                        <div className="relative">
                          <label htmlFor="rec-schools" className="sr-only">Assign schools</label>
                          <select
                            id="rec-schools"
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val && !newRecSchools.includes(val)) {
                                setNewRecSchools([...newRecSchools, val]);
                              }
                              e.target.value = "";
                            }}
                            className="border border-border/15 px-3 py-2 text-sm focus:border-primary focus:outline-none w-full"
                            defaultValue=""
                          >
                            <option value="" disabled>
                              Assign schools...
                            </option>
                            {schools.slice(0, 100).map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                          {newRecSchools.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {newRecSchools.map((sid) => (
                                <span
                                  key={sid}
                                  className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full flex items-center gap-1"
                                >
                                  {schoolMap[sid] || sid}
                                  <button
                                    onClick={() =>
                                      setNewRecSchools(
                                        newRecSchools.filter(
                                          (s) => s !== sid,
                                        ),
                                      )
                                    }
                                    className="hover:text-red-500"
                                  >
                                    <X size={10} />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={addTrackedRec}
                          className="bg-foreground text-white text-xs font-bold px-4 py-2 hover:bg-primary transition-colors"
                        >
                          Add Recommender
                        </button>
                        <button
                          onClick={() => setAddingRec(false)}
                          className="text-xs text-muted-foreground/40 px-4 py-2 hover:text-foreground"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingRec(true)}
                      className="mt-3 flex items-center gap-2 text-xs font-bold text-primary hover:text-foreground transition-colors"
                    >
                      <Plus size={14} /> Add Recommender
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Briefing Modal ──────────────────────────────────────── */}
        <AnimatePresence>
          {briefingRec && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
              onClick={() => setBriefingRec(null)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-card border border-border max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">
                      Briefing Template
                    </h3>
                    <p className="text-lg font-bold text-foreground">
                      {briefingRec.name} —{" "}
                      {schoolMap[briefingSchool] || briefingSchool}
                    </p>
                  </div>
                  <button
                    onClick={() => setBriefingRec(null)}
                    className="text-muted-foreground/40 hover:text-foreground"
                  >
                    <X size={20} />
                  </button>
                </div>

                {briefingLoading ? (
                  <div className="py-12 text-center text-muted-foreground/40">
                    <RefreshCcw className="animate-spin mx-auto mb-2" size={24} />
                    Generating briefing...
                  </div>
                ) : briefingContent ? (
                  <div className="space-y-4">
                    <pre className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-display bg-background/50 p-6 border border-border/10">
                      {briefingContent}
                    </pre>
                    <div className="flex gap-3">
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(briefingContent || "")
                        }
                        className="bg-foreground text-white text-xs font-bold px-4 py-2 hover:bg-primary transition-colors flex items-center gap-2"
                      >
                        <Mail size={14} /> Copy to Clipboard
                      </button>
                      <button
                        onClick={() => {
                          const mailto = `mailto:${briefingRec?.email || ""}?subject=Recommendation Letter Request&body=${encodeURIComponent(briefingContent || "")}`;
                          window.open(mailto);
                        }}
                        className="text-xs font-bold px-4 py-2 border border-border/20 hover:bg-foreground/5 transition-colors flex items-center gap-2"
                      >
                        <Send size={14} /> Open in Email
                      </button>
                    </div>
                  </div>
                ) : null}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-1 space-y-8">
            {/* Step 1: Context */}
            <section className="bg-card p-6 border border-border/5">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-6 flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-foreground text-white flex items-center justify-center text-[8px]">
                  1
                </span>
                Target School
              </h3>
              <select
                value={selectedSchoolId}
                onChange={(e) => setSelectedSchoolId(e.target.value)}
                className="w-full border-b border-border/20 py-2 text-sm focus:border-border focus:outline-none bg-transparent mb-4"
              >
                <option value="">Select a school...</option>
                {schools.slice(0, 100).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </section>

            {/* Step 2: Strengths */}
            <section className="bg-card p-6 border border-border/5">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-6 flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-foreground text-white flex items-center justify-center text-[8px]">
                  2
                </span>
                Your Key Strengths
              </h3>
              <div className="space-y-2">
                {[
                  "Leadership",
                  "Analytical Depth",
                  "Innovation",
                  "Global Mindset",
                  "Resilience",
                  "Collaboration",
                ].map((tag) => (
                  <label
                    key={tag}
                    className="flex items-center gap-2 text-sm cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={strengths.includes(tag)}
                      onChange={(e) => {
                        if (e.target.checked)
                          setStrengths([...strengths, tag]);
                        else setStrengths(strengths.filter((s) => s !== tag));
                      }}
                      className="accent-jet"
                    />
                    <span
                      className={
                        strengths.includes(tag)
                          ? "text-foreground font-medium"
                          : "text-muted-foreground/40 group-hover:text-muted-foreground"
                      }
                    >
                      {tag}
                    </span>
                  </label>
                ))}
              </div>
            </section>
          </div>

          <div className="lg:col-span-2 space-y-8">
            {/* Step 3: Recommenders */}
            <section className="bg-card p-8 border border-border/5">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-foreground text-white flex items-center justify-center text-[8px]">
                    3
                  </span>
                  Potential Recommenders
                </h3>
                <button
                  onClick={addRecommender}
                  disabled={recommenders.length >= 3}
                  className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 hover:text-primary disabled:opacity-30 disabled:hover:text-muted-foreground/40 transition-colors"
                >
                  <Plus size={12} /> Add Recommender
                </button>
              </div>

              <div className="space-y-6">
                <AnimatePresence>
                  {recommenders.map((rec, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="p-6 bg-background/50 border border-border/10 relative group"
                    >
                      <button
                        onClick={() => removeRecommender(idx)}
                        className="absolute top-4 right-4 text-muted-foreground/20 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label htmlFor={`rec-strategy-title-${idx}`} className="block text-[8px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">
                            Title/Role
                          </label>
                          <input
                            id={`rec-strategy-title-${idx}`}
                            type="text"
                            placeholder="e.g. CEO, Senior VP"
                            value={rec.title}
                            onChange={(e) =>
                              updateRecommender(idx, "title", e.target.value)
                            }
                            className="w-full bg-transparent border-b border-border/10 py-1 text-sm focus:border-border focus:outline-none"
                          />
                        </div>
                        <div>
                          <label htmlFor={`rec-strategy-relationship-${idx}`} className="block text-[8px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">
                            Relationship
                          </label>
                          <input
                            id={`rec-strategy-relationship-${idx}`}
                            type="text"
                            placeholder="e.g. Current Boss"
                            value={rec.relationship}
                            onChange={(e) =>
                              updateRecommender(
                                idx,
                                "relationship",
                                e.target.value,
                              )
                            }
                            className="w-full bg-transparent border-b border-border/10 py-1 text-sm focus:border-border focus:outline-none"
                          />
                        </div>
                        <div>
                          <label htmlFor={`rec-strategy-years-${idx}`} className="block text-[8px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">
                            Years Known
                          </label>
                          <input
                            id={`rec-strategy-years-${idx}`}
                            type="text"
                            placeholder="e.g. 3 years"
                            value={rec.years_known}
                            onChange={(e) =>
                              updateRecommender(
                                idx,
                                "years_known",
                                e.target.value,
                              )
                            }
                            className="w-full bg-transparent border-b border-border/10 py-1 text-sm focus:border-border focus:outline-none"
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {error && (
                <div role="alert" className="bg-red-50 border border-red-200 text-red-800 p-4 text-sm mt-6 flex items-center justify-between">
                  <span>{error}</span>
                  <button
                    onClick={() => setError(null)}
                    className="ml-3 text-sm font-bold underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <div className="mt-12">
                <button
                  onClick={handleGenerate}
                  disabled={loading || recommenders.some((r) => !r.title)}
                  className="w-full bg-foreground text-white font-bold uppercase tracking-widest py-5 flex items-center justify-center gap-3 hover:bg-foreground/90 transition-all disabled:opacity-50 group shadow-sm"
                >
                  {loading ? (
                    <span className="flex flex-col items-center">
                      <span className="flex items-center gap-2">
                        Designing Strategy{" "}
                        <RefreshCcw className="animate-spin" size={18} />
                      </span>
                      <span className="text-xs text-white/40 mt-1 normal-case tracking-normal font-normal">
                        This usually takes 5-10 seconds
                      </span>
                    </span>
                  ) : (
                    <>
                      Generate Prep Packet{" "}
                      <Sparkles
                        size={18}
                        className="group-hover:scale-110 transition-transform text-primary"
                      />
                    </>
                  )}
                </button>
              </div>
            </section>

            {/* Strategy Output */}
            {result && (
              <UsageGate feature="rec_strategy">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card border-2 border-border p-10 shadow-md relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Brain size={120} />
                  </div>

                  <div id="rec-strategy-content" className="relative z-10">
                    <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground/40 mb-8 pb-4 border-b border-border/10">
                      The Strategy Matrix
                    </h2>

                    <div className="mb-12">
                      <h3 className="text-xl heading-serif text-foreground mb-2">
                        Executive Strategy
                      </h3>
                      <p className="text-muted-foreground/70 leading-relaxed italic border-l-4 border-primary pl-6 py-2 bg-primary/5">
                        &quot;{result.overall_strategy}&quot;
                      </p>
                    </div>

                    <div className="space-y-10">
                      {result.recommenders_action_plan.map(
                        (rec: any, idx: number) => (
                          <div
                            key={idx}
                            className="border border-border/5 bg-background/30 p-8 rounded-lg"
                          >
                            <div className="flex justify-between items-start mb-6">
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">
                                  Recommender
                                </h4>
                                <p className="text-lg font-bold text-foreground">
                                  {rec.name_or_title}
                                </p>
                              </div>
                              <div className="text-right">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">
                                  Target Focus
                                </h4>
                                <p className="text-sm font-medium px-3 py-1 bg-foreground text-white rounded-full inline-block">
                                  {rec.recommended_focus}
                                </p>
                              </div>
                            </div>

                            <div className="bg-card border border-border/10 p-6 relative">
                              <h5 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-4 flex items-center gap-2">
                                <Mail size={12} /> Prep Email Draft
                              </h5>
                              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-display">
                                {rec.prep_email_draft}
                              </p>
                              <button
                                onClick={() =>
                                  navigator.clipboard.writeText(
                                    rec.prep_email_draft,
                                  )
                                }
                                className="mt-6 text-[10px] font-bold uppercase tracking-widest text-primary hover:text-foreground transition-colors flex items-center gap-1"
                              >
                                Copy to Clipboard <ChevronRight size={12} />
                              </button>
                            </div>
                          </div>
                        ),
                      )}
                    </div>

                    <div className="mt-12 pt-12 border-t border-border/10 flex flex-col md:flex-row gap-4 justify-between items-center text-muted-foreground/40">
                      <p className="text-xs italic">
                        &quot;A good recommendation is just a story that
                        hasn&apos;t been shared yet.&quot;
                      </p>
                      <button
                        onClick={() => {
                          const printContent =
                            document.getElementById("rec-strategy-content");
                          if (!printContent) return;
                          const printWindow = window.open("", "_blank");
                          if (!printWindow) return;
                          printWindow.document.write(`
                <html><head><title>Recommendation Strategy - Admit Compass</title>
                <style>
                body { font-family: Georgia, serif; max-width: 700px; margin: 40px auto; padding: 20px; color: #1a1a1a; }
                h1 { font-size: 24px; border-bottom: 2px solid #c5a572; padding-bottom: 8px; }
                h2 { font-size: 18px; margin-top: 24px; color: #333; }
                h3 { font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
                ul { padding-left: 20px; }
                li { margin-bottom: 8px; line-height: 1.6; }
                .section { margin-bottom: 32px; }
                @media print { body { margin: 0; } }
                </style></head><body>
                <h1>Recommendation Strategy Prep Packet</h1>
                ${printContent.innerHTML}
                </body></html>
                `);
                          printWindow.document.close();
                          printWindow.print();
                        }}
                        className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:text-foreground transition-colors"
                      >
                        <Download size={14} /> Export / Print Prep Packet
                      </button>
                    </div>
                  </div>
                </motion.div>
              </UsageGate>
            )}
          </div>
        </div>

        <EmailCapture variant="contextual" source="recommenders" />
        <ToolCrossLinks current="/recommenders" />
      </div>
    </div>
  );
}

const RefreshCcw = ({
  className,
  size,
}: {
  className?: string;
  size?: number;
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 16h5v5" />
  </svg>
);
