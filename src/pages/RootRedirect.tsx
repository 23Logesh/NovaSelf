import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useApp } from "@/lib/novaself/store";
import { restoreGoogleSession } from "@/lib/novaself/googleAuth";
import { loadStateFromSheet } from "@/lib/novaself/googleSheets";

type ResolveState = "pending" | "done";

export function RootRedirect() {
  const { signedIn, onboarded, sheetHandle, signOut } = useApp();
  // We need to reach into the store's setState indirectly, so we call the
  // exported actions. The simplest approach: if silent restore succeeds we
  // call signInGoogle() — but that would show a user gesture popup. Instead
  // we do the restore inline here and update state via the store's loadData.
  const { loadData } = useApp();

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

    // We have a stored SheetHandle — attempt a silent GIS token refresh and
    // then reload state from the Sheet so FR-05 works against real data.
    let cancelled = false;
    (async () => {
      try {
        const session = await restoreGoogleSession();
        if (cancelled) return;

        if (session) {
          // Patch in the fresh token (module-level in store.tsx) by calling
          // loadData which internally uses getValidAccessToken().
          await loadData();
        } else {
          // Silent restore failed — token fully expired, user must re-auth.
          // Sign out clears the stale handle so they don't get stuck.
          await signOut();
        }
      } catch {
        // Any failure: treat as signed out.
        if (!cancelled) await signOut();
      } finally {
        if (!cancelled) setResolve("done");
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (resolve === "pending") {
    // Minimal splash while we attempt the silent restore.
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground text-sm">
        Resuming session…
      </div>
    );
  }

  // FR-05: valid existing session → go straight to dashboard.
  if (signedIn && onboarded) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/welcome" replace />;
}