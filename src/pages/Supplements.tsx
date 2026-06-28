import { useState } from "react";
import { Plus, X } from "lucide-react";
import { NCard } from "@/components/novaself/NCard";
import { SectionHeader } from "@/components/novaself/SectionHeader";
import { SupplementIntakePanel } from "@/components/novaself/SupplementIntakePanel";
import { useApp } from "@/lib/novaself/store";
import type { Supplement } from "@/lib/novaself/types";

const uid = () => Math.random().toString(36).slice(2, 10);

export default function Supplements() {
  const { supplements, setSupplements } = useApp();
  const [draft, setDraft] = useState<Supplement>({
    id: uid(), name: "", unit: "tablet", stock: 0, defaultDose: 1,
  });

  return (
    <div className="space-y-7">
      <SectionHeader
        eyebrow="Stack"
        title="Supplements"
        description="Empty by default. Add anything you take — protein, creatine, vitamin D, whatever."
      />

      <NCard>
        <h3 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Add supplement</h3>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <input
            placeholder="Name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className={ic + " md:col-span-2"}
          />
          <input
            placeholder="Unit (e.g. tablet, g, ml)"
            value={draft.unit}
            onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
            className={ic}
          />
          <input
            type="number"
            placeholder="Stock"
            value={draft.stock || ""}
            onChange={(e) => setDraft({ ...draft, stock: +e.target.value })}
            className={ic}
          />
          <input
            type="number"
            placeholder="Default dose"
            value={draft.defaultDose || ""}
            onChange={(e) => setDraft({ ...draft, defaultDose: +e.target.value })}
            className={ic}
          />
        </div>
        <button
          onClick={() => {
            if (!draft.name.trim()) return;
            setSupplements([...supplements, { ...draft, id: uid() }]);
            setDraft({ id: uid(), name: "", unit: "tablet", stock: 0, defaultDose: 1 });
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--electric)] py-2.5 text-sm font-semibold text-[var(--primary-foreground)]"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </NCard>

      {/* Delete management — stays here, not in the shared panel */}
      {supplements.length > 0 && (
        <NCard>
          <h3 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Manage</h3>
          <ul className="space-y-2">
            {supplements.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-elevated)] px-3 py-2 text-sm">
                <span className="font-medium">{s.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {s.stock} {s.unit}{s.stock === 1 ? "" : "s"} · dose: {s.defaultDose}
                </span>
                <button
                  onClick={() => setSupplements(supplements.filter((x) => x.id !== s.id))}
                  className="ml-auto shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </NCard>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Today's intake</h3>
        <SupplementIntakePanel />
      </div>
    </div>
  );
}

const ic = "rounded-lg border border-border bg-[var(--surface-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--electric)]";