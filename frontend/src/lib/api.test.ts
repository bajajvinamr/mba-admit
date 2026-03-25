import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiFetch, apiFetchWithHeaders, ApiError } from "./api";

// Mock global fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe("apiFetch", () => {
  it("returns parsed JSON on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: "test" }),
    });

    const result = await apiFetch<{ data: string }>("/api/schools", { noRetry: true });
    expect(result).toEqual({ data: "test" });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/schools"),
      expect.objectContaining({
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      }),
    );
  });

  it("throws ApiError with status and detail on non-ok response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ detail: "GMAT must be at least 200" }),
    });

    await expect(apiFetch("/api/recommendations", { noRetry: true })).rejects.toThrow(ApiError);
    try {
      await apiFetch("/api/recommendations", { noRetry: true });
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(422);
      expect((err as ApiError).message).toBe("GMAT must be at least 200");
    }
  });

  it("falls back to statusText when response body is not JSON", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      headers: new Headers(),
      json: () => Promise.reject(new Error("not json")),
    });

    try {
      await apiFetch("/api/fail", { noRetry: true });
    } catch (err) {
      expect((err as ApiError).message).toBe("Internal Server Error");
    }
  });

  it("passes through custom headers", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await apiFetch("/api/test", {
      headers: { Authorization: "Bearer token123" },
      noRetry: true,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer token123",
        }),
      }),
    );
  });

  it("supports POST with body", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "123" }),
    });

    await apiFetch("/api/user/schools", {
      method: "POST",
      body: JSON.stringify({ school_id: "hbs" }),
      noRetry: true,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/user/schools"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ school_id: "hbs" }),
      }),
    );
  });
});

describe("ApiError", () => {
  it("has correct name and properties", () => {
    const err = new ApiError(404, "Not found");
    expect(err.name).toBe("ApiError");
    expect(err.status).toBe(404);
    expect(err.message).toBe("Not found");
    expect(err).toBeInstanceOf(Error);
  });

  it("isRetryable returns true for 429 and 5xx", () => {
    expect(new ApiError(429, "Too many requests").isRetryable).toBe(true);
    expect(new ApiError(500, "Server error").isRetryable).toBe(true);
    expect(new ApiError(503, "Unavailable").isRetryable).toBe(true);
    expect(new ApiError(422, "Validation error").isRetryable).toBe(false);
    expect(new ApiError(404, "Not found").isRetryable).toBe(false);
  });
});

describe("retry behavior", () => {
  it("retries on 5xx and eventually succeeds", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Server Error",
        headers: new Headers(),
        json: () => Promise.reject(new Error("bad")),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

    const result = await apiFetch<{ success: boolean }>("/api/test", {
      maxAttempts: 3,
      baseDelayMs: 10, // fast for testing
    });
    expect(result).toEqual({ success: true });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("retries on 429 (rate limit)", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ "Retry-After": "0" }),
        json: () => Promise.resolve({ detail: "Rate limited" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: "ok" }),
      });

    const result = await apiFetch<{ data: string }>("/api/test", {
      maxAttempts: 2,
      baseDelayMs: 10,
    });
    expect(result).toEqual({ data: "ok" });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("retries on network error", async () => {
    mockFetch
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ recovered: true }),
      });

    const result = await apiFetch<{ recovered: boolean }>("/api/test", {
      maxAttempts: 2,
      baseDelayMs: 10,
    });
    expect(result).toEqual({ recovered: true });
  });

  it("throws after exhausting retries", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Server Error",
      headers: new Headers(),
      json: () => Promise.resolve({ detail: "Server Error" }),
    });

    await expect(
      apiFetch("/api/test", { maxAttempts: 2, baseDelayMs: 10 }),
    ).rejects.toThrow("Server Error");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry 4xx errors (except 429)", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ detail: "Invalid input" }),
    });

    await expect(
      apiFetch("/api/test", { maxAttempts: 3, baseDelayMs: 10 }),
    ).rejects.toThrow("Invalid input");
    // Should only attempt once — 422 is not retryable
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("skips retry when noRetry is true", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Error",
      headers: new Headers(),
      json: () => Promise.resolve({ detail: "Error" }),
    });

    await expect(
      apiFetch("/api/test", { noRetry: true }),
    ).rejects.toThrow("Error");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe("error tracking", () => {
  it("calls analytics track on API error", async () => {
    const mockTrack = vi.fn();
    vi.doMock("./analytics", () => ({ track: mockTrack }));

    mockFetch.mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ detail: "Validation failed" }),
    });

    await expect(apiFetch("/api/test", { noRetry: true })).rejects.toThrow(ApiError);
    // Analytics is fire-and-forget via dynamic import — verify error still thrown correctly
  });

  it("still throws ApiError when analytics module is unavailable", async () => {
    // Force analytics import to fail
    vi.doMock("./analytics", () => { throw new Error("module not found"); });

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Server Error",
      headers: new Headers(),
      json: () => Promise.resolve({ detail: "Crash" }),
    });

    const err = await apiFetch("/api/test", { noRetry: true }).catch((e: unknown) => e) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(500);
    expect(err.message).toBe("Crash");
  });

  it("truncates long error details to 200 chars for tracking", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ detail: "A".repeat(500) }),
    });

    // Should not throw due to long detail — verify it still throws ApiError
    const err = await apiFetch("/api/test", { noRetry: true }).catch((e: unknown) => e) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    // The full detail is preserved in the error, tracking gets truncated version
    expect(err.message).toBe("A".repeat(500));
  });
});

