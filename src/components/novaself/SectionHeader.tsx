import type { ReactNode } from "react";

interface Props { eyebrow?: string; title: string; description?: string; action?: ReactNode }

export function SectionHeader({ eyebrow, title, description, action }: Props) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--electric)]">{eyebrow}</div>
        )}
        <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}