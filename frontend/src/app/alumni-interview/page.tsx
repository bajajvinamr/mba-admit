"use client";

import { useState, useEffect } from"react";
import {
 Users,
 Clock,
 ChevronDown,
 ChevronUp,
 Lightbulb,
 MessageSquare,
 Shirt,
 GraduationCap,
} from"lucide-react";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import { EmailCapture } from"@/components/EmailCapture";
import { useUsage } from"@/hooks/useUsage";
import { UsageGate } from"@/components/UsageGate";

/* -- Types ----------------------------------------------------------------- */

type InterviewSchool = {
 school_id: string;
 school_name: string;
 interview_format: string;
 typical_duration: string;
 common_questions: string[];
 tips: string[];
 interviewer_type: string;
 dress_code: string;
};

type PrepResponse = {
 schools: InterviewSchool[];
 total: number;
};

/* -- Constants ------------------------------------------------------------- */

const SCHOOLS = [
 { id:"", label:"All Schools"},
 { id:"hbs", label:"Harvard Business School"},
 { id:"gsb", label:"Stanford GSB"},
 { id:"wharton", label:"Wharton"},
 { id:"booth", label:"Chicago Booth"},
 { id:"kellogg", label:"Kellogg"},
 { id:"cbs", label:"Columbia Business School"},
 { id:"sloan", label:"MIT Sloan"},
 { id:"tuck", label:"Dartmouth Tuck"},
 { id:"haas", label:"UC Berkeley Haas"},
 { id:"som", label:"Yale SOM"},
];

const FORMAT_LABELS: Record<string, { label: string; color: string }> = {
 blind: { label:"Blind", color:"bg-amber-100 text-amber-700"},
 informed: { label:"Informed", color:"bg-emerald-100 text-emerald-700"},
 team: { label:"Team-Based", color:"bg-blue-100 text-blue-700"},
};

const INTERVIEWER_LABELS: Record<string, string> = {
 alumni:"Alumni Interviewer",
 adcom:"Admissions Committee",
 student:"Current Student",
};

/* -- Page ------------------------------------------------------------------ */

