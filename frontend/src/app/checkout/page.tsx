"use client";

import { Suspense, useState, useEffect } from"react";
import { useRouter, useSearchParams } from"next/navigation";
import { useSession } from"next-auth/react";
import {
 CheckCircle2, Shield, Loader2, ArrowRight, Zap, Crown,
 Sparkles, ArrowLeft,
} from"lucide-react";
import Link from"next/link";
import { track } from"@/lib/analytics";

// ── Plan config (must match pricing page) ────────────────────────────────────

type PlanId ="pro"|"premium";

const PLANS: Record<PlanId, {
 name: string;
 icon: typeof Zap;
 monthlyPrice: number;
 features: string[];
 color: string;
}> = {
 pro: {
 name:"Pro",
 icon: Zap,
 monthlyPrice: 29,
 features: [
"10 essay evaluations per month",
"20 mock interviews per month",
"Unlimited odds calculator",
"Full profile report access",
"School comparison (5/mo)",
 ],
 color:"text-primary",
 },
 premium: {
 name:"Premium",
 icon: Crown,
 monthlyPrice: 79,
 features: [
"Unlimited access to all AI tools",
"60-min monthly strategy call",
"Priority essay reviews (24h)",
"Networking outreach templates",
"Scholarship strategy session",
 ],
 color:"text-purple-600",
 },
};

// ── Subscription checkout ────────────────────────────────────────────────────

