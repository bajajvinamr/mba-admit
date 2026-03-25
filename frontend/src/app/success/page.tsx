"use client";

import { Suspense, useEffect, useState } from"react";
import { useSearchParams } from"next/navigation";
import { useSession } from"next-auth/react";
import { CheckCircle2, ChevronRight, Zap, Crown, Loader2, Copy, Check, Share2 } from"lucide-react";
import Link from"next/link";
import { useRouter } from"next/navigation";
import { track } from"@/lib/analytics";

// ── Subscription success ─────────────────────────────────────────────────────

function SubscriptionSuccess({ planId }: { planId: string }) {
 const isPremium = planId ==="premium";
 const planName = isPremium ?"Premium":"Pro";
 const Icon = isPremium ? Crown : Zap;

 // Ensure tier is stored + track conversion
 useEffect(() => {
 if (typeof window !=="undefined") {
 localStorage.setItem("ac_tier", planId);
 track("subscription_activated", {
 plan: planId,
 price: isPremium ? 79 : 29,
 });
 }
 }, [planId, isPremium]);

 return (
 <div className="min-h-screen bg-background py-20 px-8">
 <div className="max-w-2xl mx-auto text-center">
 {/* Animated success icon */}
 <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-8 ${
 isPremium ?"bg-purple-100":"bg-primary/20"
 }`}>
 <Icon size={36} className={isPremium ?"text-purple-600":"text-primary"} />
 </div>

 <p className="text-xs uppercase tracking-[0.2em] text-emerald-600 font-bold mb-4 flex items-center justify-center gap-2">
 <CheckCircle2 size={14} /> Upgrade Complete
 </p>

 <h1 className="heading-serif text-4xl md:text-5xl mb-4 text-foreground">
 Welcome to {planName}.
 </h1>
 <p className="text-lg text-muted-foreground/60 max-w-lg mx-auto mb-10">
 {isPremium
 ?"You now have unlimited access to every AI tool, plus monthly strategy calls and priority reviews."
 :"You now have expanded access to all AI tools. Your usage limits have been upgraded."}
 </p>

 {/* What's unlocked */}
 <div className="bg-card border border-border/10 p-8 text-left mb-8">
 <h2 className="text-xs uppercase tracking-widest font-bold text-muted-foreground/40 mb-4">
 What&apos;s Unlocked
 </h2>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 {(isPremium
 ? [
"Unlimited essay evaluations",
"Unlimited mock interviews",
"Unlimited odds calculator",
"Unlimited profile reports",
"Monthly strategy call",
"Priority essay reviews (24h)",
"Networking outreach templates",
"Scholarship strategy session",
 ]
 : [
"10 essay evaluations/mo",
"20 mock interviews/mo",
"Unlimited odds calculator",
"Unlimited profile & ROI reports",
"10 resume roasts/mo",
"5 school comparisons/mo",
"5 scholarship negotiation strategies/mo",
"5 waitlist strategies/mo",
 ]
 ).map((f) => (
 <div key={f} className="flex items-center gap-2 text-sm text-foreground">
 <CheckCircle2 size={14} className="text-emerald-500 shrink-0"/>
 {f}
 </div>
 ))}
 </div>
 </div>

 {/* Suggested next steps */}
 <div className="bg-primary/5 border border-primary/20 p-6 mb-8 text-left">
 <h2 className="text-xs uppercase tracking-widest font-bold text-primary mb-4">
 Recommended Next Steps
 </h2>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 {[
 { href:"/evaluator", label:"Evaluate your essay", desc:"Get AI feedback on your first draft"},
 { href:"/simulator", label:"Check your odds", desc:"See admit chances across schools"},
 { href:"/interview", label:"Practice mock interview", desc:"Prepare for the real thing"},
 { href:"/my-schools", label:"Track your applications", desc:"Organize your school list"},
 ].map((step) => (
 <Link
 key={step.href}
 href={step.href}
 className="flex items-center justify-between px-4 py-3 bg-card hover:bg-primary/5 border border-border/5 transition-colors group"
 >
 <div>
 <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
 {step.label}
 </p>
 <p className="text-[10px] text-muted-foreground/40">{step.desc}</p>
 </div>
 <ChevronRight size={14} className="text-foreground/20 group-hover:text-primary transition-colors"/>
 </Link>
 ))}
 </div>
 </div>

 {/* Share / Referral prompt */}
 <SharePrompt planName={planName} />

 {/* Primary CTA */}
 <div className="flex flex-col sm:flex-row gap-3 justify-center">
 <Link
 href="/tools"
 className="bg-foreground text-white px-8 py-4 font-bold text-sm uppercase tracking-widest hover:bg-foreground/80 transition-colors inline-flex items-center justify-center gap-2"
 >
 Explore All Tools <ChevronRight size={14} />
 </Link>
 </div>

 <p className="text-xs text-muted-foreground/30 mt-8">
 A confirmation email has been sent. Cancel anytime from your account settings.
 </p>
 </div>
 </div>
 );
}

// ── Consulting call success (legacy) ─────────────────────────────────────────

function ConsultingSuccess({ email, name }: { email: string; name: string }) {
 const [calendlyLoaded, setCalendlyLoaded] = useState(false);

 useEffect(() => {
 setCalendlyLoaded(true);
 track("consulting_payment_success", { email_provided: !!email });
 }, [email]);

 return (
 <div className="min-h-screen bg-background py-20 px-8">
 <div className="max-w-4xl mx-auto">
 <div className="text-center mb-16">
 <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full mb-6">
 <CheckCircle2 size={32} />
 </div>
 <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/50 font-bold mb-4">
 Payment Successful
 </p>
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 text-foreground">
 Let&apos;s Get You In.
 </h1>
 <p className="text-lg text-muted-foreground/70 max-w-2xl mx-auto">
 Your ₹1,000 payment was processed. Select a time below to schedule your
 1-hour strategy consultation.
 </p>
 </div>

 <div className="bg-card border border-border/10 p-2 md:p-8 mb-12 min-h-[700px]">
 {calendlyLoaded && (
 <iframe
 src={`https://calendly.com/admit-compass/consult?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`}
 width="100%"
 height="700"
 frameBorder="0"
 title="Schedule consultation"
 />
 )}
 </div>

 <div className="text-center">
 <Link
 href="/dashboard"
 className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors"
 >
 Go to your Dashboard <ChevronRight size={16} />
 </Link>
 </div>
 </div>
 </div>
 );
}

