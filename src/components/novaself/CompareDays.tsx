import { useState } from "react";
import { GitCompare, Calendar, ArrowUpRight, ArrowDownRight, Minus, Filter } from "lucide-react";
import { NCard } from "@/components/novaself/NCard";
import { useApp } from "@/lib/novaself/store";
import { isoDate } from "@/lib/novaself/calculations";

type MetricKey = "calories" | "protein" | "water" | "workoutBurn" | "weight" | "sleep";

export function CompareDays() {
  const { days, sleepLogs } = useApp();
  const [rangeDays, setRangeDays] = useState<7 | 30 | 90 | 365 | 730>(30);
  const [metric, setMetric] = useState<MetricKey>("calories");

  // Generate past N days array sorted chronologically
  const datesArr: string[] = [];
  const now = new Date();
  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    datesArr.push(isoDate(d));
  }

  const dayMap = new Map(days.map((d) => [d.date, d]));
  const sleepMap = new Map(sleepLogs.map((s) => [s.date, s]));

  function getVal(dateStr: string, m: MetricKey): number {
    const d = dayMap.get(dateStr);
    const s = sleepMap.get(dateStr);
    if (!d) return 0;
    switch (m) {
      case "calories": return d.foods.reduce((a, f) => a + f.calories, 0);
      case "protein": return d.foods.reduce((a, f) => a + f.protein, 0);
      case "water": return d.water.reduce((a, w) => a + w.ml, 0);
      case "workoutBurn": return Math.round(d.workouts.reduce((a, w) => a + w.caloriesBurned, 0));
      case "weight": return d.weightKg ?? 0;
      case "sleep": return s?.durationHours ?? 0;
    }
  }

  const metricLabels: Record<MetricKey, { label: string; unit: string }> = {
    calories: { label: "Calories Intake", unit: "kcal" },
    protein: { label: "Protein Intake", unit: "g" },
    water: { label: "Hydration", unit: "ml" },
    workoutBurn: { label: "Workout Burn", unit: "kcal" },
    weight: { label: "Body Weight", unit: "kg" },
    sleep: { label: "Sleep Duration", unit: "hrs" },
  };

  return (
    <NCard className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-[var(--electric)]" />
          <h3 className="font-display font-bold text-sm text-foreground">Multi-Year Historical Trend & Dynamic Comparison</h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Selector */}
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as MetricKey)}
            className="rounded-xl border border-border bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-foreground outline-none focus:border-[var(--electric)]"
          >
            {Object.entries(metricLabels).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          {/* Range Selector (Up to 2+ Years / 730 Days) */}
          <div className="flex rounded-lg border border-border bg-[var(--surface)] p-0.5 text-[10px]">
            {([
              [7, "7D"],
              [30, "30D"],
              [90, "90D"],
              [365, "1Y"],
              [730, "2Y"],
            ] as const).map(([r, label]) => (
              <button
                key={r}
                onClick={() => setRangeDays(r)}
                className={`rounded-md px-2 py-1 font-semibold transition ${
                  rangeDays === r ? "bg-[var(--electric)] text-[var(--primary-foreground)]" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable Multi-Day Comparative Grid */}
      <div className="overflow-x-auto pb-2">
        <div className="inline-flex gap-2.5 min-w-full">
          {datesArr.map((dateStr) => {
            const val = getVal(dateStr, metric);
            return (
              <div
                key={dateStr}
                className="w-28 shrink-0 rounded-2xl border border-border/80 bg-[var(--surface-elevated)] p-3 space-y-1.5 text-center"
              >
                <div className="text-[10px] text-muted-foreground font-semibold">{dateStr}</div>
                <div className="font-display text-xl font-extrabold text-[var(--electric)] tabular-nums">
                  {val > 0 ? (metric === "weight" || metric === "sleep" ? val.toFixed(1) : val) : "—"}
                </div>
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{metricLabels[metric].unit}</div>
              </div>
            );
          })}
        </div>
      </div>
    </NCard>
  );
}
