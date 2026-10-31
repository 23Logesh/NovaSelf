import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useApp } from "@/lib/novaself/store";

/**
 * No login in the Android app. The only gate is onboarding: until the profile
 * form on /welcome has been submitted, every protected route redirects there.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { onboarded } = useApp();
  if (!onboarded) return <Navigate to="/welcome" replace />;
  return <>{children}</>;
}