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

  // Lazy-init so we don't create a new controller on every render
  if (controllerRef.current === null) {
    controllerRef.current = new AbortController();
  }

  useEffect(() => {
    return () => {
      controllerRef.current.abort();
    };
  }, []);

  return controllerRef.current.signal;
}
