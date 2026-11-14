import { Link, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Flame, BookOpen, Pencil, TrendingDown,
  Dumbbell, Salad, Droplets, Pill, Sparkles, Moon,
  CalendarDays, AlertCircle, Scale, BookMarked,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ProgressRing } from "@/components/novaself/ProgressRing";
import { NCard } from "@/components/novaself/NCard";
import { NModal } from "@/components/novaself/NModal";
import { SectionHeader } from "@/components/novaself/SectionHeader";
import { AppTour } from "@/components/novaself/AppTour";
import { StoryBar } from "@/components/novaself/StoryBar";
import { useApp, today } from "@/lib/novaself/store";
import { getDailyThirukural, fetchAIThirukural, type Thirukural } from "@/lib/novaself/thirukural";
import {
  calorieTarget, proteinTargetG, waterTargetMl, goalProgressPct, isoDate,
} from "@/lib/novaself/calculations";
import { buildDailyTimeline, type TimelineCategory } from "@/lib/novaself/timeline";

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
            className="group relative rounded-2xl border border-border/80 bg-[var(--surface-elevated)] p-4 transition-all hover:border-[var(--electric)]/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                  style={{ background: bgAlpha }}
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

              <div className="flex items-center gap-1 shrink-0">
                {["🔥", "💪", "⚡", "🎯"].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => toggleReaction(entry.id, emoji)}
                    className={`rounded-full px-2 py-1 text-xs transition ${
                      activeReaction === emoji
                        ? "bg-[var(--electric)]/20 border border-[var(--electric)] scale-110"
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

export default function Dashboard() {
  const { profile, settings, days, books, readingSessions, supplements, getDay } = useApp();
  const [params, setParams] = useSearchParams();
  const [tourOpen, setTourOpen] = useState(false);
  const [kuralModalOpen, setKuralModalOpen] = useState(false);
  const [kural, setKural] = useState<Thirukural>(getDailyThirukural());

  useEffect(() => {
    if (params.get("tour") === "true") {
      setTourOpen(true);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const aiEnabled = Boolean(settings.aiApiKey?.trim() || settings.ollamaUrl?.trim());

  useEffect(() => {
    if (aiEnabled) {
      fetchAIThirukural(settings.aiProvider, settings.aiApiKey, settings.aiModel, settings.ollamaUrl)
        .then((res) => { if (res) setKural(res); })
        .catch(() => {});
    }
  }, [aiEnabled, settings.aiProvider, settings.aiApiKey, settings.aiModel, settings.ollamaUrl]);

  const t = today();
  const day = getDay(t);

  const cals    = day.foods.reduce((a, f) => a + f.calories, 0);
  const protein = day.foods.reduce((a, f) => a + f.protein, 0);
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

  return (
    <div className="mx-auto max-w-md space-y-5 px-3 py-4">
      <AppTour isOpen={tourOpen} onClose={() => setTourOpen(false)} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--electric)]">{greeting()}</div>
          <h1 className="font-display text-2xl font-bold">
            {profile.name}{" "}
            <span className="text-muted-foreground">— let's move.</span>
          </h1>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTourOpen(true)}
            className="flex items-center gap-1 rounded-full border border-[var(--electric)]/40 bg-[var(--electric)]/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--electric)]"
          >
            <Sparkles className="h-3 w-3" /> Guide
          </button>
          <Link
            to={`/log?date=${yesterday}`}
            className="flex items-center gap-1.5 rounded-full border border-border bg-[var(--surface)] px-2.5 py-1 text-[11px]"
          >
            <Pencil className="h-3 w-3" /> Yesterday
          </Link>
        </div>
      </div>

      {/* ── Daily Thirukural (Visible when AI is enabled) ── */}
      {aiEnabled && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setKuralModalOpen(true)}
          onKeyDown={(e) => e.key === "Enter" && setKuralModalOpen(true)}
          className="cursor-pointer rounded-2xl border border-border/80 bg-[var(--surface)] p-3.5 transition hover:border-[var(--electric)] shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--electric)] font-bold">
                திருக்குறள் (Daily Thirukural #{kural.number}) · {kural.sectionTa} / {kural.chapterTa}
              </div>
              <p className="mt-1 text-xs font-bold text-foreground leading-snug">
                {kural.line1} / {kural.line2}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground italic">
                Tap to read detailed meaning ({settings.thirukuralLanguage === "en" ? "English" : "தமிழ்"})
              </p>
            </div>
            <BookMarked className="h-4 w-4 text-[var(--electric)] shrink-0 mt-0.5" />
          </div>
        </div>
      )}

      {/* Thirukural Detailed Meaning Centered Dialog Modal using NModal */}
      <NModal
        isOpen={kuralModalOpen}
        onClose={() => setKuralModalOpen(false)}
        title={`திருக்குறள் #${kural.number} (${kural.sectionTa} · ${kural.chapterTa})`}
      >
        <div className="text-center space-y-2 py-3 bg-[var(--surface-elevated)] rounded-2xl p-4 border border-border/60">
          <p className="font-display text-base font-bold text-foreground leading-relaxed">
            {kural.line1}<br />{kural.line2}
          </p>
        </div>

        <div className="space-y-3 text-xs">
          <div className="rounded-2xl border border-border/60 bg-[var(--surface-elevated)] p-4 space-y-1.5">
            <div className="font-bold text-[var(--electric)] uppercase tracking-wider text-[11px]">
              {settings.thirukuralLanguage === "en" ? "Short Meaning" : "சுருக்கமான விளக்கம்"}
            </div>
            <p className="leading-relaxed text-foreground font-medium">
              {settings.thirukuralLanguage === "en" ? kural.meaningEn : kural.meaningTa}
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-[var(--surface-elevated)] p-4 space-y-1.5">
            <div className="font-bold text-[var(--electric)] uppercase tracking-wider text-[11px]">
              {settings.thirukuralLanguage === "en" ? "Detailed Commentary" : "விரிவான உரை"}
            </div>
            <p className="leading-relaxed text-muted-foreground">
              {settings.thirukuralLanguage === "en" ? kural.detailedMeaningEn : kural.detailedMeaningTa}
            </p>
          </div>
        </div>
      </NModal>

      {/* ── Instagram-Style Daily Status Story Ring Bar ── */}
      <StoryBar />

      {/* ── Calorie Surplus/Deficit Season Alert ── */}
      {isFatLossSurplus && (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/60 bg-destructive/10 px-4 py-3 text-xs text-destructive-foreground animate-fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1 font-medium">
            <span className="font-bold text-destructive">⚠️ Surplus Danger: </span>
            Exceeded target by {Math.abs(remainingCals)} kcal.
          </div>
        </div>
      )}

      {isMuscleGainDeficit && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/60 bg-amber-500/10 px-4 py-3 text-xs text-amber-200 animate-fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
          <div className="min-w-0 flex-1 font-medium">
            <span className="font-bold text-amber-300">⚠️ Deficit Warning: </span>
            {remainingCals} kcal under target.
          </div>
        </div>
      )}

      {/* ── Low Supplement Alert ── */}
      {lowStockSupps.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-amber-300">Low Stock: </span>
            {lowStockSupps.map((s) => `${s.name} (${s.stock} left)`).join(", ")}
          </div>
          <Link to="/supplements" className="shrink-0 rounded-lg bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-300">
            Restock
          </Link>
        </div>
      )}

      {/* ── Energy Balance & Macro Overview ── */}
      <NCard className="overflow-hidden p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ProgressRing value={cals}             max={targetCals}              label="Intake"  unit="kcal" color="electric" />
          <ProgressRing value={Math.round(burned)} max={400}                     label="Burned"  unit="kcal" color="neon" />
          <ProgressRing value={protein}          max={proteinTargetG(profile)} label="Protein" unit="g"    color="amber" />
          <ProgressRing value={water}            max={waterTargetMl(profile)}  label="Water"   unit="ml"   color="pink" />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-[11px]">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div>Eaten: <span className="font-semibold text-foreground">{cals}</span></div>
            <div>Burned: <span className="font-semibold text-[var(--neon)]">-{Math.round(burned)}</span></div>
            <div>Net: <span className="font-semibold text-[var(--electric)]">{netCals}</span></div>
          </div>
          <div className="font-medium text-foreground">
            {remainingCals >= 0 ? `${remainingCals} left` : `${Math.abs(remainingCals)} over`}
          </div>
        </div>
      </NCard>

      <div className="grid gap-3 grid-cols-3">
        <NCard className="p-2.5">
          <Stat
            icon={<Flame className="h-3.5 w-3.5 text-[var(--electric)]" />}
            label="Streak"
            value={`${workoutStreak}d`}
          />
        </NCard>
        <NCard className="p-2.5">
          <Stat
            icon={<BookOpen className="h-3.5 w-3.5 text-[var(--neon)]" />}
            label="Reading"
            value={`${readingStreak}d`}
          />
        </NCard>
        <NCard className="p-2.5">
          <Stat
            icon={<TrendingDown className="h-3.5 w-3.5 text-[var(--electric)]" />}
            label="Goal"
            value={`${progress.toFixed(0)}%`}
          />
        </NCard>
      </div>

      <div>
        <SectionHeader
          eyebrow="Today"
          title="Summary"
          description={`${day.foods.length} foods · ${day.water.length} water · ${day.workouts.length} workouts`}
          action={
            <Link
              to="/log"
              className="rounded-full bg-[var(--electric)]/15 px-3 py-1 text-xs font-medium text-[var(--electric)]"
            >
              + Log
            </Link>
          }
        />
        <div className="grid gap-3">
          <NCard className="p-3.5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Foods</h3>
            {day.foods.length === 0 && <p className="text-xs text-muted-foreground">Nothing logged yet.</p>}
            <ul className="space-y-1.5">
              {day.foods.map((f) => (
                <li key={f.id} className="flex items-baseline justify-between gap-3 border-b border-border/50 pb-1.5 last:border-0 text-xs">
                  <span className="font-medium">{f.name}</span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">{f.calories} kcal · {f.protein}p</span>
                </li>
              ))}
            </ul>
          </NCard>
          <NCard className="p-3.5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workouts</h3>
            {day.workouts.length === 0 && (
              <p className="text-xs text-muted-foreground">No workout logged yet today.</p>
            )}
            <ul className="space-y-1.5">
              {day.workouts.map((w) => (
                <li key={w.id} className="flex items-baseline justify-between gap-3 border-b border-border/50 pb-1.5 last:border-0 text-xs">
                  <span className="capitalize font-medium">{w.type.replace(/_/g, " ")}</span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">{w.durationMin} min · {Math.round(w.caloriesBurned)} kcal</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 text-[11px] text-muted-foreground">
              Reading: <span className="text-foreground">{books.find((b) => !b.completed)?.title ?? "—"}</span>
            </div>
          </NCard>
        </div>
      </div>

      <div>
        <SectionHeader
          eyebrow="Today"
          title="Timeline"
          description="Activity feed"
        />
        <DailyTimeline date={today()} />
      </div>
    </div>
  );
}

function Stat({
  icon, label, value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className="font-display text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}
