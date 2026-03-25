import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAbortSignal } from "./useAbortSignal";

describe("useAbortSignal", () => {
  it("returns an AbortSignal", () => {
    const { result } = renderHook(() => useAbortSignal());
    expect(result.current).toBeInstanceOf(AbortSignal);
    expect(result.current.aborted).toBe(false);
  });

  it("returns the same signal across re-renders", () => {
    const { result, rerender } = renderHook(() => useAbortSignal());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it("aborts the signal on unmount", () => {
    const { result, unmount } = renderHook(() => useAbortSignal());
    expect(result.current.aborted).toBe(false);
    unmount();
    expect(result.current.aborted).toBe(true);
  });

  it("signal is usable with addEventListener", () => {
    const { result, unmount } = renderHook(() => useAbortSignal());
    let fired = false;
    result.current.addEventListener("abort", () => { fired = true; });
    unmount();
    expect(fired).toBe(true);
  });
});