function SubscriptionCheckout({
 planId,
 annual,
 email,
}: {
 planId: PlanId;
 annual: boolean;
 email: string;
}) {
 const router = useRouter();
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState("");

 const plan = PLANS[planId];
 const Icon = plan.icon;
 const price = annual ? Math.round(plan.monthlyPrice * 0.8) : plan.monthlyPrice;
 const billingLabel = annual ?"per month, billed annually":"per month";
 const totalAnnual = annual ? price * 12 : null;

 // Track checkout page view once
 useEffect(() => {
 track("checkout_viewed", { plan: planId, billing: annual ?"annual":"monthly", price });
 }, [planId, annual, price]);

 const handleCheckout = async () => {
 setLoading(true);
 setError("");
 track("checkout_initiated", { plan: planId, billing: annual ?"annual":"monthly", price });

 try {
 const res = await fetch("/api/create-checkout-session", {
 method:"POST",
 headers: {"Content-Type":"application/json"},
 body: JSON.stringify({
 plan: planId,
 billing: annual ?"annual":"monthly",
 }),
 });

 const data = await res.json();

 if (data.url) {
 track("checkout_redirect", { plan: planId, billing: annual ?"annual":"monthly"});
 window.location.href = data.url;
 return;
 }

 if (data.error) {
 track("checkout_error", { plan: planId, error: data.error });
 setError(data.error);
 setLoading(false);
 return;
 }

 track("checkout_error", { plan: planId, error:"no_url_returned"});
 setError("Unable to start checkout. Please try again.");
 setLoading(false);
 } catch {
 track("checkout_error", { plan: planId, error:"network_error"});
 setError("Connection error. Please check your internet and try again.");
 setLoading(false);
 }
 };

 return (
 <div className="min-h-screen bg-background py-20 px-8">
 <div className="max-w-4xl mx-auto">
 <Link
 href="/pricing"
 className="inline-flex items-center gap-1 text-sm text-muted-foreground/50 hover:text-foreground transition-colors mb-8"
 >
 <ArrowLeft size={14} /> Back to plans
 </Link>

 <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
 {/* Order summary */}
 <div className="md:col-span-3">
 <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/50 font-bold mb-4">
 Upgrade Your Plan
 </p>
 <h1 className="heading-serif text-4xl mb-6 text-foreground">
 {plan.name} Plan
 </h1>

 <div className="bg-card border border-border/10 p-8">
 <div className="flex items-center gap-3 mb-6">
 <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
 planId ==="premium" ?"bg-purple-50":"bg-primary/10"
 }`}>
 <Icon size={20} className={plan.color} />
 </div>
 <div>
 <h2 className="font-bold text-lg text-foreground">{plan.name}</h2>
 <p className="text-xs text-muted-foreground/40">
 {annual ?"Annual billing - save 20%":"Monthly billing"}
 </p>
 </div>
 </div>

 <ul className="space-y-3 mb-8">
 {plan.features.map((f, i) => (
 <li key={i} className="flex gap-3 text-sm text-muted-foreground">
 <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5"/>
 {f}
 </li>
 ))}
 </ul>

 <div className="pt-6 border-t border-border/10">
 <div className="flex justify-between items-baseline">
 <span className="text-sm text-muted-foreground/50">{billingLabel}</span>
 <span className="heading-serif text-3xl text-foreground">${price}</span>
 </div>
 {totalAnnual && (
 <p className="text-xs text-muted-foreground/40 text-right mt-1">
 ${totalAnnual}/year total · save ${(plan.monthlyPrice * 12) - totalAnnual}/year
 </p>
 )}
 </div>
 </div>

 <div className="flex items-center gap-2 text-xs text-muted-foreground/40 mt-4">
 <Shield size={14} /> Cancel anytime. 7-day money-back guarantee.
 </div>

 {/* Cost comparison anchor */}
 <div className="bg-primary/5 border border-primary/15 p-4 mt-4">
 <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">
 vs. Traditional Consultants
 </p>
 <div className="flex items-baseline justify-between text-sm">
 <span className="text-muted-foreground/50">Average MBA consultant</span>
 <span className="text-muted-foreground/30 line-through">$5,000–$10,000</span>
 </div>
 <div className="flex items-baseline justify-between text-sm mt-1">
 <span className="text-foreground font-bold">Admit Compass {plan.name}</span>
 <span className="text-foreground font-bold">${price}/mo</span>
 </div>
 </div>
 </div>

 {/* Payment */}
 <div className="md:col-span-2">
 <div className="bg-foreground text-white p-8 sticky top-32">
 <h3 className="font-display text-xl mb-6">Payment</h3>

 <p className="text-sm text-white/70 mb-6 border-b border-border pb-4">
 Logged in as <strong className="text-white">{email}</strong>
 </p>

 <div className="bg-card/5 border border-border p-4 mb-6">
 <div className="flex justify-between text-sm">
 <span className="text-white/60">{plan.name} ({annual ?"Annual":"Monthly"})</span>
 <span className="font-bold">${price}/mo</span>
 </div>
 {annual && (
 <div className="flex justify-between text-xs mt-2">
 <span className="text-white/40">Billed today</span>
 <span className="text-primary font-bold">${totalAnnual}</span>
 </div>
 )}
 </div>

 {error && (
 <div className="bg-red-500/20 border border-red-400/30 text-red-200 text-sm px-4 py-3 mb-4">
 {error}
 </div>
 )}

 <button
 onClick={handleCheckout}
 disabled={loading}
 className={`w-full py-4 font-bold text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
 planId ==="premium"
 ?"bg-gradient-to-r from-purple-600 to-purple-700 hover:opacity-90"
 :"bg-primary text-foreground hover:bg-primary/90"
 }`}
 >
 {loading ? (
 <><Loader2 size={16} className="animate-spin"/> Processing...</>
 ) : (
 <>Upgrade to {plan.name} <ArrowRight size={14} /></>
 )}
 </button>

 {/* Social proof + urgency */}
 <div className="mt-4 space-y-2">
 <p className="text-center text-[10px] text-white/40">
 <Sparkles size={10} className="inline mr-1"/>
 Joined by 5,000+ MBA applicants this cycle
 </p>
 <p className="text-center text-[10px] text-primary/60 font-bold uppercase tracking-wider">
 Beta pricing - locked in for your account
 </p>
 </div>

 <p className="text-center text-[10px] text-white/30 mt-3 uppercase tracking-wider">
 Powered by Stripe · 256-bit SSL
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}

// ── Consulting call checkout (legacy) ────────────────────────────────────────

function ConsultingCheckout({
 sessionId,
 email,
}: {
 sessionId: string;
 email: string;
}) {
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState("");

 const handleStripeCheckout = async () => {
 setLoading(true);
 setError("");

 try {
 const res = await fetch("/api/create-checkout-session", {
 method:"POST",
 headers: {"Content-Type":"application/json"},
 body: JSON.stringify({ sessionId }),
 });

 const data = await res.json();
 if (data.url) {
 window.location.href = data.url;
 } else {
 setError(data.error ||"Failed to create checkout session");
 setLoading(false);
 }
 } catch {
 setError("Network error. Please try again.");
 setLoading(false);
 }
 };

 return (
 <div className="min-h-screen bg-background py-20 px-8 flex items-center justify-center">
 <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-5 gap-10">
 <div className="md:col-span-3">
 <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/50 font-bold mb-4">
 Step 2: Payment
 </p>
 <h1 className="heading-serif text-4xl mb-6 text-foreground">Secure Checkout</h1>

 <div className="bg-card border border-border/10 p-8 text-foreground mb-6">
 <h2 className="font-display text-2xl mb-2">
 1-Hour Profile Evaluation & Strategy Call
 </h2>
 <p className="text-muted-foreground/70 mb-6 text-sm">
 Deep-dive call with an M7/IIM mentor. We will review your profile,
 identify weaknesses, and build a target school list.
 </p>

 <ul className="space-y-4 mb-8">
 {[
"Full profile teardown (GMAT, GPA, Work Exp)",
"School selection strategy (Reaches, Targets, Safeties)",
"Essay narrative brainstorming",
"Actionable roadmap for the next 6 months",
 ].map((item, i) => (
 <li key={i} className="flex gap-3 text-sm font-medium text-muted-foreground">
 <CheckCircle2 size={18} className="text-emerald-600 shrink-0"/> {item}
 </li>
 ))}
 </ul>

 <div className="mt-8 pt-6 border-t border-border/10 flex items-center justify-between">
 <span className="font-bold">Total (INR)</span>
 <span className="heading-serif text-3xl text-primary-dark">₹1,000</span>
 </div>
 </div>

 <div className="flex items-center gap-2 text-xs text-muted-foreground/50">
 <Shield size={16} /> 100% Money-Back Guarantee if you are not satisfied.
 </div>
 </div>

 <div className="md:col-span-2">
 <div className="bg-foreground text-white p-8 sticky top-32">
 <h3 className="font-display text-xl mb-6">Payment Details</h3>

 <p className="text-sm text-white/70 mb-8 border-b border-border pb-4">
 Logged in as <strong className="text-white">{email}</strong>
 </p>

 {error && (
 <div className="bg-red-500/20 border border-red-400/30 text-red-200 text-sm px-4 py-3 mb-4">
 {error}
 </div>
 )}

 <button
 onClick={handleStripeCheckout}
 disabled={loading}
 className="w-full bg-[#635BFF] text-white py-4 font-bold rounded-md hover:bg-[#5349DF] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
 >
 {loading ? (
 <><Loader2 size={18} className="animate-spin"/> Connecting to Stripe...</>
 ) : (
 <>Pay ₹1,000 via Stripe <ArrowRight size={16} /></>
 )}
 </button>
 <p className="text-center text-[10px] text-white/40 mt-4 uppercase tracking-wider">
 Powered by Stripe. Secured via TLS.
 </p>
 </div>
 </div>
 </div>
 </div>
 );
}

// ── Router ────────────────────────────────────────────────────────────────────

function CheckoutContent() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const { data: session, status } = useSession();

 const planParam = searchParams.get("plan") as PlanId | null;
 const annual = searchParams.get("billing") ==="annual";
 const sessionId = searchParams.get("session_id") ||"";

 useEffect(() => {
 if (status ==="unauthenticated") {
 const callbackUrl = `/checkout${window.location.search}`;
 router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
 }
 }, [status, router]);

 if (status ==="unauthenticated" || status ==="loading") {
 return (
 <div className="min-h-screen bg-background py-20 px-8 flex items-center justify-center">
 <Loader2 className="animate-spin text-primary"size={32} />
 </div>
 );
 }

 const email = session?.user?.email ||"";

 // Subscription checkout: ?plan=pro or ?plan=premium
 if (planParam && (planParam ==="pro" || planParam ==="premium")) {
 return <SubscriptionCheckout planId={planParam} annual={annual} email={email} />;
 }

 // Consulting call checkout: ?session_id=...
 if (sessionId) {
 return <ConsultingCheckout sessionId={sessionId} email={email} />;
 }

 // No valid params - redirect to pricing
 router.push("/pricing");
 return null;
}

export default function CheckoutPage() {
 return (
 <Suspense
 fallback={
 <div className="min-h-screen bg-background py-20 px-8 flex items-center justify-center">
 <Loader2 className="animate-spin text-primary"size={32} />
 </div>
 }
 >
 <CheckoutContent />
 </Suspense>
 );
}
