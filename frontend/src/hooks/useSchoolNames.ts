/**
 * Hook to fetch the lightweight school names list for dropdowns.
 * Uses /api/schools/names which returns only {id, name, country}.
 * Shared across 8+ pages to avoid duplicate fetch logic.
 */

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

export type SchoolName = {
  id: string;
  name: string;
  country?: string;
};

let cachedSchools: SchoolName[] | null = null;

export function useSchoolNames() {
  const [schools, setSchools] = useState<SchoolName[]>(cachedSchools || []);
  const [loading, setLoading] = useState(!cachedSchools);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Already cached from a previous mount - initial state handles it
    if (cachedSchools) return;

    apiFetch<SchoolName[]>(`/api/schools/names`)
      .then((data) => {
        cachedSchools = data;
        setSchools(data);
      })
      .catch(e => {
        console.error(e);
        setError("Failed to load school list");
      })
      .finally(() => setLoading(false));
  }, []);

  return { schools, loading, error };
}
