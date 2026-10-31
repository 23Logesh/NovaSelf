import React from "react";

export interface TrendDataPoint {
  date: string;  // YYYY-MM-DD
  dayName: string; // e.g., "Mon"
  value: number;
  secondaryValue?: number;
}

interface MiniTrendChartProps {
  title: string;
  subtitle?: string;
  data: TrendDataPoint[];
  goal?: number;
  unit: string;
  color?: string;
}

export function MiniTrendChart({
  title,
  subtitle,
  data,
  goal,
  unit,
  color = "var(--electric)",
}: MiniTrendChartProps) {
  const maxVal = Math.max(goal || 0, ...data.map((d) => d.value), 1);

  return (
    <div className="rounded-2xl border border-border/70 bg-[var(--surface-elevated)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h4>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {goal && (
          <span className="text-[10px] font-medium text-muted-foreground bg-[var(--surface)] px-2 py-1 rounded-md border border-border/50">
            Goal: {goal} {unit}
          </span>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1.5 items-end h-28 pt-4 pb-1">
        {data.map((d) => {
          const heightPct = Math.min(100, Math.max(8, Math.round((d.value / maxVal) * 100)));
          const isGoalMet = goal ? d.value >= goal : false;

          return (
            <div key={d.date} className="flex flex-col items-center justify-end h-full group relative">
              {/* Tooltip on hover/tap */}
              <div className="absolute -top-7 z-10 hidden group-hover:flex flex-col items-center pointer-events-none">
                <div className="bg-popover text-popover-foreground text-[10px] font-bold px-1.5 py-0.5 rounded shadow border border-border whitespace-nowrap tabular-nums">
                  {d.value} {unit}
                </div>
              </div>

              {/* Bar container */}
              <div className="w-full bg-[var(--surface)] rounded-lg h-full flex items-end overflow-hidden p-0.5 border border-border/40">
                <div
                  className="w-full rounded-md transition-all duration-500"
                  style={{
                    height: `${heightPct}%`,
                    background: isGoalMet ? "var(--neon)" : color,
                    opacity: d.value > 0 ? 0.9 : 0.2,
                  }}
                />
              </div>

              {/* Value below bar */}
              <span className="text-[9px] font-bold tabular-nums text-foreground mt-1 tracking-tight">
                {d.value > 0 ? (unit === "kg" ? d.value.toFixed(1) : Math.round(d.value)) : "—"}
              </span>

              {/* Day label */}
              <span className="text-[9px] font-medium text-muted-foreground uppercase">
                {d.dayName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
