import { Navigate } from "react-router-dom";
import { useApp } from "@/lib/novaself/store";

export function RootRedirect() {
  const { onboarded } = useApp();
  return <Navigate to={onboarded ? "/dashboard" : "/welcome"} replace />;
}