import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "./useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 300));
    expect(result.current).toBe("hello");
  });

  it("does not update before delay", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "ab" });
    act(() => { vi.advanceTimersByTime(100); });
    // Still the old value
    expect(result.current).toBe("a");
  });

  it("updates after delay", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "ab" });
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe("ab");
  });

  it("resets timer on rapid changes", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "a" } },
    );

    // Type rapidly
    rerender({ value: "ab" });
    act(() => { vi.advanceTimersByTime(200); });
    rerender({ value: "abc" });
    act(() => { vi.advanceTimersByTime(200); });
    rerender({ value: "abcd" });
    act(() => { vi.advanceTimersByTime(200); });

    // Only 200ms since last change — still old
    expect(result.current).toBe("a");

    // Wait full delay after last change
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe("abcd");
  });

  it("works with default delay (300ms)", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 0 } },
    );

    rerender({ value: 42 });
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe(42);
  });
});
