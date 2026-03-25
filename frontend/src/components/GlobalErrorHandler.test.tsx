import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { GlobalErrorHandler } from "./GlobalErrorHandler";
import { ApiError } from "@/lib/api";

// Mock analytics to avoid side effects
vi.mock("@/lib/analytics", () => ({
  track: vi.fn(),
}));

// Mock toast to capture messages
const mockToastError = vi.fn();
vi.mock("@/components/Toast", () => ({
  toast: {
    success: vi.fn(),
    error: (...args: unknown[]) => mockToastError(...args),
    info: vi.fn(),
  },
}));

describe("GlobalErrorHandler", () => {
  let originalListeners: {
    unhandledrejection: ((e: PromiseRejectionEvent) => void)[];
    error: ((e: ErrorEvent) => void)[];
  };

  beforeEach(() => {
    mockToastError.mockClear();
    // Track original listeners
    originalListeners = { unhandledrejection: [], error: [] };
  });

  afterEach(() => {
    cleanup();
  });

  it("renders nothing", () => {
    const { container } = render(<GlobalErrorHandler />);
    expect(container.innerHTML).toBe("");
  });

  it("shows toast for 401 ApiError on unhandled rejection", () => {
    render(<GlobalErrorHandler />);
    const event = new Event("unhandledrejection") as PromiseRejectionEvent;
    Object.defineProperty(event, "reason", {
      value: new ApiError(401, "Unauthorized"),
    });
    window.dispatchEvent(event);
    expect(mockToastError).toHaveBeenCalledWith("Please sign in to continue.");
  });

  it("shows toast for 429 ApiError", () => {
    render(<GlobalErrorHandler />);
    const event = new Event("unhandledrejection") as PromiseRejectionEvent;
    Object.defineProperty(event, "reason", {
      value: new ApiError(429, "Rate limited"),
    });
    window.dispatchEvent(event);
    expect(mockToastError).toHaveBeenCalledWith(
      "Too many requests — please wait a moment.",
    );
  });

  it("shows toast for 500 ApiError", () => {
    render(<GlobalErrorHandler />);
    const event = new Event("unhandledrejection") as PromiseRejectionEvent;
    Object.defineProperty(event, "reason", {
      value: new ApiError(500, "Internal Server Error"),
    });
    window.dispatchEvent(event);
    expect(mockToastError).toHaveBeenCalledWith(
      "Server error — please try again shortly.",
    );
  });

  it("shows toast for timeout errors", () => {
    render(<GlobalErrorHandler />);
    const event = new Event("unhandledrejection") as PromiseRejectionEvent;
    Object.defineProperty(event, "reason", {
      value: new DOMException("Request timed out", "TimeoutError"),
    });
    window.dispatchEvent(event);
    expect(mockToastError).toHaveBeenCalledWith(
      "Request timed out — please try again.",
    );
  });

  it("shows toast for network errors", () => {
    render(<GlobalErrorHandler />);
    const event = new Event("unhandledrejection") as PromiseRejectionEvent;
    Object.defineProperty(event, "reason", {
      value: new TypeError("Failed to fetch"),
    });
    window.dispatchEvent(event);
    expect(mockToastError).toHaveBeenCalledWith(
      "Network error — check your connection.",
    );
  });

  it("ignores AbortError (user navigated away)", () => {
    render(<GlobalErrorHandler />);
    const event = new Event("unhandledrejection") as PromiseRejectionEvent;
    Object.defineProperty(event, "reason", {
      value: new DOMException("The operation was aborted.", "AbortError"),
    });
    window.dispatchEvent(event);
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("ignores ResizeObserver errors", () => {
    render(<GlobalErrorHandler />);
    const event = new Event("unhandledrejection") as PromiseRejectionEvent;
    Object.defineProperty(event, "reason", {
      value: new Error("ResizeObserver loop completed with undelivered notifications."),
    });
    window.dispatchEvent(event);
    expect(mockToastError).not.toHaveBeenCalled();
  });
});
