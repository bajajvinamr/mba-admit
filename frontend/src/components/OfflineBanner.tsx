"use client";

import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Floating banner that appears when the browser goes offline.
 * Auto-dismisses 2s after reconnection to confirm recovery.
 */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Don't run on server
    if (typeof window === "undefined") return;

    const handleOffline = () => {
      setIsOffline(true);
      setWasOffline(true);
    };
    const handleOnline = () => {
      setIsOffline(false);
      // Keep "Back online" message for 2s then dismiss
      setTimeout(() => setWasOffline(false), 2000);
    };

    // Check initial state
    if (!navigator.onLine) {
      setIsOffline(true);
      setWasOffline(true);
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const show = isOffline || wasOffline;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={`fixed top-0 left-0 right-0 z-[200] px-4 py-2.5 text-center text-sm font-medium ${
            isOffline
              ? "bg-red-600 text-white"
              : "bg-emerald-600 text-white"
          }`}
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center justify-center gap-2">
            {isOffline ? (
              <>
                <WifiOff size={16} />
                <span>You&apos;re offline. Some features may be unavailable.</span>
              </>
            ) : (
              <>
                <span>Back online</span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
