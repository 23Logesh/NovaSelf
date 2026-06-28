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
// - Access tokens last ~1 hour. getValidAccessToken() handles transparent re-auth:
//   if a Sheets/Drive call gets a 401 the caller catches it and calls this, which
//   does a silent requestAccessToken (prompt: "none") and retries once.
// - signOutOfGoogle() revokes the token so GIS clears its internal session.

export const GOOGLE_CLIENT_ID =
  "93341990094-bq2u0f1p4bvj99b1lakc9jaev8s5fk6s.apps.googleusercontent.com";

const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/spreadsheets",
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
let _tokenExpiry: number = 0; // ms epoch when the token expires

// The GIS TokenClient is initialized once and reused for all token requests.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _tokenClient: any = null;

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
// Internal: initialize the token client once (idempotent).
// ---------------------------------------------------------------------------
async function getTokenClient() {
  await waitForGIS();
  if (!_tokenClient) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      // callback is set per-request below (see requestToken).
      callback: () => {},
    });
  }
  return _tokenClient;
}

// ---------------------------------------------------------------------------
// Internal: request a token, resolving with the raw response or rejecting.
// `prompt` controls whether a consent screen is shown:
//   ""       — default GIS behaviour (shows consent on first use, silent after)
//   "none"   — silent only; rejects if interaction would be needed
// ---------------------------------------------------------------------------
interface TokenResponse {
  access_token: string;
  expires_in: number;
  error?: string;
}

function requestToken(prompt: "" | "none"): Promise<TokenResponse> {
  return new Promise(async (resolve, reject) => {
    const client = await getTokenClient();
    client.callback = (resp: TokenResponse) => {
      if (resp.error) {
        reject(new Error(`[googleAuth] Token error: ${resp.error}`));
      } else {
        resolve(resp);
      }
    };
    client.requestAccessToken({ prompt });
  });
}

// ---------------------------------------------------------------------------
// Internal: store a token response in module-level variables.
// ---------------------------------------------------------------------------
function storeToken(resp: TokenResponse) {
  _accessToken = resp.access_token;
  // expires_in is in seconds; subtract a 60s buffer so we refresh slightly early.
  _tokenExpiry = Date.now() + (resp.expires_in - 60) * 1000;
}

// ---------------------------------------------------------------------------
// Public: fetch a valid access token, refreshing silently if expired.
// Call this before every Sheets/Drive API request instead of caching the token
// yourself — this handles the ~1-hour expiry transparently.
// ---------------------------------------------------------------------------
export async function getValidAccessToken(): Promise<string> {
  if (_accessToken && Date.now() < _tokenExpiry) {
    return _accessToken;
  }
  // Try a silent refresh first (no user interaction).
  try {
    const resp = await requestToken("none");
    storeToken(resp);
    return _accessToken!;
  } catch {
    // Silent refresh failed (e.g. session truly expired). Fall through to
    // interactive re-auth, which MUST be called from a user gesture.
    // Callers that need this path should catch the error and surface a
    // "Re-authenticate" button to the user.
    throw new Error(
      "[googleAuth] Silent token refresh failed. Call signInWithGoogle() from a user gesture to re-authenticate.",
    );
  }
}

// ---------------------------------------------------------------------------
// Public: sign in interactively (must be called from a real user gesture).
// ---------------------------------------------------------------------------
export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  const resp = await requestToken("");
  storeToken(resp);

  // Fetch user profile from Google's userinfo endpoint.
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
    await waitForGIS();
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
  // Revoke via GIS — this tells Google to invalidate the token immediately.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).google?.accounts?.oauth2?.revoke(tokenToRevoke, () => {
    console.log("[googleAuth] Token revoked.");
  });
}