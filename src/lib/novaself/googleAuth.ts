// ============================================================================
// Sign-in / sign-out for the NovaSelf OAuth-proxy backend.
// ============================================================================

import { clearStoredToken, getStoredToken } from "./stateApi";

const BACKEND_URL: string =
  (import.meta.env.VITE_AUTH_BACKEND_URL as string | undefined) ?? "http://localhost:8080";

/** Full-page redirect into the backend's OAuth login flow. */
export function goToGoogleLogin(): void {
  window.location.href = `${BACKEND_URL}/auth/login`;
}

/** Revokes the refresh token at Google (best-effort) and clears the local token. */
export async function signOutOfGoogle(): Promise<void> {
  const token = getStoredToken();
  try {
    if (token) {
      await fetch(`${BACKEND_URL}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch (err) {
    console.warn("[googleAuth] signOutOfGoogle: backend logout call failed (clearing local token anyway):", err);
  } finally {
    clearStoredToken();
  }
}