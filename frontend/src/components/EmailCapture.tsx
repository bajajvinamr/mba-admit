"use client";

import { useState } from"react";
import { ArrowRight, Check, Sparkles } from"lucide-react";
import { apiFetch } from"@/lib/api";
import { track } from"@/lib/analytics";

type Variant ="inline"|"banner"|"compact"|"contextual";

export function EmailCapture({
 variant ="inline",
 source ="unknown",
}: {
 variant?: Variant;
 source?: string;
}) {
 const [email, setEmail] = useState("");
 const [status, setStatus] = useState<" idle"|"loading"|"success"|"error"|"duplicate">(" idle");
 const [errorMsg, setErrorMsg] = useState("");

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!email.trim()) return;

 setStatus("loading");
 setErrorMsg("");

 try {
 const data = await apiFetch<{ status: string }>(`/api/subscribe`, {
 method:"POST",
 body: JSON.stringify({ email: email.trim(), source }),
 noRetry: true,
 });

 if (data.status ==="already_subscribed") {
 setStatus("duplicate");
 track("email_capture_duplicate", { source, variant });
 } else {
 setStatus("success");
 track("email_capture_success", { source, variant });
 }
 } catch (err) {
 setErrorMsg(err instanceof Error ? err.message :"Failed to subscribe");
 setStatus("error");
 track("email_capture_error", { source, variant });
 }
 };

 if (status ==="success") {
 return (
 <div className={variant ==="compact" ?"flex items-center gap-2 text-sm":"text-center py-4"}>
 <div className="flex items-center gap-2 text-emerald-600 font-bold">
 <Check size={16} />
 <span>You&apos;re in! We&apos;ll be in touch.</span>
 </div>
 </div>
 );
 }

 if (status ==="duplicate") {
 return (
 <div className={variant ==="compact" ?"flex items-center gap-2 text-sm":"text-center py-4"}>
 <div className="flex items-center gap-2 text-primary font-bold">
 <Sparkles size={16} />
 <span>You&apos;re already on the list!</span>
 </div>
 </div>
 );
 }

 // Banner variant - full-width dark strip
 if (variant ==="banner") {
 return (
 <div className="bg-foreground text-white py-8 px-8">
 <div className="max-w-3xl mx-auto text-center">
 <p className="text-xs uppercase tracking-[0.2em] text-primary font-bold mb-2">
 Launch Coming Soon
 </p>
 <h3 className="heading-serif text-2xl mb-2">
 Get early access to Admit Compass
 </h3>
 <p className="text-white/50 text-sm mb-6 max-w-lg mx-auto">
 Join thousands of MBA applicants getting personalized admissions guidance. Free during beta.
 </p>
 <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
 <input
 type="email"
 required
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 placeholder="your@email.com"
 className="flex-1 bg-card/10 border border-border px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary transition-colors"
 />
 <button
 type="submit"
 disabled={status ==="loading"}
 className="bg-primary text-foreground font-bold px-6 py-3 hover:bg-primary-light transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0"
 >
 {status ==="loading" ?"...": <>Join <ArrowRight size={16} /></>}
 </button>
 </form>
 {status ==="error" && (
 <p className="text-red-400 text-xs mt-2">{errorMsg}</p>
 )}
 <p className="text-[10px] text-white/20 mt-3">No spam, ever. Unsubscribe anytime.</p>
 </div>
 </div>
 );
 }

 // Compact variant - single-line for footer
 if (variant ==="compact") {
 return (
 <form onSubmit={handleSubmit} className="flex gap-2">
 <input
 type="email"
 required
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 placeholder="your@email.com"
 className="bg-card/5 border border-border px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary transition-colors w-48"
 />
 <button
 type="submit"
 disabled={status ==="loading"}
 className="bg-primary text-foreground font-bold px-4 py-2 text-xs hover:bg-primary-light transition-colors disabled:opacity-50"
 >
 {status ==="loading" ?"...":"Join"}
 </button>
 </form>
 );
 }

 // Contextual variant - lightweight post-result nudge
 if (variant ==="contextual") {
 return (
 <div className="border border-primary/20 bg-primary/5 p-5 mt-6">
 <div className="flex items-start gap-3">
 <Sparkles size={16} className="text-primary mt-0.5 shrink-0"/>
 <div className="flex-1">
 <p className="text-sm font-bold text-foreground mb-1">Save your results & get tips</p>
 <p className="text-[11px] text-muted-foreground/50 mb-3">
 Get application deadlines, strategy tips, and personalized recommendations - free.
 </p>
 <form onSubmit={handleSubmit} className="flex gap-2">
 <input
 type="email"
 required
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 placeholder="your@email.com"
 className="flex-1 border border-border/10 px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors"
 />
 <button
 type="submit"
 disabled={status ==="loading"}
 className="bg-primary text-foreground font-bold px-4 py-2 text-xs hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0"
 >
 {status ==="loading" ?"...":"Save"}
 </button>
 </form>
 {status ==="error" && (
 <p className="text-red-500 text-xs mt-2">{errorMsg}</p>
 )}
 </div>
 </div>
 </div>
 );
 }

 // Inline variant - card-style for within pages
 return (
 <div className="bg-background border border-border p-6">
 <p className="text-xs uppercase tracking-[0.15em] font-bold text-muted-foreground/40 mb-1">Stay Updated</p>
 <p className="text-sm text-muted-foreground/60 mb-4">
 Get notified when new features launch. Free during beta.
 </p>
 <form onSubmit={handleSubmit} className="flex gap-2">
 <input
 type="email"
 required
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 placeholder="your@email.com"
 className="flex-1 border border-border/10 px-3 py-2.5 text-sm focus:border-primary focus:outline-none transition-colors"
 />
 <button
 type="submit"
 disabled={status ==="loading"}
 className="bg-foreground text-white font-bold px-5 py-2.5 text-xs hover:bg-primary transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
 >
 {status ==="loading" ?"...": <>Subscribe <ArrowRight size={14} /></>}
 </button>
 </form>
 {status ==="error" && (
 <p className="text-red-500 text-xs mt-2">{errorMsg}</p>
 )}
 </div>
 );
}
