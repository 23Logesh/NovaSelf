import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { NCard } from "@/components/novaself/NCard";
import { SectionHeader } from "@/components/novaself/SectionHeader";
import { useApp } from "@/lib/novaself/store";
import { goalETA, goalProgressPct } from "@/lib/novaself/calculations";
import type { DayLog } from "@/lib/novaself/types";

export default function Progress() {
  const { days, profile } = useApp();
  const weightSeries = days.filter((d) => typeof d.weightKg === "number")
    .map((d) => ({ date: d.date.slice(5), weight: d.weightKg as number, raw: d.date }));

  const eta = goalETA(profile, days.filter((d) => d.weightKg).map((d) => ({ date: d.date, weightKg: d.weightKg as number })));
  const pct = goalProgressPct(profile);

  const weekly = bucketByWeek(days);

  return (
    <div className="space-y-7">
      <SectionHeader eyebrow="Trend" title="Progress" description="Your weight, calories, and how close you are to your goal." />

      <div className="grid gap-4 md:grid-cols-3">
        <NCard>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Goal progress</div>
          <div className="mt-1 font-display text-4xl font-bold text-[var(--neon)] tabular-nums">{pct.toFixed(1)}%</div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gradient-to-r from-[var(--electric)] to-[var(--neon)]" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 text-xs text-muted-foreground tabular-nums">{profile.startingWeightKg} → {profile.weightKg} → <span className="text-[var(--neon)]">{profile.goalWeightKg} kg</span></div>
        </NCard>
        <NCard>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Goal ETA</div>
          {eta ? (
            <>
              <div className="mt-1 font-display text-3xl font-bold tabular-nums">{eta.days} <span className="text-base text-muted-foreground">days</span></div>
              <div className="mt-1 text-xs text-muted-foreground">{eta.date.toDateString()}</div>
            </>
          ) : <div className="mt-2 text-sm text-muted-foreground">Not enough trend data yet.</div>}
        </NCard>
        <NCard>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Days logged</div>
          <div className="mt-1 font-display text-3xl font-bold tabular-nums">{days.filter((d) => d.foods.length).length}</div>
          <div className="mt-1 text-xs text-muted-foreground">of {days.length} tracked</div>
        </NCard>
      </div>

      <NCard>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Weight trend</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weightSeries}>
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="oklch(0.72 0.20 240)" />
                  <stop offset="100%" stopColor="oklch(0.82 0.22 145)" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={["dataMin - 1", "dataMax + 1"]} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
              <ReferenceLine y={profile.goalWeightKg} stroke="var(--neon)" strokeDasharray="4 4" label={{ value: "Goal", fill: "var(--neon)", fontSize: 10 }} />
              <Line type="monotone" dataKey="weight" stroke="url(#lineGrad)" strokeWidth={3} dot={{ r: 3, fill: "var(--electric)" }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </NCard>

      <NCard>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Weekly summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="pb-2 pr-3">Week of</th>
                <th className="pb-2 pr-3">Start kg</th>
                <th className="pb-2 pr-3">End kg</th>
                <th className="pb-2 pr-3">Avg cal</th>
                <th className="pb-2 pr-3">% change</th>
              </tr>
            </thead>
            <tbody>
              {weekly.map((w) => (
                <tr key={w.weekOf} className="border-t border-border/40">
                  <td className="py-2 pr-3">{w.weekOf}</td>
                  <td className="py-2 pr-3 tabular-nums">{w.startKg?.toFixed(1) ?? "—"}</td>
                  <td className="py-2 pr-3 tabular-nums">{w.endKg?.toFixed(1) ?? "—"}</td>
                  <td className="py-2 pr-3 tabular-nums">{w.avgCal ? Math.round(w.avgCal) : "—"}</td>
                  <td className={`py-2 pr-3 tabular-nums ${w.pctChange && w.pctChange < 0 ? "text-[var(--neon)]" : "text-muted-foreground"}`}>
                    {w.pctChange !== null ? `${w.pctChange.toFixed(2)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </NCard>
    </div>
  );
}

interface WeekBucket { weekOf: string; startKg?: number; endKg?: number; avgCal: number | null; pctChange: number | null }

// NFR-07: pure ISO-date / Date-object arithmetic throughout (no manual
// month-length math), so this stays correct across month and year boundaries.
function bucketByWeek(days: DayLog[]): WeekBucket[] {
  const buckets = new Map<string, DayLog[]>();
  for (const d of days) {
    const dt = new Date(d.date);
    const day = dt.getDay();
    const monday = new Date(dt);
    monday.setDate(dt.getDate() - ((day + 6) % 7));
    const key = monday.toISOString().slice(0, 10);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(d);
  }
  return Array.from(buckets.entries()).sort().map(([weekOf, items]) => {
    const weighed = items.filter((i) => typeof i.weightKg === "number");
    const logged = items.filter((i) => i.foods.length > 0);
    const totalCal = logged.reduce((a, i) => a + i.foods.reduce((aa, f) => aa + f.calories, 0), 0);
    const start = weighed[0]?.weightKg;
    const end = weighed[weighed.length - 1]?.weightKg;
    return {
      weekOf,
      startKg: start,
      endKg: end,
      avgCal: logged.length ? totalCal / logged.length : null,
      pctChange: start && end ? ((end - start) / start) * 100 : null,
    };
  });
}