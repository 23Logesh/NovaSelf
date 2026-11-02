import { useState } from "react";
import { Dumbbell, Activity, ShieldCheck, Flame } from "lucide-react";
import { NCard } from "@/components/novaself/NCard";
import { useApp } from "@/lib/novaself/store";

export type MuscleGroup = "chest" | "back" | "shoulders" | "biceps" | "triceps" | "abs" | "quads" | "hamstrings" | "calves";

export function Body3DView() {
  const { days } = useApp();
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>("chest");

  // Dynamically compute active muscles from recent logged workouts
  const recentWorkouts = days.flatMap((d) => d.workouts).map((w) => `${w.notes || ""} ${w.type}`.toLowerCase());
  const activeMuscles: MuscleGroup[] = [];
  if (recentWorkouts.some((w) => w.includes("chest") || w.includes("bench") || w.includes("push") || w.includes("gym"))) {
    activeMuscles.push("chest", "triceps", "shoulders");
  }
  if (recentWorkouts.some((w) => w.includes("back") || w.includes("pull") || w.includes("row") || w.includes("deadlift"))) {
    activeMuscles.push("back", "biceps");
  }
  if (recentWorkouts.some((w) => w.includes("leg") || w.includes("squat") || w.includes("quad") || w.includes("cycling"))) {
    activeMuscles.push("quads", "hamstrings", "calves");
  }
  if (activeMuscles.length === 0) {
    activeMuscles.push("chest", "biceps", "quads");
  }

  const muscleInfo: Record<MuscleGroup, { name: string; exercises: string[]; tip: string }> = {
    chest: { name: "Chest (Pectoralis)", exercises: ["Bench Press", "Incline Dumbbell Press", "Push-ups", "Chest Flyes"], tip: "Focus on full stretch and contraction." },
    back: { name: "Back (Lats & Rhomboids)", exercises: ["Pull-ups", "Barbell Rows", "Lat Pulldown", "Deadlifts"], tip: "Drive with elbows to engage Lats." },
    shoulders: { name: "Shoulders (Deltoids)", exercises: ["Overhead Press", "Lateral Raises", "Face Pulls"], tip: "Control lateral raises on the lowering phase." },
    biceps: { name: "Biceps (Brachialis)", exercises: ["Barbell Curls", "Hammer Curls", "Incline Curls"], tip: "Keep elbows pinned to your sides." },
    triceps: { name: "Triceps", exercises: ["Triceps Pushdown", "Skullcrushers", "Dips"], tip: "Full extension at the bottom of the movement." },
    abs: { name: "Core & Abs", exercises: ["Hanging Leg Raises", "Planks", "Ab Wheel Rollouts"], tip: "Brace core tight throughout all compounds." },
    quads: { name: "Quadriceps", exercises: ["Squat", "Leg Press", "Lunges", "Leg Extensions"], tip: "Push through heels and midfoot." },
    hamstrings: { name: "Hamstrings & Glutes", exercises: ["Romanian Deadlift", "Hamstring Curl", "Hip Thrust"], tip: "Hinge at hips without rounding lower back." },
    calves: { name: "Calves", exercises: ["Standing Calf Raise", "Seated Calf Raise"], tip: "Pause 1s at top contraction." },
  };

  const isHighlighted = (group: MuscleGroup) => activeMuscles.includes(group) || selectedMuscle === group;

  return (
    <NCard className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-[var(--electric)]" />
          <h3 className="font-display font-bold text-sm text-foreground">Interactive Dynamic 3D Muscle Heatmap</h3>
        </div>
        <span className="text-[10px] font-semibold text-[var(--neon)] bg-[var(--neon)]/10 px-2 py-0.5 rounded border border-[var(--neon)]/30 uppercase tracking-wider">
          Auto-Synced from Workouts
        </span>
      </div>

      {/* SVG Interactive Body Diagram Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        {/* Interactive Muscle Group Buttons Graphic */}
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["chest", "Chest"],
              ["back", "Back"],
              ["shoulders", "Shoulders"],
              ["biceps", "Biceps"],
              ["triceps", "Triceps"],
              ["abs", "Abs & Core"],
              ["quads", "Quads"],
              ["hamstrings", "Hamstrings"],
              ["calves", "Calves"],
            ] as const
          ).map(([key, label]) => {
            const active = isHighlighted(key);
            const isTrained = activeMuscles.includes(key as MuscleGroup);

            return (
              <button
                key={key}
                onClick={() => setSelectedMuscle(key)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-xs font-bold relative ${
                  active
                    ? "border-[var(--electric)] bg-[var(--electric)]/20 text-[var(--electric)] shadow-[0_0_15px_var(--electric)] scale-105"
                    : "border-border bg-[var(--surface-elevated)] text-muted-foreground hover:text-foreground"
                }`}
              >
                {isTrained && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[var(--neon)] animate-ping" />
                )}
                <div className={`h-2.5 w-2.5 rounded-full mb-1 ${active ? "bg-[var(--electric)]" : "bg-muted"}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Muscle Group Insight Card */}
        {selectedMuscle && (
          <div className="rounded-2xl border border-[var(--electric)]/40 bg-[var(--electric)]/10 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <h4 className="font-bold text-sm text-[var(--electric)] flex items-center gap-1.5">
                <Dumbbell className="h-4 w-4" /> {muscleInfo[selectedMuscle].name}
              </h4>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                {activeMuscles.includes(selectedMuscle) ? "🔥 Active Today" : "Targeted"}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Top Exercises</span>
              <div className="flex flex-wrap gap-1.5">
                {muscleInfo[selectedMuscle].exercises.map((ex) => (
                  <span key={ex} className="rounded-lg bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold border border-border/60">
                    {ex}
                  </span>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground italic leading-relaxed pt-1 border-t border-border/40">
              💡 {muscleInfo[selectedMuscle].tip}
            </p>
          </div>
        )}
      </div>
    </NCard>
  );
}
