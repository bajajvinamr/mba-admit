"use client";

import { useState, useEffect } from"react";
import { useParams } from"next/navigation";
import { ArrowLeft, BarChart3, Sparkles } from"lucide-react";
import Link from"next/link";
import { apiFetch, ApiError } from"@/lib/api";
import { useProfile } from"@/hooks/useProfile";
import { useAbortSignal } from"@/hooks/useAbortSignal";
import { toast } from"@/components/Toast";
import { useRecentSchools } from"@/hooks/useRecentSchools";
import { track } from"@/lib/analytics";
import { notFound } from"next/navigation";
import { EmailCapture } from"@/components/EmailCapture";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";
import { cn } from"@/lib/cn";
import { Tabs, TabsList, TabsTrigger, TabsContent } from"@/components/ui/tabs";

import type { SchoolData, SchoolInsights, AppState } from"./_components/types";
import type { QuickFormData } from"./_components/ApplicationSection";
import { SchoolHeader } from"./_components/SchoolHeader";
import { ApplicantInsights } from"./_components/ApplicantInsights";
import { RealApplicantData } from"./_components/RealApplicantData";
import { ApplicationSection } from"./_components/ApplicationSection";
import {
 OverviewTab,
 EssaysTab,
 DeadlinesTab,
 AdmissionsTab,
 EmploymentTab,
 CostsTab,
} from"./_components/tabs";

const TAB_ITEMS = [
 { value: 0, label:"Overview"},
 { value: 1, label:"Essays"},
 { value: 2, label:"Deadlines"},
 { value: 3, label:"Admissions"},
 { value: 4, label:"Employment"},
 { value: 5, label:"Costs"},
] as const;

