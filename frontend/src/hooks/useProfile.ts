"use client";

import { useCallback, useSyncExternalStore } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export type UserProfile = {
  gmat: number | null;
  gpa: number | null;
  yoe: number | null;
  industry: string | null;
  name: string | null;
  test_type: string | null;
  target_degree: string | null;  // MBA, MiM, Executive MBA, MBA (CAT)
  target_countries: string[];
};

const STORAGE_KEY = "admit_compass_profile";
const EMPTY_PROFILE: UserProfile = { gmat: null, gpa: null, yoe: null, industry: null, name: null, test_type: null, target_degree: null, target_countries: [] };

// ── External store (enables cross-component sync) ─────────────────────────

let listeners: Array<() => void> = [];
let cachedProfile: UserProfile | null = null;

function getSnapshot(): UserProfile {
  if (cachedProfile) return cachedProfile;
  if (typeof window === "undefined") return EMPTY_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cachedProfile = raw ? { ...EMPTY_PROFILE, ...JSON.parse(raw) } : EMPTY_PROFILE;
  } catch {
    cachedProfile = EMPTY_PROFILE;
  }
  return cachedProfile!;
}

function getServerSnapshot(): UserProfile {
  return EMPTY_PROFILE;
}

function subscribe(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

function setProfile(updates: Partial<UserProfile>) {
  const current = getSnapshot();
  const next = { ...current, ...updates };
  cachedProfile = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch { /* quota exceeded - degrade gracefully */ }
  emitChange();
}

function clearProfile() {
  cachedProfile = EMPTY_PROFILE;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  emitChange();
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useProfile() {
  const profile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(updates);
  }, []);

  const resetProfile = useCallback(() => {
    clearProfile();
  }, []);

  const hasProfile = profile.gmat !== null || profile.gpa !== null || profile.yoe !== null;

  return { profile, updateProfile, resetProfile, hasProfile } as const;
}
