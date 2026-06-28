import { Pill, AlertCircle } from "lucide-react";
import { NCard } from "@/components/novaself/NCard";
import { useApp, today } from "@/lib/novaself/store";

const uid = () => Math.random().toString(36).slice(2, 10);

/**
 * Quick-intake grid: shows every supplement with a "Take" button for today.
 * Used by both the Log page (Supplements tab) and the full Supplements page.
 * Stock management (add/delete supplements) stays in Supplements.tsx only.
 */
export function SupplementIntakePanel() {
  const { supplements, intakes, logIntake } = useApp();
  const todayIntakes = intakes.filter((i) => i.date === today());

  if (supplements.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No supplements defined yet.{" "}
        <span className="text-[var(--electric)]">Add some on the Supplements page.</span>
      </p>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {supplements.map((s) => {
        const taken = todayIntakes
          .filter((i) => i.supplementId === s.id)
          .reduce((a, i) => a + i.amount, 0);
        const low = s.stock <= s.defaultDose * 5;
        const outOfStock = s.stock < s.defaultDose;

        return (
          <NCard key={s.id} glow={low ? "electric" : null}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Pill className="mt-0.5 h-5 w-5 shrink-0 text-[var(--electric)]" />
                <div>
                  <div className="font-display text-base font-bold leading-tight">{s.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    Stock: {s.stock} {s.unit}{s.stock === 1 ? "" : "s"} · taken today: {taken} {s.unit}{taken === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
            </div>
            {low && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--electric)]">
                <AlertCircle className="h-3 w-3" /> Stock running low
              </div>
            )}
            <button
              onClick={() =>
                logIntake({ id: uid(), supplementId: s.id, date: today(), amount: s.defaultDose })
              }
              disabled={outOfStock}
              className="mt-3 w-full rounded-xl bg-[var(--neon)] py-2 text-sm font-semibold text-[var(--accent-foreground)] transition hover:opacity-90 disabled:opacity-40"
            >
              {outOfStock ? "Out of stock" : `Take ${s.defaultDose} ${s.unit}${s.defaultDose === 1 ? "" : "s"}`}
            </button>
          </NCard>
        );
      })}
    </div>
  );
}