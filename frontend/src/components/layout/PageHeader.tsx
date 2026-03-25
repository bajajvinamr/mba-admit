import * as React from"react";
import { cva, type VariantProps } from"class-variance-authority";
import { cn } from"@/lib/cn";
import { ChevronRight } from"lucide-react";

const pageHeaderVariants = cva("flex flex-col gap-1", {
 variants: {
 size: {
 default:"pb-6",
 sm:"pb-4",
 lg:"pb-8",
 },
 },
 defaultVariants: {
 size:"default",
 },
});

interface Breadcrumb {
 label: string;
 href?: string;
}

interface PageHeaderProps
 extends React.ComponentPropsWithRef<"header">,
 VariantProps<typeof pageHeaderVariants> {
 title: string;
 description?: string;
 breadcrumbs?: Breadcrumb[];
 actions?: React.ReactNode;
}

const PageHeader = React.forwardRef<HTMLElement, PageHeaderProps>(
 ({ className, title, description, breadcrumbs, actions, size, ...props }, ref) => {
 return (
 <header
 ref={ref}
 className={cn(pageHeaderVariants({ size }), className)}
 {...props}
 >
 {breadcrumbs && breadcrumbs.length > 0 && (
 <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
 {breadcrumbs.map((crumb, i) => (
 <React.Fragment key={crumb.label}>
 {i > 0 && <ChevronRight className="size-3.5"/>}
 {crumb.href ? (
 <a
 href={crumb.href}
 className="transition-colors hover:text-foreground"
 >
 {crumb.label}
 </a>
 ) : (
 <span className="text-foreground">{crumb.label}</span>
 )}
 </React.Fragment>
 ))}
 </nav>
 )}

 <div className="flex items-start justify-between gap-4">
 <div className="flex flex-col gap-1">
 <h1 className="heading-1 text-foreground">{title}</h1>
 {description && (
 <p className="text-sm text-muted-foreground max-w-2xl">
 {description}
 </p>
 )}
 </div>

 {actions && (
 <div className="flex shrink-0 items-center gap-2">{actions}</div>
 )}
 </div>
 </header>
 );
 }
);

PageHeader.displayName ="PageHeader";

export { PageHeader, pageHeaderVariants };
export type { PageHeaderProps, Breadcrumb };
