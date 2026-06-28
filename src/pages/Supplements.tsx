import { useState } from "react";
import { Pill, Plus, X, AlertCircle } from "lucide-react";
import { NCard } from "@/components/novaself/NCard";
import { SectionHeader } from "@/components/novaself/SectionHeader";
import { useApp, today } from "@/lib/novaself/store";
import type { Supplement } from "@/lib/novaself/types";

const uid = () => Math.random().toString(36).slice(2, 10);

export default function Supplements() {
  const { supplements, setSupplements, logIntake, intakes } = useApp();
  const [draft, setDraft] = useState<Supplement>({ id: uid(), name: "", unit: "tablet", stock: 0, defaultDose: 1 });

  const todayIntakes = intakes.filter((i) => i.date === today());

  return (
    <div className="space-y-7">
      <SectionHeader eyebrow="Stack" title="Supplements" description="Empty by default. Add anything you take — protein, creatine, vitamin D, whatever." />

      <NCard>
        <h3 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Add supplement</h3>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <input placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={ic + " md:col-span-2"} />
          <input placeholder="Unit" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} className={ic} />
          <input type="number" placeholder="Stock" value={draft.stock || ""} onChange={(e) => setDraft({ ...draft, stock: +e.target.value })} className={ic} />
          <input type="number" placeholder="Dose" value={draft.defaultDose || ""} onChange={(e) => setDraft({ ...draft, defaultDose: +e.target.value })} className={ic} />
        </div>
        <button onClick={() => { if (draft.name) { setSupplements([...supplements, { ...draft, id: uid() }]); setDraft({ id: uid(), name: "", unit: "tablet", stock: 0, defaultDose: 1 }); } }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--electric)] py-2.5 text-sm font-semibold text-[var(--primary-foreground)]"><Plus className="h-4 w-4" /> Add</button>
      </NCard>

      {supplements.length === 0 ? (
        <NCard><p className="py-6 text-center text-sm text-muted-foreground">No supplements yet. Add one above to start tracking stock.</p></NCard>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {supplements.map((s) => {
            const taken = todayIntakes.filter((i) => i.supplementId === s.id).reduce((a, i) => a + i.amount, 0);
            const low = s.stock <= s.defaultDose * 5;
            return (
              <NCard key={s.id} glow={low ? "electric" : null}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Pill className="mt-0.5 h-5 w-5 text-[var(--electric)]" />
                    <div>
                      <div className="font-display text-lg font-bold">{s.name}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">Stock: {s.stock} {s.unit}{s.stock === 1 ? "" : "s"} · today: {taken}</div>
                    </div>
                  </div>
                  <button onClick={() => setSupplements(supplements.filter((x) => x.id !== s.id))} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                </div>
                {low && <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--electric)]"><AlertCircle className="h-3 w-3" /> Stock running low</div>}
                <button onClick={() => logIntake({ id: uid(), supplementId: s.id, date: today(), amount: s.defaultDose })}
                  disabled={s.stock < s.defaultDose}
                  className="mt-3 w-full rounded-xl bg-[var(--neon)] py-2 text-sm font-semibold text-[var(--accent-foreground)] disabled:opacity-50">
                  Take {s.defaultDose} {s.unit}{s.defaultDose === 1 ? "" : "s"}
                </button>
              </NCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

const ic = "rounded-lg border border-border bg-[var(--surface-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--electric)]";