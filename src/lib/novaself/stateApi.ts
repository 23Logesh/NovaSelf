// ============================================================================
// Backend state API. Auth is now a bearer token the frontend stores itself
// (localStorage) and sends explicitly — NOT a cookie. Cross-site cookies
// between the Vercel frontend and Render backend were being dropped by the
// browser, which is why every /api/state call was failing with
// "not_authenticated" even right after a successful login.
// ============================================================================

import type { AppState } from "./store";

const BACKEND_URL: string =
  (import.meta.env.VITE_AUTH_BACKEND_URL as string | undefined) ?? "http://localhost:8080";

const TOKEN_STORAGE_KEY = "novaself.sessionToken";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch (err) {
    console.error("[stateApi] failed to store session token:", err);
  }
}

export function clearStoredToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Reads ?session_token=... from the current URL (set by /auth/callback),
 *  stores it, and strips it from the URL bar. Call this once on app boot,
 *  before anything else tries to use the token. */
export function captureSessionTokenFromUrl(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const token = params.get("session_token");
  if (!token) return;

  setStoredToken(token);

  // Strip session_token from the URL without a reload, keep the hash route.
  const url = new URL(window.location.href);
  url.searchParams.delete("session_token");
  window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
}

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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
  if (!getStoredToken()) return null; // no token stored — don't even ask
  try {
    const res = await fetch(`${BACKEND_URL}/auth/me`, { headers: authHeaders() });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn("[stateApi] fetchMe failed:", err);
    return null;
  }
}

/** Peek at stored state WITHOUT pushing local data. Used once at sign-in. */
export async function fetchState(): Promise<StateSyncResult | null> {
  const res = await fetch(`${BACKEND_URL}/api/state`, { method: "GET", headers: authHeaders() });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`[stateApi] fetchState failed: ${res.status}`);
  return res.json();
}

export async function syncState(localData: Record<string, unknown>): Promise<StateSyncResult | null> {
  const res = await fetch(`${BACKEND_URL}/api/state`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(localData),
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`[stateApi] syncState failed: ${res.status}`);
  return res.json();
}