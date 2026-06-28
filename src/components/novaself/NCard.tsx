import type { ReactNode } from "react";

interface Props { children: ReactNode; className?: string; glow?: "electric" | "neon" | null }

export function NCard({ children, className = "", glow = null }: Props) {
  const glowCls = glow === "electric" ? "glow-electric" : glow === "neon" ? "glow-neon" : "";
  return (
    <div className={`relative rounded-2xl border border-border/70 bg-[var(--surface)] p-5 shadow-[0_1px_0_oklch(1_0_0_/_0.04)_inset] ${glowCls} ${className}`}>
      {children}
    </div>
  );
}