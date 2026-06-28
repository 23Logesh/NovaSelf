import { useState } from "react";
import { NCard } from "@/components/novaself/NCard";
import { SectionHeader } from "@/components/novaself/SectionHeader";
import { useApp } from "@/lib/novaself/store";
import {
  bmi, bmiCategory, bmr, tdee, calorieTarget, calculatedCalorieTarget, proteinTargetG, fiberTargetG,
  waterTargetMl, bodyFatPctUSNavy, idealWeightDevine, leanBodyMassBoer, fatMass, omega3TargetG,
} from "@/lib/novaself/calculations";

type Color = "electric" | "neon" | "amber" | "pink";

export default function Body() {
  const { profile, saveProfile } = useApp();
  const v = bmi(profile.weightKg, profile.heightCm);
  const bf = bodyFatPctUSNavy(profile);
  const fm = fatMass(profile);
  const isOverridden = typeof profile.calorieTargetOverride === "number" && profile.calorieTargetOverride > 0;

  return (
    <div className="space-y-7">
      <SectionHeader eyebrow="Body intelligence" title="Your numbers" description="Live recalculated from your profile. Edit measurements below." />

      <div className="grid gap-4 md:grid-cols-3">
        <BigStat label="BMI" value={v.toFixed(1)} sub={bmiCategory(v)} color="electric" />
        <BigStat label="BMR" value={Math.round(bmr(profile)).toLocaleString()} sub="kcal/day · Mifflin-St Jeor" />
        <BigStat label="TDEE" value={Math.round(tdee(profile)).toLocaleString()} sub={`× ${profile.activity}`} color="neon" />
        <BigStat label="Protein target" value={`${Math.round(proteinTargetG(profile))} g`} sub="1.8 g/kg" />
        <BigStat label="Fiber target" value={`${Math.round(fiberTargetG(profile))} g`} sub="14 g / 1000 kcal" />
        <BigStat label="Water target" value={`${Math.round(waterTargetMl(profile))} ml`} sub="35 ml/kg" color="amber" />
        <BigStat label="Ideal weight" value={`${idealWeightDevine(profile).toFixed(1)} kg`} sub="Devine formula" />
        <BigStat label="Lean body mass" value={`${leanBodyMassBoer(profile).toFixed(1)} kg`} sub="Boer formula" />
        <BigStat label="Body fat %" value={bf !== null ? `${bf.toFixed(1)}%` : "—"} sub="US Navy method" color="pink" />
        <BigStat label="Fat mass" value={fm !== null ? `${fm.toFixed(1)} kg` : "—"} sub="from US Navy BF%" />
        <BigStat label="Omega-3 target" value={`${omega3TargetG()} g`} sub="reference / day" />
      </div>

      {/* FR-15: calorie target is now editable/overridable, not just calculated. */}
      <NCard glow="electric">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Calorie target</div>
            <div className="mt-1 font-display text-3xl font-bold tabular-nums text-[var(--electric)]">
              {Math.round(calorieTarget(profile)).toLocaleString()} kcal
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {isOverridden ? "Manual override" : `Auto: TDEE − 500 (${Math.round(calculatedCalorieTarget(profile))} kcal)`}
            </div>
          </div>
          <CalorieOverrideControl
            isOverridden={isOverridden}
            override={profile.calorieTargetOverride}
            calculated={calculatedCalorieTarget(profile)}
            onSet={(kcal) => saveProfile({ calorieTargetOverride: kcal })}
            onClear={() => saveProfile({ calorieTargetOverride: undefined })}
          />
        </div>
      </NCard>

      <NCard>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Measurements</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Num label="Age (years)" value={profile.age} onChange={(v) => saveProfile({ age: v })} />
          <Num label="Weight (kg)" value={profile.weightKg} step={0.1} onChange={(v) => saveProfile({ weightKg: v })} />
          <Num label="Height (cm)" value={profile.heightCm} onChange={(v) => saveProfile({ heightCm: v })} />
          <Num label="Neck (cm)" value={profile.neckCm ?? 0} onChange={(v) => saveProfile({ neckCm: v })} />
          <Num label="Waist (cm)" value={profile.waistCm ?? 0} onChange={(v) => saveProfile({ waistCm: v })} />
          {profile.sex === "female" && (
            <Num label="Hip (cm)" value={profile.hipCm ?? 0} onChange={(v) => saveProfile({ hipCm: v })} />
          )}
        </div>
      </NCard>
    </div>
  );
}

function CalorieOverrideControl({
  isOverridden, override, calculated, onSet, onClear,
}: { isOverridden: boolean; override?: number; calculated: number; onSet: (v: number) => void; onClear: () => void }) {
  const [draft, setDraft] = useState(override ?? Math.round(calculated));
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={draft}
        onChange={(e) => setDraft(+e.target.value)}
        className="w-28 rounded-xl border border-border bg-[var(--surface-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--electric)]"
      />
      <button
        onClick={() => onSet(draft)}
        className="rounded-xl bg-[var(--electric)] px-3 py-2 text-sm font-medium text-[var(--primary-foreground)]"
      >
        Set
      </button>
      {isOverridden && (
        <button onClick={onClear} className="rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
          Use auto
        </button>
      )}
    </div>
  );
}

function BigStat({ label, value, sub, color = "electric" }: { label: string; value: string; sub: string; color?: Color }) {
  const c = color === "electric" ? "text-[var(--electric)]" : color === "neon" ? "text-[var(--neon)]" : color === "amber" ? "text-[oklch(0.78_0.18_60)]" : "text-[oklch(0.70_0.22_0)]";
  return (
    <NCard>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-3xl font-bold tabular-nums ${c}`}>{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </NCard>
  );
}

function Num({ label, value, step = 1, onChange }: { label: string; value: number; step?: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <input type="number" step={step} value={value} onChange={(e) => onChange(+e.target.value)}
        className="w-full rounded-xl border border-border bg-[var(--surface-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--electric)]" />
    </label>
  );
}