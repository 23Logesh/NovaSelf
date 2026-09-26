// ============================================================================
// Auth client for the NovaSelf OAuth-proxy backend (Spring Boot on Render).
// ============================================================================
//
// ARCHITECTURE (replaces the old zero-backend GIS implicit-token flow):
// - Sign-in is a full-page redirect: browser -> our backend /auth/login ->
//   Google consent -> backend /auth/callback -> back to our frontend.
// - The backend stores Google's refresh_token server-side and hands us back
//   an HttpOnly cookie. We never see or store the refresh token.
// - To get a usable access token, call fetchAccessToken(). The backend
//   transparently refreshes via the stored refresh token when needed — no
//   popup, no user gesture required, works silently on every page load.
// - Access tokens still last ~1hr, but callers no longer need to care: just
//   call fetchAccessToken() again when a Sheets call gets a 401, or on any
//   page load / focus. There is no more "expired forever until reconnect" —
//   as long as the backend session cookie is valid, a fresh token is always
//   one fetch away.
//
// IMPORTANT: set VITE_AUTH_BACKEND_URL in your .env / GitHub Pages build to
// your deployed Render URL, e.g. https://novaself-authproxy.onrender.com

const BACKEND_URL: string =
  (import.meta.env.VITE_AUTH_BACKEND_URL as string | undefined) ?? "http://localhost:8080";

export interface GoogleAuthResult {
  googleUserId: string;
  email: string;
  name: string;
  pictureUrl?: string;
  /** Short-lived OAuth access token. Hand to googleSheets.ts. Do NOT persist to localStorage. */
  accessToken: string;
}

/**
 * Public: kick off the interactive sign-in flow.
 * This is a full browser navigation — it does NOT return a token. The page
 * will unload. When Google + our backend finish, the browser lands back on
 * "/" with a session cookie set; call fetchAccessToken() from there.
 */
export function goToGoogleLogin(): void {
  window.location.href = `${BACKEND_URL}/auth/login`;
}

/**
 * Public: get a currently-valid access token for the signed-in user, silently
 * refreshing server-side if needed. Returns null if there's no valid session
 * (never signed in, or the refresh token itself was revoked/expired) — in
 * that case the caller should send the user through goToGoogleLogin() again.
 * Safe to call on every page load / tab focus — never shows a popup.
 */
export async function fetchAccessToken(): Promise<GoogleAuthResult | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/auth/token`, {
      method: "GET",
      credentials: "include", // send the HttpOnly session cookie
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      googleUserId: data.googleUserId,
      email: data.email,
      name: data.name,
      pictureUrl: data.pictureUrl,
      accessToken: data.accessToken,
    };
  } catch (err) {
    console.warn("[googleAuth] fetchAccessToken failed (network/backend unreachable):", err);
    return null;
  }
}

/**
 * Public: sign out. Revokes the refresh token at Google (best-effort, server
 * side) and clears the session cookie.
 */
export async function signOutOfGoogle(): Promise<void> {
  try {
    await fetch(`${BACKEND_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch (err) {
    console.warn("[googleAuth] signOutOfGoogle: backend logout call failed (clearing local state anyway):", err);
  }
}