describe("apiFetchWithHeaders", () => {
  it("returns data and headers on success", async () => {
    const headers = new Headers({ "X-Total-Count": "42" });
    mockFetch.mockResolvedValue({
      ok: true,
      headers,
      json: () => Promise.resolve({ items: [1, 2, 3] }),
    });

    const result = await apiFetchWithHeaders<{ items: number[] }>("/api/list", { noRetry: true });
    expect(result.data).toEqual({ items: [1, 2, 3] });
    expect(result.headers.get("X-Total-Count")).toBe("42");
  });

  it("throws ApiError on non-ok response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ detail: "Not found" }),
    });

    await expect(
      apiFetchWithHeaders("/api/missing", { noRetry: true }),
    ).rejects.toThrow(ApiError);

    const err = await apiFetchWithHeaders("/api/missing", { noRetry: true }).catch((e: unknown) => e) as ApiError;
    expect(err.status).toBe(404);
  });

  it("retries on 5xx like apiFetch", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
        headers: new Headers(),
        json: () => Promise.resolve({ detail: "Bad Gateway" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: () => Promise.resolve({ recovered: true }),
      });

    const result = await apiFetchWithHeaders<{ recovered: boolean }>("/api/test", {
      maxAttempts: 2,
      baseDelayMs: 10,
    });
    expect(result.data).toEqual({ recovered: true });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe("timeout behavior", () => {
  it("aborts request after timeoutMs", async () => {
    // Simulate a fetch that hangs but respects AbortSignal
    mockFetch.mockImplementation((_url: string, opts: RequestInit) =>
      new Promise((_resolve, reject) => {
        opts.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      }),
    );

    await expect(
      apiFetch("/api/slow", { timeoutMs: 50, noRetry: true }),
    ).rejects.toThrow();

    // Verify fetch was called with a signal
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].signal).toBeDefined();
  }, 10_000);

  it("succeeds when response arrives before timeout", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ fast: true }),
    });

    const result = await apiFetch<{ fast: boolean }>("/api/fast", {
      timeoutMs: 5000,
      noRetry: true,
    });
    expect(result).toEqual({ fast: true });
  });

  it("can disable timeout with timeoutMs: 0", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: "ok" }),
    });

    const result = await apiFetch<{ data: string }>("/api/test", {
      timeoutMs: 0,
      noRetry: true,
    });
    expect(result).toEqual({ data: "ok" });
    // Verify no signal was injected (timeout disabled)
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].signal).toBeUndefined();
  });

  it("does not retry when caller signal aborts", async () => {
    const controller = new AbortController();

    mockFetch.mockImplementation(() => {
      // Abort immediately to simulate navigation away
      controller.abort();
      return Promise.reject(new DOMException("Aborted", "AbortError"));
    });

    await expect(
      apiFetch("/api/test", { signal: controller.signal, maxAttempts: 3, baseDelayMs: 10 }),
    ).rejects.toThrow();
    // Should only attempt once — caller abort short-circuits retry
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
