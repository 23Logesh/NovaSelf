import { Link, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Flame, Zap, BookOpen, Pencil, TrendingDown,
  Dumbbell, Salad, Droplets, Pill, Sparkles, Moon,
  CalendarDays, AlertCircle, Scale,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { ProgressRing } from "@/components/novaself/ProgressRing";
import { NCard } from "@/components/novaself/NCard";
import { SectionHeader } from "@/components/novaself/SectionHeader";
import { AppTour } from "@/components/novaself/AppTour";
import { StoryBar } from "@/components/novaself/StoryBar";
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
  const [reactions, setReactions] = useState<Record<string, string>>({});

  function toggleReaction(id: string, emoji: string) {
    setReactions((prev) => ({
      ...prev,
      [id]: prev[id] === emoji ? "" : emoji,
    }));
  }

  if (entries.length === 0) {
    return (
      <NCard className="flex flex-col items-center gap-3 py-10 text-center">
        <CalendarDays className="h-10 w-10 text-muted-foreground/40" />
        <div>
          <p className="font-medium text-foreground">Nothing logged yet today</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap the <span className="text-[var(--electric)] font-bold">+</span> button below to post your first activity today.
          </p>
        </div>
      </NCard>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const { icon: Icon, color, bgAlpha } = CATEGORY_META[entry.category];
        const activeReaction = reactions[entry.id];

        return (
          <div
            key={entry.id}
            className="group relative rounded-2xl border border-border/80 bg-[var(--surface-elevated)] p-4 shadow-md transition-all hover:border-[var(--electric)]/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                  style={{
                    background: bgAlpha,
                    boxShadow: `0 0 12px ${color}30`,
                  }}
                >
                  <Icon className="h-4 w-4" style={{ color }} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>
                      {entry.category}
                    </span>
                    <span className="text-[10px] text-muted-foreground">· Today</span>
                  </div>
                  <p className="mt-0.5 text-sm font-semibold text-foreground leading-snug">{entry.label}</p>
                  {entry.detail && (
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{entry.detail}</p>
                  )}
                </div>
              </div>

              {/* Twitter / Strava Style Quick Reaction Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                {["🔥", "💪", "⚡", "🎯"].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => toggleReaction(entry.id, emoji)}
                    className={`rounded-full px-2 py-1 text-xs transition ${
                      activeReaction === emoji
                        ? "bg-[var(--electric)]/20 border border-[var(--electric)] scale-110 shadow-[0_0_8px_var(--electric)]"
                        : "bg-[var(--surface)] text-muted-foreground hover:bg-muted opacity-70 hover:opacity-100"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const { profile, settings, days, books, readingSessions, supplements, getDay, upsertDay } = useApp();
  const [params, setParams] = useSearchParams();
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    if (params.get("tour") === "true") {
      setTourOpen(true);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const t = today();
  const day = getDay(t);

  const cals    = day.foods.reduce((a, f) => a + f.calories, 0);
  const protein = day.foods.reduce((a, f) => a + f.protein, 0);
  const fiber   = day.foods.reduce((a, f) => a + f.fiber, 0);
  const water   = day.water.reduce((a, w) => a + w.ml, 0);
  const burned  = day.workouts.reduce((a, w) => a + w.caloriesBurned, 0);

  const targetCals = calorieTarget(profile);
  const netCals    = Math.round(cals - burned);
  const remainingCals = Math.round(targetCals - netCals);

  const goalMode = settings.goalMode || "fat_loss";
  const isFatLossSurplus = goalMode === "fat_loss" && netCals > targetCals;
  const isMuscleGainDeficit = goalMode === "muscle_gain" && netCals < targetCals - 300 && cals > 0;

  const workoutDates = new Set(days.filter((d) => d.workouts.length > 0).map((d) => d.date));
  const workoutStreak = computeStreak(workoutDates);
  const readingDates  = new Set(readingSessions.map((s) => s.date));
  const readingStreak = computeStreak(readingDates);

  const yesterday = isoDate(new Date(Date.now() - 86400000));
  const progress  = goalProgressPct(profile);

  const lowStockSupps = supplements.filter((s) => s.stock <= 3);

  function quickAddWater(ml: number = 250) {
    const id = Math.random().toString(36).slice(2, 10);
    upsertDay({ ...day, water: [...day.water, { id, ml }] });
    toast.success(`+${ml}ml water added!`);
  }

  return (
    <div className="space-y-7">
      <AppTour isOpen={tourOpen} onClose={() => setTourOpen(false)} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--electric)]">{greeting()}</div>
          <h1 className="font-display text-3xl font-bold md:text-4xl">
            {profile.name}{" "}
            <span className="text-muted-foreground">— let's move.</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTourOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-[var(--electric)]/40 bg-[var(--electric)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--electric)] hover:bg-[var(--electric)]/20 transition"
          >
            <Sparkles className="h-3.5 w-3.5" /> App Guide
          </button>
          <Link
            to={`/log?date=${yesterday}`}
            className="flex items-center gap-2 rounded-full border border-border bg-[var(--surface)] px-4 py-2 text-sm hover:border-[var(--electric)]"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit yesterday
          </Link>
        </div>
      </div>

      {/* ── Instagram-Style Daily Status Story Ring Bar ── */}
      <StoryBar />

      {/* ── Calorie Surplus/Deficit Season Alert ── */}
      {isFatLossSurplus && (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/60 bg-destructive/10 px-4 py-3 text-xs text-destructive-foreground animate-fade-in">
          <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1 font-medium">
            <span className="font-bold text-destructive">⚠️ Calorie Surplus Danger: </span>
            You are currently in <span className="underline">Fat Loss Season</span> and have exceeded your target by {Math.abs(remainingCals)} kcal today.
          </div>
        </div>
      )}

      {isMuscleGainDeficit && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/60 bg-amber-500/10 px-4 py-3 text-xs text-amber-200 animate-fade-in">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-400" />
          <div className="min-w-0 flex-1 font-medium">
            <span className="font-bold text-amber-300">⚠️ Calorie Deficit Warning: </span>
            You are in <span className="underline">Muscle Gain Season</span> and are currently {remainingCals} kcal under target.
          </div>
        </div>
      )}

      {/* ── Quick Action Bar ── */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/80 bg-[var(--surface)] p-2">
        <span className="ml-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick Log:</span>
        <button
          onClick={() => quickAddWater(250)}
          className="flex items-center gap-1.5 rounded-xl bg-[var(--surface-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--electric)] border border-border/60 hover:border-[var(--electric)] transition"
        >
          <Droplets className="h-3.5 w-3.5" /> +250ml Water
        </button>
        <Link
          to="/log"
          className="flex items-center gap-1.5 rounded-xl bg-[var(--surface-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--neon)] border border-border/60 hover:border-[var(--neon)] transition"
        >
          <Salad className="h-3.5 w-3.5" /> + Food
        </Link>
        <Link
          to="/log"
          className="flex items-center gap-1.5 rounded-xl bg-[var(--surface-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--electric)] border border-border/60 hover:border-[var(--electric)] transition"
        >
          <Dumbbell className="h-3.5 w-3.5" /> + Workout
        </Link>
        <Link
          to="/log"
          className="flex items-center gap-1.5 rounded-xl bg-[var(--surface-elevated)] px-3 py-1.5 text-xs font-semibold text-foreground border border-border/60 hover:border-foreground transition"
        >
          <Scale className="h-3.5 w-3.5" /> Log Weight
        </Link>
      </div>

      {/* ── Low Supplement Alert ── */}
      {lowStockSupps.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-400" />
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-amber-300">Low Supplement Stock: </span>
            {lowStockSupps.map((s) => `${s.name} (${s.stock} left)`).join(", ")}
          </div>
          <Link to="/supplements" className="shrink-0 rounded-lg bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/30">
            Restock
          </Link>
        </div>
      )}

      {/* ── Energy Balance & Macro Overview ── */}
      <NCard glow="electric" className="overflow-hidden">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <ProgressRing value={cals}    max={targetCals}  label="Calories" unit="kcal"  color="electric" />
          <ProgressRing value={protein} max={proteinTargetG(profile)} label="Protein"  unit="g"     color="neon"     />
          <ProgressRing value={water}   max={waterTargetMl(profile)}  label="Water"    unit="ml"    color="amber"    />
          <ProgressRing value={fiber}   max={fiberTargetG(profile)}   label="Fiber"    unit="g"     color="pink"     />
        </div>

        {/* Net Calorie Balance Strip */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 text-xs">
          <div className="flex items-center gap-4 text-muted-foreground">
            <div>Eaten: <span className="font-semibold text-foreground">{cals} kcal</span></div>
            <div>Burned: <span className="font-semibold text-[var(--neon)]">-{Math.round(burned)} kcal</span></div>
            <div>Net: <span className="font-semibold text-[var(--electric)]">{netCals} kcal</span></div>
          </div>
          <div className="font-medium text-foreground">
            {remainingCals >= 0 ? `${remainingCals} kcal remaining` : `${Math.abs(remainingCals)} kcal over goal`}
          </div>
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