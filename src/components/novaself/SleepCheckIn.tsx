import { Moon } from "lucide-react";
import { useState } from "react";
import { NCard } from "@/components/novaself/NCard";
import { useApp, today } from "@/lib/novaself/store";
import type { SleepLog } from "@/lib/novaself/types";

/**
 * Full sleep daily check-in form. Same shared-component pattern as
 * SkinCheckIn — reads today's existing log (if any) from store and
 * auto-saves on every interaction. Used by both Log.tsx (Sleep tab) and
 * the standalone Sleep page.
 */
export function SleepCheckIn() {
  const { sleepLogs, upsertSleep } = useApp();
  const existing = sleepLogs.find((s) => s.date === today());
  const [log, setLog] = useState<SleepLog>(
    existing ?? {
      date: today(),
      bedTime: "23:00",
      wakeTime: "07:00",
      durationHours: 8,
      quality: 3,
    },
  );

  function save(patch: Partial<SleepLog>) {
    const next = { ...log, ...patch };
    next.durationHours = computeDurationHours(next.bedTime, next.wakeTime);
    setLog(next);
    upsertSleep(next);
  }

  return (
    <div className="space-y-4">
      <NCard>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Last night</div>
            <div className="font-display text-4xl font-bold tabular-nums">
              {log.durationHours?.toFixed(1) ?? "—"} <span className="text-base text-muted-foreground">hrs</span>
            </div>
          </div>
          <Moon className="h-10 w-10 text-[var(--electric)]" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Bed time</span>
            <input
              type="time"
              value={log.bedTime ?? ""}
              onChange={(e) => save({ bedTime: e.target.value })}
              className="w-full rounded-xl border border-border bg-[var(--surface-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--electric)]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Wake time</span>
            <input
              type="time"
              value={log.wakeTime ?? ""}
              onChange={(e) => save({ wakeTime: e.target.value })}
              className="w-full rounded-xl border border-border bg-[var(--surface-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--electric)]"
            />
          </label>
        </div>
      </NCard>

      <NCard>
        <h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Sleep quality</h3>
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={log.quality}
          onChange={(e) => save({ quality: +e.target.value })}
          className="w-full accent-[var(--electric)]"
        />
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          {["Terrible", "Poor", "OK", "Good", "Great"].map((l, i) => (
            <span key={l} className={log.quality === i + 1 ? "text-[var(--electric)]" : ""}>
              {l}
            </span>
          ))}
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Notes</span>
          <textarea
            value={log.notes ?? ""}
            onChange={(e) => save({ notes: e.target.value })}
            rows={3}
            className="w-full rounded-xl border border-border bg-[var(--surface-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--electric)]"
          />
        </label>
      </NCard>
    </div>
  );
}

/**
 * Computes hours slept from "HH:MM" bed/wake strings, handling the overnight
 * wrap (e.g. bed 23:30 → wake 07:00 next day). Returns undefined if either
 * time is missing.
 */
function computeDurationHours(bedTime?: string, wakeTime?: string): number | undefined {
  if (!bedTime || !wakeTime) return undefined;
  const [bh, bm] = bedTime.split(":").map(Number);
  const [wh, wm] = wakeTime.split(":").map(Number);
  if ([bh, bm, wh, wm].some((n) => Number.isNaN(n))) return undefined;

  let minutes = (wh * 60 + wm) - (bh * 60 + bm);
  if (minutes <= 0) minutes += 24 * 60; // wake time is "next day"
  return Math.round((minutes / 60) * 10) / 10;
}