import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useApp } from "@/lib/novaself/store";

interface RequireAuthProps {
  children: ReactNode;
}

/**
 * Route-level auth guard. Wrap around any layout element in App.tsx to protect
 * all routes nested beneath it.
 *
 * Redirects to /welcome when:
 *   - Not signed in (signedIn=false): user arrived directly via URL or bookmark.
 *   - Signed in but not onboarded (onboarded=false): user completed OAuth but
 *     hasn't submitted the profile form yet.
 *
 * Both conditions use `replace` so /welcome doesn't pollute the history stack
 * and the back button doesn't loop back to the protected route.
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const { signedIn, onboarded } = useApp();

  if (!signedIn || !onboarded) {
    return <Navigate to="/welcome" replace />;
  }

  return <>{children}</>;
}