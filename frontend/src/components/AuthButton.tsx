"use client";

import { signIn, signOut, useSession } from"next-auth/react";
import { LogOut, User } from"lucide-react";

export function AuthButton() {
 const { data: session, status } = useSession();

 if (status ==="loading") {
 return <div className="text-xs text-muted-foreground/50 animate-pulse">Loading...</div>;
 }

 if (status ==="authenticated" && session?.user) {
 return (
 <div className="flex items-center gap-4">
 <span className="text-xs font-medium text-muted-foreground/50 flex items-center gap-1.5 hidden md:inline-flex">
 <User size={12} /> {session.user.name}
 </span>
 <button
 onClick={() => signOut()}
 className="text-xs text-muted-foreground/70 hover:text-red-500 transition-colors flex items-center gap-1.5"
 title="Sign Out"
 >
 <LogOut size={14} />
 <span className="hidden md:inline">Sign Out</span>
 </button>
 </div>
 );
 }

 return (
 <button
 onClick={() => signIn("credentials", { callbackUrl:"/checkout"})}
 className="text-xs font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
 >
 <User size={14} /> Sign In
 </button>
 );
}
