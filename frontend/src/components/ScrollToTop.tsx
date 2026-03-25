"use client";

/**
 * Scroll-to-top on route change.
 * Next.js App Router doesn't always scroll to top on client-side navigation.
 * This component ensures consistent scroll behavior.
 */

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function ScrollToTop() {
  const pathname = usePathname();
  const prevPath = useRef(pathname);

  useEffect(() => {
    // Only scroll on path change (not hash or query changes)
    if (prevPath.current !== pathname) {
      window.scrollTo({ top: 0, behavior: "instant" });
      prevPath.current = pathname;
    }
  }, [pathname]);

  return null;
}
