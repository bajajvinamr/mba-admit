"use client";

import { Suspense, useState } from"react";
import { signIn } from"next-auth/react";
import { useRouter, useSearchParams } from"next/navigation";
import Link from"next/link";
import { Loader2, ArrowRight, Mail, Lock, Eye, EyeOff } from"lucide-react";

function SignInContent() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const callbackUrl = searchParams.get("callbackUrl") ||"/dashboard";
 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");
 const [showPassword, setShowPassword] = useState(false);
 const [error, setError] = useState("");
 const [loading, setLoading] = useState(false);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setError("");
 setLoading(true);

 const result = await signIn("credentials", {
 email,
 password,
 redirect: false,
 });

 if (result?.error) {
 setError("Invalid email or password");
 setLoading(false);
 } else {
 router.push(callbackUrl);
 }
 };

 return (
 <div className="min-h-screen bg-background flex items-center justify-center px-6">
 <div className="w-full max-w-md">
 <div className="text-center mb-10">
 <Link href="/" className="inline-block">
 <h1 className="heading-serif text-2xl text-foreground">Admit Compass</h1>
 </Link>
 <p className="text-sm text-muted-foreground/60 mt-2">Sign in to your account</p>
 </div>

 <div className="bg-card border border-border/10 p-8">
 {error && (
 <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-6 flex items-center justify-between">
 <span>{error}</span>
 <button type="button" onClick={() => setError("")} className="ml-3 text-sm font-bold underline">Dismiss</button>
 </div>
 )}

 <form onSubmit={handleSubmit} className="space-y-5">
 <div>
 <label htmlFor="email" className="block text-xs uppercase tracking-wider text-muted-foreground/60 font-bold mb-2">
 Email
 </label>
 <div className="relative">
 <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50"/>
 <input
 id="email"
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 required
 className="w-full pl-10 pr-4 py-3 border border-border/15 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
 placeholder="you@example.com"
 />
 </div>
 </div>

 <div>
 <label htmlFor="password" className="block text-xs uppercase tracking-wider text-muted-foreground/60 font-bold mb-2">
 Password
 </label>
 <div className="relative">
 <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50"/>
 <input
 id="password"
 type={showPassword ?"text":"password"}
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 required
 className="w-full pl-10 pr-10 py-3 border border-border/15 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
 placeholder="••••••••"
 />
 <button
 type="button"
 onClick={() => setShowPassword(v => !v)}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
 aria-label={showPassword ?"Hide password":"Show password"}
 >
 {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
 </button>
 </div>
 </div>

 <button
 type="submit"
 disabled={loading}
 className="w-full bg-foreground text-white py-3 font-bold text-sm hover:bg-foreground/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
 >
 {loading ? (
 <><Loader2 size={16} className="animate-spin"/> Signing in...</>
 ) : (
 <>Sign In <ArrowRight size={14} /></>
 )}
 </button>
 </form>

 {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
 <>
 <div className="relative my-6">
 <div className="absolute inset-0 flex items-center">
 <div className="w-full border-t border-border/10"/>
 </div>
 <div className="relative flex justify-center text-xs uppercase">
 <span className="bg-card px-4 text-muted-foreground/40">or</span>
 </div>
 </div>

 <button
 onClick={() => signIn("google", { callbackUrl })}
 className="w-full border border-border/15 py-3 font-bold text-sm text-foreground hover:bg-background transition-colors flex items-center justify-center gap-2"
 >
 <svg className="w-4 h-4"viewBox="0 0 24 24">
 <path fill="#4285F4"d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
 <path fill="#34A853"d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
 <path fill="#FBBC05"d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
 <path fill="#EA4335"d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
 </svg>
 Continue with Google
 </button>
 </>
 )}
 </div>

 <p className="text-center text-sm text-muted-foreground/50 mt-6">
 Don&apos;t have an account?{""}
 <Link href="/auth/signup" className="text-foreground font-bold hover:text-primary transition-colors">
 Sign up
 </Link>
 </p>
 </div>
 </div>
 );
}

export default function SignInPage() {
 return (
 <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="animate-spin text-primary"/></div>}>
 <SignInContent />
 </Suspense>
 );
}
