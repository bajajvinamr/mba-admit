"use client";

/**
 * Global error handlers for unhandled promise rejections and uncaught errors.
 * ErrorBoundary only catches render-phase errors - this catches everything else:
 * - Failed API calls in event handlers
 * - Unhandled async/await rejections
 * - Third-party script errors
 *
 * Renders nothing. Drop into layout.tsx.
 */

import { useEffect } from "react";
import { track } from "@/lib/analytics";
import { ApiError } from "@/lib/api";
import { toast } from "@/components/Toast";

export function GlobalErrorHandler() {
  useEffect(() => {
    function onUnhandledRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      const message =
        reason instanceof Error ? reason.message : String(reason);

      // Don't report AbortError (user navigated away) or ResizeObserver (benign)
      if (
        message.includes("AbortError") ||
        message.includes("ResizeObserver")
      ) {
        return;
      }

      track("unhandled_rejection", {
        message: message.slice(0, 500),
        stack:
          reason instanceof Error
            ? (reason.stack || "").slice(0, 500)
            : "",
      });

      // Surface ApiErrors as user-facing toasts so failures aren't silent
      if (reason instanceof ApiError) {
        const label =
          reason.status === 401 ? "Please sign in to continue." :
          reason.status === 403 ? "You don't have permission for that." :
          reason.status === 404 ? "That resource wasn't found." :
          reason.status === 429 ? "Too many requests - please wait a moment." :
          reason.status >= 500 ? "Server error - please try again shortly." :
          reason.message || "Something went wrong.";
        toast.error(label);
      } else if (message.includes("timed out") || message.includes("TimeoutError")) {
        toast.error("Request timed out - please try again.");
      } else if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
        toast.error("Network error - check your connection.");
      }
    }

    function onError(event: ErrorEvent) {
      // Skip cross-origin script errors (no useful info)
      if (event.message === "Script error.") return;

      track("uncaught_error", {
        message: (event.message || "").slice(0, 500),
        filename: event.filename || "",
        line: event.lineno || 0,
        col: event.colno || 0,
      });
    }

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("error", onError);

    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("error", onError);
    };
  }, []);

  return null;
}
