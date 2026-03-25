import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUsage, FEATURE_LIMITS } from "./useUsage";

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { Object.keys(store).forEach((k) => delete store[k]); }),
  get length() { return Object.keys(store).length; },
  key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("useUsage", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("starts with 0 usage on free tier", () => {
    const { result } = renderHook(() => useUsage("essay_evaluator"));
    expect(result.current.usageCount).toBe(0);
    expect(result.current.tier).toBe("free");
    expect(result.current.isAtLimit).toBe(false);
  });

  it("reports correct remaining uses for free tier", () => {
    const { result } = renderHook(() => useUsage("odds_calculator"));
    const freeLimit = FEATURE_LIMITS.odds_calculator.free;
    expect(result.current.remaining).toBe(freeLimit);
    expect(result.current.limit).toBe(freeLimit);
  });

  it("records a use and decrements remaining", () => {
    const { result } = renderHook(() => useUsage("essay_evaluator"));
    const freeLimit = FEATURE_LIMITS.essay_evaluator.free; // 1

    act(() => { result.current.recordUse(); });

    expect(result.current.usageCount).toBe(1);
    expect(result.current.remaining).toBe(Math.max(0, freeLimit - 1));
  });

  it("detects when at limit (essay_evaluator free = 1 use)", () => {
    const { result } = renderHook(() => useUsage("essay_evaluator"));

    act(() => { result.current.recordUse(); });

    expect(result.current.isAtLimit).toBe(true);
    expect(result.current.upgradeNeeded).toBe("pro");
  });

  it("odds_calculator allows 3 daily uses on free tier", () => {
    const { result } = renderHook(() => useUsage("odds_calculator"));

    act(() => { result.current.recordUse(); });
    expect(result.current.isAtLimit).toBe(false);
    expect(result.current.remaining).toBe(2);

    act(() => { result.current.recordUse(); });
    expect(result.current.remaining).toBe(1);

    act(() => { result.current.recordUse(); });
    expect(result.current.isAtLimit).toBe(true);
    expect(result.current.upgradeNeeded).toBe("pro");
  });

  it("reads tier from localStorage", () => {
    store["ac_tier"] = "pro";
    const { result } = renderHook(() => useUsage("essay_evaluator"));
    expect(result.current.tier).toBe("pro");
    expect(result.current.limit).toBe(10); // pro limit for essay_evaluator
  });

  it("premium tier is unlimited", () => {
    store["ac_tier"] = "premium";
    const { result } = renderHook(() => useUsage("essay_evaluator"));
    expect(result.current.isUnlimited).toBe(true);
    expect(result.current.remaining).toBe(Infinity);
    expect(result.current.isAtLimit).toBe(false);
  });

  it("persists usage across re-renders", () => {
    const { result, rerender } = renderHook(() => useUsage("odds_calculator"));

    act(() => { result.current.recordUse(); });
    rerender();

    expect(result.current.usageCount).toBe(1);
  });

  it("resets expired usage (simulate past resetAt)", () => {
    // Manually set expired usage in storage
    const expired = {
      odds_calculator: { count: 3, resetAt: Date.now() - 1000 },
    };
    store["ac_usage"] = JSON.stringify(expired);

    const { result } = renderHook(() => useUsage("odds_calculator"));
    expect(result.current.usageCount).toBe(0); // should reset
  });

  it("returns correct period per feature", () => {
    const { result: daily } = renderHook(() => useUsage("odds_calculator"));
    expect(daily.current.period).toBe("day");

    const { result: monthly } = renderHook(() => useUsage("essay_evaluator"));
    expect(monthly.current.period).toBe("month");
  });

  // ── Pro → Premium upgrade path ──────────────────────────────────────────

  it("pro user at limit gets upgradeNeeded='premium'", () => {
    store["ac_tier"] = "pro";
    const { result } = renderHook(() => useUsage("storyteller"));
    // storyteller pro limit = 5
    for (let i = 0; i < 5; i++) {
      act(() => { result.current.recordUse(); });
    }
    expect(result.current.isAtLimit).toBe(true);
    expect(result.current.upgradeNeeded).toBe("premium");
  });

  it("premium user never gets upgradeNeeded", () => {
    store["ac_tier"] = "premium";
    const { result } = renderHook(() => useUsage("storyteller"));
    expect(result.current.upgradeNeeded).toBeNull();
    expect(result.current.isUnlimited).toBe(true);
  });

  // ── New feature keys (waitlist, roi, scholarship_negotiator) ────────────

  it("waitlist_strategy has correct free limits", () => {
    const { result } = renderHook(() => useUsage("waitlist_strategy"));
    expect(result.current.limit).toBe(1);
    expect(result.current.period).toBe("month");
    expect(result.current.featureLabel).toBe("Waitlist Strategy");
  });

  it("roi_calculator has correct free limits", () => {
    const { result } = renderHook(() => useUsage("roi_calculator"));
    expect(result.current.limit).toBe(2);
    expect(result.current.period).toBe("month");
    expect(result.current.featureLabel).toBe("ROI Calculator");
  });

  it("scholarship_negotiator has correct free limits", () => {
    const { result } = renderHook(() => useUsage("scholarship_negotiator"));
    expect(result.current.limit).toBe(1);
    expect(result.current.period).toBe("month");
    expect(result.current.featureLabel).toBe("Scholarship Negotiator");
  });

  it("roi_calculator is unlimited for pro users", () => {
    store["ac_tier"] = "pro";
    const { result } = renderHook(() => useUsage("roi_calculator"));
    expect(result.current.isUnlimited).toBe(true);
  });

  // ── Edge cases ──────────────────────────────────────────────────────────

  it("handles corrupted localStorage gracefully", () => {
    store["ac_usage"] = "not-json";
    const { result } = renderHook(() => useUsage("odds_calculator"));
    expect(result.current.usageCount).toBe(0);
  });

  it("ignores invalid tier values", () => {
    store["ac_tier"] = "enterprise";
    const { result } = renderHook(() => useUsage("odds_calculator"));
    // Should fall back to free since "enterprise" is not a valid tier
    expect(result.current.tier).toBe("free");
  });

  it("remaining never goes below 0", () => {
    const { result } = renderHook(() => useUsage("essay_evaluator"));
    // essay_evaluator free limit = 1
    act(() => { result.current.recordUse(); });
    act(() => { result.current.recordUse(); }); // over-use
    expect(result.current.remaining).toBe(0);
    expect(result.current.remaining).toBeGreaterThanOrEqual(0);
  });

  it("featureLabel matches FEATURE_LIMITS config", () => {
    const keys = Object.keys(FEATURE_LIMITS) as Array<keyof typeof FEATURE_LIMITS>;
    keys.forEach((key) => {
      const { result } = renderHook(() => useUsage(key));
      expect(result.current.featureLabel).toBe(FEATURE_LIMITS[key].label);
    });
  });

  // ── All 19 features are configured ─────────────────────────────────────

  it("FEATURE_LIMITS has exactly 19 features", () => {
    expect(Object.keys(FEATURE_LIMITS)).toHaveLength(19);
  });
});
