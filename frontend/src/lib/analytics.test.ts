import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("analytics", () => {
  let track: typeof import("./analytics").track;
  let trackPageView: typeof import("./analytics").trackPageView;

  beforeEach(async () => {
    vi.useFakeTimers();
    // Reset module state by re-importing with cache busted
    vi.resetModules();
    const mod = await import("./analytics");
    track = mod.track;
    trackPageView = mod.trackPageView;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("track() queues events without immediate side effects", () => {
    const spy = vi.spyOn(console, "debug").mockImplementation(() => {});
    track("test_event", { key: "value" });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("flushes events after 1s debounce", () => {
    const spy = vi.spyOn(console, "debug").mockImplementation(() => {});
    track("flush_test", { x: 1 });
    vi.advanceTimersByTime(1100);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("flush_test"),
      expect.objectContaining({ x: 1 }),
    );
    spy.mockRestore();
  });

  it("batches multiple events in one flush", () => {
    const spy = vi.spyOn(console, "debug").mockImplementation(() => {});
    track("event_a", {});
    track("event_b", {});
    track("event_c", {});
    vi.advanceTimersByTime(1100);
    expect(spy).toHaveBeenCalledTimes(3);
    spy.mockRestore();
  });

  it("trackPageView sends page_view event", () => {
    const spy = vi.spyOn(console, "debug").mockImplementation(() => {});
    trackPageView("/schools");
    vi.advanceTimersByTime(1100);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("page_view"),
      expect.objectContaining({ path: "/schools" }),
    );
    spy.mockRestore();
  });

  it("includes url and referrer in event properties", () => {
    const spy = vi.spyOn(console, "debug").mockImplementation(() => {});
    track("prop_test", { foo: "bar" });
    vi.advanceTimersByTime(1100);
    expect(spy).toHaveBeenCalled();
    const [, props] = spy.mock.calls[0];
    expect(props).toHaveProperty("url");
    expect(props).toHaveProperty(" referrer");
    spy.mockRestore();
  });
});