export default function SchoolDetail() {
 const params = useParams();
 const schoolId = params.schoolId as string;
 const abortSignal = useAbortSignal();

 const [school, setSchool] = useState<SchoolData | null>(null);
 const [showApplication, setShowApplication] = useState(false);
 const [appState, setAppState] = useState<AppState | null>(null);
 const [sessionId] = useState(() => {
 if (typeof window ==="undefined") return Math.random().toString(36).substring(7);
 const storageKey = `mba_session_${schoolId}`;
 const existing = sessionStorage.getItem(storageKey);
 if (existing) return existing;
 const newId = crypto.randomUUID();
 sessionStorage.setItem(storageKey, newId);
 return newId;
 });
 const [insights, setInsights] = useState<SchoolInsights | null>(null);
 const { profile: savedProfile, updateProfile: saveProfile } = useProfile();
 const { recordView } = useRecentSchools();
 const [insightsProfile, setInsightsProfile] = useState({ gmat:"", gpa:"", yoe:""});
 const [showInsightsForm, setShowInsightsForm] = useState(false);
 const [trackStatus, setTrackStatus] = useState<string | null>(null);

 // ── Data fetching ──────────────────────────────────────────────────────
 useEffect(() => {
 apiFetch<SchoolData>(`/api/schools/${schoolId}`, { noRetry: true, signal: abortSignal })
 .then(data => {
 setSchool(data);
 recordView({ id: schoolId, name: data.name, location: data.location });
 track("school_viewed", { school_id: schoolId, school_name: data.name });
 })
 .catch((err) => {
 if (abortSignal.aborted) return;
 if (err instanceof ApiError && err.status === 404) { notFound(); return; }
 console.error(err);
 });

 const searchParams = new URLSearchParams();
 if (savedProfile.gmat) searchParams.set("gmat", String(savedProfile.gmat));
 if (savedProfile.gpa) searchParams.set("gpa", String(savedProfile.gpa));
 if (savedProfile.yoe) searchParams.set("yoe", String(savedProfile.yoe));
 apiFetch<SchoolInsights>(`/api/schools/${schoolId}/insights?${searchParams}`, { signal: abortSignal })
 .then(data => setInsights(data))
 .catch((e) => { if (e.name !=="AbortError") console.error("Failed to load school insights:", e); });

 if (savedProfile.gmat) setInsightsProfile(p => ({ ...p, gmat: String(savedProfile.gmat) }));
 if (savedProfile.gpa) setInsightsProfile(p => ({ ...p, gpa: String(savedProfile.gpa) }));
 if (savedProfile.yoe) setInsightsProfile(p => ({ ...p, yoe: String(savedProfile.yoe) }));
 }, [schoolId, savedProfile.gmat, savedProfile.gpa, savedProfile.yoe]);

 // ── Handlers ──────────────────────────────────────────────────────────
 const fetchInsightsWithProfile = () => {
 const searchParams = new URLSearchParams();
 if (insightsProfile.gmat) searchParams.set("gmat", insightsProfile.gmat);
 if (insightsProfile.gpa) searchParams.set("gpa", insightsProfile.gpa);
 if (insightsProfile.yoe) searchParams.set("yoe", insightsProfile.yoe);

 saveProfile({
 gmat: insightsProfile.gmat ? Number(insightsProfile.gmat) : null,
 gpa: insightsProfile.gpa ? Number(insightsProfile.gpa) : null,
 yoe: insightsProfile.yoe ? Number(insightsProfile.yoe) : null,
 });

 apiFetch<SchoolInsights>(`/api/schools/${schoolId}/insights?${searchParams}`, { signal: abortSignal })
 .then(data => { setInsights(data); setShowInsightsForm(false); })
 .catch((e) => { if (e.name !=="AbortError") console.error("Failed to load school insights:", e); });
 };

 const addToMySchools = async (status: string) => {
 try {
 await apiFetch(`/api/user/schools`, {
 method:"POST",
 body: JSON.stringify({ school_id: schoolId, status }),
 noRetry: true,
 signal: abortSignal,
 });
 setTrackStatus(status);
 toast.success(`${school?.name ||"School"} added to your tracker`);
 } catch (err) {
 if (err instanceof ApiError && err.status === 409) {
 setTrackStatus(status);
 toast.success(`${school?.name ||"School"} added to your tracker`);
 } else if (err instanceof ApiError && err.status === 401) {
 toast.info("Sign in to track schools");
 } else {
 toast.error("Failed to track school");
 }
 }
 };

 const startSession = async (form: QuickFormData) => {
 try {
 const data = await apiFetch<AppState>(`/api/start_session`, {
 method:"POST",
 body: JSON.stringify({
 session_id: sessionId, school_id: schoolId,
 name: form.name, gmat: parseInt(form.gmat),
 gpa: parseFloat(form.gpa), industry_background: form.industry,
 undergrad_tier: form.undergrad_tier,
 leadership_roles: form.leadership_roles,
 target_intake: form.target_intake,
 intl_experience: form.intl_experience,
 community_service: form.community_service,
 publications: form.publications,
 }),
 noRetry: true,
 timeoutMs: 60_000,
 signal: abortSignal,
 });
 setAppState(data);
 setShowApplication(true);
 } catch (e) {
 toast.error("Failed to start session. Please try again.");
 console.error(e);
 }
 };

 const sendChat = async (message: string) => {
 setAppState(prev => prev ? { ...prev, interview_history: [...prev.interview_history, { role:"user", content: message }] } : null);
 try {
 const data = await apiFetch<AppState>(`/api/chat`, {
 method:"POST",
 body: JSON.stringify({ session_id: sessionId, message }),
 noRetry: true,
 timeoutMs: 60_000,
 signal: abortSignal,
 });
 setAppState(data);
 } catch (e) {
 toast.error("Message failed to send. Please try again.");
 console.error(e);
 }
 };

 const handleUnlock = async () => {
 try {
 const data = await apiFetch<AppState>(`/api/unlock`, {
 method:"POST",
 body: JSON.stringify({ session_id: sessionId }),
 noRetry: true,
 timeoutMs: 60_000,
 signal: abortSignal,
 });
 setAppState(data);
 } catch (e) {
 toast.error("Unlock failed. Please try again.");
 console.error(e);
 }
 };

 const handleStartApplication = () => {
 setShowApplication(true);
 };

 // ── Loading state ──────────────────────────────────────────────────────
 if (!school) {
 return (
 <div className="min-h-screen flex items-center justify-center">
 <div className="flex flex-col items-center gap-4">
 <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin"/>
 <p className="text-muted-foreground/40 text-sm">Loading school data…</p>
 </div>
 </div>
 );
 }

 // ── Render ─────────────────────────────────────────────────────────────
 return (
 <div className="max-w-7xl mx-auto px-8">
 <Link href="/schools" className="inline-flex items-center gap-2 text-muted-foreground/40 hover:text-foreground mb-8 transition-colors text-sm font-medium uppercase tracking-wider">
 <ArrowLeft size={14} /> Back to Directory
 </Link>

 <SchoolHeader school={school} trackStatus={trackStatus} onAddToSchools={addToMySchools} />

 {insights ? (
 <ApplicantInsights
 insights={insights}
 insightsProfile={insightsProfile}
 showInsightsForm={showInsightsForm}
 onProfileChange={setInsightsProfile}
 onShowForm={() => setShowInsightsForm(true)}
 onHideForm={() => setShowInsightsForm(false)}
 onSubmitProfile={fetchInsightsWithProfile}
 />
 ) : (
 <div className="editorial-card mt-10 p-8 text-center">
 <BarChart3 size={40} className="mx-auto mb-4 text-muted-foreground"/>
 <p className="text-muted-foreground text-lg mb-2">Complete your profile to see personalized admission insights</p>
 <Link href="/simulator" className="text-primary hover:text-primary/80 text-sm font-medium transition-colors">
 Go to Simulator &rarr;
 </Link>
 </div>
 )}

 {/* Start Application CTA + Application Section */}
 {showApplication ? (
 <div className="mt-10 pb-16">
 <div className="flex gap-0 border-b border-border/10 mb-10">
 <button onClick={() => setShowApplication(false)}
 className="px-6 py-4 text-sm uppercase tracking-widest font-bold transition-colors text-muted-foreground/30 hover:text-muted-foreground">
 School Profile
 </button>
 <button
 className="px-6 py-4 text-sm uppercase tracking-widest font-bold transition-colors flex items-center gap-2 border-b-2 border-primary text-primary">
 <Sparkles size={14} /> Application
 </button>
 </div>
 <ApplicationSection
 school={school}
 appState={appState}
 onStartSession={startSession}
 onSendChat={sendChat}
 onUnlock={handleUnlock}
 />
 </div>
 ) : (
 <>
 {/* Sticky Tab Navigation */}
 <Tabs defaultValue={0} className="mt-10">
 <div className={cn(
"sticky top-16 z-40 bg-background border-b border-border/10",
"-mx-8 px-8"
 )}>
 <TabsList
 variant="line"
 className={cn(
"w-full justify-start gap-0 overflow-x-auto",
"scrollbar-none"
 )}
 >
 {TAB_ITEMS.map((tab) => (
 <TabsTrigger
 key={tab.value}
 value={tab.value}
 className={cn(
"px-5 py-4 text-xs uppercase tracking-widest font-bold",
"whitespace-nowrap shrink-0",
" data-active:text-foreground data-active:after:bg-foreground",
"text-muted-foreground/30 hover:text-muted-foreground"
 )}
 >
 {tab.label}
 </TabsTrigger>
 ))}
 {/* Start Application button alongside tabs */}
 <button
 onClick={handleStartApplication}
 className="ml-auto px-5 py-4 text-xs uppercase tracking-widest font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
 >
 <Sparkles size={14} /> Start Application
 </button>
 </TabsList>
 </div>

 <TabsContent value={0} className="mt-10">
 <OverviewTab school={school} />
 <RealApplicantData schoolId={schoolId} />
 </TabsContent>

 <TabsContent value={1} className="mt-10">
 <EssaysTab school={school} onStartApplication={handleStartApplication} />
 </TabsContent>

 <TabsContent value={2} className="mt-10">
 <DeadlinesTab school={school} />
 </TabsContent>

 <TabsContent value={3} className="mt-10">
 <AdmissionsTab school={school} />
 </TabsContent>

 <TabsContent value={4} className="mt-10">
 <EmploymentTab school={school} />
 </TabsContent>

 <TabsContent value={5} className="mt-10">
 <CostsTab school={school} />
 </TabsContent>
 </Tabs>

 {/* Post-content conversion surfaces */}
 <EmailCapture variant="contextual"source={`school-${schoolId}`} />
 <div className="mt-8">
 <ToolCrossLinks current={`/school/${schoolId}`} />
 </div>
 </>
 )}
 </div>
 );
}
