// ============================================================================
// Google Identity Services (GIS) — real OAuth token client implementation.
// ============================================================================
//
// ARCHITECTURE:
// - Zero backend. All auth happens browser-side via GIS (accounts.google.com/gsi/client).
// - Uses the implicit/token flow (initTokenClient), NOT the ID token / One Tap flow,
//   because we need an access token to call Drive/Sheets REST APIs directly.
// - The GIS script is loaded in index.html (async defer). We gate all calls behind
//   a waitForGIS() helper that polls until window.google is available.
// - Access tokens last ~1 hour. After expiry, callers show a reconnect banner so the
//   user can re-auth with a real button click (never auto-popup from background saves).
// - signOutOfGoogle() revokes the token so GIS clears its internal session.
//
// CRITICAL: GIS's requestAccessToken() MUST be called synchronously within a
// browser user-gesture (click) handler. Any await before the call — including
// awaiting getTokenClient() — breaks the gesture requirement and GIS either
// silently fails or shows a popup that gets blocked. To guarantee synchronous
// calling, initTokenClient is run eagerly on first waitForGIS() resolution and
// the result is cached. requestToken() is then safe to call from an onClick.

export const GOOGLE_CLIENT_ID =
  "93341990094-bq2u0f1p4bvj99b1lakc9jaev8s5fk6s.apps.googleusercontent.com";

const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/spreadsheets",
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

export interface GoogleAuthResult {
  /** Google's "sub" claim — stable per-account unique ID. */
  googleUserId: string;
  email: string;
  name: string;
  pictureUrl?: string;
  /** OAuth access token. Hand to googleSheets.ts. Do NOT persist to localStorage. */
  accessToken: string;
}

// ---------------------------------------------------------------------------
// Internal state — in-memory only, never touches localStorage.
// ---------------------------------------------------------------------------
let _accessToken: string | null = null;
let _tokenExpiry: number = 0;

// The GIS TokenClient — initialized once as soon as GIS loads, then reused.
// It MUST be initialized before any interactive requestAccessToken call so that
// the call itself is synchronous within the user gesture.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _tokenClient: any = null;

// Promise that resolves when GIS is ready and _tokenClient is initialized.
let _initPromise: Promise<void> | null = null;

// ---------------------------------------------------------------------------
// GIS availability guard
// ---------------------------------------------------------------------------
function waitForGIS(timeoutMs = 10_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const check = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).google?.accounts?.oauth2) {
        resolve();
      } else if (Date.now() > deadline) {
        reject(new Error("[googleAuth] GIS script did not load in time. Check index.html."));
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
}

// ---------------------------------------------------------------------------
// Public: eagerly initialize the token client.
// Call this as early as possible (e.g. app mount) so _tokenClient is ready
// before any user clicks Reconnect or Sign In. This makes requestToken()
// safe to call synchronously from a click handler.
// ---------------------------------------------------------------------------
export function initGoogleAuth(): Promise<void> {
  if (_initPromise) return _initPromise;
  _initPromise = waitForGIS().then(() => {
    if (!_tokenClient) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: () => {}, // overridden per-request
      });
      console.log("[googleAuth] TokenClient initialized");
    }
  });
  return _initPromise;
}

// ---------------------------------------------------------------------------
// Internal: request a token.
// REQUIRES _tokenClient to already be initialized (call initGoogleAuth() first).
// `prompt`:
//   ""     — default GIS behaviour (shows consent on first use, silent after)
//   "none" — silent only; rejects if interaction would be needed
//
// IMPORTANT: client.requestAccessToken() must be called synchronously from a
// user-gesture handler. Do NOT await anything before calling this from a click.
// ---------------------------------------------------------------------------
interface TokenResponse {
  access_token: string;
  expires_in: number;
  error?: string;
}

function requestToken(prompt: "" | "none"): Promise<TokenResponse> {
  return new Promise((resolve, reject) => {
    if (!_tokenClient) {
      reject(new Error("[googleAuth] TokenClient not initialized. Call initGoogleAuth() first."));
      return;
    }
    _tokenClient.callback = (resp: TokenResponse) => {
      if (resp.error) {
        reject(new Error(`[googleAuth] Token error: ${resp.error}`));
      } else {
        resolve(resp);
      }
    };
    // This call is synchronous — it schedules the OAuth popup/flow immediately.
    // It MUST happen within a user-gesture event handler to avoid popup blocking.
    _tokenClient.requestAccessToken({ prompt });
  });
}

// ---------------------------------------------------------------------------
// Internal: store a token response.
// ---------------------------------------------------------------------------
function storeToken(resp: TokenResponse) {
  _accessToken = resp.access_token;
  _tokenExpiry = Date.now() + (resp.expires_in - 60) * 1000;
}

// ---------------------------------------------------------------------------
// Public: sign in interactively.
// MUST be called directly from a user-gesture handler (onClick).
// Assumes initGoogleAuth() has already resolved.
// ---------------------------------------------------------------------------
export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  const resp = await requestToken("");
  storeToken(resp);

  const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${_accessToken}` },
  });
  if (!profileRes.ok) {
    throw new Error(`[googleAuth] Failed to fetch user profile: ${profileRes.status}`);
  }
  const profile = await profileRes.json();

  return {
    googleUserId: profile.sub,
    email: profile.email,
    name: profile.name,
    pictureUrl: profile.picture,
    accessToken: _accessToken!,
  };
}

// ---------------------------------------------------------------------------
// Public: attempt a silent session restore on app load (no user gesture).
// Returns null if the user needs to sign in interactively.
// ---------------------------------------------------------------------------
export async function restoreGoogleSession(): Promise<GoogleAuthResult | null> {
  try {
    await initGoogleAuth(); // ensure client is ready
    const resp = await requestToken("none");
    storeToken(resp);

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${_accessToken}` },
    });
    if (!profileRes.ok) return null;
    const profile = await profileRes.json();

    return {
      googleUserId: profile.sub,
      email: profile.email,
      name: profile.name,
      pictureUrl: profile.picture,
      accessToken: _accessToken!,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public: revoke the current token and clear internal state.
// ---------------------------------------------------------------------------
export async function signOutOfGoogle(): Promise<void> {
  if (!_accessToken) return;
  const tokenToRevoke = _accessToken;
  _accessToken = null;
  _tokenExpiry = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).google?.accounts?.oauth2?.revoke(tokenToRevoke, () => {
    console.log("[googleAuth] Token revoked.");
  });
}