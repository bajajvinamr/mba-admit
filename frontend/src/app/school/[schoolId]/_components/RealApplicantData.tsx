"use client";

import { useState, useEffect } from"react";
import { Users, Star, MessageCircle, User } from"lucide-react";
import { apiFetch } from"@/lib/api";
import { useAbortSignal } from"@/hooks/useAbortSignal";
import type {
 RealApplicantData as RealApplicantDataType,
 ApplicantProfile,
 InterviewQuestion,
 StudentReview,
} from"./types";

type Tab ="profiles"|"reviews"|"questions";

function ResultBadge({ result }: { result: string }) {
 const r = result.toLowerCase();
 if (r.includes("accepted") || r.includes("admitted")) {
 return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200">Accepted</span>;
 }
 if (r.includes("rejected") || r.includes("denied")) {
 return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-red-50 text-red-500 border border-red-200">Rejected</span>;
 }
 if (r.includes("waitlist")) {
 return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-50 text-amber-500 border border-amber-200">Waitlisted</span>;
 }
 if (r.includes("interview")) {
 return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-500 border border-blue-200">Interview</span>;
 }
 return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-muted text-muted-foreground border border-border">{result}</span>;
}

function StarRating({ rating }: { rating: number }) {
 return (
 <div className="flex gap-0.5">
 {[1, 2, 3, 4, 5].map((i) => (
 <Star
 key={i}
 size={12}
 className={i <= rating ?"text-primary fill-primary":"text-muted-foreground"}
 />
 ))}
 </div>
 );
}

