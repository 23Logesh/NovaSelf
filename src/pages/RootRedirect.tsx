import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useApp } from "@/lib/novaself/store";
import { captureSessionTokenFromUrl } from "@/lib/novaself/stateApi";

type ResolveState = "pending" | "done";

export function RootRedirect() {
  const { signedIn, onboarded, restoreSession } = useApp();

  const [resolve, setResolve] = useState<ResolveState>(() => {
    if (signedIn) return "done";
    return "pending";
  });

  useEffect(() => {
    if (resolve === "done") return;

    // Grab ?session_token=... left by /auth/callback (if we just came back
    // from Google sign-in) before asking the backend anything.
    captureSessionTokenFromUrl();

    let cancelled = false;
    (async () => {
      try {
        const restored = await restoreSession();
        if (cancelled) return;
        console.log(restored
          ? "[RootRedirect] Session restored from backend."
          : "[RootRedirect] No valid backend session — user needs to sign in.");
      } catch (err) {
        if (!cancelled) console.warn("[RootRedirect] restoreSession threw:", err);
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