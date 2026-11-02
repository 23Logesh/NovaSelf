import { useState } from "react";
import { Plus, Trash2, Dumbbell, Save, Timer, Flame, Award } from "lucide-react";
import { toast } from "sonner";
import { NCard } from "@/components/novaself/NCard";
import { useApp, today } from "@/lib/novaself/store";
import { caloriesBurned, WORKOUT_METS } from "@/lib/novaself/calculations";

interface SetEntry {
  setNumber: number;
  weightKg: number;
  reps: number;
}

export function SetTrackerModal({ onClose }: { onClose?: () => void }) {
  const { profile, getDay, upsertDay } = useApp();
  const [exerciseName, setExerciseName] = useState("Bench Press");
  const [workoutType, setWorkoutType] = useState<"gym" | "badminton" | "hiit" | "cycling">("gym");
  const [sets, setSets] = useState<SetEntry[]>([
    { setNumber: 1, weightKg: 60, reps: 10 },
    { setNumber: 2, weightKg: 70, reps: 8 },
    { setNumber: 3, weightKg: 80, reps: 6 },
  ]);
  const [durationMin, setDurationMin] = useState(45);

  function addSet() {
    const last = sets[sets.length - 1];
    setSets([
      ...sets,
      {
        setNumber: sets.length + 1,
        weightKg: last ? last.weightKg : 50,
        reps: last ? last.reps : 10,
      },
    ]);
  }

  function removeSet(index: number) {
    setSets(sets.filter((_, i) => i !== index).map((s, i) => ({ ...s, setNumber: i + 1 })));
  }

  function updateSet(index: number, patch: Partial<SetEntry>) {
    setSets(sets.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  // Calculate Volume Load (Tonnage = sum of weight * reps)
  const totalVolumeKg = sets.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
  const met = WORKOUT_METS[workoutType] || 6.0;
  const estimatedBurn = Math.round(caloriesBurned(met, profile.weightKg || 70, durationMin));

  function saveWorkout() {
    if (!exerciseName.trim()) {
      toast.error("Please enter exercise name.");
      return;
    }

    const t = today();
    const day = getDay(t);
    const id = Math.random().toString(36).slice(2, 10);

    const setDetails = sets.map((s) => `Set ${s.setNumber}: ${s.weightKg}kg x ${s.reps}`).join(", ");
    const notes = `${exerciseName} (${sets.length} sets, Total Volume: ${totalVolumeKg} kg) — ${setDetails}`;

    upsertDay({
      ...day,
      workouts: [
        ...day.workouts,
        {
          id,
          type: workoutType,
          durationMin,
          caloriesBurned: estimatedBurn,
          notes,
        },
      ],
    });

    toast.success(`Workout Logged! ${exerciseName} (${totalVolumeKg} kg Volume Load, ${estimatedBurn} kcal)`);
    if (onClose) onClose();
  }

  return (
    <NCard glow="electric" className="space-y-4">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-[var(--electric)]" />
          <h3 className="font-display font-bold text-base text-foreground">Set & Rep Gym Session Tracker</h3>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--electric)] bg-[var(--electric)]/10 px-2.5 py-1 rounded-full border border-[var(--electric)]/30">
          Volume Load Tracker
        </span>
      </div>

      {/* Workout Type & Name Form */}
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Activity Type</span>
          <select
            value={workoutType}
            onChange={(e) => setWorkoutType(e.target.value as any)}
            className="w-full rounded-xl border border-border bg-[var(--surface-elevated)] px-3 py-2 text-xs font-semibold outline-none focus:border-[var(--electric)]"
          >
            <option value="gym">Gym / Lifting</option>
            <option value="badminton">Badminton / Sports</option>
            <option value="hiit">HIIT / Cardio</option>
            <option value="cycling">Cycling</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Exercise / Sport Name</span>
          <input
            value={exerciseName}
            onChange={(e) => setExerciseName(e.target.value)}
            placeholder="e.g. Bench Press / Badminton Match"
            className="w-full rounded-xl border border-border bg-[var(--surface-elevated)] px-3 py-2 text-xs outline-none focus:border-[var(--electric)]"
          />
        </label>
      </div>

      {/* Volume Summary Badges */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl border border-border/70 bg-[var(--surface-elevated)] p-2.5">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">Duration</span>
          <span className="font-display text-lg font-bold text-foreground tabular-nums">{durationMin} min</span>
        </div>

        <div className="rounded-xl border border-[var(--electric)]/40 bg-[var(--electric)]/10 p-2.5">
          <span className="text-[9px] uppercase tracking-wider text-[var(--electric)] font-semibold block">Volume Load</span>
          <span className="font-display text-lg font-extrabold text-[var(--electric)] tabular-nums">{totalVolumeKg} kg</span>
        </div>

        <div className="rounded-xl border border-[var(--neon)]/40 bg-[var(--neon)]/10 p-2.5">
          <span className="text-[9px] uppercase tracking-wider text-[var(--neon)] font-semibold block">Est. Burn</span>
          <span className="font-display text-lg font-extrabold text-[var(--neon)] tabular-nums">{estimatedBurn} kcal</span>
        </div>
      </div>

      {/* Set-by-Set Input List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <span>Set List</span>
          <button
            onClick={addSet}
            className="flex items-center gap-1 text-[11px] text-[var(--electric)] hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Add Set
          </button>
        </div>

        {sets.map((set, idx) => (
          <div key={idx} className="flex items-center gap-2 rounded-xl border border-border/60 bg-[var(--surface-elevated)] p-2 text-xs">
            <span className="font-bold text-[var(--electric)] w-12 text-center shrink-0">Set {set.setNumber}</span>

            <label className="flex-1 flex items-center gap-1 min-w-0">
              <span className="text-[10px] text-muted-foreground">Weight:</span>
              <input
                type="number"
                value={set.weightKg}
                onChange={(e) => updateSet(idx, { weightKg: +e.target.value })}
                className="w-16 rounded-lg border border-border bg-[var(--surface)] px-2 py-1 text-center font-bold outline-none"
              />
              <span className="text-[10px] text-muted-foreground">kg</span>
            </label>

            <label className="flex-1 flex items-center gap-1 min-w-0">
              <span className="text-[10px] text-muted-foreground">Reps:</span>
              <input
                type="number"
                value={set.reps}
                onChange={(e) => updateSet(idx, { reps: +e.target.value })}
                className="w-14 rounded-lg border border-border bg-[var(--surface)] px-2 py-1 text-center font-bold outline-none"
              />
            </label>

            <button
              onClick={() => removeSet(idx)}
              className="p-1 text-muted-foreground hover:text-destructive"
              title="Remove set"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Save Button */}
      <button
        onClick={saveWorkout}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--electric)] to-[var(--neon)] py-3 text-sm font-bold text-[var(--primary-foreground)] shadow-[0_0_20px_var(--electric)] transition hover:scale-[1.01]"
      >
        <Save className="h-4 w-4" /> Save Workout Session
      </button>
    </NCard>
  );
}