function ProfileCard({ profile }: { profile: ApplicantProfile }) {
 return (
 <div className="border border-border/8 bg-card p-5 hover:border-border/15 transition-colors">
 <div className="flex items-start justify-between gap-3 mb-4">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 bg-background border border-border/10 flex items-center justify-center">
 <User size={14} className="text-muted-foreground/40"/>
 </div>
 <div>
 {profile.industry && <p className="text-sm font-medium">{profile.industry}</p>}
 {profile.nationality && <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40">{profile.nationality}</p>}
 </div>
 </div>
 <ResultBadge result={profile.result} />
 </div>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 {profile.gmat_score != null && (
 <div>
 <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40">GMAT</p>
 <p className="text-sm font-medium">{profile.gmat_score}</p>
 </div>
 )}
 {profile.gpa != null && (
 <div>
 <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40">GPA</p>
 <p className="text-sm font-medium">{profile.gpa}</p>
 </div>
 )}
 {profile.work_experience_years != null && (
 <div>
 <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40">Experience</p>
 <p className="text-sm font-medium">{profile.work_experience_years} yrs</p>
 </div>
 )}
 {profile.round && (
 <div>
 <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40">Round</p>
 <p className="text-sm font-medium">{profile.round}</p>
 </div>
 )}
 </div>
 {(profile.year || profile.undergraduate_school || profile.scholarship_info) && (
 <div className="mt-3 pt-3 border-t border-border/5 flex flex-wrap gap-x-4 gap-y-1">
 {profile.year && <p className="text-xs text-muted-foreground/40">Class of {profile.year}</p>}
 {profile.undergraduate_school && <p className="text-xs text-muted-foreground/40">{profile.undergraduate_school}</p>}
 {profile.scholarship_info && <p className="text-xs text-emerald-600">{profile.scholarship_info}</p>}
 </div>
 )}
 </div>
 );
}

function ReviewCard({ review }: { review: StudentReview }) {
 return (
 <div className="border border-border/8 bg-card p-5 hover:border-border/15 transition-colors">
 <div className="flex items-center justify-between mb-3">
 {review.rating != null && <StarRating rating={review.rating} />}
 {review.year_of_review && (
 <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40">{review.year_of_review}</span>
 )}
 </div>
 {review.pros && (
 <div className="mb-2">
 <p className="text-[10px] uppercase tracking-widest text-emerald-600 font-bold mb-1">Pros</p>
 <p className="text-sm text-muted-foreground/70 leading-relaxed">{review.pros}</p>
 </div>
 )}
 {review.cons && (
 <div>
 <p className="text-[10px] uppercase tracking-widest text-red-400 font-bold mb-1">Cons</p>
 <p className="text-sm text-muted-foreground/70 leading-relaxed">{review.cons}</p>
 </div>
 )}
 </div>
 );
}

function QuestionItem({ question }: { question: InterviewQuestion }) {
 return (
 <div className="flex items-start gap-4 border border-border/8 bg-card p-5 hover:border-border/15 transition-colors">
 <MessageCircle size={16} className="text-muted-foreground/30 mt-0.5 shrink-0"/>
 <div className="flex-1">
 <p className="text-sm text-muted-foreground/80 leading-relaxed">{question.question}</p>
 <div className="flex gap-2 mt-2">
 {question.category && (
 <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-background border border-border/10 text-muted-foreground/50">
 {question.category}
 </span>
 )}
 {question.frequency && (
 <span className="text-[10px] uppercase tracking-wider text-muted-foreground/40">
 {question.frequency}
 </span>
 )}
 </div>
 </div>
 </div>
 );
}

type Props = {
 schoolId: string;
};

export function RealApplicantData({ schoolId }: Props) {
 const [data, setData] = useState<RealApplicantDataType | null>(null);
 const [loaded, setLoaded] = useState(false);
 const [activeTab, setActiveTab] = useState<Tab>("profiles");
 const abortSignal = useAbortSignal();

 useEffect(() => {
 apiFetch<RealApplicantDataType>(`/api/applicant-data/school/${schoolId}`, {
 noRetry: true,
 signal: abortSignal,
 })
 .then((d) => {
 setData(d);
 setLoaded(true);
 // Default to a tab that has data
 if (d.applicant_profiles.length > 0) setActiveTab("profiles");
 else if (d.student_reviews.length > 0) setActiveTab("reviews");
 else if (d.interview_questions.length > 0) setActiveTab("questions");
 })
 .catch((err) => {
 if (err.name ==="AbortError") return;
 // 404 or any error - just hide the section
 setLoaded(true);
 });
 }, [schoolId, abortSignal]);

 // Don't render anything while loading or if no data
 if (!loaded) return null;
 if (!data) return null;

 const { applicant_profiles, student_reviews, interview_questions, data_counts } = data;

 // If all sections are empty, don't render
 if (data_counts.profiles === 0 && data_counts.reviews === 0 && data_counts.interview_questions === 0) {
 return null;
 }

 const allTabs: { key: Tab; label: string; count: number }[] = [
 { key:"profiles", label:"Applicant Profiles", count: data_counts.profiles },
 { key:"reviews", label:"Student Reviews", count: data_counts.reviews },
 { key:"questions", label:"Interview Questions", count: data_counts.interview_questions },
 ];
 const tabs = allTabs.filter((t) => t.count > 0);

 return (
 <div className="mt-10">
 {/* Section Header */}
 <div className="mb-6">
 <h2 className="heading-serif text-2xl flex items-center gap-2">
 <Users size={20} /> What Real Applicants Say
 </h2>
 <p className="text-xs text-muted-foreground/40 mt-1 uppercase tracking-widest">
 Data from GMAT Club, Clear Admit, and Reddit
 </p>
 </div>

 {/* Tabs */}
 <div className="flex gap-0 border-b border-border/10 mb-6">
 {tabs.map((tab) => (
 <button
 key={tab.key}
 onClick={() => setActiveTab(tab.key)}
 className={`px-5 py-3 text-xs uppercase tracking-widest font-bold transition-colors ${
 activeTab === tab.key
 ?"border-b-2 border-border text-foreground"
 :"text-muted-foreground/30 hover:text-muted-foreground"
 }`}
 >
 {tab.label}
 <span className="ml-1.5 text-[10px] font-normal text-muted-foreground/30">{tab.count}</span>
 </button>
 ))}
 </div>

 {/* Tab Content */}
 {activeTab ==="profiles" && applicant_profiles.length > 0 && (
 <div className="space-y-3">
 {applicant_profiles.slice(0, 20).map((profile, i) => (
 <ProfileCard key={i} profile={profile} />
 ))}
 {applicant_profiles.length > 20 && (
 <p className="text-xs text-muted-foreground/40 text-center pt-2">
 Showing 20 of {applicant_profiles.length} profiles
 </p>
 )}
 </div>
 )}

 {activeTab ==="reviews" && student_reviews.length > 0 && (
 <div className="space-y-3">
 {student_reviews.slice(0, 15).map((review, i) => (
 <ReviewCard key={i} review={review} />
 ))}
 {student_reviews.length > 15 && (
 <p className="text-xs text-muted-foreground/40 text-center pt-2">
 Showing 15 of {student_reviews.length} reviews
 </p>
 )}
 </div>
 )}

 {activeTab ==="questions" && interview_questions.length > 0 && (
 <div className="space-y-3">
 {interview_questions.slice(0, 25).map((question, i) => (
 <QuestionItem key={i} question={question} />
 ))}
 {interview_questions.length > 25 && (
 <p className="text-xs text-muted-foreground/40 text-center pt-2">
 Showing 25 of {interview_questions.length} questions
 </p>
 )}
 </div>
 )}
 </div>
 );
}