// ── Router ────────────────────────────────────────────────────────────────────

function SuccessContent() {
 const searchParams = useSearchParams();
 const { data: session, status } = useSession();
 const router = useRouter();

 const planParam = searchParams.get("plan");

 useEffect(() => {
 if (status ==="unauthenticated") {
 router.push("/");
 }
 }, [status, router]);

 if (status ==="loading") {
 return (
 <div className="min-h-screen bg-background flex items-center justify-center">
 <Loader2 className="animate-spin text-primary"size={32} />
 </div>
 );
 }

 // Subscription success
 if (planParam ==="pro" || planParam ==="premium") {
 return <SubscriptionSuccess planId={planParam} />;
 }

 // Consulting call success (legacy)
 return (
 <ConsultingSuccess
 email={session?.user?.email ||""}
 name={session?.user?.name ||""}
 />
 );
}

// ── Share Prompt (post-purchase referral) ─────────────────────────────────────

function SharePrompt({ planName }: { planName: string }) {
 const [copied, setCopied] = useState(false);
 const shareUrl ="https://admitcompass.ai?ref=share";
 const shareText = `Just upgraded to Admit Compass ${planName} - 100+ AI tools for MBA admissions. Way better than paying $10K for a consultant.`;

 const copyLink = async () => {
 try {
 await navigator.clipboard.writeText(shareUrl);
 setCopied(true);
 track("share_clicked", { plan: planName, channel:"copy_link"});
 setTimeout(() => setCopied(false), 2000);
 } catch {
 // Fallback for non-secure contexts
 }
 };

 const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
 const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
 const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;

 return (
 <div className="border border-border/10 bg-card p-6 mb-8 text-left">
 <div className="flex items-center gap-2 mb-3">
 <Share2 size={14} className="text-primary"/>
 <h2 className="text-xs uppercase tracking-widest font-bold text-muted-foreground/40">
 Know someone applying?
 </h2>
 </div>
 <p className="text-sm text-muted-foreground/60 mb-4">
 Share Admit Compass with fellow applicants. Every edge helps.
 </p>
 <div className="flex flex-wrap gap-2">
 <button
 onClick={copyLink}
 className="inline-flex items-center gap-1.5 px-4 py-2 border border-border/10 text-xs font-bold text-foreground hover:bg-foreground/5 transition-colors"
 >
 {copied ? <><Check size={12} className="text-emerald-500"/> Copied!</> : <><Copy size={12} /> Copy Link</>}
 </button>
 <a
 href={twitterUrl}
 target="_blank"
 rel="noopener noreferrer"
 onClick={() => track("share_clicked", { plan: planName, channel:"twitter"})}
 className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1DA1F2]/10 text-[#1DA1F2] text-xs font-bold hover:bg-[#1DA1F2]/20 transition-colors"
 >
 Twitter
 </a>
 <a
 href={linkedinUrl}
 target="_blank"
 rel="noopener noreferrer"
 onClick={() => track("share_clicked", { plan: planName, channel:"linkedin"})}
 className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0077B5]/10 text-[#0077B5] text-xs font-bold hover:bg-[#0077B5]/20 transition-colors"
 >
 LinkedIn
 </a>
 <a
 href={whatsappUrl}
 target="_blank"
 rel="noopener noreferrer"
 onClick={() => track("share_clicked", { plan: planName, channel:"whatsapp"})}
 className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#25D366]/10 text-[#25D366] text-xs font-bold hover:bg-[#25D366]/20 transition-colors"
 >
 WhatsApp
 </a>
 </div>
 </div>
 );
}

export default function SuccessPage() {
 return (
 <Suspense
 fallback={
 <div className="min-h-screen bg-background flex items-center justify-center">
 <Loader2 className="animate-spin text-primary"size={32} />
 </div>
 }
 >
 <SuccessContent />
 </Suspense>
 );
}
