"use client";

import React, { Component, type ReactNode } from"react";
import { track } from"@/lib/analytics";

interface ErrorBoundaryProps {
 children: ReactNode;
 fallback?: ReactNode;
}

interface ErrorBoundaryState {
 hasError: boolean;
 error: Error | null;
}

/**
 * React Error Boundary - catches render errors in child components.
 * Must be a class component (React limitation).
 *
 * Usage:
 * <ErrorBoundary>
 * <MyComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
 constructor(props: ErrorBoundaryProps) {
 super(props);
 this.state = { hasError: false, error: null };
 }

 static getDerivedStateFromError(error: Error): ErrorBoundaryState {
 return { hasError: true, error };
 }

 componentDidCatch(error: Error, info: React.ErrorInfo) {
 console.error("ErrorBoundary caught:", error, info.componentStack);
 // Report to analytics pipeline for production monitoring
 track("error_boundary", {
 message: error.message,
 name: error.name,
 stack: (error.stack ||"").slice(0, 500),
 component: (info.componentStack ||"").slice(0, 200),
 });
 }

 render() {
 if (this.state.hasError) {
 if (this.props.fallback) return this.props.fallback;
 return <ErrorFallback error={this.state.error} onRetry={() => this.setState({ hasError: false, error: null })} />;
 }
 return this.props.children;
 }
}

interface ErrorFallbackProps {
 error: Error | null;
 onRetry?: () => void;
}

export function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
 return (
 <div className="min-h-[300px] flex items-center justify-center px-8">
 <div className="text-center max-w-md">
 <div className="inline-flex items-center justify-center w-14 h-14 bg-red-50 text-red-600 rounded-full mb-6">
 <svg width="24" height="24"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2">
 <circle cx="12"cy="12"r="10"/>
 <line x1="12"y1="8"x2="12"y2="12"/>
 <line x1="12"y1="16"x2="12.01"y2="16"/>
 </svg>
 </div>
 <h2 className="heading-serif text-2xl mb-3 text-foreground">Something went wrong</h2>
 <p className="text-sm text-muted-foreground/60 mb-6">
 {error?.message ||"An unexpected error occurred. Please try again."}
 </p>
 {onRetry && (
 <button
 onClick={onRetry}
 className="bg-foreground text-white px-6 py-2.5 text-sm font-bold hover:bg-foreground/90 transition-colors"
 >
 Try Again
 </button>
 )}
 </div>
 </div>
 );
}
