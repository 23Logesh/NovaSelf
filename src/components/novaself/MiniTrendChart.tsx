import { useState } from "react";

export interface TrendDataPoint {
  date: string;         // YYYY-MM-DD
  dayName: string;      // e.g., "Mon"
  formattedDate: string; // DD_MM_YY
  value: number;
  secondaryValue?: number;
}

interface MiniTrendChartProps {
  title: string;
  subtitle?: string;
  data7: TrendDataPoint[];
  data30: TrendDataPoint[];
  data90: TrendDataPoint[];
  data365: TrendDataPoint[];
  goal?: number;
  unit: string;
  color?: string;
}

export function MiniTrendChart({
  title,
  subtitle,
  data7,
  data30,
  data90,
  data365,
  goal,
  unit,
  color = "var(--electric)",
}: MiniTrendChartProps) {
  const [range, setRange] = useState<7 | 30 | 90 | 365>(7);
  const data = range === 7 ? data7 : range === 30 ? data30 : range === 90 ? data90 : data365;
  const maxVal = Math.max(goal || 0, ...data.map((d) => d.value), 1);

  return (
    <div className="rounded-2xl border border-border/70 bg-[var(--surface-elevated)] p-4 space-y-3 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h4>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1.5">
          {goal && (
            <span className="text-[10px] font-medium text-muted-foreground bg-[var(--surface)] px-2 py-1 rounded-md border border-border/50 hidden sm:inline">
              Goal: {goal} {unit}
            </span>
          )}
          <div className="flex rounded-lg border border-border bg-[var(--surface)] p-0.5 text-[10px]">
            {([
              [7, "7D"],
              [30, "30D"],
              [90, "90D"],
              [365, "1Y"],
            ] as const).map(([r, label]) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-md px-2 py-1 font-semibold transition ${
                  range === r ? "bg-[var(--electric)] text-[var(--primary-foreground)]" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-1 items-end h-32 pt-4 pb-1 overflow-x-auto" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(18px, 1fr))` }}>
        {data.map((d) => {
          const heightPct = Math.min(100, Math.max(6, Math.round((d.value / maxVal) * 100)));
          const isGoalMet = goal ? d.value >= goal : false;

          return (
            <div key={d.date} className="flex flex-col items-center justify-end h-full group relative min-w-[16px]">
              {/* Tooltip on hover/tap */}
              <div className="absolute -top-8 z-20 hidden group-hover:flex flex-col items-center pointer-events-none">
                <div className="bg-popover text-popover-foreground text-[10px] font-bold px-1.5 py-0.5 rounded shadow border border-border whitespace-nowrap tabular-nums">
                  {d.formattedDate}: {d.value} {unit}
                </div>
              </div>

              {/* Bar container */}
              <div className="w-full bg-[var(--surface)] rounded-md h-full flex items-end overflow-hidden p-0.5 border border-border/40">
                <div
                  className="w-full rounded-sm transition-all duration-300"
                  style={{
                    height: `${heightPct}%`,
                    background: isGoalMet ? "var(--neon)" : color,
                    opacity: d.value > 0 ? 0.9 : 0.2,
                  }}
                />
              </div>

              {/* Value below bar */}
              <span className="text-[8px] font-bold tabular-nums text-foreground mt-1 tracking-tight truncate max-w-full">
                {d.value > 0 ? (unit === "kg" ? d.value.toFixed(1) : Math.round(d.value)) : "—"}
              </span>

              {/* Date label DD_MM_YY */}
              <span className="text-[7px] font-medium text-muted-foreground truncate max-w-full">
                {range === 7 ? d.dayName : d.formattedDate}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
