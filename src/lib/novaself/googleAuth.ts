// ============================================================================
// Sign-in / sign-out for the NovaSelf OAuth-proxy backend (Spring Boot on Render).
// ============================================================================
// The backend owns everything token-related now — refresh tokens, access
// tokens, and every call to Google. The frontend just kicks off the login
// redirect and tells the backend to sign out. See stateApi.ts for
// fetchMe()/fetchState()/syncState() — how the frontend checks auth status
// and loads/saves data.

const BACKEND_URL: string =
  (import.meta.env.VITE_AUTH_BACKEND_URL as string | undefined) ?? "http://localhost:8080";

/** Full-page redirect into the backend's OAuth login flow. The page unloads — no return value. */
export function goToGoogleLogin(): void {
  window.location.href = `${BACKEND_URL}/auth/login`;
}

/** Revokes the refresh token at Google (best-effort, server-side) and clears the session cookie. */
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