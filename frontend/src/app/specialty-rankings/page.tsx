"use client";

import { useState, useEffect } from"react";
import { Trophy, Star, Building2 } from"lucide-react";
import { apiFetch } from"@/lib/api";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type RankedSchool = {
 rank: number;
 school_id: string;
 school_name: string;
 specialty_score: number;
 notable_features: string[];
 key_faculty_or_centers: string[];
};

type SpecialtyResponse = {
 specialty: string;
 rankings: RankedSchool[];
 total: number;
};

type SummaryResponse = {
 specialties: string[];
 summary: Record<string, { top_3: { rank: number; school_name: string; specialty_score: number }[]; total_ranked: number }>;
};

const SPECIALTY_LABELS: Record<string, string> = {
 finance:"Finance",
 consulting:"Consulting",
 technology:"Technology",
 entrepreneurship:"Entrepreneurship",
 healthcare:"Healthcare",
 marketing:"Marketing",
 operations:"Operations",
 social_impact:"Social Impact",
 international_business:"Intl Business",
 real_estate:"Real Estate",
};

function ScoreBar({ score }: { score: number }) {
 return (
 <div className="flex items-center gap-2">
 <div className="flex-1 h-2 bg-foreground/5 rounded-full overflow-hidden">
 <div
 className="h-full bg-primary rounded-full transition-all duration-500"
 style={{ width: `${score}%` }}
 />
 </div>
 <span className="text-sm font-bold text-foreground tabular-nums w-8 text-right">{score}</span>
 </div>
 );
}

export default function SpecialtyRankingsPage() {
 const [specialties, setSpecialties] = useState<string[]>([]);
 const [selected, setSelected] = useState<string>("");
 const [rankings, setRankings] = useState<RankedSchool[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 // Load specialties list
 useEffect(() => {
 apiFetch<SummaryResponse>("/api/rankings/specialty")
 .then((r) => {
 setSpecialties(r.specialties);
 if (r.specialties.length > 0) {
 setSelected(r.specialties[0]);
 }
 })
 .catch(() => setError("Failed to load specialty rankings. Please refresh."))
 .finally(() => setLoading(false));
 }, []);

 // Load rankings for selected specialty
 useEffect(() => {
 if (!selected) return;
 setLoading(true);
 apiFetch<SpecialtyResponse>(`/api/rankings/specialty?specialty=${encodeURIComponent(selected)}`)
 .then((r) => setRankings(r.rankings))
 .catch(() => { setRankings([]); setError("Failed to load rankings for this specialty."); })
 .finally(() => setLoading(false));
 }, [selected]);

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-4xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Rankings by Specialty
 </h1>
 <p className="text-white/70 text-lg">Top MBA programs ranked across 10 career specializations.</p>
 </div>
 </section>

 <div className="max-w-4xl mx-auto px-6 py-10">
 {error && (
 <div className="editorial-card p-4 mb-6 border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
 )}
 {/* Specialty tabs */}
 <div className="editorial-card p-4 mb-8">
 <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-3">Select Specialty</label>
 <div className="flex gap-2 flex-wrap">
 {specialties.map((s) => (
 <button
 key={s}
 onClick={() => setSelected(s)}
 className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
 selected === s
 ?"bg-primary text-white"
 :"bg-foreground/5 text-muted-foreground hover:bg-foreground/10"
 }`}
 >
 {SPECIALTY_LABELS[s] || s}
 </button>
 ))}
 </div>
 </div>

 {loading && (
 <div className="text-center py-16">
 <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"/>
 </div>
 )}

 {!loading && rankings.length > 0 && (
 <div className="space-y-4">
 <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
 {SPECIALTY_LABELS[selected] || selected} - Top {rankings.length} Programs
 </p>

 {rankings.map((school) => (
 <div key={school.school_id} className="editorial-card p-5 hover: transition-shadow">
 <div className="flex items-start gap-4">
 {/* Rank badge */}
 <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
 school.rank <= 3
 ?"bg-primary text-white"
 :"bg-foreground/5 text-muted-foreground"
 }`}>
 {school.rank}
 </div>

 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between mb-2">
 <h3 className="font-bold text-foreground text-lg">{school.school_name}</h3>
 {school.rank <= 3 && (
 <Trophy size={16} className="text-primary flex-shrink-0"/>
 )}
 </div>

 <ScoreBar score={school.specialty_score} />

 {/* Notable features */}
 <div className="mt-3 flex flex-wrap gap-1.5">
 {school.notable_features.map((feat) => (
 <span key={feat} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded font-medium">
 <Star size={10} />
 {feat}
 </span>
 ))}
 </div>

 {/* Key faculty / centers */}
 <div className="mt-2 flex flex-wrap gap-1.5">
 {school.key_faculty_or_centers.map((center) => (
 <span key={center} className="inline-flex items-center gap-1 px-2 py-0.5 bg-foreground/5 text-muted-foreground text-xs rounded font-medium">
 <Building2 size={10} />
 {center}
 </span>
 ))}
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}

 {!loading && rankings.length === 0 && selected && (
 <div className="editorial-card p-8 text-center">
 <p className="text-muted-foreground">No rankings available for this specialty.</p>
 </div>
 )}

 <ToolCrossLinks current="/specialty-rankings"/>
 </div>
 </main>
 );
}