export default function AlumniInterviewPage() {
 const [data, setData] = useState<InterviewSchool[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [schoolId, setSchoolId] = useState("");
 const [expandedId, setExpandedId] = useState<string | null>(null);
 const usage = useUsage("alumni_interview");

 useEffect(() => {
 setLoading(true);
 setError(null);
 const qs = schoolId ? `?school_id=${schoolId}` :"";
 apiFetch<PrepResponse>(`/api/alumni-interview-prep${qs}`)
 .then((res) => { setData(res.schools); usage.recordUse(); })
 .catch(() => setError("Failed to load interview prep data."))
 .finally(() => setLoading(false));
 }, [schoolId]);

 const toggle = (id: string) =>
 setExpandedId((prev) => (prev === id ? null : id));

 return (
 <main className="min-h-screen bg-background">
 {/* Hero */}
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-3xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Alumni Interview Prep
 </h1>
 <p className="text-white/70 text-lg">
 School-specific interview formats, common questions, insider tips,
 and dress code guidance for top MBA programs.
 </p>
 </div>
 </section>

 <div className="max-w-4xl mx-auto px-6 py-10">
 {/* School Selector */}
 <div className="editorial-card p-5 mb-8">
 <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-muted-foreground">
 <GraduationCap size={16} />
 Select a School
 </div>
 <select
 value={schoolId}
 onChange={(e) => {
 setSchoolId(e.target.value);
 setExpandedId(null);
 }}
 className="w-full px-4 py-2.5 border border-border/10 rounded-lg text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
 >
 {SCHOOLS.map((s) => (
 <option key={s.id} value={s.id}>
 {s.label}
 </option>
 ))}
 </select>
 </div>

 {/* Loading */}
 {loading && (
 <div className="text-center py-16">
 <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"/>
 </div>
 )}

 {/* Error */}
 {error && (
 <div className="editorial-card p-4 mb-8 border-red-200 bg-red-50 text-red-700 text-sm">
 {error}
 </div>
 )}

 {/* Cards */}
 <UsageGate feature="alumni_interview">
 {!loading && !error && (
 <div className="space-y-4">
 {data.map((school) => {
 const isOpen = expandedId === school.school_id;
 const fmt = FORMAT_LABELS[school.interview_format] ?? {
 label: school.interview_format,
 color:"bg-foreground/10 text-muted-foreground",
 };

 return (
 <div key={school.school_id} className="editorial-card overflow-hidden">
 {/* Header */}
 <button
 onClick={() => toggle(school.school_id)}
 className="w-full text-left p-5 flex items-start gap-4"
 >
 <GraduationCap
 size={20}
 className="mt-0.5 shrink-0 text-primary"
 />
 <div className="flex-1 min-w-0">
 <h2 className="text-lg font-semibold text-foreground">
 {school.school_name}
 </h2>
 <div className="flex flex-wrap items-center gap-2 mt-2">
 <span
 className={`text-xs font-semibold px-2 py-0.5 rounded-full ${fmt.color}`}
 >
 {fmt.label} Interview
 </span>
 <span className="text-xs text-muted-foreground flex items-center gap-1">
 <Clock size={10} />
 {school.typical_duration}
 </span>
 <span className="text-xs text-muted-foreground flex items-center gap-1">
 <Users size={10} />
 {INTERVIEWER_LABELS[school.interviewer_type] ??
 school.interviewer_type}
 </span>
 <span className="text-xs text-muted-foreground flex items-center gap-1">
 <Shirt size={10} />
 {school.dress_code}
 </span>
 </div>
 </div>
 {isOpen ? (
 <ChevronUp size={18} className="text-muted-foreground mt-1 shrink-0"/>
 ) : (
 <ChevronDown size={18} className="text-muted-foreground mt-1 shrink-0"/>
 )}
 </button>

 {/* Expanded Content */}
 {isOpen && (
 <div className="px-5 pb-5 ml-[36px]">
 <div className="border-t border-border/5 pt-4 space-y-5">
 {/* Common Questions */}
 <div>
 <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
 <MessageSquare size={14} className="text-primary"/>
 Common Questions
 </h3>
 <ol className="space-y-2 list-decimal list-inside">
 {school.common_questions.map((q, i) => (
 <li
 key={i}
 className="text-sm text-muted-foreground leading-relaxed"
 >
 {q}
 </li>
 ))}
 </ol>
 </div>

 {/* Tips */}
 <div>
 <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
 <Lightbulb size={14} className="text-primary"/>
 Insider Tips
 </h3>
 <ul className="space-y-2">
 {school.tips.map((tip, i) => (
 <li
 key={i}
 className="text-sm text-muted-foreground flex items-start gap-2"
 >
 <span className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0"/>
 {tip}
 </li>
 ))}
 </ul>
 </div>

 {/* Meta Row */}
 <div className="flex flex-wrap gap-4 pt-2 border-t border-border/5">
 <div className="text-xs text-muted-foreground">
 <span className="font-semibold text-muted-foreground">Format:</span>{""}
 {fmt.label} - interviewer{""}
 {school.interview_format ==="blind"
 ?"has NOT read your application"
 : school.interview_format ==="informed"
 ?"has read your application"
 :"observes team dynamics"}
 </div>
 <div className="text-xs text-muted-foreground">
 <span className="font-semibold text-muted-foreground">Dress Code:</span>{""}
 {school.dress_code}
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 );
 })}

 {data.length === 0 && !loading && (
 <div className="text-center py-16">
 <GraduationCap size={48} className="mx-auto mb-4 text-muted-foreground"/>
 <p className="text-muted-foreground">No interview prep data found.</p>
 </div>
 )}
 </div>
 )}

 </UsageGate>

 <EmailCapture variant="contextual"source="alumni-interview"/>
 <ToolCrossLinks current="/alumni-interview"/>
 </div>
 </main>
 );
}
