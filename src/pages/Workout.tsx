import { useState } from "react";
import { Plus, X, Layers } from "lucide-react";
import { NCard } from "@/components/novaself/NCard";
import { SectionHeader } from "@/components/novaself/SectionHeader";
import { useApp } from "@/lib/novaself/store";
import type { Exercise, WorkoutDay, WorkoutPhase } from "@/lib/novaself/types";

const uid = () => Math.random().toString(36).slice(2, 10);

export default function Workout() {
  const { workoutPhases, setWorkoutPhases } = useApp();
  const [newPhase, setNewPhase] = useState("");

  function addPhase() {
    if (!newPhase.trim()) return;
    setWorkoutPhases([...workoutPhases, { id: uid(), name: newPhase, days: [] }]);
    setNewPhase("");
  }
  function updatePhase(id: string, patch: Partial<WorkoutPhase>) {
    setWorkoutPhases(workoutPhases.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function removePhase(id: string) { setWorkoutPhases(workoutPhases.filter((p) => p.id !== id)); }

  return (
    <div className="space-y-7">
      <SectionHeader eyebrow="Plan" title="Workout phases" description="Phase → day → exercise. Add anything you do — swimming, climbing, cycling, whatever." />

      <NCard glow="neon">
        <div className="flex gap-2">
          <input placeholder="New phase (e.g. Phase 3 — Swimming)" value={newPhase} onChange={(e) => setNewPhase(e.target.value)}
            className="flex-1 rounded-xl border border-border bg-[var(--surface-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--neon)]" />
          <button onClick={addPhase} className="flex items-center gap-2 rounded-xl bg-[var(--neon)] px-4 text-sm font-semibold text-[var(--accent-foreground)]">
            <Plus className="h-4 w-4" /> Phase
          </button>
        </div>
      </NCard>

      <div className="space-y-4">
        {workoutPhases.map((phase) => (
          <PhaseCard key={phase.id} phase={phase} onChange={(p) => updatePhase(phase.id, p)} onRemove={() => removePhase(phase.id)} />
        ))}
      </div>
    </div>
  );
}

function PhaseCard({ phase, onChange, onRemove }: { phase: WorkoutPhase; onChange: (p: Partial<WorkoutPhase>) => void; onRemove: () => void }) {
  const [dayName, setDayName] = useState("");

  function addDay() {
    if (!dayName.trim()) return;
    onChange({ days: [...phase.days, { id: uid(), name: dayName, exercises: [] }] });
    setDayName("");
  }
  function updateDay(id: string, patch: Partial<WorkoutDay>) {
    onChange({ days: phase.days.map((d) => (d.id === id ? { ...d, ...patch } : d)) });
  }

  return (
    <NCard>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[var(--electric)]" />
          <input value={phase.name} onChange={(e) => onChange({ name: e.target.value })}
            className="bg-transparent font-display text-lg font-bold outline-none" />
        </div>
        <button onClick={onRemove} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
      </div>

      <div className="space-y-3">
        {phase.days.map((day) => (
          <DayBlock key={day.id} day={day}
            onChange={(patch) => updateDay(day.id, patch)}
            onRemove={() => onChange({ days: phase.days.filter((d) => d.id !== day.id) })} />
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input placeholder="Add day (e.g. Push, Mon)" value={dayName} onChange={(e) => setDayName(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-[var(--surface-elevated)] px-3 py-2 text-sm outline-none" />
        <button onClick={addDay} className="rounded-lg bg-[var(--electric)]/15 px-3 text-sm font-medium text-[var(--electric)]">+ Day</button>
      </div>
    </NCard>
  );
}

function DayBlock({ day, onChange, onRemove }: { day: WorkoutDay; onChange: (p: Partial<WorkoutDay>) => void; onRemove: () => void }) {
  const [ex, setEx] = useState<Exercise>({ id: uid(), name: "", sets: undefined, reps: undefined, durationMin: undefined, notes: "" });
  return (
    <div className="rounded-xl border border-border bg-[var(--surface-elevated)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <input value={day.name} onChange={(e) => onChange({ name: e.target.value })}
          className="bg-transparent text-sm font-semibold uppercase tracking-wider text-[var(--neon)] outline-none" />
        <button onClick={onRemove} className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
      </div>
      <ul className="space-y-1">
        {day.exercises.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-3 text-sm">
            <span>{e.name}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {e.sets && e.reps ? `${e.sets}×${e.reps}` : ""}
              {e.durationMin ? ` · ${e.durationMin} min` : ""}
              {e.notes ? ` · ${e.notes}` : ""}
            </span>
            <button onClick={() => onChange({ exercises: day.exercises.filter((x) => x.id !== e.id) })} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
          </li>
        ))}
      </ul>
      {/* FR-29: sets, reps, duration, AND notes are all enterable here. */}
      <div className="mt-2 grid grid-cols-2 gap-1.5 md:grid-cols-6">
        <input placeholder="Exercise" value={ex.name} onChange={(e) => setEx({ ...ex, name: e.target.value })} className="rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none md:col-span-2" />
        <input type="number" placeholder="Sets" value={ex.sets ?? ""} onChange={(e) => setEx({ ...ex, sets: e.target.value ? +e.target.value : undefined })} className="rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none" />
        <input type="number" placeholder="Reps" value={ex.reps ?? ""} onChange={(e) => setEx({ ...ex, reps: e.target.value ? +e.target.value : undefined })} className="rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none" />
        <input type="number" placeholder="Min" value={ex.durationMin ?? ""} onChange={(e) => setEx({ ...ex, durationMin: e.target.value ? +e.target.value : undefined })} className="rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none" />
        <input placeholder="Notes" value={ex.notes ?? ""} onChange={(e) => setEx({ ...ex, notes: e.target.value })} className="rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none" />
      </div>
      <button onClick={() => { if (ex.name) { onChange({ exercises: [...day.exercises, { ...ex, id: uid() }] }); setEx({ id: uid(), name: "", notes: "" }); } }}
        className="mt-1.5 w-full rounded-md bg-[var(--electric)]/15 py-1 text-xs font-medium text-[var(--electric)]">+ Exercise</button>
    </div>
  );
}