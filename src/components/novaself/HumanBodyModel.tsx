import { useState } from "react";
import { User, Activity, Flame, Scale, ShieldCheck } from "lucide-react";
import { NCard } from "@/components/novaself/NCard";
import { useApp } from "@/lib/novaself/store";
import {
  bmi, bmiCategory, bodyFatPctUSNavy, whtr, whr, ffmi, leanBodyMassBoer, fatMass,
} from "@/lib/novaself/calculations";

export function HumanBodyModel() {
  const { profile } = useApp();
  const sex = profile.sex || "male";

  const [activeZone, setActiveZone] = useState<"chest" | "waist" | "legs">("waist");

  const bmiVal = bmi(profile.weightKg, profile.heightCm);
  const bfVal = bodyFatPctUSNavy(profile);
  const fmVal = fatMass(profile);
  const whtrRes = whtr(profile.waistCm, profile.heightCm);
  const whrRes = whr(profile.waistCm, profile.hipCm, sex);
  const ffmiRes = ffmi(profile);
  const lbmVal = leanBodyMassBoer(profile);

  return (
    <NCard glow="electric" className="space-y-4">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-[var(--electric)]" />
          <h3 className="font-display font-bold text-base text-foreground">
            Anatomical Body Composition Model ({sex === "male" ? "Male" : "Female"})
          </h3>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--electric)] bg-[var(--electric)]/10 px-2.5 py-1 rounded-full border border-[var(--electric)]/30">
          Live Metric Visualization
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Anatomical Body Model Diagram Graphic */}
        <div className="relative mx-auto flex flex-col items-center justify-center p-6 rounded-3xl border border-border/80 bg-[var(--surface-elevated)] w-full max-w-xs shadow-xl">
          {/* Head & Neck */}
          <div className="h-12 w-12 rounded-full border-2 border-[var(--electric)] bg-[var(--electric)]/20 shadow-[0_0_15px_var(--electric)] mb-2 flex items-center justify-center text-[10px] font-bold">
            {profile.heightCm} cm
          </div>

          {/* Shoulders & Chest Region */}
          <button
            onClick={() => setActiveZone("chest")}
            className={`w-48 h-16 rounded-2xl border-2 transition-all p-2 flex flex-col items-center justify-center my-1 ${
              activeZone === "chest"
                ? "border-[var(--neon)] bg-[var(--neon)]/20 text-[var(--neon)] shadow-[0_0_20px_var(--neon)] scale-105"
                : "border-border bg-[var(--surface)] text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="text-xs font-bold uppercase tracking-wider">Chest & Muscle Mass</span>
            <span className="text-[10px] tabular-nums font-semibold">{lbmVal.toFixed(1)} kg Lean Mass</span>
          </button>

          {/* Waist & Core Region */}
          <button
            onClick={() => setActiveZone("waist")}
            className={`w-40 h-20 rounded-2xl border-2 transition-all p-2 flex flex-col items-center justify-center my-1 ${
              activeZone === "waist"
                ? "border-[var(--electric)] bg-[var(--electric)]/20 text-[var(--electric)] shadow-[0_0_20px_var(--electric)] scale-105"
                : "border-border bg-[var(--surface)] text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="text-xs font-bold uppercase tracking-wider">Waist & Abdomen</span>
            <span className="text-[10px] tabular-nums font-semibold">
              {bfVal ? `${bfVal.toFixed(1)}% Body Fat` : "Navy Method"}
            </span>
          </button>

          {/* Hips & Lower Body Region */}
          <button
            onClick={() => setActiveZone("legs")}
            className={`w-44 h-24 rounded-2xl border-2 transition-all p-2 flex flex-col items-center justify-center my-1 ${
              activeZone === "legs"
                ? "border-amber-400 bg-amber-500/20 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.4)] scale-105"
                : "border-border bg-[var(--surface)] text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="text-xs font-bold uppercase tracking-wider">Hips, Quads & Lower Body</span>
            <span className="text-[10px] tabular-nums font-semibold">{profile.weightKg} kg Total Weight</span>
          </button>
        </div>

        {/* Selected Anatomical Region Breakdown */}
        <div className="space-y-3">
          {activeZone === "chest" && (
            <div className="rounded-2xl border border-[var(--neon)]/40 bg-[var(--neon)]/10 p-4 space-y-3 animate-fade-in">
              <h4 className="font-bold text-sm text-[var(--neon)] flex items-center gap-1.5 border-b border-border/50 pb-2">
                <Flame className="h-4 w-4" /> Upper Body & Muscle Tonnage
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase">Lean Body Mass</span>
                  <strong className="text-foreground text-sm tabular-nums">{lbmVal.toFixed(1)} kg</strong>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase">Fat-Free Mass Index</span>
                  <strong className="text-[var(--neon)] text-sm tabular-nums">{ffmiRes ? ffmiRes.ffmi.toFixed(1) : "—"} ({ffmiRes?.category})</strong>
                </div>
              </div>
            </div>
          )}

          {activeZone === "waist" && (
            <div className="rounded-2xl border border-[var(--electric)]/40 bg-[var(--electric)]/10 p-4 space-y-3 animate-fade-in">
              <h4 className="font-bold text-sm text-[var(--electric)] flex items-center gap-1.5 border-b border-border/50 pb-2">
                <Activity className="h-4 w-4" /> Core & Abdominal Health Risk
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase">US Navy Body Fat %</span>
                  <strong className="text-foreground text-sm tabular-nums">{bfVal ? `${bfVal.toFixed(1)}%` : "—"}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase">Fat Mass</span>
                  <strong className="text-[var(--electric)] text-sm tabular-nums">{fmVal ? `${fmVal.toFixed(1)} kg` : "—"}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase">Waist-to-Height (WHtR)</span>
                  <strong className="text-foreground text-sm tabular-nums">{whtrRes ? `${whtrRes.ratio} (${whtrRes.category})` : "—"}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase">Waist-to-Hip (WHR)</span>
                  <strong className="text-foreground text-sm tabular-nums">{whrRes ? `${whrRes.ratio} (${whrRes.category})` : "—"}</strong>
                </div>
              </div>
            </div>
          )}

          {activeZone === "legs" && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3 animate-fade-in">
              <h4 className="font-bold text-sm text-amber-300 flex items-center gap-1.5 border-b border-border/50 pb-2">
                <Scale className="h-4 w-4" /> Total Body Mass & BMI Classification
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase">Body Mass Index (BMI)</span>
                  <strong className="text-foreground text-sm tabular-nums">{bmiVal.toFixed(1)} ({bmiCategory(bmiVal)})</strong>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase">Current Weight</span>
                  <strong className="text-amber-300 text-sm tabular-nums">{profile.weightKg} kg</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </NCard>
  );
}
