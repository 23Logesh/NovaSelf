import { useState } from "react";
import { Plus, X, Pencil, Check } from "lucide-react";
import { NCard } from "@/components/novaself/NCard";
import { SectionHeader } from "@/components/novaself/SectionHeader";
import { useApp } from "@/lib/novaself/store";
import type { DietItem, DietPhase, MessItem } from "@/lib/novaself/types";

const uid = () => Math.random().toString(36).slice(2, 10);

export default function Diet() {
  const { dietPhases, setDietPhases, mess, setMess } = useApp();
  const [activePhaseId, setActivePhaseId] = useState(dietPhases[0]?.id);
  const phase = dietPhases.find((p) => p.id === activePhaseId) ?? dietPhases[0];

  function updatePhase(patch: Partial<DietPhase>) {
    if (!phase) return;
    setDietPhases(dietPhases.map((p) => (p.id === phase.id ? { ...p, ...patch } : p)));
  }

  function addPhase() {
    const np: DietPhase = { id: uid(), name: `Phase ${dietPhases.length + 1}`, items: [] };
    setDietPhases([...dietPhases, np]);
    setActivePhaseId(np.id);
  }

  function removePhase(id: string) {
    const next = dietPhases.filter((p) => p.id !== id);
    setDietPhases(next);
    if (activePhaseId === id) setActivePhaseId(next[0]?.id);
  }

  return (
    <div className="space-y-7">
      <SectionHeader eyebrow="Plan" title="Diet plan" description="Organized into phases — add as many as your transformation needs. Edit freely." />

      {/* FR-27: Phase tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {dietPhases.map((p) => (
          <button
            key={p.id}
            onClick={() => setActivePhaseId(p.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              p.id === phase?.id
                ? "bg-[var(--electric)] text-[var(--primary-foreground)] shadow-[0_0_18px_var(--electric)]"
                : "border border-border bg-[var(--surface)] text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.name}
          </button>
        ))}
        <button onClick={addPhase} className="flex items-center gap-1 rounded-full border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:border-[var(--electric)] hover:text-[var(--electric)]">
          <Plus className="h-3.5 w-3.5" /> Add phase
        </button>
      </div>

      {phase && <PhaseEditor phase={phase} onUpdate={updatePhase} onRemove={() => removePhase(phase.id)} canRemove={dietPhases.length > 1} />}

      <SectionHeader eyebrow="Reference" title="PG / Hostel mess menu" description="Tracked separately — what the mess is actually serving this week." />
      <NCard>
        <div className="grid gap-2">
          {mess.map((m) => (
            <div key={m.id} className="grid grid-cols-[60px_100px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-[var(--surface-elevated)] p-3 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--neon)]">{m.day}</span>
              <span className="text-xs text-muted-foreground">{m.meal}</span>
              <span className="truncate">{m.item}</span>
              <button onClick={() => setMess(mess.filter((x) => x.id !== m.id))} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <MessAdder mess={mess} setMess={setMess} />
      </NCard>
    </div>
  );
}

function PhaseEditor({ phase, onUpdate, onRemove, canRemove }: { phase: DietPhase; onUpdate: (p: Partial<DietPhase>) => void; onRemove: () => void; canRemove: boolean }) {
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(phase.name);
  const totals = phase.items.reduce((a, d) => ({ cal: a.cal + d.calories, p: a.p + d.protein, f: a.f + d.fiber }), { cal: 0, p: 0, f: 0 });
  const [draft, setDraft] = useState<DietItem>({ id: uid(), meal: "Snack", food: "", calories: 0, protein: 0, fiber: 0 });

  return (
    <NCard>
      <div className="mb-3 flex items-center justify-between gap-3">
        {renaming ? (
          <div className="flex items-center gap-2">
            <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} className={ic} />
            <button onClick={() => { onUpdate({ name: nameDraft || phase.name }); setRenaming(false); }} className="text-[var(--electric)]"><Check className="h-4 w-4" /></button>
          </div>
        ) : (
          <button onClick={() => setRenaming(true)} className="flex items-center gap-2 text-left">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{phase.name}</h3>
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className="text-right text-xs text-muted-foreground tabular-nums">
            <div>{Math.round(totals.cal)} kcal</div>
            <div>{totals.p}g protein · {totals.f}g fiber</div>
          </div>
          {canRemove && (
            <button onClick={onRemove} className="text-muted-foreground hover:text-destructive" title="Delete phase">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <ul className="space-y-2">
        {phase.items.map((d) => (
          <li key={d.id} className="grid grid-cols-[100px_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl bg-[var(--surface-elevated)] p-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--electric)]">{d.meal}</span>
            <span className="truncate text-sm">{d.food}</span>
            <span className="hidden text-xs text-muted-foreground tabular-nums sm:inline">{d.calories} kcal · {d.protein}p · {d.fiber}f</span>
            <button onClick={() => onUpdate({ items: phase.items.filter((x) => x.id !== d.id) })} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
          </li>
        ))}
        {phase.items.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No meals in this phase yet.</p>}
      </ul>

      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-6">
        <input placeholder="Meal" value={draft.meal} onChange={(e) => setDraft({ ...draft, meal: e.target.value })} className={ic} />
        <input placeholder="Food" value={draft.food} onChange={(e) => setDraft({ ...draft, food: e.target.value })} className={ic + " col-span-2"} />
        <input type="number" placeholder="kcal" value={draft.calories || ""} onChange={(e) => setDraft({ ...draft, calories: +e.target.value })} className={ic} />
        <input type="number" placeholder="prot" value={draft.protein || ""} onChange={(e) => setDraft({ ...draft, protein: +e.target.value })} className={ic} />
        <input type="number" placeholder="fiber" value={draft.fiber || ""} onChange={(e) => setDraft({ ...draft, fiber: +e.target.value })} className={ic} />
      </div>
      <button
        onClick={() => {
          if (draft.food) {
            onUpdate({ items: [...phase.items, { ...draft, id: uid() }] });
            setDraft({ ...draft, food: "", calories: 0, protein: 0, fiber: 0 });
          }
        }}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--electric)] py-2.5 text-sm font-semibold text-[var(--primary-foreground)]"
      >
        <Plus className="h-4 w-4" /> Add meal
      </button>
    </NCard>
  );
}

function MessAdder({ mess, setMess }: { mess: MessItem[]; setMess: (m: MessItem[]) => void }) {
  const [mDraft, setMDraft] = useState<MessItem>({ id: uid(), day: "Mon", meal: "Breakfast", item: "" });
  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <select value={mDraft.day} onChange={(e) => setMDraft({ ...mDraft, day: e.target.value })} className={ic}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <option key={d}>{d}</option>)}
        </select>
        <select value={mDraft.meal} onChange={(e) => setMDraft({ ...mDraft, meal: e.target.value })} className={ic}>
          {["Breakfast", "Lunch", "Snack", "Dinner"].map((d) => <option key={d}>{d}</option>)}
        </select>
        <input placeholder="Item" value={mDraft.item} onChange={(e) => setMDraft({ ...mDraft, item: e.target.value })} className={ic + " md:col-span-2"} />
      </div>
      <button
        onClick={() => { if (mDraft.item) { setMess([...mess, { ...mDraft, id: uid() }]); setMDraft({ ...mDraft, item: "" }); } }}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--neon)] py-2.5 text-sm font-semibold text-[var(--neon)] hover:bg-[var(--neon)]/10"
      >
        <Plus className="h-4 w-4" /> Add menu item
      </button>
    </>
  );
}

const ic = "rounded-lg border border-border bg-[var(--surface-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--electric)]";