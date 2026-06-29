import { Link } from "react-router-dom";
import {
  Flame, Zap, BookOpen, Pencil, TrendingDown,
  Dumbbell, Salad, Droplets, Pill, Sparkles, Moon,
  CalendarDays,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ProgressRing } from "@/components/novaself/ProgressRing";
import { NCard } from "@/components/novaself/NCard";
import { SectionHeader } from "@/components/novaself/SectionHeader";
import { useApp, today } from "@/lib/novaself/store";
import {
  calorieTarget, proteinTargetG, fiberTargetG, waterTargetMl, goalProgressPct, isoDate,
} from "@/lib/novaself/calculations";
import { buildDailyTimeline, type TimelineCategory } from "@/lib/novaself/timeline";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Wind it down";
}

function computeStreak(set: Set<string>): number {
  let count = 0;
  let cur = new Date();
  while (set.has(cur.toISOString().slice(0, 10))) {
    count++;
    cur = new Date(cur.getTime() - 86400000);
  }
  return count;
}

// ---------------------------------------------------------------------------
// Category metadata — icon + accent color for each timeline category.
//
// Colors are chosen to be visually distinct while staying within the design
// system palette. `electric` and `neon` are CSS variables; amber, pink, and
// violet use raw oklch values matching the ProgressRing constants so the
// dashboard feels consistent.
// ---------------------------------------------------------------------------
type CategoryMeta = { icon: LucideIcon; color: string; bgAlpha: string };

const CATEGORY_META: Record<TimelineCategory, CategoryMeta> = {
  workout:    { icon: Dumbbell,  color: "var(--electric)",          bgAlpha: "color-mix(in oklab, var(--electric) 15%, transparent)" },
  food:       { icon: Salad,     color: "var(--neon)",              bgAlpha: "color-mix(in oklab, var(--neon) 15%, transparent)" },
  water:      { icon: Droplets,  color: "oklch(0.78 0.18 60)",      bgAlpha: "color-mix(in oklab, oklch(0.78 0.18 60) 15%, transparent)" },
  supplement: { icon: Pill,      color: "oklch(0.70 0.22 0)",       bgAlpha: "color-mix(in oklab, oklch(0.70 0.22 0) 15%, transparent)" },
  skin:       { icon: Sparkles,  color: "oklch(0.72 0.16 300)",     bgAlpha: "color-mix(in oklab, oklch(0.72 0.16 300) 15%, transparent)" },
  sleep:      { icon: Moon,      color: "oklch(0.68 0.14 250)",     bgAlpha: "color-mix(in oklab, oklch(0.68 0.14 250) 15%, transparent)" },
  reading:    { icon: BookOpen,  color: "oklch(0.75 0.15 185)",     bgAlpha: "color-mix(in oklab, oklch(0.75 0.15 185) 15%, transparent)" },
};

// ---------------------------------------------------------------------------
// DailyTimeline
// ---------------------------------------------------------------------------

/**
 * Renders the "Today's Timeline" feed for a given date.
 * Accepts a `date` prop so it works for any date — currently called with
 * today() but trivially usable for past-date views later.
 */
