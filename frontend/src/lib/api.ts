const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** True for 429 (rate limit) or 5xx (server error) - worth retrying. */
  get isRetryable(): boolean {
    return this.status === 429 || this.status >= 500;
  }
}

// ── Retry Configuration ───────────────────────────────────────────────────────

type RetryOptions = {
  /** Max attempts including the initial request. Default: 3 */
  maxAttempts?: number;
  /** Base delay in ms. Doubled each retry. Default: 500 */
  baseDelayMs?: number;
  /** Skip retry logic entirely. Default: false */
  noRetry?: boolean;
  /** Per-request timeout in ms. Default: 30_000 (30s). Set 0 to disable. */
  timeoutMs?: number;
};

const DEFAULT_RETRY: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelayMs: 500,
  noRetry: false,
  timeoutMs: 30_000,
};

/**
 * Sleep helper that respects Retry-After header from 429 responses.
 * Falls back to exponential backoff with jitter.
 */
function retryDelay(attempt: number, baseMs: number, retryAfter?: string | null): number {
  if (retryAfter) {
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) return seconds * 1000;
  }
  // Exponential backoff with ±25% jitter to prevent thundering herd
  const delay = baseMs * Math.pow(2, attempt);
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.min(delay + jitter, 10_000); // Cap at 10s
}

// ── Timeout Helper ────────────────────────────────────────────────────────────

/**
 * Create an AbortSignal that fires after `ms` milliseconds.
 * If the caller also passes a signal, the two are composed so either can abort.
 */
function withTimeout(
  ms: number,
  callerSignal?: AbortSignal | null,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("Request timed out", "TimeoutError")), ms);

  // If the caller's signal aborts first, propagate to our controller
  const onCallerAbort = () => controller.abort(callerSignal?.reason);
  callerSignal?.addEventListener("abort", onCallerAbort, { once: true });

  const cleanup = () => {
    clearTimeout(timer);
    callerSignal?.removeEventListener("abort", onCallerAbort);
  };

  return { signal: controller.signal, cleanup };
}

// ── Core Fetch with Retry ─────────────────────────────────────────────────────

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retry: Required<RetryOptions>,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retry.maxAttempts; attempt++) {
    // Apply per-attempt timeout if configured (compose with caller signal)
    const useTimeout = retry.timeoutMs > 0;
    const timeout = useTimeout
      ? withTimeout(retry.timeoutMs, options.signal)
      : null;
    const fetchOpts = timeout ? { ...options, signal: timeout.signal } : options;

    try {
      const res = await fetch(url, fetchOpts);
      timeout?.cleanup();

      // Success or non-retryable error → return immediately
      if (res.ok || (res.status !== 429 && res.status < 500)) {
        return res;
      }

      // Retryable error (429 or 5xx)
      if (attempt < retry.maxAttempts - 1 && !retry.noRetry) {
        const wait = retryDelay(attempt, retry.baseDelayMs, res.headers.get("Retry-After"));
        await new Promise((resolve) => setTimeout(resolve, wait));
        continue;
      }

      return res; // Last attempt - let caller handle the error
    } catch (err) {
      timeout?.cleanup();
      // Network error (offline, DNS failure, timeout)
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry if the caller aborted (navigation away) or timeout
      const isCallerAbort = options.signal?.aborted;
      if (isCallerAbort) throw lastError;

      if (attempt < retry.maxAttempts - 1 && !retry.noRetry) {
        const wait = retryDelay(attempt, retry.baseDelayMs, null);
        await new Promise((resolve) => setTimeout(resolve, wait));
        continue;
      }
    }
  }

  throw lastError || new Error("Request failed after retries");
}

// ── Error Handling ────────────────────────────────────────────────────────────

/** Parse error response and throw tracked ApiError. Never returns. */
async function throwTrackedError(res: Response, path: string): Promise<never> {
  const error = await res.json().catch(() => ({ detail: res.statusText }));
  const apiError = new ApiError(res.status, error.detail || "Unknown error", error);
  // Fire-and-forget error tracking for observability
  try {
    const { track } = await import("./analytics");
    track("api_error", { path, status: res.status, detail: String(error.detail || "").slice(0, 200) });
  } catch { /* analytics unavailable - don't block error flow */ }
  throw apiError;
}

/** Shared option destructuring + fetch-with-retry call. */
async function resolvedFetch(
  path: string,
  options?: RequestInit & RetryOptions,
): Promise<Response> {
  const { maxAttempts, baseDelayMs, noRetry, timeoutMs, ...fetchOptions } = {
    ...DEFAULT_RETRY,
    ...options,
  };
  return fetchWithRetry(
    `${API_BASE}${path}`,
    {
      ...fetchOptions,
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions.headers,
      },
    },
    { maxAttempts, baseDelayMs, noRetry, timeoutMs },
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Standard JSON fetch with error handling and automatic retry. */
export async function apiFetch<T>(
  path: string,
  options?: RequestInit & RetryOptions,
): Promise<T> {
  const res = await resolvedFetch(path, options);
  if (!res.ok) await throwTrackedError(res, path);
  return res.json();
}

/** Fetch that returns both data and response headers (for X-Total-Count etc). */
export async function apiFetchWithHeaders<T>(
  path: string,
  options?: RequestInit & RetryOptions,
): Promise<{ data: T; headers: Headers }> {
  const res = await resolvedFetch(path, options);
  if (!res.ok) await throwTrackedError(res, path);
  const data: T = await res.json();
  return { data, headers: res.headers };
}

/**
 * Fetch a Server-Sent Events (SSE) stream endpoint.
 * Calls `onEvent` for each parsed SSE `data:` line.
 * Returns when the stream closes.
 */
export async function fetchSSE(
  path: string,
  options: RequestInit & { timeoutMs?: number },
  onEvent: (event: Record<string, unknown>) => void,
): Promise<void> {
  const { timeoutMs = 60_000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timer = timeoutMs > 0
    ? setTimeout(() => controller.abort(new DOMException("SSE timed out", "TimeoutError")), timeoutMs)
    : null;

  // Compose with caller signal
  if (fetchOptions.signal) {
    fetchOptions.signal.addEventListener("abort", () => controller.abort(fetchOptions.signal?.reason), { once: true });
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions.headers,
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new ApiError(res.status, error.detail || "Stream error", error);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body for SSE stream");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE lines
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            onEvent(parsed);
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim().startsWith("data: ")) {
      try {
        const parsed = JSON.parse(buffer.trim().slice(6));
        onEvent(parsed);
      } catch {
        // Skip
      }
    }
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export { API_BASE };
