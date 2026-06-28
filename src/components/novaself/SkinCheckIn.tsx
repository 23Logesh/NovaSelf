import { Check } from "lucide-react";
import { useState } from "react";
import { NCard } from "@/components/novaself/NCard";
import { useApp, today } from "@/lib/novaself/store";
import type { SkinLog } from "@/lib/novaself/types";

/**
 * Full skin & hair daily check-in form.
 * Reads today's existing log (if any) from store and auto-saves on every
 * interaction. Used by both Log.tsx (Skin tab) and the standalone Skin page.
 */
export function SkinCheckIn() {
  const { skinLogs, upsertSkin } = useApp();
  const existing = skinLogs.find((s) => s.date === today());
  const [log, setLog] = useState<SkinLog>(
    existing ?? {
      date: today(),
      faceWash: false, moisturizer: false, sunscreen: false,
      hairOil: false, scalpMassage: false,
      oiliness: 3, hairFall: 3,
      pimples: 0, darkPatchChange: false,
    },
  );

  function save(patch: Partial<SkinLog>) {
    const next = { ...log, ...patch };
    setLog(next);
    upsertSkin(next);
  }

  return (
    <div className="space-y-4">
      <NCard>
        <h3 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Checklist</h3>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {(
            [
              ["faceWash", "Face wash"],
              ["moisturizer", "Moisturizer"],
              ["sunscreen", "Sunscreen"],
              ["hairOil", "Hair oil"],
              ["scalpMassage", "Scalp massage"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => save({ [k]: !log[k] } as Partial<SkinLog>)}
              className={`flex items-center justify-between gap-2 rounded-xl border p-3 text-sm transition ${
                log[k]
                  ? "border-[var(--neon)] bg-[var(--neon)]/10 text-[var(--neon)]"
                  : "border-border bg-[var(--surface-elevated)] text-muted-foreground"
              }`}
            >
              <span>{label}</span>
              {log[k] && <Check className="h-4 w-4 shrink-0" />}
            </button>
          ))}
        </div>
      </NCard>

      <div className="grid gap-4 md:grid-cols-2">
        <NCard>
          <h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Oiliness</h3>
          <SliderRow
            value={log.oiliness}
            onChange={(v) => save({ oiliness: v })}
            labels={["Dry", "Normal", "Combo", "Oily", "Very oily"]}
          />
          <h3 className="mb-2 mt-5 text-xs uppercase tracking-wider text-muted-foreground">Hair fall</h3>
          <SliderRow
            value={log.hairFall}
            onChange={(v) => save({ hairFall: v })}
            labels={["None", "Mild", "Normal", "High", "Severe"]}
          />
        </NCard>

        <NCard>
          <h3 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Today</h3>
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">New pimples</span>
            <input
              type="number"
              min={0}
              value={log.pimples}
              onChange={(e) => save({ pimples: +e.target.value })}
              className="w-full rounded-xl border border-border bg-[var(--surface-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--electric)]"
            />
          </label>
          <label className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-[var(--surface-elevated)] p-3 text-sm">
            <span>Dark patch change today?</span>
            <input
              type="checkbox"
              checked={log.darkPatchChange}
              onChange={(e) => save({ darkPatchChange: e.target.checked })}
              className="h-5 w-5 accent-[var(--electric)]"
            />
          </label>
          <label className="mt-3 block">
            <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Notes</span>
            <textarea
              value={log.notes ?? ""}
              onChange={(e) => save({ notes: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-border bg-[var(--surface-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--electric)]"
            />
          </label>
        </NCard>
      </div>
    </div>
  );
}

function SliderRow({
  value,
  onChange,
  labels,
}: {
  value: number;
  onChange: (v: number) => void;
  labels: string[];
}) {
  return (
    <div>
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full accent-[var(--electric)]"
      />
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        {labels.map((l, i) => (
          <span key={l} className={value === i + 1 ? "text-[var(--electric)]" : ""}>
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}