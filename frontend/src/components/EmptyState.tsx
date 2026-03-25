import Link from"next/link";
import { Inbox, type LucideIcon } from"lucide-react";

type EmptyStateProps = {
 icon?: LucideIcon;
 title: string;
 description?: string;
 action?: { href: string; label: string };
};

/**
 * Reusable empty state component - consistent across all tool pages.
 *
 * Usage:
 * <EmptyState
 * icon={FileText}
 * title="No essays yet"
 * description="Start writing to see your essay drafts here."
 * action={{ href:"/evaluator", label:"Write an essay"}}
 * />
 */
export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
 return (
 <div className="flex flex-col items-center justify-center py-16 text-center" role="status">
 <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center mb-4">
 <Icon size={20} className="text-muted-foreground"/>
 </div>
 <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
 {description && <p className="text-xs text-muted-foreground max-w-xs">{description}</p>}
 {action && (
 <Link
 href={action.href}
 className="mt-4 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
 >
 {action.label} →
 </Link>
 )}
 </div>
 );
}
