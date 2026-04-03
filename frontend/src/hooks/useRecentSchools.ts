"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "admit_compass_recent_schools";
const MAX_RECENT = 8;

type RecentSchool = {
  id: string;
  name: string;
  location: string;
  viewedAt: number; // timestamp
};

// ── External store ──────────────────────────────────────────────────────────

let listeners: Array<() => void> = [];
let cached: RecentSchool[] | null = null;
const EMPTY: RecentSchool[] = []; // stable reference for SSR

function getSnapshot(): RecentSchool[] {
  if (cached) return cached;
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cached = raw ? JSON.parse(raw) : EMPTY;
  } catch {
    cached = EMPTY;
  }
  return cached!;
}

function getServerSnapshot(): RecentSchool[] {
  return EMPTY;
}

function subscribe(listener: () => void): () => void {
  listeners.push(listener);

  // Listen for cross-tab localStorage changes to avoid stale cache
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cached = null; // invalidate cache so getSnapshot re-reads
      emit();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }

  return () => {
    listeners = listeners.filter((l) => l !== listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function emit() {
  for (const listener of listeners) listener();
}

function addRecent(school: Omit<RecentSchool, "viewedAt">) {
  const current = getSnapshot();
  // Remove duplicate if exists, then prepend
  const filtered = current.filter((s) => s.id !== school.id);
  const next = [{ ...school, viewedAt: Date.now() }, ...filtered].slice(0, MAX_RECENT);
  cached = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota exceeded */
  }
  emit();
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useRecentSchools() {
  const schools = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const recordView = useCallback((school: { id: string; name: string; location: string }) => {
    addRecent(school);
  }, []);

  return { recentSchools: schools, recordView } as const;
}
