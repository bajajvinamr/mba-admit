import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";

// Mock framer-motion so AnimatePresence exit animations don't block DOM removal
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      initial: _i,
      animate: _a,
      exit: _e,
      transition: _t,
      ...rest
    }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <div {...rest}>{children}</div>
    ),
  },
}));

import { toast, ToastContainer } from "./Toast";

describe("Toast system", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Flush any pending dismiss timers to clean module-level state
    act(() => {
      vi.runAllTimers();
    });
    vi.useRealTimers();
    cleanup();
  });

  it("renders nothing when no toasts", () => {
    const { container } = render(<ToastContainer />);
    // AnimatePresence wrapper exists but no toast items
    expect(container.querySelectorAll("[class*=flex]").length).toBeLessThanOrEqual(1);
  });

  it("toast.success shows a success toast", () => {
    render(<ToastContainer />);
    act(() => {
      toast.success("Operation completed");
    });
    expect(screen.getByText("Operation completed")).toBeDefined();
  });

  it("toast.error shows an error toast", () => {
    render(<ToastContainer />);
    act(() => {
      toast.error("Something failed");
    });
    expect(screen.getByText("Something failed")).toBeDefined();
  });

  it("toast.info shows an info toast", () => {
    render(<ToastContainer />);
    act(() => {
      toast.info("FYI this happened");
    });
    expect(screen.getByText("FYI this happened")).toBeDefined();
  });

  it("auto-dismisses after default duration", () => {
    render(<ToastContainer />);
    act(() => {
      toast.success("Fleeting message");
    });
    expect(screen.getByText("Fleeting message")).toBeDefined();

    // Default success duration is 3000ms
    act(() => {
      vi.advanceTimersByTime(3500);
    });
    expect(screen.queryByText("Fleeting message")).toBeNull();
  });

  it("error toasts last longer (5000ms default)", () => {
    render(<ToastContainer />);
    act(() => {
      toast.error("Error persists");
    });

    // Still visible at 3.5s
    act(() => {
      vi.advanceTimersByTime(3500);
    });
    expect(screen.getByText("Error persists")).toBeDefined();

    // Gone at 5.5s
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByText("Error persists")).toBeNull();
  });

  it("supports custom duration", () => {
    render(<ToastContainer />);
    act(() => {
      toast.success("Quick flash", 1000);
    });
    expect(screen.getByText("Quick flash")).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.queryByText("Quick flash")).toBeNull();
  });

  it("shows multiple toasts simultaneously", () => {
    render(<ToastContainer />);
    act(() => {
      toast.success("First");
      toast.error("Second");
      toast.info("Third");
    });
    expect(screen.getByText("First")).toBeDefined();
    expect(screen.getByText("Second")).toBeDefined();
    expect(screen.getByText("Third")).toBeDefined();
  });
});
