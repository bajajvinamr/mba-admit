"use client";

import * as React from"react";
import { cn } from"@/lib/cn";
import { Button } from"@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from"@/components/ui/avatar";
import {
 DropdownMenu,
 DropdownMenuTrigger,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuSeparator,
 DropdownMenuLabel,
} from"@/components/ui/dropdown-menu";
import { Input } from"@/components/ui/input";
import { Menu, Search, Settings, LogOut, User } from"lucide-react";

interface TopNavProps extends React.ComponentPropsWithRef<"header"> {
 onMobileMenuToggle?: () => void;
 user?: {
 name?: string;
 email?: string;
 avatarUrl?: string;
 initials?: string;
 };
 onSignOut?: () => void;
}

const TopNav = React.forwardRef<HTMLElement, TopNavProps>(
 ({ className, onMobileMenuToggle, user, onSignOut, ...props }, ref) => {
 return (
 <header
 ref={ref}
 className={cn(
"sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background/80 px-4 supports-backdrop-filter:bg-background/60",
 className
 )}
 {...props}
 >
 {/* Mobile menu toggle */}
 <Button
 variant="ghost"
 size="icon"
 className="lg:hidden"
 onClick={onMobileMenuToggle}
 aria-label="Toggle navigation menu"
 >
 <Menu className="size-5"/>
 </Button>

 {/* Logo */}
 <a href="/" className="flex shrink-0 items-center gap-2">
 <span className="text-lg font-bold tracking-tight">
 Admit<span className="text-primary">IQ</span>
 </span>
 </a>

 {/* Search bar (desktop only) */}
 <div className="hidden flex-1 md:flex md:max-w-sm md:ml-4">
 <div className="relative w-full">
 <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
 <Input
 type="search"
 placeholder="Search schools, essays..."
 className="pl-9 h-8"
 />
 </div>
 </div>

 {/* Spacer */}
 <div className="flex-1 md:hidden"/>

 {/* Right section */}
 <div className="flex items-center gap-2">
 {/* Mobile search */}
 <Button
 variant="ghost"
 size="icon"
 className="md:hidden"
 aria-label="Search"
 >
 <Search className="size-5"/>
 </Button>

 {/* User avatar dropdown */}
 <DropdownMenu>
 <DropdownMenuTrigger
 className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
 >
 <Avatar size="sm">
 {user?.avatarUrl && (
 <AvatarImage src={user.avatarUrl} alt={user.name ??"User"} />
 )}
 <AvatarFallback>
 {user?.initials ??"U"}
 </AvatarFallback>
 </Avatar>
 </DropdownMenuTrigger>

 <DropdownMenuContent align="end"sideOffset={8}>
 <DropdownMenuLabel>
 <div className="flex flex-col">
 <span className="text-sm font-medium">
 {user?.name ??"User"}
 </span>
 {user?.email && (
 <span className="text-xs text-muted-foreground">
 {user.email}
 </span>
 )}
 </div>
 </DropdownMenuLabel>

 <DropdownMenuSeparator />

 <DropdownMenuItem>
 <User className="size-4"/>
 Profile
 </DropdownMenuItem>

 <DropdownMenuItem>
 <Settings className="size-4"/>
 Settings
 </DropdownMenuItem>

 <DropdownMenuSeparator />

 <DropdownMenuItem onClick={onSignOut}>
 <LogOut className="size-4"/>
 Sign out
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>
 </header>
 );
 }
);

TopNav.displayName ="TopNav";

export { TopNav };
export type { TopNavProps };
