interface Props {
  value: number;
  max: number;
  label: string;
  unit?: string;
  color?: "electric" | "neon" | "amber" | "pink";
  size?: number;
}

const colorVar: Record<NonNullable<Props["color"]>, string> = {
  electric: "var(--electric)",
  neon: "var(--neon)",
  amber: "oklch(0.78 0.18 60)",
  pink: "oklch(0.70 0.22 0)",
};

export function ProgressRing({ value, max, label, unit, color = "electric", size = 120 }: Props) {
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * pct;
  const stroked = colorVar[color];
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--muted)" strokeWidth={stroke} fill="none" opacity={0.4} />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            stroke={stroked} strokeWidth={stroke} fill="none" strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
            style={{ transition: "stroke-dasharray 700ms cubic-bezier(.2,.8,.2,1)", filter: `drop-shadow(0 0 8px ${stroked})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-bold tabular-nums">{Math.round(value)}</span>
          <span className="text-xs text-muted-foreground">/ {Math.round(max)}{unit ? ` ${unit}` : ""}</span>
        </div>
      </div>
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}