function DailyTimeline({ date }: { date: string }) {
  const state = useApp();
  const entries = buildDailyTimeline(date, state);

  if (entries.length === 0) {
    return (
      <NCard className="flex flex-col items-center gap-3 py-10 text-center">
        <CalendarDays className="h-10 w-10 text-muted-foreground/40" />
        <div>
          <p className="font-medium text-foreground">Nothing logged yet today</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Head to{" "}
            <Link to="/log" className="text-[var(--electric)] hover:underline">Log</Link>
            {" "}or any section to start tracking.
          </p>
        </div>
      </NCard>
    );
  }

  return (
    <NCard className="py-5">
      {/* Outer wrapper: left padding to make room for the icon column */}
      <ul className="relative ml-3 space-y-5">
        {/* Vertical connecting line — runs behind all dots */}
        <div
          aria-hidden
          className="absolute left-3 top-4 bottom-4 w-px bg-border/50"
        />

        {entries.map((entry) => {
          const { icon: Icon, color, bgAlpha } = CATEGORY_META[entry.category];
          return (
            <li key={entry.id} className="relative flex items-start gap-4 pl-10">
              {/* Category dot / icon badge — sits on the vertical line */}
              <div
                aria-hidden
                className="absolute left-0 top-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: bgAlpha,
                  boxShadow: `0 0 0 1.5px ${color}`,
                }}
              >
                <Icon className="h-3.5 w-3.5" style={{ color }} />
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug text-foreground">{entry.label}</p>
                {entry.detail && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{entry.detail}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </NCard>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const { profile, days, books, readingSessions } = useApp();
  const day = days.find((d) => d.date === today()) ?? { date: today(), foods: [], water: [], workouts: [] };

  const cals    = day.foods.reduce((a, f) => a + f.calories, 0);
  const protein = day.foods.reduce((a, f) => a + f.protein, 0);
  const fiber   = day.foods.reduce((a, f) => a + f.fiber, 0);
  const water   = day.water.reduce((a, w) => a + w.ml, 0);

  const workoutDates = new Set(days.filter((d) => d.workouts.length > 0).map((d) => d.date));
  const workoutStreak = computeStreak(workoutDates);
  const readingDates  = new Set(readingSessions.map((s) => s.date));
  const readingStreak = computeStreak(readingDates);

  const yesterday = isoDate(new Date(Date.now() - 86400000));
  const progress  = goalProgressPct(profile);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--electric)]">{greeting()}</div>
          <h1 className="font-display text-3xl font-bold md:text-4xl">
            {profile.name}{" "}
            <span className="text-muted-foreground">— let's move.</span>
          </h1>
        </div>
        <Link
          to={`/log?date=${yesterday}`}
          className="flex items-center gap-2 rounded-full border border-border bg-[var(--surface)] px-4 py-2 text-sm hover:border-[var(--electric)]"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit yesterday
        </Link>
      </div>

      <NCard glow="electric" className="overflow-hidden">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <ProgressRing value={cals}    max={calorieTarget(profile)}  label="Calories" unit="kcal"  color="electric" />
          <ProgressRing value={protein} max={proteinTargetG(profile)} label="Protein"  unit="g"     color="neon"     />
          <ProgressRing value={water}   max={waterTargetMl(profile)}  label="Water"    unit="ml"    color="amber"    />
          <ProgressRing value={fiber}   max={fiberTargetG(profile)}   label="Fiber"    unit="g"     color="pink"     />
        </div>
      </NCard>

      <div className="grid gap-5 md:grid-cols-3">
        <NCard>
          <Stat
            icon={<Flame className="h-5 w-5 text-[var(--electric)]" />}
            label="Workout streak"
            value={`${workoutStreak} ${workoutStreak === 1 ? "day" : "days"}`}
          />
        </NCard>
        <NCard>
          <Stat
            icon={<BookOpen className="h-5 w-5 text-[var(--neon)]" />}
            label="Reading streak"
            value={`${readingStreak} ${readingStreak === 1 ? "day" : "days"}`}
          />
        </NCard>
        <NCard>
          <Stat
            icon={<TrendingDown className="h-5 w-5 text-[var(--electric)]" />}
            label="Goal progress"
            value={`${progress.toFixed(1)}%`}
            sub={`${profile.weightKg.toFixed(1)} → ${profile.goalWeightKg} kg`}
          />
        </NCard>
      </div>

      <div>
        <SectionHeader
          eyebrow="Today"
          title="Summary"
          description={`${day.foods.length} foods · ${day.water.length} water entries · ${day.workouts.length} workout${day.workouts.length === 1 ? "" : "s"}`}
          action={
            <Link
              to="/log"
              className="rounded-full bg-[var(--electric)]/15 px-4 py-2 text-sm font-medium text-[var(--electric)] hover:bg-[var(--electric)]/25"
            >
              + Log
            </Link>
          }
        />
        <div className="grid gap-4 md:grid-cols-2">
          <NCard>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Foods</h3>
            {day.foods.length === 0 && <p className="text-sm text-muted-foreground">Nothing logged yet.</p>}
            <ul className="space-y-2">
              {day.foods.map((f) => (
                <li key={f.id} className="flex items-baseline justify-between gap-3 border-b border-border/50 pb-2 last:border-0">
                  <span className="text-sm">{f.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{f.calories} kcal · {f.protein}p</span>
                </li>
              ))}
            </ul>
          </NCard>
          <NCard>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Workouts</h3>
            {day.workouts.length === 0 && (
              <p className="text-sm text-muted-foreground">No workout yet. <Zap className="inline h-3 w-3 text-[var(--neon)]" /></p>
            )}
            <ul className="space-y-2">
              {day.workouts.map((w) => (
                <li key={w.id} className="flex items-baseline justify-between gap-3 border-b border-border/50 pb-2 last:border-0">
                  <span className="text-sm capitalize">{w.type.replace(/_/g, " ")}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{w.durationMin} min · {Math.round(w.caloriesBurned)} kcal</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 text-xs text-muted-foreground">
              Currently reading: <span className="text-foreground">{books.find((b) => !b.completed)?.title ?? "—"}</span>
            </div>
          </NCard>
        </div>
      </div>

      {/* ── Today's Timeline ─────────────────────────────────────────────── */}
      <div>
        <SectionHeader
          eyebrow="Today"
          title="Timeline"
          description="All activity across every category — ordered by type, not clock time"
        />
        <DailyTimeline date={today()} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Stat({
  icon, label, value, sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className="font-display text-3xl font-bold tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}