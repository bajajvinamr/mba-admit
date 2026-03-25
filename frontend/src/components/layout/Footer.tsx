import * as React from"react";
import { cn } from"@/lib/cn";
import { Separator } from"@/components/ui/separator";

const FOOTER_LINKS = [
 { label:"About", href:"/about"},
 { label:"Privacy", href:"/privacy"},
 { label:"Terms", href:"/terms"},
 { label:"Contact", href:"/contact"},
] as const;

interface FooterProps extends React.ComponentPropsWithRef<"footer"> {}

const Footer = React.forwardRef<HTMLElement, FooterProps>(
 ({ className, ...props }, ref) => {
 return (
 <footer
 ref={ref}
 className={cn("border-t bg-muted py-8", className)}
 {...props}
 >
 <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-4 px-4 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
 <p className="text-sm text-muted-foreground">
 &copy; {new Date().getFullYear()} AdmitIQ. All rights reserved.
 </p>

 <nav aria-label="Footer" className="flex items-center gap-4">
 {FOOTER_LINKS.map((link) => (
 <a
 key={link.label}
 href={link.href}
 className="text-sm text-muted-foreground transition-colors hover:text-foreground"
 >
 {link.label}
 </a>
 ))}
 </nav>
 </div>
 </footer>
 );
 }
);

Footer.displayName ="Footer";

export { Footer, FOOTER_LINKS };
export type { FooterProps };
