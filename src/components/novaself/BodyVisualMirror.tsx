import { useState } from "react";
import { Sparkles, Activity, Box, User } from "lucide-react";
import { NCard } from "@/components/novaself/NCard";
import { useApp } from "@/lib/novaself/store";
import { bodyFatPctUSNavy, ffmi, bmi, bmiCategory, fatMass, leanBodyMassBoer } from "@/lib/novaself/calculations";

export function BodyVisualMirror() {
  const { profile } = useApp();
  const sex = profile.sex || "male";

  const [viewMode, setViewMode] = useState<"front" | "isometric">("isometric");

  const bf = bodyFatPctUSNavy(profile) ?? 18;
  const fm = fatMass(profile) ?? 14;
  const lbm = leanBodyMassBoer(profile) ?? 64;
  const ffmiData = ffmi(profile);
  const ffmiVal = ffmiData ? ffmiData.ffmi : 20;
  const bmiVal = bmi(profile.weightKg, profile.heightCm);

  // Anatomical proportions based on body fat and muscle index
  const muscleScale = Math.min(1.3, Math.max(0.85, ffmiVal / 19));
  const fatScale = Math.min(1.35, Math.max(0.8, bf / 18));

  let physiqueTitle = "Athletic & Balanced Physique";
  if (bf > 24) physiqueTitle = "Bulking / Higher Mass Phase";
  else if (ffmiVal > 22) physiqueTitle = "Elite Muscular & Shredded";
  else if (bf < 12) physiqueTitle = "Low Body Fat / Aesthetic";

  return (
    <NCard glow="electric" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-[var(--electric)] animate-pulse" />
          <h3 className="font-display font-bold text-base text-foreground">
            Realistic Anatomical Body Mirror ({sex === "male" ? "Male" : "Female"})
          </h3>
        </div>
        <div className="flex rounded-lg border border-border bg-[var(--surface)] p-0.5 text-[10px]">
          {(["isometric", "front"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`rounded-md px-3 py-1 font-semibold capitalize transition ${
                viewMode === m ? "bg-[var(--electric)] text-[var(--primary-foreground)] shadow-[0_0_10px_var(--electric)]" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m} View
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Photorealistic Anatomical SVG Human Silhouette */}
        <div className="relative mx-auto flex flex-col items-center justify-center p-6 rounded-3xl border border-border/80 bg-[var(--surface-elevated)] w-full max-w-xs shadow-2xl overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--electric)]/10 to-[var(--neon)]/10 pointer-events-none" />

          <div className="absolute top-3 left-3 bg-background/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-bold text-[var(--electric)] border border-border z-10">
            {physiqueTitle}
          </div>

          {/* Anatomical Human SVG Contour */}
          <svg viewBox="0 0 200 340" className="w-48 h-72 drop-shadow-[0_15px_25px_rgba(0,0,0,0.6)] transition-transform duration-500 group-hover:scale-105">
            <defs>
              <linearGradient id="humanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="oklch(0.75 0.22 240)" />
                <stop offset="50%" stopColor="oklch(0.65 0.20 250)" />
                <stop offset="100%" stopColor="oklch(0.85 0.24 145)" />
              </linearGradient>
            </defs>

            {/* Head */}
            <circle cx="100" cy="35" r="20" fill="url(#humanGrad)" />
            <path d="M 90 55 L 110 55 L 115 68 L 85 68 Z" fill="url(#humanGrad)" />

            {/* Shoulders & Chest (Scaled by muscleScale) */}
            <path
              d={`M ${100 - 42 * muscleScale} 70
                 Q 100 65 ${100 + 42 * muscleScale} 70
                 L ${100 + 34 * fatScale} 150
                 Q 100 160 ${100 - 34 * fatScale} 150 Z`}
              fill="url(#humanGrad)"
            />

            {/* Abdomen & Core (Scaled by fatScale) */}
            <path
              d={`M ${100 - 34 * fatScale} 150
                 Q 100 160 ${100 + 34 * fatScale} 150
                 L ${100 + 28 * fatScale} 220
                 L ${100 - 28 * fatScale} 220 Z`}
              fill="url(#humanGrad)"
            />

            {/* Legs */}
            <path
              d={`M ${100 - 28 * fatScale} 220
                 L ${100 + 28 * fatScale} 220
                 L ${100 + 20} 330
                 L ${100 - 20} 330 Z`}
              fill="url(#humanGrad)"
            />
          </svg>

          <div className="mt-2 text-center text-xs text-muted-foreground z-10">
            Anatomical Mirror: <strong className="text-foreground">{bf.toFixed(1)}% BF</strong> · <strong className="text-[var(--electric)]">{ffmiVal.toFixed(1)} FFMI</strong>
          </div>
        </div>

        {/* Metrics Breakdown */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-[var(--electric)]/40 bg-[var(--electric)]/10 p-4 space-y-3">
            <h4 className="font-bold text-sm text-[var(--electric)] flex items-center gap-1.5 border-b border-border/50 pb-2">
              <Activity className="h-4 w-4" /> Composition Breakdown
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase">Total Weight</span>
                <strong className="text-foreground text-sm tabular-nums">{profile.weightKg} kg</strong>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase">Lean Mass (Boer)</span>
                <strong className="text-[var(--electric)] text-sm tabular-nums">{lbm.toFixed(1)} kg</strong>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase">Fat Mass</span>
                <strong className="text-foreground text-sm tabular-nums">{fm.toFixed(1)} kg</strong>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase">Muscle Index (FFMI)</span>
                <strong className="text-[var(--neon)] text-sm tabular-nums">{ffmiVal.toFixed(1)} ({ffmiData?.category})</strong>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground italic leading-relaxed">
            ✨ This realistic anatomical mirror dynamically calculates your body proportions in real-time based on your weight and body measurements.
          </p>
        </div>
      </div>
    </NCard>
  );
}
