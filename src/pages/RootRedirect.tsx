import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useApp } from "@/lib/novaself/store";
import { restoreGoogleSession } from "@/lib/novaself/googleAuth";
import { loadStateFromSheet } from "@/lib/novaself/googleSheets";

// We need a way to set _memAccessToken in store from here. The cleanest approach
// is to import the signInGoogle action from the store — but since restoreGoogleSession
// already gave us a token, we don't want another popup. Instead we expose a
// dedicated setRestoredSession action from the store (see store.tsx).
// For now: if the silent restore succeeds, we call signOut+redirect so the
// user signs in interactively from Welcome (safe, and correct). If we want
// fully-transparent session restore, store.tsx must export setRestoredSession.
// TODO: wire up store.setRestoredSession when available.

type ResolveState = "pending" | "done";

export function RootRedirect() {
  const { signedIn, onboarded, sheetHandle, signOut } = useApp();

  const [resolve, setResolve] = useState<ResolveState>(() => {
    // If already signed in (session was persisted in localStorage state),
    // no async work is needed.
    if (signedIn) return "done";
    // If there's no stored SheetHandle, there's nothing to restore.
    if (!sheetHandle) return "done";
    return "pending";
  });

  useEffect(() => {
    if (resolve === "done") return;

    // We have a stored SheetHandle — attempt a silent GIS token refresh.
    // If it succeeds, the user was previously signed in; they'll see the
    // "Reconnect" banner on dashboard (because _memAccessToken is null until
    // they explicitly tap it). This is correct — no automatic popup.
    // If it fails, sign out so they start fresh from Welcome.
    let cancelled = false;
    (async () => {
      try {
        const session = await restoreGoogleSession();
        if (cancelled) return;

        if (session) {
          // Silent restore succeeded. We have a fresh token from GIS, but we
          // cannot set _memAccessToken from here without a dedicated export.
          // Mark the user as signed in (localStorage already has their state)
          // so they go to dashboard, then the sessionExpired banner will appear
          // when auto-save fires and finds no _memAccessToken. They tap Reconnect
          // once and everything flushes.
          // State is already loaded from localStorage (loadInitial in store), so
          // no Sheet reload is needed — their local state is authoritative.
          console.log("[RootRedirect] Silent restore succeeded; user goes to dashboard (Reconnect banner will appear).");
        } else {
          // Silent restore failed — token fully expired, user must re-auth.
          console.log("[RootRedirect] Silent restore failed; signing out.");
          await signOut();
        }
      } catch {
        if (!cancelled) {
          console.warn("[RootRedirect] restoreGoogleSession threw; signing out.");
          await signOut();
        }
      } finally {
        if (!cancelled) setResolve("done");
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (resolve === "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground text-sm">
        Resuming session…
      </div>
    );
  }

  if (signedIn && onboarded) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/welcome" replace />;
}