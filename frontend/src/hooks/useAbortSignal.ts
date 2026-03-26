import { useEffect, useRef } from "react";

/**
 * Returns an AbortSignal that fires when the component unmounts.
 * Pass it to `apiFetch(..., { signal })` so in-flight requests
 * are cancelled on navigation, preventing setState-after-unmount.
 *
 * The signal is stable for the component's lifetime - safe to
 * reference in event handlers without adding to dependency arrays.
 */
export function useAbortSignal(): AbortSignal {
  const controllerRef = useRef<AbortController>(null!);

  // Create a new controller if none exists OR if the previous one was aborted.
  // The aborted case handles React Strict Mode: mount → cleanup (abort) → remount.
  // Without this, the remount would reuse the aborted signal and all fetches
  // would fail immediately.
  if (controllerRef.current === null || controllerRef.current.signal.aborted) {
    controllerRef.current = new AbortController();
  }

  useEffect(() => {
    return () => {
      controllerRef.current.abort();
    };
  }, []);

  return controllerRef.current.signal;
}
