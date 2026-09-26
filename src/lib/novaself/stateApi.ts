// ============================================================================
// Backend state API — the ONLY thing the frontend talks to for saving or
// loading data now. No Google token, no Sheets calls, no client-side merge
// logic — all of that moved server-side (StateController / StateMergeService).
// ============================================================================

import type { AppState } from "./store";

const BACKEND_URL: string =
  (import.meta.env.VITE_AUTH_BACKEND_URL as string | undefined) ?? "http://localhost:8080";

export interface MeResult {
  googleUserId: string;
  email: string;
  name: string;
  pictureUrl?: string;
}

export interface StateSyncResult {
  data: Partial<AppState>;
  lastModified: number;
  isNewlyCreated: boolean;
}

/** Fields that live in Drive. signedIn/onboarded/googleAccount are local/session-derived and never sent. */
const SYNCABLE_FIELDS = [
  "profile", "profileUpdatedAt", "settings", "settingsUpdatedAt",
  "days", "dietPhases", "mess", "workoutPhases",
  "skinLogs", "sleepLogs", "supplements", "intakes",
  "books", "readingSessions", "chat",
] as const satisfies readonly (keyof AppState)[];

export function pickSyncable(state: AppState): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of SYNCABLE_FIELDS) out[key] = state[key];
  return out;
}

export async function fetchMe(): Promise<MeResult | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/auth/me`, { credentials: "include" });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn("[stateApi] fetchMe failed:", err);
    return null;
  }
}

/** Peek at stored state WITHOUT pushing local data. Used once at sign-in. */
export async function fetchState(): Promise<StateSyncResult | null> {
  const res = await fetch(`${BACKEND_URL}/api/state`, { method: "GET", credentials: "include" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`[stateApi] fetchState failed: ${res.status}`);
  return res.json();
}

/** Push local state; backend merges it with what's currently stored (under a
 *  per-user lock) and returns the reconciled truth. Safe to call from
 *  autosave, on focus, on an interval — always merges, never overwrites blindly. */
export async function syncState(localData: Record<string, unknown>): Promise<StateSyncResult | null> {
  const res = await fetch(`${BACKEND_URL}/api/state`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(localData),
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`[stateApi] syncState failed: ${res.status}`);
  return res.json();
}